import * as THREE from 'three';
import { mat, mesh } from './util.js';

// A kick scooter that rides under a kid: built facing +Z with its deck on the ground (y = 0), so it can be
// a child of kid.root. The kid stands on the deck (Kid pose 'scoot' lifts the body by DECK_TOP) and holds
// the handlebar. spin(dt, speed) turns the wheels.
export const DECK_TOP = 0.13;

export function makeScooter(color = '#ff7fa3') {
  const g = new THREE.Group();
  const paint = mat(color, { rough: 0.35, metal: 0.1 });
  const dark = mat('#3b2b3f', { rough: 0.6 });
  const metal = mat('#d7dbe3', { rough: 0.25, metal: 0.6 });
  const grip = mat('#2c2433', { rough: 0.9 });

  // Deck with a grippy top
  const deck = mesh(new THREE.BoxGeometry(0.2, 0.04, 0.7), paint);
  deck.position.set(0, 0.105, 0.0);
  const top = mesh(new THREE.BoxGeometry(0.17, 0.006, 0.52), grip, { cast: false });
  top.position.set(0, 0.128, -0.03);
  // Rear guard over the back wheel (the brake)
  const guard = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 14, 1, false, 0, Math.PI), paint);
  guard.rotation.set(0, 0, Math.PI / 2);
  guard.position.set(0, 0.07, -0.34);
  g.add(deck, top, guard);

  // Wheels: a soft tyre and a bright hub
  const wheels = [];
  const tyreGeo = new THREE.TorusGeometry(0.048, 0.016, 8, 18);
  const hubGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12);
  for (const z of [-0.33, 0.38]) {
    const w = new THREE.Group();
    w.position.set(0, 0.064, z);
    const tyre = mesh(tyreGeo, dark);
    tyre.rotation.y = Math.PI / 2;
    const hub = mesh(hubGeo, metal);
    hub.rotation.z = Math.PI / 2;
    w.add(tyre, hub);
    g.add(w);
    wheels.push(w);
  }

  // Fork, stem and handlebar in front of the rider, leaning back a touch so the bar meets the hands
  // (about 0.3 m in front and 0.68 m up)
  const stem = new THREE.Group();
  stem.position.set(0, 0.07, 0.38);
  stem.rotation.x = -0.1;
  const fork = mesh(new THREE.BoxGeometry(0.07, 0.1, 0.03), paint);
  fork.position.y = 0.05;
  const pole = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.56, 10), metal);
  pole.position.y = 0.34;
  const collar = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 10), paint);
  collar.position.y = 0.16;
  const bar = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10), metal);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 0.61;
  stem.add(fork, pole, collar, bar);
  for (const s of [-1, 1]) {
    const h = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 10), paint);
    h.rotation.z = Math.PI / 2;
    h.position.set(0.18 * s, 0.61, 0);
    stem.add(h);
  }
  // A little bell on the bar
  const bell = mesh(new THREE.SphereGeometry(0.022, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal);
  bell.position.set(0.08, 0.625, 0.01);
  stem.add(bell);
  g.add(stem);

  let roll = 0;
  return {
    root: g,
    spin(dt, speed) {
      roll += (dt * speed) / 0.064;
      for (const w of wheels) w.rotation.x = roll;
    },
  };
}
