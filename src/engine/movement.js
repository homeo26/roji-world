import * as THREE from 'three';
import { damp, dampAngle, clamp } from '../util.js';

// Kid movement shared by the town and the dev harness: walking, ledges, jump, double jump, swimming.
// An actor: { id, kid, pos (feet x/z), y (feet height), ground, vel, vy, yaw, speed, turn, jumps, flipT, mode }
// mode: 'walk' | 'swim'. ground: height of what the kid stands on (0, a ledge, or the water surface).

export const GRAVITY = 22;
export const RADIUS = 0.34;
const HANG_V = 1.7; // below this vertical speed near the top of a jump gravity eases off (a little hang time)
const HANG_G = 0.55;
const FALL_G = 1.3; // and the way down is a bit quicker than the way up
const MAX_FALL = 18;
const COYOTE = 0.12; // a jump still counts this long after walking off a ledge
const STEP_RATE = 26; // how quickly feet rise onto a small ledge (no snap)

export function makeActor(id, kid, x, z, yaw = 0) {
  const a = {
    id,
    kid,
    pos: new THREE.Vector3(x, 0, z),
    vel: new THREE.Vector3(),
    y: 0,
    ground: 0,
    vy: 0,
    yaw,
    speed: 0,
    turn: 0,
    idle: 0,
    stepSign: 1,
    jumps: 0,
    flipT: -1,
    mode: 'walk',
    surface: null, // ground kind under the feet: null | 'snow' | 'ice' | 'water'
  };
  kid.root.position.set(x, 0, z);
  kid.root.rotation.y = yaw;
  return a;
}

export const airOf = (a) => Math.max(0, a.y - a.ground);

// Horizontal step toward (dirX, dirZ) with an intent of 0..1.
export function stepWalker(a, physics, dirX, dirZ, intent, maxSpeed, accel, dt, radius = RADIUS) {
  const len = Math.hypot(dirX, dirZ) || 1;
  const k = Math.min(1, intent);
  const ice = a.surface === 'ice';
  const acc = ice ? accel * 0.18 : accel;
  const brake = ice ? 0.6 : 13;
  const top = a.surface === 'snow' ? maxSpeed * 0.82 : a.mode === 'swim' ? maxSpeed * 0.5 : maxSpeed;
  // A little less steering in the air, so jumps keep their line
  const airK = a.y - a.ground > 0.05 && a.mode !== 'swim' ? 0.75 : 1;
  a.vel.x = damp(a.vel.x, (dirX / len) * top * k, (intent > 0.05 ? acc : brake) * airK, dt);
  a.vel.z = damp(a.vel.z, (dirZ / len) * top * k, (intent > 0.05 ? acc : brake) * airK, dt);
  a.pos.x += a.vel.x * dt;
  a.pos.z += a.vel.z * dt;
  physics.resolve(a.pos, radius, a.vel, { feet: a.y });
  a.speed = Math.hypot(a.vel.x, a.vel.z);
}

// Gravity, landing on ledges and floating in water. water: { y, depth } under the kid, or null.
// Returns 'land' on a landing, else null.
export function stepVertical(a, physics, dt, water = null, radius = RADIUS) {
  const ledge = physics.support(a.pos.x, a.pos.z, radius, a.y, water ? water.y - water.depth : 0);
  let ground = ledge;
  const swim = water && water.depth > 0.55 && ledge <= water.y + 0.05;
  if (water && ledge <= water.y + 0.05) ground = swim ? water.y : Math.max(ledge, water.y - water.depth);
  a.mode = swim ? 'swim' : 'walk';
  a.ground = ground;
  let landed = null;
  if (a.y > ground + 1e-3 || a.vy > 0) {
    // The hang is for jumps only: stepping off a ledge drops straight away
    const g = GRAVITY * (swim && a.y < ground + 0.3 ? 0.35 : a.jumps > 0 && Math.abs(a.vy) < HANG_V ? HANG_G : a.vy < 0 ? FALL_G : 1);
    // Exact for constant gravity over the frame, so the jump height does not depend on the frame rate
    a.y += a.vy * dt - 0.5 * g * dt * dt;
    a.vy = Math.max(a.vy - g * dt, -MAX_FALL);
    a.airT = (a.airT || 0) + dt;
    if (a.y <= ground) {
      if (a.vy < -4.2) landed = 'land'; // stepping off a kerb is not a landing
      a.y = ground;
      a.vy = 0;
      a.jumps = 0;
      a.airT = 0;
      // A flip that is still going finishes quickly on the ground (syncKid) instead of snapping upright
    }
  } else {
    // Small ledges: the body rises onto them over a few frames (stepLag, drawn by syncKid) instead of
    // snapping, while the feet used for collisions are already on top. The water surface holds them up.
    const rise = ground - a.y;
    if (rise > 0.01 && rise < 0.45) a.stepLag = Math.min(0.45, (a.stepLag || 0) + rise);
    a.y = ground;
    a.vy = 0;
    a.jumps = 0;
    a.airT = 0;
  }
  if (a.stepLag) a.stepLag = a.stepLag < 0.005 ? 0 : a.stepLag * Math.exp(-STEP_RATE * dt);
  if (a.flipT >= 0) a.flipT += dt;
  return landed;
}

// Jump, or a second jump with a flip while in the air. Returns 'jump' | 'double' | null.
export function tryJump(a, { power = 7.4, allowDouble = true } = {}) {
  const air = airOf(a);
  if (a.mode === 'swim') {
    if (air > 0.05) return null;
    a.vy = 4.2;
    a.jumps = 1;
    return 'jump';
  }
  // On the ground, or just walked off a ledge (coyote time)
  if ((air < 0.03 && a.vy <= 0.01) || (a.jumps === 0 && a.vy <= 0 && (a.airT || 0) < COYOTE)) {
    a.vy = power;
    a.jumps = 1;
    a.airT = 0;
    return 'jump';
  }
  // The second jump; falling off a ledge without jumping still leaves this one
  if (allowDouble && a.jumps <= 1) {
    a.vy = power * 0.92;
    a.jumps = 2;
    a.flipT = 0;
    return 'double';
  }
  return null;
}

export function faceTo(a, dt, targetYaw, rate = 12) {
  const prev = a.yaw;
  a.yaw = dampAngle(a.yaw, targetYaw, rate, dt);
  let turn = a.yaw - prev;
  if (turn > Math.PI) turn -= Math.PI * 2;
  if (turn < -Math.PI) turn += Math.PI * 2;
  a.turn = turn / Math.max(dt, 1e-3);
}

// Push the actor's state onto its Kid (call once per frame for walking actors).
export function syncKid(a, dt, t) {
  const k = a.kid;
  const air = airOf(a);
  if (k.pose === 'stand' || k.pose === 'swim' || k.pose === 'scoot') {
    if (k.pose !== 'scoot') k.pose = a.mode === 'swim' ? 'swim' : k.pose === 'swim' ? 'stand' : k.pose;
    k.root.position.set(a.pos.x, a.y - (a.stepLag || 0), a.pos.z);
    k.root.rotation.set(0, a.yaw, 0);
  }
  if (a.flipT >= 0) a.flipT += dt * (air < 0.02 ? 5 : 0);
  k.flip = a.flipT >= 0 ? clamp(a.flipT / 0.5, 0, 1) : 0;
  if (k.flip >= 1) {
    a.flipT = -1;
    k.flip = 0;
  }
  k.update(dt, t, k.pose === 'stand' || k.pose === 'swim' || k.pose === 'scoot' ? a.speed : 0, air, a.turn || 0);
}
