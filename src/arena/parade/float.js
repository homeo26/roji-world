import * as THREE from 'three';
import { colorBake, glowTexture } from '../../places/school/kit.js';
import { skinify } from '../../places/zoo/rig.js';
import { heartShape, canvasTexture, FONT } from '../../util.js';

// The parade float: a white and pink float with a light-up dance floor at the front for Roji and
// Homama, a raised stage at the back where Mimi (a pink bunny in a lilac dress) and Bobo (a blue bear
// with a red bow tie) dance, a giant glowing heart ringed with bulbs, candy-striped poles with
// balloons, and a music gate at the front where the arrows come out. The bulbs light up with your
// combo. Everything is in the rig's coordinates: the float faces +Z, toward the camera.

export const DECK_Y = 0.55;
export const TIER_Y = 1.25;
export const FRONT_Z = -1.0;
export const KID_Z = -1.95;
export const MASCOT_Z = -3.95;
const TIER_Z = -3.1;
const BACK_Z = -6.0;
const HEART = { x: 0, y: 3.35, z: -5.35, size: 2.5 };

const PINK = '#ff9eb5';
const ROSE = '#ef5b6f';
const LILAC = '#c7a6ff';
const GOLD = '#f4c24f';
const CREAM = '#fff4e3';
const SKY = '#8fd3ff';
const MINT = '#7fd8bf';
const SUN = '#ffd166';

export const LANE_COLORS = ['#ff6f9a', '#5fb4ff', '#3fcf9f', '#ffb733'];

