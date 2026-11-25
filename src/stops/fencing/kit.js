import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kit, makeAtlas, colorBake, boardDraw, fitText, heartPath, glowTexture, uvScale, bellTone } from '../../places/school/kit.js';
import { mat, umat, mesh, canvasTexture, roundRect, heartShape, FONT, clamp, damp, rng } from '../../util.js';
import { POSES, lerpPose, applyPose, whites } from '../../arena/riding/fencer.js';

// Shared pieces of the Roji & Homama Fencing Club: colours, the fencing kit (whites, mask, foil) that can be put on
// and taken off any kid, the fencing poses, and cheap club people.

export { THREE, kit, makeAtlas, colorBake, boardDraw, fitText, heartPath, glowTexture, uvScale, bellTone };
export { mat, umat, mesh, canvasTexture, roundRect, heartShape, FONT, clamp, damp, rng };
export { POSES, lerpPose, applyPose, whites };

export const COL = {
  navy: '#2c3e66',
  blue: '#3f7bf0',
  sky: '#8fc4ff',
  ice: '#e3eeff',
  white: '#ffffff',
  cream: '#fff4e3',
  stucco: '#fbecd7',
  stone: '#e6d3ba',
  gold: '#f4c24f',
  pink: '#ef5b6f',
  rose: '#ff9eb5',
  blush: '#ffd1dc',
  slate: '#5b6f99',
  slateDark: '#46587f',
  wood: '#c99567',
  woodDark: '#8d5f3c',
  ink: '#3b2b3f',
  steel: '#dfe4ec',
  leaf: '#6cc24a',
  leafDark: '#3f9a4f',
  piste: '#cfd9ea',
  red: '#e5484d',
  green: '#3fbf7f',
};
export const SIDE = { roji: '#ef5b6f', homama: '#3f7bf0' };
export const NAME = { roji: 'Roji', homama: 'Homama' };

// A tiny shuffled deck: draw() never repeats the last pick
export function deck(list, seed = Math.random() * 1e9) {
  const r = rng(seed | 0);
  let pile = [];
  let last = null;
  return () => {
    if (!pile.length) {
      pile = list.slice().sort(() => r() - 0.5);
      if (pile[0] === last && pile.length > 1) pile.push(pile.shift());
    }
    last = pile.shift();
    return last;
  };
}

export function tone(sound, f, dur, o = {}, delay = 0) {
  if (sound?.ctx) sound.tone(f, sound.ctx.currentTime + delay, dur, o);
}

// ------------------------------------------------------------------ the fencing kit
let gridTex = null;
function maskGrid() {
  if (gridTex) return gridTex;
  gridTex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 6, 0);
      ctx.lineTo((i * w) / 6, h);
      ctx.moveTo(0, (i * h) / 6);
      ctx.lineTo(w, (i * h) / 6);
      ctx.stroke();
    }
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.repeat.set(6, 3.5);
  return gridTex;
}
const gridMat = () => {
  const m = new THREE.MeshStandardMaterial({ color: '#4a4958', map: maskGrid(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.35 });
  return m;
};
let sharedGrid = null;

const geoCache = new Map();
const G = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};

// The mesh mask: a see-through front, a white bib under the chin, a strap and a small heart in the fencer's colour.
export function makeMask(color, { light = false } = {}) {
  const g = new THREE.Group();
  sharedGrid ||= gridMat();
  const front = new THREE.Mesh(
    G(light ? 'maskL' : 'mask', () => new THREE.SphereGeometry(0.37, light ? 14 : 20, light ? 9 : 12, Math.PI / 2 - 1.55, 3.1, Math.PI * 0.14, Math.PI * 0.6)),
    sharedGrid,
  );
  front.castShadow = !light;
  front.scale.set(1, 1.04, 1.05);
  const bib = mesh(G('bib', () => new THREE.CylinderGeometry(0.27, 0.32, 0.16, 14, 1, true, -1.3, 2.6)), mat('#fffaf4', { rough: 0.7, side: THREE.DoubleSide }), { cast: false });
  bib.position.set(0, -0.3, 0.02);
  bib.rotation.x = -0.15;
  const strap = mesh(G('strap', () => new THREE.TorusGeometry(0.34, 0.022, 5, 16, Math.PI * 0.55)), mat(color, { rough: 0.7, side: THREE.DoubleSide }), { cast: false });
  strap.rotation.set(0, Math.PI / 2, Math.PI * 0.42);
  const heart = mesh(G('mheart', () => new THREE.ShapeGeometry(heartShape(0.1), 4)), mat(color, { rough: 0.7, side: THREE.DoubleSide }), { cast: false });
  heart.position.set(0.3, 0.1, 0.12);
  heart.rotation.y = 1.1;
  g.add(front, bib, strap, heart);
  bakeParts(g, [front]);
  return g;
}

