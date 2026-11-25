import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, canvasTexture, roundRect, heartShape, FONT, lighten, rng, easeOutCubic, bakeStatic } from './util.js';
import { drawIcon } from './icons.js';
import { PADS, DIORAMA_OFFSET, FUTURE } from './world.js';
import { isUnlocked, unlockLabel } from './config.js';

const WOOD = '#9b6a43';
const GOLD = '#f4c24f';

// ------------------------------------------------------------------ helpers
function box(w, h, d, color, opts) {
  return mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color, opts) : color);
}
function rbox(w, h, d, color, r = 0.08, opts) {
  return mesh(new RoundedBoxGeometry(w, h, d, 3, r), typeof color === 'string' ? mat(color, opts) : color);
}
function cyl(rt, rb, h, color, seg = 16, opts) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mat(color, opts) : color);
}
function sphere(r, color, opts, seg = 16) {
  return mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75)), typeof color === 'string' ? mat(color, opts) : color);
}
function at(obj, x, y, z) {
  obj.position.set(x, y, z);
  return obj;
}
function lathe(points, color, seg = 24, opts) {
  return mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg), typeof color === 'string' ? mat(color, opts) : color);
}
function planeTex(w, h, tex, opts = {}) {
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, ...opts }), { cast: false });
}
function glowSprite(color = 'rgba(255,255,255,1)') {
  const tex = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
}