// ---------------------------------------------------------------- Mimi and Bobo
function mascot(k, kind) {
  const bunny = kind === 'bunny';
  const fur = bunny ? '#ffb3cc' : '#7fb8f0';
  const inner = bunny ? '#ffe3ec' : '#e3f1ff';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.17, 0.55, 0);
    leg.add(k.at(k.cyl(0.12, 0.13, 0.42, fur, 10), 0, -0.24, 0));
    const foot = k.sph(0.15, inner, undefined, 10);
    foot.scale.set(1, 0.55, 1.45);
    foot.position.set(0, -0.48, 0.06);
    leg.add(foot);
    body.add(leg);
    legs.push(leg);
  }
  const torso = k.sph(0.42, fur, undefined, 16);
  torso.scale.set(1, 1.08, 0.92);
  torso.position.y = 0.98;
  body.add(torso);
  const belly = k.sph(0.3, inner, undefined, 14);
  belly.scale.set(1, 1.1, 0.55);
  belly.position.set(0, 0.94, 0.25);
  body.add(belly);
  if (bunny) {
    body.add(k.at(k.cyl(0.36, 0.52, 0.42, LILAC, 18), 0, 0.78, 0));
    body.add(k.at(k.cyl(0.53, 0.53, 0.05, '#ffffff', 18), 0, 0.58, 0));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      body.add(k.at(k.sph(0.035, '#ffffff', undefined, 6), Math.sin(a) * 0.45, 0.72, Math.cos(a) * 0.45));
    }
    body.add(k.at(k.sph(0.13, '#ffffff', undefined, 10), 0, 0.82, -0.5));
  } else {
    for (const s of [-1, 1]) {
      const bow = k.cone(0.09, 0.16, ROSE, 8);
      bow.rotation.z = (s * Math.PI) / 2;
      bow.position.set(s * 0.09, 1.3, 0.34);
      body.add(bow);
    }
    body.add(k.at(k.sph(0.05, '#c73b45', undefined, 8), 0, 1.3, 0.37));
    body.add(k.at(k.sph(0.09, fur, undefined, 8), 0, 0.78, -0.42));
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.4, 1.2, 0);
    arm.add(k.at(k.cyl(0.095, 0.1, 0.42, fur, 8), 0, -0.2, 0));
    arm.add(k.at(k.sph(0.11, inner, undefined, 8), 0, -0.44, 0));
    arm.rotation.z = s * 0.25;
    body.add(arm);
    arms.push(arm);
  }
  const head = new THREE.Group();
  head.position.y = 1.5;
  body.add(head);
  head.add(k.sph(0.38, fur, undefined, 18));
  const muzzle = k.sph(0.17, inner, undefined, 12);
  muzzle.scale.set(1.2, 0.85, 0.8);
  muzzle.position.set(0, -0.1, 0.3);
  head.add(muzzle);
  head.add(k.at(k.sph(0.055, bunny ? ROSE : '#3b2b3f', undefined, 8), 0, -0.04, 0.44));
  for (const s of [-1, 1]) {
    head.add(k.at(k.sph(0.06, '#2a1f2e', undefined, 10), s * 0.14, 0.07, 0.32));
    head.add(k.at(k.sph(0.02, '#ffffff', undefined, 6), s * 0.14 + 0.02, 0.1, 0.375));
    head.add(k.at(k.sph(0.055, '#ff8fb1', undefined, 8), s * 0.24, -0.08, 0.27));
    if (bunny) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.15, 0.3, -0.02);
      ear.rotation.z = -s * 0.18;
      const outer = k.sph(0.1, fur, undefined, 10);
      outer.scale.set(1, 3.2, 0.6);
      outer.position.y = 0.3;
      ear.add(outer);
      const inn = k.sph(0.06, PINK, undefined, 8);
      inn.scale.set(1, 3.4, 0.4);
      inn.position.set(0, 0.3, 0.04);
      ear.add(inn);
      head.add(ear);
      if (s > 0) {
        for (const b of [-1, 1]) {
          const bow = k.cone(0.07, 0.13, LILAC, 8);
          bow.rotation.z = (b * Math.PI) / 2;
          bow.position.set(0.15 + b * 0.08, 0.38, 0.05);
          head.add(bow);
        }
      }
    } else {
      head.add(k.at(k.sph(0.13, fur, undefined, 10), s * 0.28, 0.28, -0.02));
      const ein = k.sph(0.08, inner, undefined, 8);
      ein.scale.z = 0.4;
      ein.position.set(s * 0.28, 0.28, 0.07);
      head.add(ein);
    }
  }
  if (!bunny) {
    head.add(k.at(k.cyl(0.14, 0.16, 0.05, '#3b2b3f', 12), 0.05, 0.37, 0));
    head.add(k.at(k.cyl(0.11, 0.11, 0.18, '#3b2b3f', 12), 0.05, 0.47, 0));
    head.add(k.at(k.cyl(0.115, 0.115, 0.04, ROSE, 12), 0.05, 0.42, 0));
  }
  return { root, body, legs, arms, head, kind };
}

// A mascot that dances to the beat. energy 0..1 grows with the combo; spin() and wave() for moments.
class Mascot {
  constructor(k, kind, x, side) {
    const m = mascot(k, kind);
    Object.assign(this, m);
    this.x = x;
    this.side = side;
    this.root.position.set(x, TIER_Y, MASCOT_Z);
    this.spinT = 0;
    this.waveT = 0;
    this.throwT = 0;
    this.wobT = 0;
    this.energy = 0.3;
  }

  skin() {
    this.root.updateMatrixWorld(true);
    for (const sk of skinify(this.root, { rough: 0.75 })) {
      sk.frustumCulled = false;
    }
  }