export function makeFoil(color = COL.gold) {
  const g = new THREE.Group();
  const steel = mat(COL.steel, { metal: 0.7, rough: 0.25 });
  const bell = mesh(G('bell', () => new THREE.SphereGeometry(0.06, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45)), steel, { cast: false });
  bell.rotation.x = Math.PI;
  bell.position.y = -0.03;
  const grip = mesh(G('grip', () => new THREE.CylinderGeometry(0.016, 0.018, 0.1, 6)), mat('#3b2b3f', { metal: 0.6, rough: 0.3 }), { cast: false });
  grip.position.y = 0.02;
  const pommel = mesh(G('pom', () => new THREE.SphereGeometry(0.022, 8, 6)), steel, { cast: false });
  pommel.position.y = 0.08;
  const blade = mesh(G('blade', () => new THREE.CylinderGeometry(0.0035, 0.0075, 0.86, 5)), steel, { cast: false });
  blade.position.y = -0.03 - 0.43;
  const tip = mesh(G('tip', () => new THREE.SphereGeometry(0.016, 8, 6)), mat(color, { rough: 0.4 }), { cast: false });
  tip.position.y = -0.9;
  g.add(bell, grip, pommel, blade, tip);
  bakeParts(g);
  return g;
}

const JACKET = [[0.222, 0.38], [0.232, 0.46], [0.255, 0.51], [0.24, 0.56], [0.214, 0.62], [0.192, 0.68], [0.178, 0.72], [0.14, 0.76], [0.095, 0.79]].map(([x, y]) => new THREE.Vector2(x, y));

// Put the kit on a kid: a white jacket with a high collar and a heart patch, long white sleeves, a glove and a foil
// in the right hand, and the mask (on the head, lifted up, or held in the left hand). remove() takes it all off again.
// jacket: false for club fencers already dressed in whites.
export function suitUp(kid, color, { jacket = true, light = false } = {}) {
  const added = [];
  const put = (parent, o) => (parent.add(o), added.push(o), o);
  const white = mat('#fbfbff', { rough: 0.7 });
  const cream = mat('#fffaf4', { rough: 0.7 });
  // Each piece of clothing is baked into one mesh per body part
  const part = (parent, fill, cast = false) => {
    const g = new THREE.Group();
    fill(g);
    bakeParts(g, [], cast);
    return put(parent, g);
  };
  part(
    kid.body,
    (g) => {
      if (jacket) {
        g.add(mesh(G('jacket' + (light ? 12 : 20), () => new THREE.LatheGeometry(JACKET, light ? 12 : 20)), white));
        const collar = g.add(mesh(G('collar', () => new THREE.CylinderGeometry(0.074, 0.08, 0.075, 14, 1, true)), white)).children.at(-1);
        collar.position.y = 0.815;
        const trim = g.add(mesh(G('trim', () => new THREE.TorusGeometry(0.074, 0.011, 4, 16)), mat(color, { rough: 0.6 }))).children.at(-1);
        trim.rotation.x = Math.PI / 2;
        trim.position.y = 0.852;
        const zip = g.add(mesh(G('zip', () => new THREE.BoxGeometry(0.014, 0.3, 0.01)), mat(color, { rough: 0.6 }))).children.at(-1);
        zip.position.set(-0.11, 0.6, 0.19);
        zip.rotation.set(-0.16, -0.5, 0);
      }
      const patch = g.add(mesh(G('patch', () => new THREE.ShapeGeometry(heartShape(0.085), 4)), mat(color, { rough: 0.5 }))).children.at(-1);
      patch.position.set(0.078, 0.62, jacket ? 0.212 : 0.196);
      patch.rotation.y = 0.32;
    },
    jacket && !light,
  );
  kid.arms.forEach((arm, i) =>
    part(arm, (g) => {
      g.add(mesh(G('sleeve', () => new THREE.CapsuleGeometry(0.058, 0.17, 3, 8)), white)).children.at(-1).position.y = -0.14;
      if (jacket) g.add(mesh(G('shoulder', () => new THREE.SphereGeometry(0.09, 10, 8)), white)).children.at(-1).position.y = -0.015;
      if (i === 1) {
        g.add(mesh(G('glove', () => new THREE.SphereGeometry(0.068, 10, 8)), cream)).children.at(-1).position.y = -0.28;
        g.add(mesh(G('cuff', () => new THREE.CylinderGeometry(0.072, 0.062, 0.07, 10)), cream)).children.at(-1).position.y = -0.22;
      }
    }),
  );
  const R = kid.arms[1];
  const order = R.rotation.order;
  R.rotation.order = 'YXZ';
  const wrist = put(R, new THREE.Group());
  wrist.position.y = -0.29;
  const foil = makeFoil(color);
  wrist.add(foil);
  const mask = makeMask(color, { light });
  const gear = {
    wrist,
    foil,
    mask,
    mode: 'hand',
    setMask(mode) {
      this.mode = mode;
      if (mode === 'head' || mode === 'up') {
        kid.head.add(mask);
        if (mode === 'head') {
          mask.position.set(0, 0.29, 0);
          mask.rotation.set(0, 0, 0);
        } else {
          // pushed up over the forehead, the grille looking at the sky
          mask.position.set(0, 0.47, -0.1);
          mask.rotation.set(-1.25, 0, 0);
        }
        mask.scale.setScalar(1);
      } else if (mode === 'hand') {
        kid.arms[0].add(mask);
        mask.position.set(0.06, -0.42, 0.08);
        mask.rotation.set(0.2, -Math.PI / 2 + 0.3, 0.1);
        mask.scale.setScalar(0.8);
      } else mask.removeFromParent();
    },
    remove() {
      for (const o of added) o.removeFromParent();
      mask.removeFromParent();
      R.rotation.order = order;
      kid.arms[0].rotation.y = 0;
      R.rotation.y = 0;
    },
  };
  gear.setMask('hand');
  return gear;
}