// Pad decal and floating badge textures
function drawPad(ctx, w, stop, state) {
  const c = w / 2;
  ctx.clearRect(0, 0, w, w);
  const col = state === 'locked' ? '#a9a6bf' : stop.color;
  ctx.fillStyle = state === 'locked' ? '#ecebf3' : '#' + lighten(stop.color, 0.78).getHexString();
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 18;
  ctx.strokeStyle = col;
  ctx.beginPath();
  ctx.arc(c, c, c - 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([18, 16]);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c, c, c - 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (stop.week && state !== 'locked') {
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${w * 0.4}px ${FONT}`;
    ctx.fillText(String(stop.week), c, c + w * 0.02);
  } else {
    drawIcon(ctx, stop.icon, c, c, w * 0.42, col, 2.4);
  }
}

function drawBadge(ctx, w, stop, state) {
  const c = w / 2;
  ctx.clearRect(0, 0, w, w);
  ctx.shadowColor = 'rgba(40,30,60,0.35)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = state === 'locked' ? '#9e9ab8' : stop.color;
  ctx.beginPath();
  ctx.arc(c, c - 8, c - 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 10;
  ctx.strokeStyle = state === 'stamped' ? '#ffd166' : '#ffffff';
  ctx.stroke();
  drawIcon(ctx, stop.icon, c, c - 8, w * 0.42, '#ffffff', 2.3);
  if (state === 'stamped') {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(c + c * 0.52, c - c * 0.5, w * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.stroke();
    drawIcon(ctx, 'check', c + c * 0.52, c - c * 0.5, w * 0.16, '#6b4a00', 3.4);
  }
}

// ------------------------------------------------------------------ Station
export class Station {
  // opts: { pad: [x, z], origin: [x, z], badgeY } for places built by src/engine (no diorama builder).
  constructor(world, scene, stop, builder, opts = {}) {
    this.stop = stop;
    this.world = world;
    const [px, pz] = opts.pad || PADS[stop.id];
    this.pad = new THREE.Vector3(px, 0, pz);
    this.origin = opts.origin ? new THREE.Vector3(opts.origin[0], 0, opts.origin[1]) : new THREE.Vector3(px, 0, pz + DIORAMA_OFFSET);
    this.state = 'open';
    this.nearAmount = 0;

    // Pad on the path
    this.padCanvas = document.createElement('canvas');
    this.padCanvas.width = this.padCanvas.height = 512;
    this.padTex = new THREE.CanvasTexture(this.padCanvas);
    this.padTex.colorSpace = THREE.SRGBColorSpace;
    this.padTex.anisotropy = 8;
    const disc = mesh(new THREE.CylinderGeometry(1.8, 1.9, 0.1, 40), mat('#efe3c9', { rough: 0.9 }), { cast: false });
    disc.position.set(px, 0.06, pz);
    const decal = new THREE.Mesh(new THREE.CircleGeometry(1.72, 48), new THREE.MeshStandardMaterial({ map: this.padTex, transparent: true, roughness: 0.8 }));
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(px, 0.115, pz);
    decal.receiveShadow = true;
    this.glowMat = new THREE.MeshBasicMaterial({ color: stop.color, transparent: true, opacity: 0, depthWrite: false });
    this.glow = new THREE.Mesh(new THREE.RingGeometry(1.95, 2.35, 48), this.glowMat);
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.set(px, 0.07, pz);
    scene.add(disc, decal, this.glow);

    // Diorama
    this.group = new THREE.Group();
    this.group.position.copy(this.origin);
    scene.add(this.group);
    const built = builder ? builder(this, scene) : {};
    this.badgeY = opts.badgeY ?? built.badgeY ?? 4;
    this.animate = built.update ?? (() => {});
    bakeStatic(this.group, built.dynamic ?? [], mergeGeometries);

    // Floating badge
    this.badgeCanvas = document.createElement('canvas');
    this.badgeCanvas.width = this.badgeCanvas.height = 256;
    this.badgeTex = new THREE.CanvasTexture(this.badgeCanvas);
    this.badgeTex.colorSpace = THREE.SRGBColorSpace;
    this.badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.badgeTex, transparent: true, depthWrite: false }));
    this.badge.scale.setScalar(1.7);
    this.badge.position.set(this.origin.x, this.badgeY, this.origin.z);
    this.badge.renderOrder = 5;
    scene.add(this.badge);

    // Sign next to the pad
    if (stop.week) {
      const label = stop.locked ? ['Weekend ' + stop.week, 'Coming soon'] : ['Weekend ' + stop.week, stop.title];
      const sign = world.sign(label, { width: 2.5, height: 1.05, accent: stop.color, postHeight: 0.9 });
      sign.position.set(px - 3.3, 0, pz - 2.0);
      sign.scale.setScalar(0.9);
      world.statics.add(sign);
      world.addCollider({ type: 'box', x: px - 3.3, z: pz - 2.06, hw: 1.15, hd: 0.15 });
    }
    this.refresh(false);
  }

  addCollider(c) {
    this.world.addCollider({ ...c, x: c.x + this.origin.x, z: c.z + this.origin.z });
  }

  get unlocked() {
    return this.stop.kind === 'start' || isUnlocked(this.stop);
  }

  get label() {
    return unlockLabel(this.stop);
  }

  // stamped: has Roji collected this weekend's stamp?
  refresh(stamped) {
    this.state = !this.unlocked ? 'locked' : stamped ? 'stamped' : 'open';
    const ctx = this.padCanvas.getContext('2d');
    drawPad(ctx, 512, this.stop, this.state);
    this.padTex.needsUpdate = true;
    const b = this.badgeCanvas.getContext('2d');
    drawBadge(b, 256, this.stop, this.state);
    this.badgeTex.needsUpdate = true;
  }

  update(dt, t, rojiPos) {
    const dPad = Math.hypot(rojiPos.x - this.pad.x, rojiPos.z - this.pad.z);
    const dOrigin = Math.hypot(rojiPos.x - this.origin.x, rojiPos.z - this.origin.z);
    const near = Math.min(dPad, dOrigin) < 9;
    this.onPad = dPad < 2.1;
    this.nearAmount += ((near ? 1 : 0) - this.nearAmount) * Math.min(1, dt * 3);
    this.glowMat.opacity = this.onPad ? 0.55 + Math.sin(t * 5) * 0.2 : 0.12 * this.nearAmount;
    this.badge.position.y = this.badgeY + Math.sin(t * 1.6 + this.pad.x) * 0.18 + (this.onPad ? 0.35 : 0);
    const s = this.onPad ? 2.05 : 1.7;
    this.badge.scale.x += (s - this.badge.scale.x) * Math.min(1, dt * 8);
    this.badge.scale.y = this.badge.scale.x;
    this.animate(dt, t, this.nearAmount, this.onPad, rojiPos);
  }
}

// ------------------------------------------------------------------ home
export function buildHome(st) {
  const g = st.group;
  const walls = box(3.4, 2.1, 2.7, '#fff2e1');
  at(walls, 0, 1.05, -0.4);
  const base = box(3.6, 0.25, 2.9, '#d9b48c');
  at(base, 0, 0.12, -0.4);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.1, 0);
  roofShape.lineTo(2.1, 0);
  roofShape.lineTo(0, 1.6);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 3.1, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  roofGeo.translate(0, 0, -1.55);
  const roof = mesh(roofGeo, mat('#f08a5d', { rough: 0.7 }));
  at(roof, 0, 2.08, -0.4);
  const chimney = box(0.45, 1.0, 0.45, '#c9705a');
  at(chimney, 1.0, 3.1, -0.9);
  const door = rbox(0.8, 1.35, 0.1, '#8a5a3c', 0.04);
  at(door, 0.55, 0.92, 0.97);
  const knob = sphere(0.05, GOLD, { metal: 0.6, rough: 0.3 });
  at(knob, 0.82, 0.9, 1.04);
  const win = mat('#ffe7b0', { emissive: '#ffcf7a', ei: 0.7, rough: 0.3 });
  for (const x of [-0.95]) {
    const frame = box(0.95, 0.85, 0.08, '#ffffff');
    at(frame, x, 1.25, 0.96);
    const glass = box(0.75, 0.65, 0.06, win);
    at(glass, x, 1.25, 0.99);
    const cross = box(0.06, 0.65, 0.08, '#ffffff');
    at(cross, x, 1.25, 1.01);
    const planter = box(1.0, 0.2, 0.25, WOOD);
    at(planter, x, 0.72, 1.1);
    g.add(frame, glass, cross, planter);
    for (let i = 0; i < 5; i++) {
      const f = sphere(0.08, ['#ff8fb1', '#ffd75e', '#ffffff'][i % 3], { rough: 0.6 }, 8);
      at(f, x - 0.38 + i * 0.19, 0.88, 1.12);
      g.add(f);
    }
  }
  const heart = mesh(new THREE.ExtrudeGeometry(heartShape(0.32), { depth: 0.05, bevelEnabled: false }), mat('#ef5b6f'));
  at(heart, 0.55, 1.2, 1.03);
  heart.position.x -= 0;
  heart.position.y -= 0.16;
  g.add(walls, base, roof, chimney, door, knob, heart);
  // Picket fence
  const picket = mat('#ffffff', { rough: 0.7 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const p = box(0.12, 0.6, 0.06, picket);
      at(p, side * (2.1 + i * 0.32), 0.3, 1.5);
      g.add(p);
    }
    const rail = box(1.5, 0.08, 0.05, picket);
    at(rail, side * 2.75, 0.4, 1.47);
    g.add(rail);
  }
  // Mailbox
  const post = box(0.1, 0.9, 0.1, WOOD);
  at(post, -2.4, 0.45, 3.2);
  const mb = rbox(0.4, 0.32, 0.55, '#3f7bf0', 0.12);
  at(mb, -2.4, 1.05, 3.2);
  const flag = box(0.04, 0.25, 0.12, '#e5484d');
  at(flag, -2.18, 1.2, 3.1);
  g.add(post, mb, flag);
  const sign = st.world.sign([`Roji's Home`], { width: 2.3, height: 0.8, accent: '#f08a5d', postHeight: 0.8 });
  sign.position.set(2.5, 0, 3.0);
  sign.scale.setScalar(0.9);
  g.add(sign);

  st.addCollider({ type: 'box', x: 0, z: -0.4, hw: 1.85, hd: 1.5 });
  st.door = new THREE.Vector3(st.origin.x + 0.55, 0, st.origin.z + 1.75);
  st.addCollider({ type: 'circle', x: -2.4, z: 3.2, r: 0.3 });
  st.addCollider({ type: 'box', x: 2.5, z: 3.0, hw: 1.0, hd: 0.15 });
  st.addCollider({ type: 'box', x: -2.75, z: 1.5, hw: 0.8, hd: 0.1 });
  st.addCollider({ type: 'box', x: 2.75, z: 1.5, hw: 0.8, hd: 0.1 });

  // Smoke puffs from the chimney
  const puffs = [];
  for (let i = 0; i < 4; i++) {
    const s = glowSprite('rgba(255,255,255,0.9)');
    g.add(s);
    puffs.push(s);
  }
  return {
    badgeY: 4.9,
    update(dt, t) {
      puffs.forEach((s, i) => {
        const k = (t * 0.35 + i / puffs.length) % 1;
        s.position.set(1.0 + Math.sin(k * 4 + i) * 0.2, 3.7 + k * 1.6, -0.9);
        s.scale.setScalar(0.4 + k * 0.9);
        s.material.opacity = 0.7 * (1 - k);
      });
    },
  };
}

// ------------------------------------------------------------------ week 1: cinema
export function buildCinema(st) {
  const g = st.group;
  const red = '#c73b45';
  const body = box(5, 3.2, 3, red);
  at(body, 0, 1.6, -0.4);
  const trim = box(5.3, 0.25, 3.3, GOLD, { metal: 0.3, rough: 0.4 });
  at(trim, 0, 3.32, -0.4);
  const crown = box(3.2, 0.8, 0.5, red);
  at(crown, 0, 3.8, 0.6);
  const crownTrim = box(3.4, 0.14, 0.6, GOLD, { metal: 0.3, rough: 0.4 });
  at(crownTrim, 0, 4.25, 0.6);
  const star = mesh(new THREE.ExtrudeGeometry(starShape(0.32, 0.14), { depth: 0.08, bevelEnabled: false }), mat(GOLD, { emissive: '#ffb200', ei: 0.4 }));
  at(star, 0, 3.75, 0.86);
  g.add(body, trim, crown, crownTrim, star);

  // Marquee with chasing bulbs
  const marqueeTex = canvasTexture(1024, 230, (ctx, w, h) => {
    ctx.fillStyle = '#4a1019';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff2c9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${h * 0.56}px ${FONT}`;
    ctx.fillText('CINEMA', w / 2, h * 0.47);
    ctx.font = `500 ${h * 0.17}px ${FONT}`;
    ctx.fillStyle = '#ffd166';
    ctx.fillText('TONIGHT  -  DATE NIGHT', w / 2, h * 0.86);
  });
  const marquee = mesh(new THREE.BoxGeometry(4.2, 0.95, 0.3), [mat('#4a1019'), mat('#4a1019'), mat('#4a1019'), mat('#4a1019'), new THREE.MeshStandardMaterial({ map: marqueeTex, roughness: 0.5, emissive: '#ffffff', emissiveMap: marqueeTex, emissiveIntensity: 0.35 }), mat('#4a1019')]);
  at(marquee, 0, 2.55, 1.25);
  g.add(marquee);
  const bulbOn = mat('#fff4cf', { emissive: '#ffd27a', ei: 2.2, rough: 0.3 });
  const bulbOff = mat('#b9935e', { emissive: '#7a5a20', ei: 0.3, rough: 0.4 });
  const bulbs = [];
  const bulbGeo = new THREE.SphereGeometry(0.06, 10, 8);
  const perim = [];
  for (let i = 0; i <= 14; i++) perim.push([-2.1 + (i / 14) * 4.2, 3.02]);
  for (let i = 1; i <= 3; i++) perim.push([2.1, 3.02 - (i / 4) * 0.95]);
  for (let i = 14; i >= 0; i--) perim.push([-2.1 + (i / 14) * 4.2, 2.08]);
  for (let i = 3; i >= 1; i--) perim.push([-2.1, 3.02 - (i / 4) * 0.95]);
  perim.forEach(([x, y]) => {
    const b = mesh(bulbGeo, bulbOn, { cast: false });
    at(b, x, y, 1.42);
    g.add(b);
    bulbs.push(b);
  });

  // Doors and posters
  const door = rbox(1.4, 1.75, 0.1, '#3b1d22', 0.04);
  at(door, 0, 0.88, 1.12);
  const split = box(0.04, 1.6, 0.12, GOLD);
  at(split, 0, 0.88, 1.15);
  g.add(door, split);
  const posters = [
    ['#1f2a5c', 'Moonlight', 'moon'],
    ['#ff8fa8', 'Two Stars', 'stars'],
  ];
  posters.forEach(([bg, title, kind], i) => {
    const x = i === 0 ? -1.75 : 1.75;
    const frame = box(1.0, 1.35, 0.08, GOLD, { metal: 0.3, rough: 0.4 });
    at(frame, x, 1.15, 1.12);
    const tex = canvasTexture(256, 352, (ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff6dc';
      if (kind === 'moon') {
        ctx.beginPath();
        ctx.arc(w * 0.55, h * 0.38, 62, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(w * 0.68, h * 0.32, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff6dc';
        for (let k = 0; k < 14; k++) ctx.fillRect((k * 53) % w, (k * 37) % (h * 0.6), 4, 4);
      } else {
        ctx.translate(w / 2, h * 0.38);
        for (const [dx, s] of [[-40, 1], [44, 0.7]]) {
          ctx.save();
          ctx.translate(dx, 0);
          ctx.scale(s, s);
          ctx.beginPath();
          for (let k = 0; k < 10; k++) {
            const r = k % 2 ? 26 : 62;
            const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.fillStyle = '#fff6dc';
      ctx.textAlign = 'center';
      ctx.font = `600 38px ${FONT}`;
      ctx.fillText(title, w / 2, h * 0.82);
    });
    const p = planeTex(0.85, 1.2, tex);
    at(p, x, 1.15, 1.17);
    g.add(frame, p);
  });

  // Red carpet and rope barrier
  const carpet = box(1.5, 0.03, 3.4, '#d43f4f', { rough: 1 });
  carpet.castShadow = false;
  at(carpet, 0, 0.02, 2.8);
  g.add(carpet);
  const goldMat = mat(GOLD, { metal: 0.6, rough: 0.3 });
  for (const sx of [-1, 1]) {
    const pts = [];
    for (const z of [1.9, 3.7]) {
      const p = cyl(0.05, 0.08, 0.9, goldMat, 10);
      at(p, sx * 1.05, 0.45, z);
      const top = sphere(0.09, goldMat, undefined, 10);
      at(top, sx * 1.05, 0.92, z);
      g.add(p, top);
      pts.push(new THREE.Vector3(sx * 1.05, 0.85, z));
    }
    const rope = new THREE.QuadraticBezierCurve3(pts[0], new THREE.Vector3(sx * 1.05, 0.55, 2.8), pts[1]);
    const r = mesh(new THREE.TubeGeometry(rope, 16, 0.04, 6), mat('#9e1b32', { rough: 0.6 }));
    g.add(r);
  }

  // Giant popcorn
  const stripes = canvasTexture(256, 64, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#e5484d';
      ctx.fillRect((i * w) / 8, 0, w / 8, h);
    }
  });
  const bucket = mesh(new THREE.CylinderGeometry(0.6, 0.45, 1.1, 24, 1, true), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6, side: THREE.DoubleSide }));
  at(bucket, -3.4, 0.55, 1.7);
  g.add(bucket);
  const r = rng(5);
  const kernelGeo = new THREE.IcosahedronGeometry(0.14, 0);
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * 0.5;
    const k = mesh(kernelGeo, mat(r() < 0.7 ? '#fff3cf' : '#ffd977', { rough: 0.8, flat: true }));
    at(k, -3.4 + Math.cos(a) * rad, 1.1 + r() * 0.25 + (0.5 - rad) * 0.4, 1.7 + Math.sin(a) * rad);
    k.rotation.set(r() * 3, r() * 3, r() * 3);
    g.add(k);
  }
  for (let i = 0; i < 5; i++) {
    const k = mesh(kernelGeo, mat('#fff3cf', { rough: 0.8, flat: true }));
    at(k, -3.4 + (r() - 0.5) * 1.8, 0.08, 2.3 + r() * 0.8);
    g.add(k);
  }

  // Two seats and a little table with drinks
  for (const sx of [2.75, 3.85]) {
    const seat = rbox(0.8, 0.22, 0.75, '#b8323e', 0.08);
    at(seat, sx, 0.5, 2.1);
    const back = rbox(0.8, 0.9, 0.18, '#b8323e', 0.08);
    at(back, sx, 0.9, 1.75);
    const leg = cyl(0.06, 0.08, 0.4, '#3b1d22', 8);
    at(leg, sx, 0.2, 2.1);
    g.add(seat, back, leg);
  }
  const table = cyl(0.3, 0.3, 0.05, '#ffffff', 20);
  at(table, 3.3, 0.72, 2.85);
  const tleg = cyl(0.04, 0.04, 0.7, '#3b1d22', 8);
  at(tleg, 3.3, 0.36, 2.85);
  g.add(table, tleg);
  for (const [dx, col] of [[-0.12, '#ff8fa8'], [0.12, '#6fd3ff']]) {
    const cup = cyl(0.075, 0.06, 0.22, col, 12);
    at(cup, 3.3 + dx, 0.86, 2.85);
    const straw = cyl(0.012, 0.012, 0.25, '#ffffff', 6);
    at(straw, 3.3 + dx + 0.02, 1.02, 2.85);
    straw.rotation.z = -0.25;
    g.add(cup, straw);
  }

  st.addCollider({ type: 'box', x: 0, z: -0.4, hw: 2.65, hd: 1.65 });
  st.addCollider({ type: 'circle', x: -3.4, z: 1.7, r: 0.7 });
  st.addCollider({ type: 'box', x: 3.3, z: 2.3, hw: 1.0, hd: 0.8 });
  for (const sx of [-1, 1]) for (const z of [1.9, 3.7]) st.addCollider({ type: 'circle', x: sx * 1.05, z, r: 0.12 });
  for (const sx of [-1, 1]) st.addCollider({ type: 'box', x: sx * 1.05, z: 2.8, hw: 0.04, hd: 0.9 }); // the velvet ropes

  // Hearts floating up while Roji is near
  const heartGeo = new THREE.ExtrudeGeometry(heartShape(0.55), { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
  heartGeo.center();
  const hearts = [];
  for (let i = 0; i < 6; i++) {
    const m = mesh(heartGeo, umat(i % 2 ? '#ff6b8a' : '#e5484d', { emissive: '#ff3355', ei: 0.3, transparent: true }), { cast: false });
    g.add(m);
    hearts.push({ m, ph: i / 6, x: (i - 2.5) * 0.7 });
  }
  return {
    badgeY: 5.6,
    dynamic: [...bulbs, ...hearts.map((h) => h.m)],
    update(dt, t, near) {
      const step = Math.floor(t * 9);
      bulbs.forEach((b, i) => {
        b.material = near > 0.5 ? ((i + step) % 3 === 0 ? bulbOff : bulbOn) : i % 2 ? bulbOn : bulbOff;
      });
      for (const h of hearts) {
        const k = (t * 0.28 + h.ph) % 1;
        h.m.visible = near > 0.05;
        h.m.position.set(h.x + Math.sin(t * 2 + h.ph * 9) * 0.25, 4.3 + k * 2.6, 0.8);
        h.m.rotation.y = Math.sin(t * 1.5 + h.ph * 6) * 0.6;
        h.m.material.opacity = near * Math.min(1, k * 4) * (1 - k);
        h.m.scale.setScalar(0.6 + k * 0.5);
      }
    },
  };
}

function starShape(R, r) {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const rad = k % 2 ? r : R;
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    if (k === 0) s.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else s.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  s.closePath();
  return s;
}

// ------------------------------------------------------------------ week 2: horse riding
function buildPony() {
  const root = new THREE.Group();
  const coat = mat('#b06a32', { rough: 0.7 });
  const dark = mat('#4a2a17', { rough: 0.6 });
  const light = mat('#f3dfc8', { rough: 0.7 });
  const body = mesh(new THREE.CapsuleGeometry(0.36, 0.75, 6, 14), coat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.95;
  root.add(body);
  const legs = [];
  for (const [x, z] of [[0.19, 0.42], [-0.19, 0.42], [0.19, -0.42], [-0.19, -0.42]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.85, z);
    const leg = mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.7, 10), coat);
    leg.position.y = -0.38;
    const hoof = mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10), dark);
    hoof.position.y = -0.76;
    pivot.add(leg, hoof);
    root.add(pivot);
    legs.push(pivot);
  }
  const neck = mesh(new THREE.CapsuleGeometry(0.19, 0.45, 4, 12), coat);
  neck.position.set(0, 1.35, 0.55);
  neck.rotation.x = 0.55;
  root.add(neck);
  const head = new THREE.Group();
  head.position.set(0, 1.68, 0.78);
  const skull = mesh(new THREE.SphereGeometry(0.22, 16, 12), coat);
  skull.scale.set(0.85, 0.85, 1.35);
  const muzzle = mesh(new THREE.SphereGeometry(0.16, 14, 10), light);
  muzzle.position.set(0, -0.08, 0.26);
  muzzle.scale.set(1, 0.85, 1);
  const blaze = mesh(new THREE.SphereGeometry(0.06, 10, 8), light);
  blaze.scale.set(0.8, 2.2, 0.5);
  blaze.position.set(0, 0.06, 0.25);
  blaze.rotation.x = 0.6;
  head.add(skull, muzzle, blaze);
  for (const s of [1, -1]) {
    const ear = mesh(new THREE.ConeGeometry(0.06, 0.18, 8), coat);
    ear.position.set(0.1 * s, 0.22, -0.05);
    ear.rotation.z = -0.2 * s;
    const eye = mesh(new THREE.SphereGeometry(0.035, 8, 6), dark);
    eye.position.set(0.16 * s, 0.05, 0.08);
    head.add(ear, eye);
  }
  head.rotation.x = 0.55;
  root.add(head);
  for (let i = 0; i < 5; i++) {
    const tuft = mesh(new THREE.SphereGeometry(0.09, 10, 8), dark);
    tuft.position.set(0, 1.3 + i * 0.1, 0.38 + i * 0.07);
    tuft.scale.set(0.6, 1, 1.3);
    root.add(tuft);
  }
  const forelock = mesh(new THREE.SphereGeometry(0.08, 10, 8), dark);
  forelock.position.set(0, 1.9, 0.72);
  root.add(forelock);
  const tail = new THREE.Group();
  tail.position.set(0, 1.12, -0.72);
  const tailMesh = mesh(new THREE.CapsuleGeometry(0.09, 0.45, 4, 10), dark);
  tailMesh.position.set(0, -0.25, -0.12);
  tailMesh.rotation.x = -0.45;
  tail.add(tailMesh);
  root.add(tail);
  const blanket = box(0.78, 0.04, 0.62, '#fff3df');
  blanket.position.set(0, 1.3, 0.02);
  const saddle = rbox(0.5, 0.14, 0.5, '#c0392b', 0.06);
  saddle.position.set(0, 1.37, 0.02);
  const horn = sphere(0.06, '#7a2e22');
  horn.position.set(0, 1.47, 0.22);
  root.add(blanket, saddle, horn);
  return { root, legs, head, tail };
}

// The same saddled pony as the riding stop, for 3D minigames.
// Returns { root, legs, head, tail, animate(dt, speed) }. Faces +Z; the saddle top is at y = 1.1.
export function makePony(coat = null) {
  const p = buildPony();
  if (coat) p.root.traverse((o) => o.isMesh && o.material.color?.getHexString() === 'b06a32' && (o.material = mat(coat, { rough: 0.7 })));
  let phase = 0;
  p.animate = (dt, speed) => {
    phase += dt * (3 + speed * 1.6);
    const amp = Math.min(0.85, 0.1 + speed * 0.09);
    const s = Math.sin(phase);
    p.legs[0].rotation.x = s * amp;
    p.legs[3].rotation.x = s * amp;
    p.legs[1].rotation.x = -s * amp;
    p.legs[2].rotation.x = -s * amp;
    p.head.rotation.x = 0.55 + Math.sin(phase * 2) * 0.06 * Math.min(1, speed / 4);
    p.tail.rotation.x = 0.3 + Math.sin(phase * 1.3) * 0.2;
  };
  return p;
}

export function buildHorse(st) {
  const g = st.group;
  const R = 3.3;
  const arena = new THREE.Mesh(new THREE.CircleGeometry(R - 0.05, 40), mat('#ead2a0', { rough: 1 }));
  arena.rotation.x = -Math.PI / 2;
  arena.position.y = 0.025;
  arena.receiveShadow = true;
  g.add(arena);
  const wood = mat('#a8764a', { rough: 0.85 });
  const gap = 0.75;
  const posts = 16;
  for (let i = 0; i < posts; i++) {
    const a = Math.PI / 2 + gap / 2 + (i / (posts - 1)) * (Math.PI * 2 - gap);
    const p = box(0.14, 1.05, 0.14, wood);
    at(p, Math.cos(a) * R, 0.52, Math.sin(a) * R);
    p.rotation.y = -a;
    g.add(p);
  }
  for (const y of [0.45, 0.85]) {
    const rail = mesh(new THREE.TorusGeometry(R, 0.045, 6, 64, Math.PI * 2 - gap), wood);
    rail.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(rail);
    // Gap centred on +Z (the front, facing the path)
    holder.rotation.y = -Math.PI / 2 - gap / 2;
    holder.position.y = y;
    g.add(holder);
  }
  const pony = buildPony();
  g.add(pony.root);

  // Hay bales
  const hay = mat('#e9c560', { rough: 1 });
  for (const [x, z, ry] of [[-4.1, 1.4, 0.3], [-4.3, 0.2, -0.1], [4.2, 1.6, -0.4]]) {
    const b = rbox(1.0, 0.6, 0.62, hay, 0.08);
    at(b, x, 0.3, z);
    b.rotation.y = ry;
    const band = box(0.04, 0.62, 0.64, '#c99a3a');
    at(band, x, 0.3, z);
    band.rotation.y = ry;
    g.add(b, band);
    st.addCollider({ type: 'circle', x, z, r: 0.55 });
  }
  const top = rbox(0.9, 0.5, 0.55, hay, 0.08);
  at(top, -4.2, 0.85, 0.8);
  g.add(top);
  // Little stable
  const shed = box(1.7, 1.4, 1.5, '#c95a4a');
  at(shed, 4.4, 0.7, -1.4);
  const shedRoof = box(2.0, 0.16, 1.8, '#f6ead7');
  at(shedRoof, 4.4, 1.48, -1.4);
  shedRoof.rotation.z = 0.12;
  const shedDoor = box(0.7, 0.9, 0.05, '#f6ead7');
  at(shedDoor, 4.4, 0.45, -0.63);
  const x1 = box(0.06, 0.9, 0.06, '#c95a4a');
  at(x1, 4.4, 0.45, -0.6);
  x1.rotation.z = 0.65;
  const x2 = x1.clone();
  x2.rotation.z = -0.65;
  g.add(shed, shedRoof, shedDoor, x1, x2);
  const shoe = mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20, Math.PI * 1.4), mat(GOLD, { metal: 0.6, rough: 0.35 }));
  at(shoe, 4.4, 1.15, -0.62);
  shoe.rotation.z = -Math.PI * 0.2 + Math.PI;
  g.add(shoe);
  // Fence colliders all round except the gate at the front, so the pony can be ridden out
  const fenceN = 44;
  for (let i = 0; i < fenceN; i++) {
    const a = Math.PI / 2 + gap / 2 + 0.12 + (i / (fenceN - 1)) * (Math.PI * 2 - gap - 0.24);
    st.addCollider({ type: 'circle', x: Math.cos(a) * R, z: Math.sin(a) * R, r: 0.2 });
  }
  st.addCollider({ type: 'box', x: 4.4, z: -1.4, hw: 0.9, hd: 0.8 });
  for (const s of [-1, 1]) st.addCollider({ type: 'circle', x: Math.cos(Math.PI / 2 + s * gap / 2) * R, z: Math.sin(Math.PI / 2 + s * gap / 2) * R, r: 0.12 });
  // The pony on its walk round the ring is solid too (it nudges kids aside); parked far away while ridden
  const ponyCol = { type: 'circle', x: st.origin.x, z: st.origin.z, r: 0.55 };
  st.world.addCollider(ponyCol);

  let angle = 0;
  const ringR = 1.95;
  // Riding: main.js moves pony.root (in this group's space) and sets ctl.speed
  const ctl = { pony, ridden: false, speed: 0, phase: 0 };
  st.pony = ctl;
  ctl.home = () => {
    pony.root.position.set(Math.cos(angle) * ringR, 0, Math.sin(angle) * ringR);
  };
  ctl.legs = (dt, speed) => {
    ctl.phase += dt * (3 + speed * 1.6);
    const amp = Math.min(0.75, 0.1 + speed * 0.09);
    const s = Math.sin(ctl.phase);
    pony.legs[0].rotation.x = s * amp;
    pony.legs[3].rotation.x = s * amp;
    pony.legs[1].rotation.x = -s * amp;
    pony.legs[2].rotation.x = -s * amp;
    pony.head.rotation.x = 0.55 + Math.sin(ctl.phase * 2) * 0.05 * Math.min(1, speed / 4);
    pony.tail.rotation.x = 0.3 * Math.min(1, speed / 6) + Math.sin(ctl.phase) * 0.1;
  };
  return {
    badgeY: 4.2,
    dynamic: [pony.root],
    update(dt, t, near) {
      if (ctl.ridden) {
        ponyCol.x = 1e5;
        return;
      }
      const speed = 0.32 + near * 0.55;
      angle += dt * speed;
      const x = Math.cos(angle) * ringR;
      const z = Math.sin(angle) * ringR;
      pony.root.position.set(x, 0, z);
      pony.root.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle));
      ponyCol.x = st.origin.x + x;
      ponyCol.z = st.origin.z + z;
      const ph = t * (4 + near * 5);
      const amp = 0.35 + near * 0.25;
      pony.legs[0].rotation.x = Math.sin(ph) * amp;
      pony.legs[3].rotation.x = Math.sin(ph) * amp;
      pony.legs[1].rotation.x = -Math.sin(ph) * amp;
      pony.legs[2].rotation.x = -Math.sin(ph) * amp;
      pony.root.position.y = Math.abs(Math.sin(ph)) * 0.05 * (0.5 + near);
      pony.head.rotation.x = 0.55 + Math.sin(ph * 2) * 0.06;
      pony.tail.rotation.x = Math.sin(t * 3) * 0.15;
      pony.tail.rotation.z = Math.sin(t * 2.3) * 0.25;
    },
  };
}

// ------------------------------------------------------------------ week 3: fencing
function buildFencer(accent) {
  const root = new THREE.Group();
  const suit = mat('#f7f8fb', { rough: 0.55 });
  const legs = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.1 * s, 0.55, 0);
    const leg = mesh(new THREE.CapsuleGeometry(0.075, 0.32, 4, 10), suit);
    leg.position.y = -0.24;
    const shoe = mesh(new THREE.SphereGeometry(0.08, 10, 8), mat('#2c2f3a'));
    shoe.scale.set(1, 0.6, 1.5);
    shoe.position.set(0, -0.5, 0.04);
    pivot.add(leg, shoe);
    root.add(pivot);
    legs.push(pivot);
  }
  const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.38, 6, 12), suit);
  torso.position.y = 0.88;
  root.add(torso);
  const belt = mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 20), mat(accent));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.72;
  root.add(belt);
  const head = new THREE.Group();
  head.position.y = 1.32;
  const mask = mesh(new THREE.SphereGeometry(0.2, 16, 12), mat('#eef1f6'));
  const mesh_ = mesh(new THREE.SphereGeometry(0.205, 16, 12, Math.PI / 2 - 0.95, 1.9, 0.5, 1.6), mat('#2a2f3a', { rough: 0.4 }));
  const bib = mesh(new THREE.SphereGeometry(0.12, 12, 8), suit);
  bib.position.set(0, -0.17, 0.05);
  bib.scale.set(1.2, 0.6, 1);
  head.add(mask, mesh_, bib);
  root.add(head);
  // Sword arm points forward (+Z); the back arm curls up behind.
  const armF = new THREE.Group();
  armF.position.set(-0.22, 1.06, 0);
  const upper = mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), suit);
  upper.position.y = -0.2;
  const glove = mesh(new THREE.SphereGeometry(0.07, 10, 8), mat('#ffffff'));
  glove.position.y = -0.4;
  const guard = mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d8dde6', { metal: 0.8, rough: 0.25 }));
  guard.position.y = -0.46;
  guard.rotation.x = Math.PI;
  const blade = mesh(new THREE.CylinderGeometry(0.008, 0.014, 1.05, 6), mat('#e8ecf2', { metal: 0.9, rough: 0.2 }));
  blade.position.y = -0.98;
  const tip = mesh(new THREE.SphereGeometry(0.02, 6, 4), mat(accent));
  tip.position.y = -1.5;
  armF.add(upper, glove, guard, blade, tip);
  root.add(armF);
  const armB = new THREE.Group();
  armB.position.set(0.22, 1.06, 0);
  const bArm = mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), suit);
  bArm.position.y = -0.2;
  armB.add(bArm);
  armB.rotation.set(0.3, 0, 2.3);
  root.add(armB);
  return { root, legs, armF, armB, torso, head };
}

export function buildFencing(st) {
  const g = st.group;
  const pisteTex = canvasTexture(1024, 210, (ctx, w, h) => {
    ctx.fillStyle = '#d6dff0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b8c6e2';
    ctx.fillRect(0, 0, w * 0.12, h);
    ctx.fillRect(w * 0.88, 0, w * 0.12, h);
    ctx.fillStyle = '#ffffff';
    for (const x of [0.5, 0.3, 0.7]) ctx.fillRect(w * x - 4, 10, 8, h - 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  });
  const pisteMats = Array(6).fill(mat('#b8c6e2'));
  pisteMats[2] = new THREE.MeshStandardMaterial({ map: pisteTex, roughness: 0.8 });
  const piste = mesh(new THREE.BoxGeometry(6.4, 0.06, 1.3), pisteMats, { cast: false });
  at(piste, 0, 0.03, 0.2);
  g.add(piste);

  const blue = buildFencer('#3f7bf0');
  const red = buildFencer('#e5484d');
  blue.root.position.set(-1.15, 0.06, 0.2);
  blue.root.rotation.y = Math.PI / 2;
  red.root.position.set(1.15, 0.06, 0.2);
  red.root.rotation.y = -Math.PI / 2;
  g.add(blue.root, red.root);
  st.addCollider({ type: 'box', x: 0, z: 0.2, hw: 1.8, hd: 0.45 });

  // Scoreboard
  const boardPostMat = mat('#3a3f4d', { metal: 0.4, rough: 0.5 });
  for (const sx of [-0.8, 0.8]) {
    const p = cyl(0.05, 0.05, 2.0, boardPostMat, 8);
    at(p, sx, 1.0, -1.9);
    g.add(p);
  }
  const scoreCanvas = document.createElement('canvas');
  scoreCanvas.width = 512;
  scoreCanvas.height = 200;
  const scoreTex = new THREE.CanvasTexture(scoreCanvas);
  scoreTex.colorSpace = THREE.SRGBColorSpace;
  const score = [0, 0];
  const drawScore = () => {
    const ctx = scoreCanvas.getContext('2d');
    ctx.fillStyle = '#1f2330';
    ctx.fillRect(0, 0, 512, 200);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 120px ${FONT}`;
    ctx.fillStyle = '#7fb0ff';
    ctx.fillText(String(score[0]), 130, 106);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(':', 256, 100);
    ctx.fillStyle = '#ff8a8f';
    ctx.fillText(String(score[1]), 382, 106);
    scoreTex.needsUpdate = true;
  };
  drawScore();
  const boardMats = Array(6).fill(mat('#2a2f3d'));
  boardMats[4] = new THREE.MeshStandardMaterial({ map: scoreTex, emissive: '#ffffff', emissiveMap: scoreTex, emissiveIntensity: 0.5 });
  const board = mesh(new THREE.BoxGeometry(2.0, 0.8, 0.16), boardMats);
  at(board, 0, 2.1, -1.9);
  g.add(board);
  const lightL = mesh(new THREE.SphereGeometry(0.14, 12, 10), umat('#7fb0ff', { emissive: '#3f7bf0', ei: 0.2 }), { cast: false });
  const lightR = mesh(new THREE.SphereGeometry(0.14, 12, 10), umat('#ff8a8f', { emissive: '#e5484d', ei: 0.2 }), { cast: false });
  at(lightL, -1.2, 2.1, -1.85);
  at(lightR, 1.2, 2.1, -1.85);
  g.add(lightL, lightR);
  st.addCollider({ type: 'box', x: 0, z: -1.9, hw: 1.0, hd: 0.15 });

  // Bench with spare masks
  const bench = rbox(2.0, 0.12, 0.5, WOOD, 0.04);
  at(bench, -3.6, 0.45, -0.6);
  bench.rotation.y = 0.3;
  g.add(bench);
  for (const dx of [-0.6, 0.6]) {
    const leg = box(0.1, 0.45, 0.4, '#7a5234');
    at(leg, -3.6 + dx * Math.cos(0.3), 0.22, -0.6 - dx * Math.sin(0.3));
    leg.rotation.y = 0.3;
    g.add(leg);
  }
  const spare = sphere(0.2, '#eef1f6');
  at(spare, -3.9, 0.7, -0.5);
  const spareMesh = mesh(new THREE.SphereGeometry(0.205, 16, 12, Math.PI / 2 - 0.95, 1.9, 0.5, 1.6), mat('#2a2f3a'));
  at(spareMesh, -3.9, 0.7, -0.5);
  g.add(spare, spareMesh);
  // The bench sits at an angle: three round seats along it, low enough to hop onto
  for (const dx of [-0.7, 0, 0.7]) st.addCollider({ type: 'circle', x: -3.6 + dx * Math.cos(0.3), z: -0.6 - dx * Math.sin(0.3), r: 0.3, h: 0.51 });

  let lastHit = -1;
  const pose = (f, lunge, guardUp) => {
    f.legs[0].rotation.x = -0.35 - lunge * 0.75;
    f.legs[1].rotation.x = 0.35 + lunge * 0.35;
    f.armF.rotation.x = -1.2 - lunge * 0.4 - guardUp;
    f.torso.rotation.x = lunge * 0.25;
    f.root.position.y = 0.06 - lunge * 0.1;
  };
  return {
    badgeY: 4.0,
    dynamic: [blue.root, red.root, lightL, lightR],
    update(dt, t, near) {
      const cycle = 2.6;
      const k = (t % (cycle * 2)) / cycle;
      const who = k < 1 ? 0 : 1;
      const p = k % 1;
      const lunge = near > 0.3 ? (p < 0.25 ? easeOutCubic(p / 0.25) : p < 0.55 ? 1 : p < 0.8 ? 1 - (p - 0.55) / 0.25 : 0) : 0;
      const idle = Math.sin(t * 4) * 0.04;
      const att = who === 0 ? blue : red;
      const def = who === 0 ? red : blue;
      pose(att, lunge * near, 0);
      pose(def, 0, lunge * 0.4);
      att.root.position.x = (who === 0 ? -1.15 : 1.15) + (who === 0 ? 1 : -1) * lunge * 0.55 * near;
      def.root.position.x = who === 0 ? 1.15 : -1.15;
      blue.root.position.y += idle;
      red.root.position.y -= idle;
      const hitId = Math.floor(t / cycle);
      const hitting = near > 0.3 && p > 0.25 && p < 0.55;
      (who === 0 ? lightL : lightR).material.emissiveIntensity = hitting ? 2.5 : 0.2;
      (who === 0 ? lightR : lightL).material.emissiveIntensity = 0.2;
      if (hitting && hitId !== lastHit) {
        lastHit = hitId;
        score[who] = (score[who] + 1) % 16;
        drawScore();
      }
    },
  };
}

// ------------------------------------------------------------------ week 4: board games
function buildDie(size = 0.9) {
  const g = new THREE.Group();
  const cube = mesh(new RoundedBoxGeometry(size, size, size, 4, size * 0.16), mat('#fffdf7', { rough: 0.35 }));
  g.add(cube);
  const pipGeo = new THREE.SphereGeometry(size * 0.085, 12, 8);
  const pipMat = mat('#3d2b63', { rough: 0.4 });
  const faces = [
    [1, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)],
    [6, new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)],
    [2, new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)],
    [5, new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)],
    [3, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
    [4, new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
  ];
  const layouts = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
  };
  const d = size * 0.26;
  for (const [n, N, U, V] of faces) {
    for (const [u, v] of layouts[n]) {
      const p = mesh(pipGeo, pipMat, { cast: false });
      p.position.copy(N).multiplyScalar(size * 0.49).addScaledVector(U, u * d).addScaledVector(V, v * d);
      p.scale.set(N.x ? 0.35 : 1, N.y ? 0.35 : 1, N.z ? 0.35 : 1);
      g.add(p);
    }
  }
  return g;
}