  update(dt, t, beat) {
    const e = this.energy;
    const ph = beat % 1;
    const b = Math.floor(beat);
    const hop = Math.pow(Math.abs(Math.sin(ph * Math.PI)), 1.5);
    const alt = b % 2 ? 1 : -1;
    const B = this.body;
    B.position.set(0, hop * (0.05 + 0.1 * e), 0);
    B.rotation.set(0, Math.sin(beat * Math.PI * 0.5) * (0.15 + 0.25 * e) * this.side, Math.sin(beat * Math.PI) * 0.05);
    this.legs[0].rotation.set(alt > 0 ? -0.3 * hop * e : 0, 0, 0);
    this.legs[1].rotation.set(alt < 0 ? -0.3 * hop * e : 0, 0, 0);
    // arms pump in turn on the beat (a and b: how far each arm lifts out to its own side)
    const up = 0.5 + 1.6 * e;
    let a = 0.3 + (alt > 0 ? up * hop : 0.15);
    let b2 = 0.3 + (alt < 0 ? up * hop : 0.15);
    let ax = 0;
    this.head.rotation.set(hop * 0.12, Math.sin(beat * Math.PI * 0.5) * 0.2, Math.sin(beat * Math.PI) * 0.12);
    if (this.waveT > 0) {
      this.waveT -= dt;
      const k = Math.min(1, this.waveT * 3);
      // wave to the crowd with the outer arm
      if (this.side > 0) a = 0.3 + k * (2.3 + Math.sin(t * 12) * 0.35);
      else b2 = 0.3 + k * (2.3 + Math.sin(t * 12) * 0.35);
    }
    if (this.throwT > 0) {
      this.throwT -= dt;
      const k = Math.sin(Math.min(1, 1 - this.throwT / 0.6) * Math.PI);
      a = b2 = 0.3 + 2.5 * k;
    }
    if (this.spinT > 0) {
      this.spinT -= dt;
      const p = 1 - Math.max(0, this.spinT) / 1.1;
      B.rotation.y = (1 - Math.pow(1 - p, 3)) * Math.PI * 2 * this.side;
      a = b2 = 1.5;
      B.position.y += Math.sin(p * Math.PI) * 0.2;
    }
    if (this.wobT > 0) {
      this.wobT -= dt;
      B.rotation.z = Math.sin(t * 22) * 0.12 * Math.min(1, this.wobT * 2);
      ax = -0.8 * Math.min(1, this.wobT * 2);
    }
    // arms[0] hangs on -X (lifting it out is a negative turn), arms[1] on +X
    this.arms[0].rotation.set(ax, 0, -a);
    this.arms[1].rotation.set(ax, 0, b2);
  }
}

