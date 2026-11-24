import * as THREE from 'three';
import { mat, umat, mesh, canvasTexture, heartShape, damp } from '../../util.js';
import { cyl, ball, bakeVC } from './kit.js';

// Fencing kit for a real kid: whites, a coloured sash, a glove, a foil in the right hand
// and a mesh mask that can sit on the head or be held in the left hand.

export const whites = (look) => ({ ...look, outfit: 'tee-pants', top: '#fbfbff', bottom: '#f4f4fa', shoes: '#ffffff' });

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

function buildMask(color) {
  const g = new THREE.Group();
  const grid = new THREE.MeshStandardMaterial({ color: '#4a4958', map: maskGrid(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.35 });
  const front = new THREE.Mesh(new THREE.SphereGeometry(0.37, 22, 14, Math.PI / 2 - 1.55, 3.1, Math.PI * 0.14, Math.PI * 0.6), grid);
  front.castShadow = true;
  front.scale.set(1, 1.04, 1.05);
  // A bib under the chin and a strap over the head
  const bib = mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.16, 18, 1, true, -1.3, 2.6), mat('#fffaf4', { rough: 0.7, side: THREE.DoubleSide }));
  bib.position.set(0, -0.3, 0.02);
  bib.rotation.x = -0.15;
  const strap = mesh(new THREE.TorusGeometry(0.34, 0.022, 6, 20, Math.PI * 0.55), mat(color, { rough: 0.7, side: THREE.DoubleSide }));
  strap.rotation.set(0, Math.PI / 2, Math.PI * 0.42);
  // A small heart badge in the fencer's colour on the side
  const hg = new THREE.ShapeGeometry(heartShape(0.1));
  const heart = mesh(hg, mat(color, { rough: 0.7, side: THREE.DoubleSide }));
  heart.position.set(0.3, 0.1, 0.12);
  heart.rotation.y = 1.1;
  g.add(front, bib, strap, heart);
  bakeVC(g); // bib, strap and badge become one mesh; the see-through grid stays
  return g;
}

function buildFoil() {
  const g = new THREE.Group();
  const steel = mat('#dfe4ec', { metal: 0.7, rough: 0.25 });
  const bell = mesh(new THREE.SphereGeometry(0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), steel);
  bell.rotation.x = Math.PI;
  bell.position.y = -0.03;
  const grip = mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.1, 8), mat('#3b2b3f', { metal: 0.7, rough: 0.25 }));
  grip.position.y = 0.02;
  const pommel = ball(0.022, steel, {}, 8);
  pommel.position.y = 0.08;
  const blade = mesh(new THREE.CylinderGeometry(0.0035, 0.0075, 0.86, 6), steel);
  blade.position.y = -0.03 - 0.43;
  const tipMat = umat('#ffd166', { rough: 0.4, emissive: '#ffd166', ei: 0 });
  const tip = mesh(new THREE.SphereGeometry(0.016, 10, 8), tipMat);
  tip.position.y = -0.9;
  g.add(bell, grip, pommel, blade, tip);
  bakeVC(g, [tip]); // one steel mesh; the tip glows on its own
  return { g, tip, tipMat };
}

export function dressFencer(kid, color) {
  const B = kid.body;
  // Sash across the chest
  const sash = mesh(new THREE.TorusGeometry(0.205, 0.028, 6, 24), mat(color, { rough: 0.55 }));
  sash.position.set(0, 0.55, 0);
  sash.rotation.set(Math.PI / 2, 0.55, 0);
  sash.scale.set(1, 1, 1.4);
  const belt = mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 24), mat(color, { rough: 0.55 }));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.36;
  const patch = mesh(new THREE.ShapeGeometry(heartShape(0.09)), mat(color, { rough: 0.5, side: THREE.DoubleSide }), { cast: false });
  patch.position.set(0.07, 0.6, 0.192);
  B.add(sash, belt, patch);
  // Long white sleeves over both arms
  for (const arm of kid.arms) {
    const sleeve = mesh(new THREE.CapsuleGeometry(0.056, 0.17, 3, 10), mat('#fbfbff', { rough: 0.7 }));
    sleeve.position.y = -0.14;
    arm.add(sleeve);
  }
  // Glove and foil in the right hand
  const R = kid.arms[1];
  R.rotation.order = 'YXZ';
  const glove = ball(0.066, '#fffaf4', { rough: 0.7 }, 12);
  glove.position.y = -0.28;
  const cuff = cyl(0.07, 0.06, 0.07, '#fffaf4', 12);
  cuff.position.y = -0.22;
  const foil = buildFoil();
  const wrist = new THREE.Group();
  wrist.position.y = -0.29;
  wrist.add(foil.g);
  R.add(glove, cuff, wrist);
  // Mask
  const mask = buildMask(color);
  const onHead = () => {
    kid.head.add(mask);
    mask.position.set(0, 0.29, 0.0);
    mask.rotation.set(0, 0, 0);
    mask.scale.setScalar(1);
  };
  const inHand = () => {
    kid.arms[0].add(mask);
    mask.position.set(0.06, -0.42, 0.08);
    mask.rotation.set(0.2, -Math.PI / 2 + 0.3, 0.1);
    mask.scale.setScalar(0.8);
  };
  inHand();
  return {
    wrist,
    tip: foil.tip,
    tipMat: foil.tipMat,
    mask,
    maskOn: false,
    setMask(on) {
      this.maskOn = on;
      if (on) onHead();
      else inHand();
    },
  };
}