export function buildBoardGames(st) {
  const g = st.group;
  const N = 8;
  const tile = 0.6;
  const boardTex = canvasTexture(512, 512, (ctx, w) => {
    const s = w / N;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#8b5cf6' : '#f8efe0';
        ctx.fillRect(i * s, j * s, s, s);
      }
    }
  });
  const bmats = Array(6).fill(mat('#b0814f'));
  bmats[2] = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6 });
  const board = mesh(new THREE.BoxGeometry(N * tile + 0.3, 0.08, N * tile + 0.3), bmats, { cast: false });
  at(board, 0, 0.04, 0);
  g.add(board);
  const T = (i) => (i - (N - 1) / 2) * tile;
  const cream = mat('#fff4e0', { rough: 0.45 });
  const purple = mat('#6d3fd6', { rough: 0.45 });
  const pawnProfile = [[0, 0], [0.34, 0], [0.34, 0.08], [0.26, 0.14], [0.16, 0.24], [0.12, 0.5], [0.22, 0.56], [0.1, 0.62], [0, 0.62]];
  const pieces = [];
  const placePawn = (i, j, m) => {
    const p = new THREE.Group();
    p.add(lathe(pawnProfile, m, 20));
    const head = sphere(0.17, m);
    head.position.y = 0.75;
    p.add(head);
    p.position.set(T(i), 0.08, T(j));
    g.add(p);
    pieces.push({ p, ph: pieces.length * 0.7 });
    st.addCollider({ type: 'circle', x: T(i), z: T(j), r: 0.3 });
  };
  placePawn(2, 5, cream);
  placePawn(5, 2, purple);
  placePawn(1, 2, purple);
  placePawn(6, 6, cream);
  const kingProfile = [[0, 0], [0.45, 0], [0.45, 0.1], [0.34, 0.18], [0.22, 0.3], [0.16, 0.95], [0.3, 1.02], [0.2, 1.1], [0.26, 1.35], [0, 1.4]];
  const king = new THREE.Group();
  king.add(lathe(kingProfile, purple, 24));
  const cross1 = box(0.08, 0.35, 0.08, purple);
  at(cross1, 0, 1.55, 0);
  const cross2 = box(0.25, 0.08, 0.08, purple);
  at(cross2, 0, 1.58, 0);
  king.add(cross1, cross2);
  king.position.set(T(3), 0.08, T(1));
  g.add(king);
  pieces.push({ p: king, ph: 2 });
  st.addCollider({ type: 'circle', x: T(3), z: T(1), r: 0.4 });
  const queen = new THREE.Group();
  queen.add(lathe(kingProfile.map(([x, y]) => [x * 0.95, y * 0.9]), cream, 24));
  const qball = sphere(0.12, cream);
  qball.position.y = 1.36;
  queen.add(qball);
  queen.position.set(T(4), 0.08, T(6));
  g.add(queen);
  pieces.push({ p: queen, ph: 3.2 });
  st.addCollider({ type: 'circle', x: T(4), z: T(6), r: 0.4 });

  // Dice
  const dice = [buildDie(0.9), buildDie(0.9)];
  const diceHome = [new THREE.Vector3(3.5, 0.45, 1.4), new THREE.Vector3(3.2, 0.45, 2.6)];
  dice.forEach((d, i) => {
    d.position.copy(diceHome[i]);
    d.rotation.y = i * 0.6;
    g.add(d);
    st.addCollider({ type: 'circle', x: diceHome[i].x, z: diceHome[i].z, r: 0.55 });
  });
  // Meeple
  const meeple = new THREE.Shape();
  meeple.moveTo(-0.5, 0);
  meeple.lineTo(-0.18, 0);
  meeple.lineTo(0, 0.32);
  meeple.lineTo(0.18, 0);
  meeple.lineTo(0.5, 0);
  meeple.quadraticCurveTo(0.42, 0.5, 0.22, 0.62);
  meeple.quadraticCurveTo(0.6, 0.7, 0.6, 0.8);
  meeple.quadraticCurveTo(0.55, 0.92, 0.2, 0.88);
  meeple.quadraticCurveTo(0.3, 1.15, 0, 1.2);
  meeple.quadraticCurveTo(-0.3, 1.15, -0.2, 0.88);
  meeple.quadraticCurveTo(-0.55, 0.92, -0.6, 0.8);
  meeple.quadraticCurveTo(-0.6, 0.7, -0.22, 0.62);
  meeple.quadraticCurveTo(-0.42, 0.5, -0.5, 0);
  const mGeo = new THREE.ExtrudeGeometry(meeple, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 });
  mGeo.translate(0, 0, -0.15);
  const mp = mesh(mGeo, mat('#ffcf3f', { rough: 0.5 }));
  mp.scale.setScalar(1.15);
  at(mp, -3.5, 0.05, 1.4);
  mp.rotation.y = 0.35;
  g.add(mp);
  st.addCollider({ type: 'circle', x: -3.5, z: 1.4, r: 0.6 });
  // Cards fanned on the grass
  ['#e5484d', '#3f7bf0', '#ffcf3f', '#3fbf7f'].forEach((c, i) => {
    const card = rbox(0.55, 0.03, 0.8, '#ffffff', 0.015);
    at(card, -3.4 + i * 0.12, 0.02 + i * 0.012, -1.2);
    card.rotation.y = -0.5 + i * 0.3;
    const dot = mesh(new THREE.CircleGeometry(0.14, 16), mat(c), { cast: false });
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.017;
    card.add(dot);
    g.add(card);
  });

  // Dice roll state
  const rolls = dice.map((d, i) => ({ d, t: 1 + i * 0.25, from: new THREE.Quaternion(), to: new THREE.Quaternion(), axis: new THREE.Vector3(1, 0, 0), home: diceHome[i] }));
  const tmpQ = new THREE.Quaternion();
  let timer = 0;
  const r = rng(21);
  return {
    badgeY: 3.8,
    dynamic: [...dice, ...pieces.map((p) => p.p)],
    update(dt, t, near) {
      timer -= dt;
      if (near > 0.5 && timer <= 0) {
        timer = 2.6;
        rolls.forEach((rl, i) => {
          rl.t = -i * 0.12;
          rl.from.copy(rl.d.quaternion);
          const q = new THREE.Euler(Math.floor(r() * 4) * (Math.PI / 2), Math.floor(r() * 4) * (Math.PI / 2), Math.floor(r() * 4) * (Math.PI / 2));
          rl.to.setFromEuler(q);
          rl.axis.set(r() - 0.5, r() * 0.5, r() - 0.5).normalize();
        });
      }
      for (const rl of rolls) {
        if (rl.t < 1) {
          rl.t += dt / 0.9;
          const k = Math.max(0, Math.min(1, rl.t));
          rl.d.position.y = rl.home.y + 4 * k * (1 - k) * 1.6;
          rl.d.quaternion.slerpQuaternions(rl.from, rl.to, easeOutCubic(k));
          tmpQ.setFromAxisAngle(rl.axis, (1 - easeOutCubic(k)) * 9);
          rl.d.quaternion.premultiply(tmpQ);
        }
      }
      for (const pc of pieces) {
        const hop = near > 0.5 ? Math.max(0, Math.sin(t * 3 + pc.ph)) * 0.25 : 0;
        pc.p.position.y = 0.08 + hop;
      }
    },
  };
}