// ---------------------------------------------------------------- the float
export function buildFloat(k) {
  const g = new THREE.Group();
  const add = (o, x, y, z) => (o.position.set(x, y, z), g.add(o), o);
  // base: a long white body with a pink band and scalloped frills
  add(k.rbox(3.95, 0.5, 5.05, '#ffffff', 0.14), 0, 0.3, (FRONT_Z + BACK_Z) / 2);
  add(k.box(4.02, 0.08, 5.12, PINK), 0, 0.5, (FRONT_Z + BACK_Z) / 2);
  add(k.box(3.92, 0.04, 2.1, '#ffe3ec'), 0, DECK_Y - 0.02, (FRONT_Z + TIER_Z) / 2);
  for (let i = 0; i < 17; i++) {
    const x = -1.92 + (i / 16) * 3.84;
    add(k.sph(0.13, i % 2 ? PINK : '#ffffff', undefined, 8), x, 0.12, FRONT_Z + 0.02);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 20; i++) add(k.sph(0.13, i % 2 ? PINK : '#ffffff', undefined, 8), s * 1.98, 0.12, FRONT_Z - 0.1 - (i / 19) * 4.8);
    // wheels peeking out under the frills
    for (const z of [-1.7, -5.2]) {
      const w = k.cyl(0.26, 0.26, 0.2, '#3f4a7a', 14);
      w.rotation.z = Math.PI / 2;
      add(w, s * 1.82, 0.22, z);
      const hub = k.cyl(0.1, 0.1, 0.22, GOLD, 10);
      hub.rotation.z = Math.PI / 2;
      add(hub, s * 1.83, 0.22, z);
    }
  }
  // the back stage for Mimi and Bobo, with a lilac face and gold trim
  add(k.rbox(3.7, TIER_Y - DECK_Y, 2.9, LILAC, 0.08), 0, (TIER_Y + DECK_Y) / 2, (TIER_Z + BACK_Z) / 2);
  add(k.box(3.78, 0.06, 2.96, GOLD), 0, TIER_Y - 0.01, (TIER_Z + BACK_Z) / 2);
  for (let i = 0; i < 7; i++) add(k.star(0.13, 0.06, 0.04, SUN), -1.5 + i * 0.5, (TIER_Y + DECK_Y) / 2, TIER_Z + 0.03);
  // little steps up to the stage at each side
  for (const s of [-1, 1]) add(k.rbox(0.5, 0.35, 0.5, '#ffd1dc', 0.05), s * 1.55, DECK_Y + 0.17, TIER_Z + 0.3);
  // candy-striped poles at the front corners and the back corners, with gold balls
  const poles = [
    [-1.85, FRONT_Z - 0.18, 1.7],
    [1.85, FRONT_Z - 0.18, 1.7],
    [-1.7, BACK_Z + 0.25, 2.6],
    [1.7, BACK_Z + 0.25, 2.6],
  ];
  const tops = [];
  for (const [x, z, h] of poles) {
    const n = Math.round(h / 0.2);
    for (let i = 0; i < n; i++) add(k.cyl(0.06, 0.06, 0.2, i % 2 ? '#ffffff' : ROSE, 10), x, DECK_Y + 0.1 + i * 0.2, z);
    add(k.sph(0.1, GOLD, undefined, 10), x, DECK_Y + h + 0.05, z);
    tops.push(new THREE.Vector3(x, DECK_Y + h + 0.05, z));
  }
  // the heart's stand behind the mascots
  add(k.cyl(0.12, 0.16, HEART.y - HEART.size * 0.35 - TIER_Y, CREAM, 10), 0, TIER_Y + (HEART.y - HEART.size * 0.35 - TIER_Y) / 2, HEART.z);
  // the music gate: four arches at the front, one per lane, where the arrows come out
  const gate = new THREE.Group();
  for (let l = 0; l < 4; l++) {
    const x = -1.5 + l;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: LANE_COLORS[l], emissive: LANE_COLORS[l], emissiveIntensity: 0.5, roughness: 0.5 }));
    arch.position.set(x, 0.06, FRONT_Z + 0.06);
    gate.add(arch);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.26, 18, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#4a3060' }));
    hole.position.set(x, 0.06, FRONT_Z + 0.04);
    gate.add(hole);
  }
  g.add(gate);

  // merge the plain parts into a few vertex-colour meshes
  colorBake(g, [gate]);

  // a tiny sticker by Bobo's feet: R + H in a heart (easy to miss)
  const sticker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.26),
    new THREE.MeshBasicMaterial({
      transparent: true,
      map: canvasTexture(64, 64, (x) => {
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.moveTo(32, 56);
        x.bezierCurveTo(-6, 30, 12, 0, 32, 18);
        x.bezierCurveTo(52, 0, 70, 30, 32, 56);
        x.fill();
        x.fillStyle = ROSE;
        x.font = `700 15px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('R+H', 32, 32);
      }),
    }),
  );
  sticker.position.set(1.62, TIER_Y - 0.2, TIER_Z + 0.035);
  sticker.rotation.z = -0.15;
  g.add(sticker);

  // the giant heart (it pulses on the beat and glows with the combo)
  const heartGeo = new THREE.ExtrudeGeometry(heartShape(HEART.size), { depth: 0.32, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 10 });
  heartGeo.computeBoundingBox();
  const hb = heartGeo.boundingBox;
  heartGeo.translate(-(hb.min.x + hb.max.x) / 2, -(hb.min.y + hb.max.y) / 2, -0.16);
  const heartMat = new THREE.MeshStandardMaterial({ color: '#ff5d7a', emissive: '#ff3d6e', emissiveIntensity: 0.25, roughness: 0.35 });
  const heart = new THREE.Mesh(heartGeo, heartMat);
  heart.position.set(HEART.x, HEART.y, HEART.z);
  heart.castShadow = true;
  g.add(heart);

  // bulbs: along the deck front, up the stage face, round the heart
  const pts = [];
  for (let i = 0; i < 15; i++) pts.push(new THREE.Vector3(-1.75 + i * 0.25, DECK_Y + 0.04, FRONT_Z + 0.02));
  for (let i = 0; i < 13; i++) pts.push(new THREE.Vector3(-1.75 + i * (3.5 / 12), TIER_Y + 0.05, TIER_Z + 0.05));
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) pts.push(new THREE.Vector3(s * 2.0, DECK_Y + 0.02, FRONT_Z - 0.35 - i * 0.8));
  const hs = heartShape(HEART.size);
  const hpts = hs.getSpacedPoints(26).slice(0, 26);
  const hbb = new THREE.Box2();
  for (const p of hpts) hbb.expandByPoint(p);
  const hc = hbb.getCenter(new THREE.Vector2());
  for (const p of hpts) pts.push(new THREE.Vector3(HEART.x + (p.x - hc.x) * 1.08, HEART.y + (p.y - hc.y) * 1.08, HEART.z + 0.28));
  const heartStart = pts.length - hpts.length;
  const bulbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.065, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), pts.length);
  const m4 = new THREE.Matrix4();
  pts.forEach((p, i) => bulbs.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  const c = new THREE.Color();
  for (let i = 0; i < pts.length; i++) bulbs.setColorAt(i, c.set('#fff3c4'));
  bulbs.instanceMatrix.needsUpdate = true;
  g.add(bulbs);
  // and a soft glow round each lit bulb (one Points mesh)
  const gpos = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => gpos.set([p.x, p.y, p.z + 0.02], i * 3));
  const gcol = new Float32Array(pts.length * 3);
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
  glowGeo.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  const glow = new THREE.Points(glowGeo, new THREE.PointsMaterial({ size: 0.55, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.frustumCulled = false;
  glow.renderOrder = 3;
  g.add(glow);

  // the light-up dance floor under Roji and Homama: 4 x 2 tiles
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.03, 0.95), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 8);
  for (let i = 0; i < 8; i++) {
    tiles.setMatrixAt(i, m4.makeTranslation(-1.47 + (i % 4) * 0.98, DECK_Y + 0.005, FRONT_Z - 0.55 - Math.floor(i / 4) * 1.0));
    tiles.setColorAt(i, c.set('#ffe3ec'));
  }
  tiles.receiveShadow = true;
  g.add(tiles);
  const tileGlow = new Float32Array(8);

  // balloon bunches on the poles
  const bal = [];
  const BAL = [PINK, SKY, SUN, LILAC, MINT, '#ffffff'];
  tops.forEach((p, ti) => {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + ti;
      bal.push({ base: new THREE.Vector3(p.x + Math.cos(a) * 0.22, p.y + 0.55 + (i % 2) * 0.18, p.z + Math.sin(a) * 0.22), ph: ti * 1.7 + i, c: BAL[(ti * 3 + i) % BAL.length] });
    }
  });
  const balloons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }), bal.length);
  bal.forEach((b, i) => balloons.setColorAt(i, c.set(b.c)));
  balloons.castShadow = true;
  g.add(balloons);
  const strings = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 3), new THREE.MeshBasicMaterial({ color: '#7a6470' }), bal.length);
  g.add(strings);

  // Mimi and Bobo on the stage
  const mimi = new Mascot(k, 'bunny', -1.05, 1);
  const bobo = new Mascot(k, 'bear', 1.05, -1);
  for (const m of [mimi, bobo]) {
    g.add(m.root);
    m.skin();
  }

  const lit = new THREE.Color();
  const dim = new THREE.Color();
  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3(1, 1, 1);
  const BULB_COLORS = ['#fff3c4', '#ffd1dc', '#ffe08a', '#d9c8ff'].map((x) => new THREE.Color(x));
  const TILE = LANE_COLORS.map((x) => new THREE.Color(x));
  const TILE_BASE = new THREE.Color('#ffe3ec');
  return {
    group: g,
    heart,
    mimi,
    bobo,
    heartPos: new THREE.Vector3(HEART.x, HEART.y, HEART.z + 0.3),
    // flash the dance floor under a lane
    flashTile(lane) {
      tileGlow[lane] = 1;
      tileGlow[4 + (3 - lane)] = Math.max(tileGlow[4 + (3 - lane)], 0.6);
    },
    // level 0..1 (combo), beat (song beats), night 0..1
    update(dt, t, beat, level, night, pulse) {
      const ph = beat % 1;
      const thump = Math.pow(1 - ph, 3);
      heart.scale.setScalar(1 + thump * (0.03 + 0.05 * level) + pulse * 0.08);
      heartMat.emissiveIntensity = 0.18 + level * 0.6 + thump * 0.3 * level + night * 0.35 + pulse * 0.8;
      // bulbs: how many are lit grows with the combo, and they chase round
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const isHeart = i >= heartStart;
        const share = isHeart ? (i - heartStart) / hpts.length : i / heartStart;
        const on = share < level * 1.05 || level >= 0.99;
        const chase = 0.5 + 0.5 * Math.sin(t * 7 - i * 0.9);
        const base = BULB_COLORS[i % BULB_COLORS.length];
        dim.copy(base).multiplyScalar(0.42 + night * 0.08);
        lit.copy(base).multiplyScalar(on ? 0.85 + 0.15 * chase + thump * 0.1 : 0);
        c.copy(dim).lerp(lit, on ? 1 : 0);
        if (!on) c.copy(dim);
        bulbs.setColorAt(i, c);
        const gk = on ? (0.35 + 0.5 * chase) * (0.45 + night * 0.9) : 0;
        gcol[i * 3] = base.r * gk;
        gcol[i * 3 + 1] = base.g * gk;
        gcol[i * 3 + 2] = base.b * gk;
      }
      bulbs.instanceColor.needsUpdate = true;
      glowGeo.attributes.color.needsUpdate = true;
      // dance floor tiles fade back after a flash, and twinkle softly with the beat when the combo is high
      for (let i = 0; i < 8; i++) {
        tileGlow[i] = Math.max(0, tileGlow[i] - dt * 3);
        const lane = i < 4 ? i : 3 - (i - 4);
        const beatGlow = level > 0.5 ? thump * 0.25 * (((Math.floor(beat) + i) % 2) ? 1 : 0) : 0;
        c.copy(TILE_BASE).lerp(TILE[lane], Math.min(1, tileGlow[i] + beatGlow));
        tiles.setColorAt(i, c);
      }
      tiles.instanceColor.needsUpdate = true;
      // balloons bob on their strings, and float away into the sky at the end of a song
      if (this.release) this.rise = (this.rise || 0) + dt;
      const rise = this.rise || 0;
      bal.forEach((b, i) => {
        tmp.copy(b.base);
        if (rise > 0) {
          const r = Math.max(0, rise - (i % 5) * 0.12);
          tmp.y += r * r * 0.9 + r * 0.8;
          tmp.x += Math.sin(r * 1.3 + b.ph) * r * 0.4;
        }
        tmp.x += Math.sin(t * 1.3 + b.ph) * 0.05;
        tmp.y += Math.sin(t * 1.7 + b.ph) * 0.04;
        balloons.setMatrixAt(i, m4.compose(tmp, q.identity(), sc.set(1, 1.12, 1)));
        const top = rise > 0 ? tmp.clone().add(new THREE.Vector3(0, -0.7, 0)) : tops[Math.floor(i / 4)];
        const mid = tmp.clone().add(top).multiplyScalar(0.5);
        const len = tmp.distanceTo(top);
        q.setFromUnitVectors(up, tmp.clone().sub(top).normalize());
        strings.setMatrixAt(i, m4.compose(mid, q, sc.set(1, len, 1)));
        sc.set(1, 1, 1);
        q.identity();
      });
      balloons.instanceMatrix.needsUpdate = true;
      strings.instanceMatrix.needsUpdate = true;
      for (const m of [mimi, bobo]) {
        m.energy = 0.25 + level * 0.75;
        m.update(dt, t, beat);
      }
    },
  };
}