// ------------------------------------------------------------------ a fencer the club moves about
// Holds one kid's fencing pose and slides it toward targets every frame. dir +1 faces +X, -1 faces -X.
export class Fencer {
  constructor(kid, gear, dir, { actor = null, origin = null, twist = 0.45 } = {}) {
    this.kid = kid;
    this.gear = gear;
    this.dir = dir;
    this.actor = actor; // Roji's or Homama's actor: its position is moved too, so the game keeps the kid there
    this.origin = origin; // where (0, 0) of the interior is in the world, for kids that live in the scene root
    this.twist = twist;
    this.P = { ...POSES.stand };
    this.PT = POSES.stand;
    this.rate = 12;
    this.off = 0;
    this.offT = 0;
    this.offRate = 9;
    this.step = 0;
    this.stepT = -1;
    this.stepDur = 0.32;
    this.salute = null;
    this.free = false; // true: leave the kid alone (an emote is playing)
  }

  to(name, rate = 12) {
    this.PT = POSES[name];
    this.rate = rate;
  }

  stepBy(d, dur = 0.32) {
    this.offT += d;
    this.stepT = 0;
    this.stepDur = dur;
  }

  // After kid.update(): pose the limbs and place the kid at (x, y, z) plus its footwork.
  apply(dt, x, y, z) {
    const k = 1 - Math.exp(-this.rate * dt);
    for (const key in this.P) this.P[key] += (this.PT[key] - this.P[key]) * k;
    this.off += (this.offT - this.off) * (1 - Math.exp(-this.offRate * dt));
    if (this.stepT >= 0) {
      this.stepT += dt;
      const s = this.stepT / this.stepDur;
      this.step = s < 1 ? Math.sin(s * Math.PI) * 0.9 : 0;
      if (s >= 1) this.stepT = -1;
    }
    if (this.salute !== null) this.salute += dt;
    const ox = this.origin?.x ?? 0;
    const oz = this.origin?.z ?? 0;
    const px = x + this.dir * (this.off + this.P.shift) + ox;
    const yaw = (this.dir * Math.PI) / 2;
    if (this.actor) {
      this.actor.pos.set(px, 0, z + oz);
      this.actor.yaw = yaw;
    }
    const root = this.kid.root;
    root.position.set(px, y, z + oz);
    root.rotation.set(0, yaw, 0);
    if (this.free) return;
    applyPose(this.kid, this.P, this.dir, { twist: this.twist, step: this.step, salute: this.salute });
    this.gear?.wrist.rotation.set(this.P.wrist, 0, 0);
  }

  reset() {
    this.P = { ...POSES.stand };
    this.PT = POSES.stand;
    this.off = this.offT = 0;
    this.step = 0;
    this.stepT = -1;
    this.salute = null;
    this.free = false;
    this.gear?.wrist.rotation.set(0, 0, 0);
  }
}