// ------------------------------------------------------------------ week 5: clay at the cafe
const VASE = [[0, 0], [0.16, 0], [0.22, 0.06], [0.26, 0.18], [0.24, 0.3], [0.16, 0.4], [0.11, 0.46], [0.12, 0.52], [0.15, 0.55]];

export function buildClayCafe(st) {
  const g = st.group;
  const terra = '#d9734e';
  const walls = box(4.6, 2.8, 3, '#fdf0df');
  at(walls, 0.3, 1.4, -0.7);
  const base = box(4.8, 0.35, 3.2, terra);
  at(base, 0.3, 0.17, -0.7);
  const roof = box(5.0, 0.3, 3.4, terra);
  at(roof, 0.3, 2.95, -0.7);
  g.add(walls, base, roof);
  const signTex = canvasTexture(768, 180, (ctx, w, h) => {
    ctx.fillStyle = '#fff7ea';
    roundRect(ctx, 4, 4, w - 8, h - 8, 40);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = terra;
    ctx.stroke();
    ctx.fillStyle = '#8c3f22';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${h * 0.5}px ${FONT}`;
    ctx.fillText('Clay Café', w / 2, h * 0.54);
  });
  const sign = planeTex(3.2, 0.75, signTex, { emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 0.15 });
  at(sign, 0.3, 3.55, 1.0);
  const signBack = rbox(3.3, 0.82, 0.1, terra, 0.05);
  at(signBack, 0.3, 3.55, 0.93);
  g.add(signBack, sign);
  // Striped awning with scallops
  const stripes = canvasTexture(512, 64, (ctx, w, h) => {
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#fff5e6' : terra;
      ctx.fillRect((i * w) / 10, 0, w / 10, h);
    }
  });
  const awning = mesh(new THREE.PlaneGeometry(4.6, 1.2), new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.8 }));
  at(awning, 0.3, 2.32, 1.3);
  awning.rotation.x = -0.9;
  g.add(awning);
  for (let i = 0; i < 10; i++) {
    const sc = mesh(new THREE.CircleGeometry(0.23, 12, 0, Math.PI), mat(i % 2 ? '#fff5e6' : terra, { side: THREE.DoubleSide }));
    at(sc, 0.3 - 2.07 + i * 0.46, 1.93, 1.68);
    sc.rotation.z = Math.PI;
    g.add(sc);
  }
  // Window and door
  const glass = box(2.0, 1.2, 0.06, mat('#ffe9c2', { emissive: '#ffc977', ei: 0.6, rough: 0.2 }));
  at(glass, -0.6, 1.25, 0.82);
  const frame = box(2.2, 1.4, 0.05, '#ffffff');
  at(frame, -0.6, 1.25, 0.79);
  const mull = box(0.06, 1.2, 0.08, '#ffffff');
  at(mull, -0.6, 1.25, 0.86);
  const door = rbox(0.85, 1.7, 0.1, WOOD, 0.04);
  at(door, 1.65, 0.85, 0.82);
  const knob = sphere(0.05, GOLD, { metal: 0.6, rough: 0.3 });
  at(knob, 1.9, 0.85, 0.89);
  g.add(frame, glass, mull, door, knob);
  // Vases visible in the window
  ['#7fc8b5', '#f2a7c3', '#6f9bd8'].forEach((c, i) => {
    const v = lathe(VASE, mat(c, { rough: 0.35 }), 16);
    v.scale.setScalar(0.9);
    at(v, -1.3 + i * 0.7, 0.68, 0.7);
    g.add(v);
  });
  st.addCollider({ type: 'box', x: 0.3, z: -0.7, hw: 2.45, hd: 1.65 });

  // Table with the pottery wheel
  const table = (x, z) => {
    const top = cyl(0.65, 0.65, 0.07, '#fff8ee', 24);
    at(top, x, 0.78, z);
    const leg = cyl(0.06, 0.06, 0.75, '#5a3d2b', 8);
    at(leg, x, 0.38, z);
    const foot = cyl(0.3, 0.32, 0.04, '#5a3d2b', 16);
    at(foot, x, 0.02, z);
    g.add(top, leg, foot);
    st.addCollider({ type: 'circle', x, z, r: 0.7 });
    for (const a of [0.6, Math.PI - 0.6]) {
      const sx = x + Math.cos(a) * 1.0;
      const sz = z + Math.sin(a) * 0.4 + 0.5;
      const seat = cyl(0.26, 0.26, 0.08, terra, 16);
      at(seat, sx, 0.5, sz);
      const sl = cyl(0.04, 0.05, 0.48, '#5a3d2b', 8);
      at(sl, sx, 0.25, sz);
      g.add(seat, sl);
      st.addCollider({ type: 'circle', x: sx, z: sz, r: 0.24, h: 0.54 });
    }
  };
  table(-1.4, 2.4);
  table(2.6, 2.4);
  const wheelBase = cyl(0.3, 0.34, 0.14, '#8d96a3', 20, { metal: 0.3, rough: 0.4 });
  at(wheelBase, -1.55, 0.88, 2.35);
  const wheel = new THREE.Group();
  wheel.position.set(-1.55, 0.96, 2.35);
  const disk = cyl(0.24, 0.24, 0.04, '#c4cad3', 24, { metal: 0.4, rough: 0.3 });
  const mark = box(0.04, 0.045, 0.2, '#6b7480');
  at(mark, 0, 0, 0.1);
  wheel.add(disk, mark);
  const pot = lathe(VASE, umat('#c9784f', { rough: 0.5 }), 24);
  pot.position.y = 0.02;
  wheel.add(pot);
  g.add(wheelBase, wheel);
  // Clay lump and tools
  const lump = sphere(0.12, '#c9784f');
  at(lump, -1.05, 0.86, 2.6);
  lump.scale.set(1.2, 0.7, 1);
  g.add(lump);
  // Coffee cups with steam
  const cup = (x, z) => {
    const saucer = cyl(0.14, 0.12, 0.02, '#ffffff', 16);
    at(saucer, x, 0.83, z);
    const c = cyl(0.08, 0.065, 0.13, '#ffffff', 16);
    at(c, x, 0.9, z);
    const coffee = mesh(new THREE.CircleGeometry(0.07, 16), mat('#6b3b22'), { cast: false });
    coffee.rotation.x = -Math.PI / 2;
    at(coffee, x, 0.962, z);
    const handle = mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), mat('#ffffff'));
    at(handle, x + 0.09, 0.9, z);
    g.add(saucer, c, coffee, handle);
    return new THREE.Vector3(x, 1.0, z);
  };
  const steamFrom = [cup(-1.0, 2.15), cup(2.35, 2.25), cup(2.85, 2.55)];
  const croissant = mesh(new THREE.TorusGeometry(0.12, 0.06, 8, 14, Math.PI * 1.2), mat('#e0a24e', { rough: 0.6 }));
  croissant.rotation.x = -Math.PI / 2;
  at(croissant, 2.6, 0.86, 2.0);
  g.add(croissant);
  const steam = [];
  steamFrom.forEach((p, i) => {
    for (let k = 0; k < 3; k++) {
      const s = glowSprite('rgba(255,255,255,0.9)');
      g.add(s);
      steam.push({ s, p, ph: k / 3 + i * 0.2 });
    }
  });
  // Shelf with finished pieces
  const shelfX = -3.3;
  for (const y of [0.05, 0.75, 1.45]) {
    const plank = box(0.6, 0.08, 1.8, WOOD);
    at(plank, shelfX, y + 0.04, -0.4);
    g.add(plank);
  }
  for (const z of [-1.25, 0.45]) {
    const side = box(0.6, 1.6, 0.08, WOOD);
    at(side, shelfX, 0.8, z);
    g.add(side);
  }
  ['#7fc8b5', '#f2a7c3', '#6f9bd8', '#fff2d8', '#e9b35c', '#c9784f'].forEach((c, i) => {
    const v = lathe(VASE, mat(c, { rough: 0.35 }), 16);
    v.scale.setScalar(0.75 + (i % 3) * 0.12);
    at(v, shelfX, (i < 3 ? 0.13 : 0.83), -0.95 + (i % 3) * 0.55);
    g.add(v);
  });
  st.addCollider({ type: 'box', x: shelfX, z: -0.4, hw: 0.35, hd: 0.95 });
  const plant = cyl(0.25, 0.2, 0.45, terra, 14);
  at(plant, 2.55, 0.22, 1.1);
  const leaves = sphere(0.38, '#5aa84f', { flat: true }, 8);
  at(leaves, 2.55, 0.75, 1.1);
  g.add(plant, leaves);
  st.addCollider({ type: 'circle', x: 2.55, z: 1.1, r: 0.32 });

  let shape = 0;
  return {
    badgeY: 5.0,
    dynamic: [wheel],
    update(dt, t, near) {
      wheel.rotation.y += dt * (1.5 + near * 9);
      shape += ((near > 0.5 ? 1 : 0.35) - shape) * Math.min(1, dt * 0.8);
      const wob = near > 0.5 ? Math.sin(t * 3) * 0.06 : 0;
      pot.scale.set(1.25 - shape * 0.35 + wob, 0.35 + shape * 0.65, 1.25 - shape * 0.35 + wob);
      for (const { s, p, ph } of steam) {
        const k = (t * 0.45 + ph) % 1;
        s.position.set(p.x + Math.sin(k * 6 + ph * 10) * 0.05, p.y + k * 0.7, p.z);
        s.scale.setScalar(0.12 + k * 0.25);
        s.material.opacity = 0.55 * Math.sin(k * Math.PI);
      }
    },
  };
}

// ------------------------------------------------------------------ week 6: drawing
function paintPicture(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#9fd8ff');
  sky.addColorStop(1, '#fff1d6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.22, h * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const [x, y, s] of [[0.2, 0.18, 1], [0.45, 0.12, 0.7]]) {
    ctx.beginPath();
    ctx.ellipse(w * x, h * y, 50 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(w * x + 30 * s, h * y - 12 * s, 34 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#8fd16b';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.6, h * 0.6);
  ctx.quadraticCurveTo(w * 0.85, h * 0.5, w, h * 0.58);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  ctx.fillStyle = '#6cbb55';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.quadraticCurveTo(w * 0.5, h * 0.62, w, h * 0.8);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  // Tree
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(w * 0.13, h * 0.45, w * 0.03, h * 0.2);
  ctx.fillStyle = '#4f9a45';
  ctx.beginPath();
  ctx.arc(w * 0.145, h * 0.42, h * 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Flowers
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = ['#ff8fb1', '#ffd75e', '#ffffff', '#c7a6ff'][i % 4];
    ctx.beginPath();
    ctx.arc(w * (0.08 + i * 0.1), h * (0.88 + (i % 2) * 0.05), 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Little girl with dark pigtails
  const cx = w * 0.52;
  const cy = h * 0.6;
  ctx.fillStyle = '#ef5b6f';
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy + 70);
  ctx.lineTo(cx + 30, cy + 70);
  ctx.lineTo(cx + 14, cy + 10);
  ctx.lineTo(cx - 14, cy + 10);
  ctx.fill();
  ctx.fillStyle = '#2a1a13';
  ctx.beginPath();
  ctx.arc(cx - 30, cy - 8, 12, 0, Math.PI * 2);
  ctx.arc(cx + 30, cy - 8, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - 12, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8dccb';
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 23, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.ellipse(cx, cy - 8, 23, 18, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#2a1a13';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 24, 24, 9, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 8, cy - 7, 4, 6);
  ctx.fillRect(cx + 5, cy - 7, 4, 6);
  ctx.strokeStyle = '#b23a48';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = '#f8dccb';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 22);
  ctx.lineTo(cx - 32, cy + 40);
  ctx.moveTo(cx + 14, cy + 22);
  ctx.lineTo(cx + 34, cy + 6);
  ctx.moveTo(cx - 10, cy + 70);
  ctx.lineTo(cx - 10, cy + 92);
  ctx.moveTo(cx + 10, cy + 70);
  ctx.lineTo(cx + 10, cy + 92);
  ctx.stroke();
  // Heart balloon
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 34, cy + 6);
  ctx.quadraticCurveTo(cx + 50, cy - 40, cx + 60, cy - 70);
  ctx.stroke();
  ctx.fillStyle = '#e5484d';
  ctx.save();
  ctx.translate(cx + 60, cy - 92);
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.bezierCurveTo(-30, 0, -22, -24, 0, -10);
  ctx.bezierCurveTo(22, -24, 30, 0, 0, 22);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#7a5a8a';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText('Roji', w - 70, h - 18);
}

export function buildDrawing(st) {
  const g = st.group;
  const wood = mat('#b27a4c', { rough: 0.8 });
  // Easel
  const easel = new THREE.Group();
  for (const [x, rz] of [[-0.55, -0.12], [0.55, 0.12]]) {
    const leg = box(0.08, 2.6, 0.08, wood);
    at(leg, x, 1.25, 0);
    leg.rotation.z = rz;
    easel.add(leg);
  }
  const backLeg = box(0.08, 2.5, 0.08, wood);
  at(backLeg, 0, 1.2, -0.45);
  backLeg.rotation.x = -0.35;
  const ledge = box(1.5, 0.08, 0.2, wood);
  at(ledge, 0, 0.92, 0.07);
  easel.add(backLeg, ledge);
  const W = 512;
  const H = 400;
  const full = document.createElement('canvas');
  full.width = W;
  full.height = H;
  paintPicture(full.getContext('2d'), W, H);
  const view = document.createElement('canvas');
  view.width = W;
  view.height = H;
  const vctx = view.getContext('2d');
  const viewTex = new THREE.CanvasTexture(view);
  viewTex.colorSpace = THREE.SRGBColorSpace;
  viewTex.anisotropy = 8;
  const sketch = () => {
    vctx.fillStyle = '#fffaf1';
    vctx.fillRect(0, 0, W, H);
    vctx.globalAlpha = 0.14;
    vctx.drawImage(full, 0, 0);
    vctx.globalAlpha = 1;
    viewTex.needsUpdate = true;
  };
  sketch();
  const cmats = Array(6).fill(mat('#f6efe2'));
  cmats[4] = new THREE.MeshStandardMaterial({ map: viewTex, roughness: 0.8 });
  const canvasBoard = mesh(new THREE.BoxGeometry(1.6, 1.25, 0.06), cmats);
  at(canvasBoard, 0, 1.6, 0.1);
  canvasBoard.rotation.x = -0.08;
  easel.add(canvasBoard);
  easel.position.set(0, 0, -0.3);
  g.add(easel);
  st.addCollider({ type: 'circle', x: 0, z: -0.4, r: 0.85 });
  const stool = cyl(0.28, 0.28, 0.08, '#ec5f9e', 16);
  at(stool, 0, 0.55, 1.0);
  const stoolLeg = cyl(0.05, 0.08, 0.52, wood, 8);
  at(stoolLeg, 0, 0.26, 1.0);
  g.add(stool, stoolLeg);
  st.addCollider({ type: 'circle', x: 0, z: 1.0, r: 0.3 });

  // Portrait of Roji on a small easel
  const portrait = canvasTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#ffe3ec';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.45;
    ctx.fillStyle = '#2a1a13';
    ctx.beginPath();
    ctx.arc(cx - 70, cy + 20, 26, 0, Math.PI * 2);
    ctx.arc(cx + 70, cy + 20, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8dccb';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 64, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a13';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 36, 70, 30, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 24, cy + 12, 8, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 24, cy + 12, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,140,160,0.6)';
    ctx.beginPath();
    ctx.arc(cx - 40, cy + 34, 10, 0, Math.PI * 2);
    ctx.arc(cx + 40, cy + 34, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b23a48';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy + 36, 10, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#ef5b6f';
    ctx.beginPath();
    ctx.moveTo(cx - 70, h);
    ctx.quadraticCurveTo(cx, cy + 70, cx + 70, h);
    ctx.fill();
    ctx.fillStyle = '#ff7fa3';
    ctx.beginPath();
    ctx.arc(cx - 52, cy - 52, 12, 0, Math.PI * 2);
    ctx.arc(cx - 30, cy - 58, 12, 0, Math.PI * 2);
    ctx.fill();
  });
  const small = new THREE.Group();
  for (const x of [-0.32, 0.32]) {
    const leg = box(0.06, 1.6, 0.06, wood);
    at(leg, x, 0.78, 0);
    leg.rotation.z = x * 0.25;
    small.add(leg);
  }
  const frame = box(0.9, 1.1, 0.06, GOLD, { metal: 0.3, rough: 0.4 });
  at(frame, 0, 1.25, 0.06);
  const pic = planeTex(0.78, 0.98, portrait);
  at(pic, 0, 1.25, 0.1);
  small.add(frame, pic);
  small.position.set(-2.6, 0, -0.6);
  small.rotation.y = 0.35;
  g.add(small);
  st.addCollider({ type: 'circle', x: -2.6, z: -0.6, r: 0.55 });

  // Giant pencil
  const pencil = new THREE.Group();
  const shaft = cyl(0.22, 0.22, 2.6, '#ffcf3f', 6);
  shaft.rotation.z = Math.PI / 2;
  const tipWood = mesh(new THREE.ConeGeometry(0.22, 0.5, 6), mat('#f3d2a2'));
  tipWood.rotation.z = -Math.PI / 2;
  tipWood.position.x = 1.55;
  const lead = mesh(new THREE.ConeGeometry(0.075, 0.17, 6), mat('#3a3a46'));
  lead.rotation.z = -Math.PI / 2;
  lead.position.x = 1.73;
  const band = cyl(0.23, 0.23, 0.22, '#c8ccd4', 12, { metal: 0.6, rough: 0.3 });
  band.rotation.z = Math.PI / 2;
  band.position.x = -1.4;
  const eraser = cyl(0.22, 0.22, 0.3, '#ff9ab5', 12);
  eraser.rotation.z = Math.PI / 2;
  eraser.position.x = -1.66;
  pencil.add(shaft, tipWood, lead, band, eraser);
  pencil.position.set(-2.4, 0.22, 1.7);
  pencil.rotation.y = 0.45;
  g.add(pencil);
  st.addCollider({ type: 'box', x: -2.4, z: 1.7, hw: 1.6, hd: 0.55 });

  // Palette, brushes and paint pots
  const pal = new THREE.Shape();
  pal.absellipse(0, 0, 0.75, 0.55, 0, Math.PI * 2);
  const hole = new THREE.Path();
  hole.absellipse(-0.42, -0.12, 0.1, 0.1, 0, Math.PI * 2);
  pal.holes.push(hole);
  const palette = mesh(new THREE.ExtrudeGeometry(pal, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }), mat('#e3b98a'));
  palette.rotation.x = -Math.PI / 2;
  at(palette, 2.5, 0.06, 1.4);
  g.add(palette);
  ['#e5484d', '#ffd166', '#3f7bf0', '#3fbf7f', '#ec5f9e', '#ffffff'].forEach((c, i) => {
    const a = -0.6 + i * 0.42;
    const blob = sphere(0.09, c, { rough: 0.3 }, 10);
    blob.scale.y = 0.45;
    at(blob, 2.5 + Math.cos(a) * 0.48, 0.15, 1.4 - Math.sin(a) * 0.32);
    g.add(blob);
  });
  const jar = cyl(0.2, 0.18, 0.42, mat('#cfeff5', { transparent: true, opacity: 0.6, rough: 0.1 }), 16);
  at(jar, 3.4, 0.21, 0.4);
  g.add(jar);
  ['#e5484d', '#3f7bf0', '#ffd166'].forEach((c, i) => {
    const handle = cyl(0.025, 0.025, 0.7, WOOD, 6);
    at(handle, 3.4 + (i - 1) * 0.06, 0.6, 0.4);
    handle.rotation.z = (i - 1) * 0.22;
    const tip = sphere(0.05, c, undefined, 8);
    tip.scale.y = 1.8;
    at(tip, 3.4 + (i - 1) * 0.06 - (i - 1) * 0.22 * 0.33, 0.97, 0.4);
    g.add(handle, tip);
  });
  st.addCollider({ type: 'circle', x: 3.4, z: 0.4, r: 0.3 });
  ['#e5484d', '#3f7bf0', '#3fbf7f', '#ffd166'].forEach((c, i) => {
    const pot = cyl(0.17, 0.17, 0.26, '#ffffff', 14);
    at(pot, 2.6 + (i % 2) * 0.45, 0.13, -1.0 - Math.floor(i / 2) * 0.45);
    const paint = mesh(new THREE.CircleGeometry(0.15, 14), mat(c), { cast: false });
    paint.rotation.x = -Math.PI / 2;
    at(paint, pot.position.x, 0.265, pot.position.z);
    g.add(pot, paint);
  });
  st.addCollider({ type: 'circle', x: 2.8, z: -1.2, r: 0.55 });
  // Paint splats
  const r = rng(13);
  for (let i = 0; i < 9; i++) {
    const c = ['#ec5f9e', '#ffd166', '#3f7bf0', '#3fbf7f', '#e5484d'][i % 5];
    const s = mesh(new THREE.CircleGeometry(0.15 + r() * 0.25, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, transparent: true, opacity: 0.85 }), { cast: false });
    s.rotation.x = -Math.PI / 2;
    at(s, (r() - 0.5) * 6, 0.03 + i * 0.001, (r() - 0.3) * 4);
    g.add(s);
  }

  // Painting reveal state
  let progress = 0;
  let hold = 0;
  const cols = 9;
  const rows = 7;
  const dabs = cols * rows * 3;
  return {
    badgeY: 4.2,
    update(dt, t, near) {
      if (near < 0.5) return;
      if (progress < dabs) {
        const n = Math.min(dabs, progress + dt * 70);
        for (let i = Math.floor(progress); i < Math.floor(n); i++) {
          const row = Math.floor(i / (cols * 3));
          const colF = (i % (cols * 3)) / 3;
          const col = row % 2 ? cols - colF : colF;
          const x = (col / cols) * W + Math.sin(i * 1.7) * 10;
          const y = ((row + 0.5) / rows) * H + Math.cos(i * 2.3) * 12;
          vctx.save();
          vctx.beginPath();
          vctx.ellipse(x, y, 46, 38, i * 0.7, 0, Math.PI * 2);
          vctx.clip();
          vctx.drawImage(full, 0, 0);
          vctx.restore();
        }
        progress = n;
        viewTex.needsUpdate = true;
        if (progress >= dabs) {
          vctx.drawImage(full, 0, 0);
          viewTex.needsUpdate = true;
          hold = 5;
        }
      } else {
        hold -= dt;
        if (hold <= 0) {
          progress = 0;
          sketch();
        }
      }
    },
  };
}

// ------------------------------------------------------------------ week 7: coming soon
export function buildNext(st, scene) {
  const g = st.group;
  const lilac = '#b9a6e8';
  const giftBox = new THREE.Group();
  const base = rbox(1.6, 1.3, 1.6, lilac, 0.1);
  base.position.y = 0.65;
  const lid = rbox(1.78, 0.32, 1.78, '#a08bd9', 0.08);
  lid.position.y = 1.42;
  const ribbon = mat('#ffd166', { rough: 0.4 });
  const r1 = box(0.28, 1.34, 1.64, ribbon);
  r1.position.y = 0.65;
  const r2 = box(1.64, 1.34, 0.28, ribbon);
  r2.position.y = 0.65;
  const r3 = box(0.3, 0.34, 1.82, ribbon);
  r3.position.y = 1.42;
  const r4 = box(1.82, 0.34, 0.3, ribbon);
  r4.position.y = 1.42;
  giftBox.add(base, lid, r1, r2, r3, r4);
  for (const s of [1, -1]) {
    const loop = mesh(new THREE.TorusGeometry(0.26, 0.08, 8, 18), ribbon);
    loop.position.set(0.24 * s, 1.75, 0);
    loop.rotation.set(0, Math.PI / 2, 0.6 * s);
    loop.scale.set(1, 0.75, 1);
    giftBox.add(loop);
  }
  const knot = sphere(0.12, '#ffc23d');
  knot.position.y = 1.66;
  giftBox.add(knot);
  // Padlock on the front
  const lockMat = mat(GOLD, { metal: 0.7, rough: 0.3 });
  const lockBody = rbox(0.55, 0.45, 0.18, lockMat, 0.06);
  lockBody.position.set(0, 0.55, 0.92);
  const shackle = mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 16, Math.PI), lockMat);
  shackle.position.set(0, 0.78, 0.92);
  const keyhole = sphere(0.05, '#5a4300');
  keyhole.position.set(0, 0.58, 1.02);
  keyhole.scale.z = 0.4;
  giftBox.add(lockBody, shackle, keyhole);
  g.add(giftBox);
  st.addCollider({ type: 'circle', x: 0, z: 0, r: 1.15 });

  // Floating question mark
  const qTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 210px ${FONT}`;
    ctx.shadowColor = 'rgba(120,90,200,0.6)';
    ctx.shadowBlur = 18;
    ctx.fillText('?', w / 2, h / 2 + 10);
  });
  const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex, transparent: true, depthWrite: false }));
  q.scale.setScalar(1.1);
  g.add(q);

  // Mist around the base
  const mistMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, roughness: 1, flatShading: true, depthWrite: false });
  const mistGeo = new THREE.IcosahedronGeometry(0.6, 1);
  const mist = [];
  const r = rng(31);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(mistGeo, mistMat);
    const a = (i / 9) * Math.PI * 2;
    m.position.set(Math.cos(a) * (1.7 + r() * 0.6), 0.2, Math.sin(a) * (1.4 + r() * 0.5));
    m.scale.set(1 + r(), 0.5 + r() * 0.3, 1 + r());
    g.add(m);
    mist.push({ m, ph: r() * 6, base: m.scale.clone() });
  }

  // Traffic cones on the unbuilt road and future plots
  const coneMat = mat('#ff8a3d', { rough: 0.6 });
  const stripe = mat('#ffffff');
  const cone = (x, z) => {
    const c = new THREE.Group();
    const body = mesh(new THREE.ConeGeometry(0.22, 0.6, 14), coneMat);
    body.position.y = 0.32;
    const band = mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 14), stripe);
    band.position.y = 0.34;
    const foot = box(0.5, 0.05, 0.5, coneMat);
    foot.position.y = 0.025;
    c.add(body, band, foot);
    c.position.set(x, 0, z);
    st.world.statics.add(c);
    st.world.addCollider({ type: 'circle', x, z, r: 0.28 });
  };
  for (const [fx, fz] of FUTURE) {
    const plot = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.75, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
    plot.rotation.x = -Math.PI / 2;
    plot.position.set(fx, 0.04, fz - 5.5);
    scene.add(plot);
    const stake = st.world.sign(['?'], { width: 0.9, height: 0.8, accent: '#8f8ab0', postHeight: 0.7 });
    stake.position.set(fx, 0, fz - 5.5);
    stake.scale.setScalar(0.85);
    st.world.statics.add(stake);
    st.world.addCollider({ type: 'box', x: fx, z: fz - 5.5, hw: 0.45, hd: 0.12 });
    cone(fx - 1.6, fz + 1.3);
    cone(fx + 1.5, fz - 1.4);
  }
  return {
    badgeY: 4.3,
    dynamic: [giftBox],
    update(dt, t, near) {
      const wig = near > 0.5 ? Math.sin(t * 9) * 0.06 * Math.max(0, Math.sin(t * 1.7)) : 0;
      giftBox.rotation.z = wig;
      giftBox.position.y = near > 0.5 ? Math.max(0, Math.sin(t * 3.4)) * 0.08 : 0;
      q.position.y = 2.6 + Math.sin(t * 2) * 0.15;
      q.material.rotation = Math.sin(t * 1.3) * 0.15;
      for (const { m, ph, base } of mist) {
        const s = 1 + Math.sin(t * 0.8 + ph) * 0.12;
        m.scale.set(base.x * s, base.y, base.z * s);
      }
    },
  };
}

export const BUILDERS = {
  home: buildHome,
  cinema: buildCinema,
  horse: buildHorse,
  fencing: buildFencing,
  boardgames: buildBoardGames,
  clay: buildClayCafe,
  drawing: buildDrawing,
  next: buildNext,
};
