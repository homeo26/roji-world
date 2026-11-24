// The family home inside, seen like a dollhouse: the majlis, the entrance and the dining room at the
// front, the hallway with the family photos, and the play room, the inner courtyard and the kitchen
// at the back. Walls in front of a back room sink while you are behind them.
import { THREE, P, at, sph, cyl, box, rbox, mat, sc, colorBake, bakePart, mergeGeometries } from './kit.js';
import { bakeStatic } from '../../util.js';
import { buildRooms } from './rooms.js';
import { setupInside } from './inside.js';
import { W, D, ZE } from './plan.js';

function mansaf() {
  const m = new THREE.Group();
  m.add(at(cyl(0.5, 0.42, 0.05, '#e9eef3', 22), 0, 0.025, 0));
  m.add(at(cyl(0.46, 0.46, 0.02, '#e8d3a8', 22), 0, 0.06, 0));
  const rice = mesh_(new THREE.SphereGeometry(0.4, 18, 6, 0, P * 2, 0, P / 2), '#f6ecc8');
  rice.scale.y = 0.32;
  m.add(at(rice, 0, 0.06, 0));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * P * 2;
    m.add(at(sc(sph(0.07, '#8a5232', 8, 6), 1, 0.8, 1), Math.sin(a) * 0.2, 0.15, Math.cos(a) * 0.2));
  }
  for (let i = 0; i < 16; i++) m.add(at(sph(0.018, i % 2 ? '#f6e7c8' : '#3f8f4e', 4, 3), Math.sin(i * 2.4) * 0.28, 0.17, Math.cos(i * 2.4) * 0.28));
  bakePart(m);
  return m;
}
function mesh_(geo, col) {
  const me = new THREE.Mesh(geo, mat(col));
  me.castShadow = true;
  me.receiveShadow = true;
  return me;
}
function maqluba() {
  const m = new THREE.Group();
  m.add(at(cyl(0.42, 0.36, 0.04, '#e9eef3', 22), 0, 0.02, 0));
  const dome = mesh_(new THREE.SphereGeometry(0.3, 18, 8, 0, P * 2, 0, P / 2), '#f2d28a');
  dome.scale.y = 0.9;
  m.add(at(dome, 0, 0.04, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * P * 2;
    m.add(at(sc(sph(0.08, '#5b3a6a', 8, 6), 1, 0.4, 0.7), Math.sin(a) * 0.24, 0.13, Math.cos(a) * 0.24, 0, a, 0.9));
  }
  for (let i = 0; i < 12; i++) m.add(at(sph(0.024, i % 2 ? '#f6e7c8' : '#3f8f4e', 5, 4), Math.sin(i * 2.1) * 0.14, 0.31, Math.cos(i * 2.1) * 0.14));
  bakePart(m);
  return m;
}
function kunafa() {
  const k = new THREE.Group();
  k.add(at(cyl(0.3, 0.3, 0.04, '#c0c4c8', 22), 0, 0.02, 0));
  k.add(at(cyl(0.28, 0.28, 0.05, '#f28c28', 22), 0, 0.06, 0));
  for (let i = 0; i < 14; i++) k.add(at(sph(0.018, '#6fae4a', 4, 3), Math.sin(i * 2.3) * 0.18, 0.09, Math.cos(i * 2.3) * 0.18));
  bakePart(k);
  return k;
}

export function buildInterior(ictx, F, links) {
  const g = new THREE.Group();
  const R = { g, dynamic: [], colliders: [], cutaway: [] };
  buildRooms(ictx, R);

  // Dishes that come and go: the main dish on the dining table, Basem's kunafa
  const dish = new THREE.Group();
  const dishes = { mansaf: mansaf(), maqluba: maqluba() };
  for (const d of Object.values(dishes)) dish.add(d);
  dish.position.set(R.table.x + 0.15, R.table.y, R.table.z);
  dish.visible = false;
  g.add(dish);
  R.dynamic.push(dish);
  R.maqlubaOnTable = dish;
  R.setDish = (kind) => {
    for (const [k, d] of Object.entries(dishes)) d.visible = k === kind;
    if (kind === 'maqluba') R.maqluba.visible = false;
  };
  R.kunafa = kunafa();
  R.kunafa.position.set(-6.0, 0.64, 0.42);
  R.kunafa.visible = false;
  g.add(R.kunafa);
  R.dynamic.push(R.kunafa);
  R.kunafaTable = kunafa();
  R.kunafaTable.position.set(R.table.x - 0.9, R.table.y, R.table.z + 0.1);
  R.kunafaTable.visible = false;
  g.add(R.kunafaTable);
  R.dynamic.push(R.kunafaTable);

  const inside = setupInside(ictx, F, R);

  // Merge the fixed parts: the room in a few meshes, and each cut-away wall into one
  for (const c of R.cutaway) {
    bakePart(c.object, [c.decor]);
    bakePart(c.decor);
    bakeStatic(c.decor, [], mergeGeometries);
  }
  colorBake(g, R.dynamic);

  const jets = R.jets;
  const jm = new THREE.Matrix4();
  const resetKitchen = () => {
    if (R.potMoved) {
      R.pot.pivot.position.copy(R.potMoved.base);
      R.pot.pivot.rotation.set(0, 0, 0);
      R.potMoved = null;
    }
    R.maqluba.visible = false;
    for (const c of [...R.leaves.children].slice(1)) c.removeFromParent();
  };

  return {
    group: g,
    dynamic: R.dynamic,
    colliders: R.colliders,
    cutaway: R.cutaway,
    hotspots: inside.hotspots,
    size: { w: W, d: D },
    spawn: { x: -1.5, z: ZE - 1.6, yaw: P },
    exit: { x: -1.5, z: ZE - 0.75 },
    background: '#f3d6bc',
    onEnter(api) {
      links.outside?.enterHouse?.();
      inside.onEnter(api);
    },
    onExit(api) {
      inside.onExit(api);
      resetKitchen();
      links.onLeave?.();
    },
    update(dt, t, api) {
      F.tick(dt, api);
      inside.update(dt, t);
      // Hide pictures on a wall while it is sunk low
      for (const c of R.cutaway) c.decor.visible = c.object.scale.y > 0.7;
      // The fountain sparkles, the canary hops
      for (let i = 0; i < jets.count; i++) {
        const k = (t * 0.9 + i / jets.count) % 1;
        const a = (i / jets.count) * P * 2;
        const y = 1.2 + Math.sin(k * P) * 0.35 - k * 0.7;
        jm.makeTranslation(Math.sin(a) * k * 0.55, y, Math.cos(a) * k * 0.55);
        if (y < 0.48) jm.scale(new THREE.Vector3(0.001, 0.001, 0.001));
        jets.setMatrixAt(i, jm);
      }
      jets.instanceMatrix.needsUpdate = true;
      // Windows show the night sky after dark
      const n = F.night();
      if (Math.abs(n - (R.skyN ?? -1)) > 0.02) {
        R.skyN = n;
        R.skyMat.color.setRGB(1 - n * 0.72, 1 - n * 0.66, 1 - n * 0.4);
        R.skyMat.emissiveIntensity = 0.15 * (1 - n);
      }
      R.birdHop = Math.max(0, (R.birdHop || 0) - dt);
      R.bird.position.y = 1.75 + (R.birdHop > 0 ? Math.abs(Math.sin(t * 14)) * 0.08 : Math.abs(Math.sin(t * 2.2)) * 0.01);
      R.bird.rotation.y = Math.sin(t * 0.7) * 0.8;
    },
    debug: { inside, R },
  };
}