// ------------------------------------------------------------------ cheap club people
// Fewer segments, plain materials (so the parts merge into a few meshes) and no real shadows except the body.
// mode 'still': the room's colour bake swallows it; 'live': legs and arms stay their own pieces for posing.
export function lowKid(kid) {
  const swap = new Map();
  kid.root.traverse((o) => {
    if (!o.isMesh || o === kid.blob) return;
    const geo = o.geometry;
    const p = geo.parameters;
    if (!p) return;
    let next = swap.get(geo);
    if (!next) {
      if (geo.type === 'SphereGeometry' && p.widthSegments > 10) next = new THREE.SphereGeometry(p.radius, Math.max(8, Math.ceil(p.widthSegments * 0.45)), Math.max(5, Math.ceil(p.heightSegments * 0.45)), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
      else if (geo.type === 'TorusGeometry' && p.tubularSegments > 10) next = new THREE.TorusGeometry(p.radius, p.tube, Math.min(p.radialSegments, 4), Math.max(8, Math.ceil(p.tubularSegments * 0.5)), p.arc);
      else if (geo.type === 'LatheGeometry' && p.segments > 10) next = new THREE.LatheGeometry(p.points, Math.max(10, Math.ceil(p.segments * 0.5)), p.phiStart, p.phiLength);
      else if (geo.type === 'CylinderGeometry' && p.radialSegments > 8) next = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 8, 1, p.openEnded, p.thetaStart, p.thetaLength);
      else if (geo.type === 'CapsuleGeometry') next = new THREE.CapsuleGeometry(p.radius, p.height ?? p.length, 2, 7);
      if (!next) return;
      swap.set(geo, next);
    }
    o.geometry = next;
  });
}

function plainify(kid, look) {
  const hair = mat(look.hair || '#2a1a13', { rough: 0.45 });
  const cheek = mat('#' + new THREE.Color(look.skin).lerp(new THREE.Color('#ff8fa0'), look.gender === 'girl' ? 0.5 : 0.32).getHexString(), { rough: 0.6 });
  const shine = mat('#ffffff', { rough: 0.2 });
  kid.root.traverse((o) => {
    if (!o.isMesh || o === kid.blob || o.material === sharedGrid || o.material.vertexColors) return;
    const m = o.material;
    if (m.map) o.material = hair;
    else if (m.transparent) o.material = cheek;
    else if (m.emissive && m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0) o.material = shine;
    if (o.material.side !== THREE.FrontSide) o.material = mat('#' + o.material.color.getHexString(), { rough: o.material.roughness, metal: o.material.metalness });
    o.castShadow = false;
  });
}

// Merge the plain pieces under group (not under keep) into one vertex-coloured mesh per metal / shadow setting.
const bakeMats = new Map();
export function bakeParts(group, keep = [], cast = false) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of keep) d?.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh || skip.has(o) || o.children.length || !o.visible) return;
    const m = o.material;
    if (Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.alphaTest > 0) return;
    if (m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0) return;
    const vc = m.vertexColors && o.geometry.attributes.color?.itemSize === 3;
    if (m.vertexColors && !vc) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal' && !(vc && n === 'color')) g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    if (!vc) {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([m.color.r, m.color.g, m.color.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const metal = m.metalness > 0.3 ? 0.55 : 0;
    const key = `${metal}`;
    if (!buckets.has(key)) buckets.set(key, { metal, list: [] });
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const geo = mergeGeometries(b.list, false);
    if (!geo) continue;
    if (!bakeMats.has(b.metal)) bakeMats.set(b.metal, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.metal ? 0.3 : 0.7, metalness: b.metal, side: THREE.DoubleSide }));
    // a blank uv set, so the scene's static merge can join every baked piece that shares this material
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    const me = new THREE.Mesh(geo, bakeMats.get(b.metal));
    me.castShadow = cast && !b.metal;
    me.receiveShadow = true;
    group.add(me);
    out.push(me);
  }
  return out;
}

// make: (look) => Kid (ctx.makeKid inside, new Kid outside). kit: colour for the fencing kit, or null.
// Returns { kid, gear }.
export function person(make, look, { pose = 'stand', hands = null, mode = 'still', scale = 1, kit: kitColor = null, jacket = false, mask = 'hand', dress, cast = true } = {}) {
  const kid = make(look);
  lowKid(kid);
  const gear = kitColor ? suitUp(kid, kitColor, { jacket, light: true }) : null;
  gear?.setMask(mask);
  dress?.(kid, gear);
  plainify(kid, look);
  kid.pose = pose;
  kid.hands = hands;
  kid.blinkTimer = 1e9;
  for (let i = 0; i < 30; i++) kid.update(1 / 30, 0, 0, 0, 0);
  kid.root.scale.setScalar(scale);
  kid.blob.visible = pose === 'stand';
  if (mode === 'still') bakeParts(kid.root, [kid.blob], cast);
  else if (mode === 'arm') {
    // one piece, with the right arm free (a wave, a clap, a pointing coach)
    bakeParts(kid.root, [kid.blob, kid.arms[1], kid.arms[0], gear?.mask], cast);
    for (const p of kid.arms) bakeParts(p, [gear?.mask], false);
  } else if (mode === 'live') {
    const limbs = [...kid.legs, ...kid.arms];
    bakeParts(kid.body, [...limbs, kid.head, kid.carryAnchor], cast);
    bakeParts(kid.head, [gear?.mask], false);
    for (const p of limbs) bakeParts(p, [gear?.mask], false);
  }
  return { kid, gear };
}