// Pose numbers, all in radians or metres. Blended every frame.
export const POSES = {
  stand: { front: -0.12, back: 0.08, spread: 0.06, crouch: 0, lean: 0, armX: -0.35, armZ: -0.05, wrist: -0.2, rearX: 0.1, rearZ: 0.2, shift: 0 },
  idle: { front: -0.6, back: 0.5, spread: 0.14, crouch: -0.075, lean: 0.06, armX: -0.95, armZ: -0.12, wrist: -0.75, rearX: 0.55, rearZ: 2.25, shift: 0 },
  windup: { front: -0.5, back: 0.55, spread: 0.14, crouch: -0.06, lean: -0.08, armX: -0.55, armZ: -0.1, wrist: -1.35, rearX: 0.4, rearZ: 2.6, shift: -0.05 },
  lunge: { front: -1.3, back: 0.8, spread: 0.12, crouch: -0.17, lean: 0.3, armX: -1.5, armZ: -0.02, wrist: -0.06, rearX: 1.3, rearZ: 0.85, shift: 0.45 },
  parry: { front: -0.55, back: 0.5, spread: 0.14, crouch: -0.08, lean: -0.02, armX: -1.05, armZ: -0.5, wrist: -1.5, rearX: 0.5, rearZ: 2.3, shift: -0.04 },
  parried: { front: -1.1, back: 0.7, spread: 0.12, crouch: -0.13, lean: 0.15, armX: -1.3, armZ: 0.55, wrist: -0.6, rearX: 1.0, rearZ: 1.3, shift: 0.3 },
  hit: { front: -0.35, back: 0.3, spread: 0.12, crouch: -0.03, lean: -0.32, armX: -0.5, armZ: -0.1, wrist: -0.25, rearX: 0.3, rearZ: 1.5, shift: -0.08 },
};

export const lerpPose = (a, b, t) => {
  const o = {};
  for (const k in a) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
};

// Apply a pose after kid.update(). dir: +1 faces +X, -1 faces -X. twist turns the chest toward the camera.
export function applyPose(kid, P, dir, { twist = 0.45, step = 0, salute = null } = {}) {
  const B = kid.body;
  const [legL, legR] = kid.legs;
  const [armL, armR] = kid.arms;
  const tw = -twist * dir;
  legR.rotation.set(P.front + step * 0.25, 0, -P.spread);
  legL.rotation.set(P.back - step * 0.2, 0, P.spread);
  B.position.y = P.crouch + Math.abs(step) * 0.03;
  B.rotation.set(P.lean, tw, 0);
  armR.rotation.set(P.armX, -tw, P.armZ);
  armL.rotation.set(P.rearX, 0, P.rearZ);
  kid.head.rotation.set(0.04 - P.lean * 0.5, -tw * 0.4, 0);
  if (salute !== null) {
    // Foil up in front of the face, then swept down
    const up = Math.min(1, salute / 0.45);
    const down = Math.max(0, Math.min(1, (salute - 0.9) / 0.4));
    armR.rotation.x = -0.35 - 2.45 * up + 2.3 * down;
    armR.rotation.z = -0.05 - 0.25 * up * (1 - down);
  }
}

export function setWrist(gear, P, sweep = 0) {
  gear.wrist.rotation.set(P.wrist, 0, sweep);
}

export { damp };
