import * as THREE from 'three';
import { kit, colorBake } from '../../places/school/kit.js';
import * as K from '../riding/kit.js';
import { GRID_Y } from './scene.js';

// The little bumper cars and their drivers: Roji and Homama (the real kids), Roji Land's mascots
// Mimi (a pink bunny in a lilac dress) and Bobo (a blue bear with a red bow tie and a top hat)
// sitting in their cars, and two park visitors.

export const SEAT = { y: 0.3, z: -0.22 }; // where a kid's root sits in a car (hips on the seat)

export const DRIVERS = {
  roji: { name: 'Roji', color: '#ff9eb5', flag: '#ef5b6f', emblem: 'heart', laugh: 1050 },
  homama: { name: 'Homama', color: '#8fd3ff', flag: '#3f7bf0', emblem: 'star', laugh: 620 },
  mimi: { name: 'Mimi', color: '#c7a6ff', flag: '#ffb3cc', emblem: 'heart', laugh: 1300, mascot: 'bunny' },
  bobo: { name: 'Bobo', color: '#ffd166', flag: '#ef5b6f', emblem: 'star', laugh: 420, mascot: 'bear' },
  nina: {
    name: 'Nina',
    color: '#7fd8bf',
    flag: '#3fbf9f',
    emblem: 'star',
    laugh: 980,
    look: { id: 'nina', name: 'Nina', gender: 'girl', skin: '#c98f68', hair: '#141010', hairstyle: 'buns', outfit: 'overalls', top: '#ffd166', bottom: '#3fbf9f', shoes: '#ffffff', accent: '#7fd8bf' },
  },
  sam: {
    name: 'Sam',
    color: '#ffb38a',
    flag: '#f6907a',
    emblem: 'heart',
    laugh: 700,
    look: { id: 'sam', name: 'Sam', gender: 'boy', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'curly', outfit: 'hoodie', top: '#f6907a', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' },
  },
};

const lighten = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();

// One car, facing +Z, floor at y = 0. Returns { root, tilt, seat, poleTip, flag }.
function carModel(k, d) {
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const g = new THREE.Group();
  tilt.add(g);
  const bump = k.tor(0.7, 0.14, '#3b2b3f', Math.PI * 2, { rough: 0.9 }, 22, 6);
  bump.rotation.x = Math.PI / 2;
  bump.scale.set(1, 1.3, 1);
  bump.position.y = 0.2;
  bump.castShadow = true;
  g.add(bump);
  const body = k.rbox(1.3, 0.42, 1.72, d.color, 0.18);
  body.position.y = 0.36;
  g.add(body);
  g.add(k.at(k.rbox(1.02, 0.2, 0.46, lighten(d.color, 0.35), 0.08), 0, 0.6, 0.58));
  g.add(k.at(k.rbox(0.86, 0.14, 0.52, '#fff4e3', 0.05), 0, 0.58, -0.22));
  g.add(k.at(k.rbox(0.92, 0.5, 0.16, '#fff4e3', 0.06), 0, 0.82, -0.56));
  g.add(k.at(k.rbox(1.22, 0.2, 0.42, d.color, 0.08), 0, 0.62, -0.7));
  const col = k.cyl(0.03, 0.03, 0.34, '#3b2b3f', 6);
  col.rotation.x = -0.6;
  col.position.set(0, 0.7, 0.36);
  g.add(col);
  const wheel = k.tor(0.13, 0.026, '#3b2b3f', Math.PI * 2, undefined, 12, 4);
  wheel.rotation.x = -0.9;
  wheel.position.set(0, 0.82, 0.28);
  g.add(wheel);
  for (const s of [-1, 1]) g.add(k.at(k.sph(0.075, '#fff3c4', undefined, 8), s * 0.38, 0.44, 0.86));
  const em = d.emblem === 'heart' ? k.heart(0.3, 0.05, '#ffffff') : k.star(0.17, 0.08, 0.05, '#ffffff');
  em.rotation.x = -Math.PI / 2;
  em.position.set(0, 0.715, 0.6);
  g.add(em);
  // the pole up to the ceiling grid, a contact shoe on top and the driver's little flag
  const poleH = GRID_Y - 0.62;
  g.add(k.at(k.cyl(0.028, 0.028, poleH, '#d3dbe5', 6), 0, 0.62 + poleH / 2, -0.8));
  g.add(k.at(k.cyl(0.07, 0.05, 0.12, '#f4c24f', 8), 0, GRID_Y - 0.06, -0.8));
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.34, 0, 0, -0.17, 0.42], 3));
  flagGeo.computeVertexNormals();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: d.flag, side: THREE.DoubleSide, roughness: 0.7 }));
  flag.position.set(0, 2.15, -0.8);
  g.add(flag);
  colorBake(g);
  const seat = new THREE.Group();
  seat.position.set(0, SEAT.y, SEAT.z);
  tilt.add(seat);
  const poleTip = new THREE.Vector3(0, GRID_Y, -0.8);
  return { root, tilt, seat, poleTip };
}

// A mascot sitting in a car, built in the same style as the ones on the park's stage.
function mascotModel(k, kind) {
  const bunny = kind === 'bunny';
  const fur = bunny ? '#ffb3cc' : '#7fb8f0';
  const inner = bunny ? '#ffe3ec' : '#e3f1ff';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const Y0 = 0.33; // hips on the seat, like a kid's
  const torso = k.sph(0.29, fur, undefined, 14);
  torso.scale.set(1, 1.08, 0.9);
  torso.position.y = Y0 + 0.3;
  body.add(torso);
  const belly = k.sph(0.21, inner, undefined, 12);
  belly.scale.set(1, 1.1, 0.55);
  belly.position.set(0, Y0 + 0.27, 0.17);
  body.add(belly);
  for (const s of [-1, 1]) {
    const leg = k.cyl(0.09, 0.1, 0.34, fur, 8);
    leg.rotation.x = Math.PI / 2 - 0.1;
    leg.position.set(s * 0.13, Y0 + 0.08, 0.17);
    body.add(leg);
    const foot = k.sph(0.11, inner, undefined, 8);
    foot.scale.set(1, 0.7, 1.2);
    foot.position.set(s * 0.13, Y0 + 0.06, 0.38);
    body.add(foot);
  }
  if (bunny) {
    body.add(k.at(k.cyl(0.27, 0.36, 0.26, '#c7a6ff', 16), 0, Y0 + 0.13, 0));
    body.add(k.at(k.cyl(0.37, 0.37, 0.04, '#ffffff', 16), 0, Y0 + 0.0, 0));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      body.add(k.at(k.sph(0.028, '#ffffff', undefined, 6), Math.sin(a) * 0.31, Y0 + 0.12, Math.cos(a) * 0.31));
    }
  } else {
    for (const s of [-1, 1]) {
      const bow = k.cone(0.07, 0.13, '#ef5b6f', 8);
      bow.rotation.z = (s * Math.PI) / 2;
      bow.position.set(s * 0.07, Y0 + 0.55, 0.24);
      body.add(bow);
    }
    body.add(k.at(k.sph(0.04, '#c73b45', undefined, 8), 0, Y0 + 0.55, 0.27));
  }
  const arms = [];
  for (const s of [1, -1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.29, Y0 + 0.48, 0.02);
    arm.add(k.at(k.cyl(0.07, 0.075, 0.32, fur, 8), 0, -0.16, 0));
    arm.add(k.at(k.sph(0.085, inner, undefined, 8), 0, -0.34, 0));
    body.add(arm);
    arms.push(arm);
  }
  const head = new THREE.Group();
  head.position.y = Y0 + 0.82;
  body.add(head);
  head.add(k.sph(0.3, fur, undefined, 16));
  const muzzle = k.sph(0.13, inner, undefined, 12);
  muzzle.scale.set(1.2, 0.85, 0.8);
  muzzle.position.set(0, -0.08, 0.23);
  head.add(muzzle);
  head.add(k.at(k.sph(0.045, bunny ? '#ef5b6f' : '#3b2b3f', undefined, 8), 0, -0.03, 0.34));
  for (const s of [-1, 1]) {
    head.add(k.at(k.sph(0.048, '#2a1f2e', undefined, 10), s * 0.11, 0.06, 0.25));
    head.add(k.at(k.sph(0.016, '#ffffff', undefined, 6), s * 0.11 + 0.016, 0.08, 0.29));
    head.add(k.at(k.sph(0.045, '#ff8fb1', undefined, 8), s * 0.19, -0.06, 0.21));
    if (bunny) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.12, 0.24, -0.02);
      ear.rotation.z = -s * 0.2;
      const outer = k.sph(0.08, fur, undefined, 10);
      outer.scale.set(1, 3.1, 0.6);
      outer.position.y = 0.24;
      ear.add(outer);
      const inn = k.sph(0.05, '#ff9eb5', undefined, 8);
      inn.scale.set(1, 3.2, 0.4);
      inn.position.set(0, 0.24, 0.035);
      ear.add(inn);
      head.add(ear);
    } else {
      head.add(k.at(k.sph(0.1, fur, undefined, 10), s * 0.22, 0.22, -0.02));
      const ein = k.sph(0.06, inner, undefined, 8);
      ein.scale.z = 0.4;
      ein.position.set(s * 0.22, 0.22, 0.05);
      head.add(ein);
    }
  }
  let hat = null;
  if (bunny) {
    for (const b of [-1, 1]) {
      const bow = k.cone(0.06, 0.11, '#c7a6ff', 8);
      bow.rotation.z = (b * Math.PI) / 2;
      bow.position.set(0.12 + b * 0.065, 0.31, 0.05);
      head.add(bow);
    }
  } else {
    // the top hat is its own piece: it pops off on a big bump
    hat = new THREE.Group();
    hat.add(k.at(k.cyl(0.12, 0.13, 0.04, '#3b2b3f', 12), 0, 0, 0));
    hat.add(k.at(k.cyl(0.09, 0.09, 0.15, '#3b2b3f', 12), 0, 0.09, 0));
    hat.add(k.at(k.cyl(0.093, 0.093, 0.035, '#ef5b6f', 12), 0, 0.04, 0));
    hat.position.set(0.04, 0.3, 0);
    hat.rotation.z = -0.12;
    head.add(hat);
  }
  // merge each moving part into a couple of meshes
  for (const a of arms) colorBake(a);
  if (hat) colorBake(hat);
  colorBake(head, hat ? [hat] : []);
  colorBake(body, [head, ...arms]);
  for (const a of arms) a.rotation.x = -1.15;
  return { root, body, head, arms, hat };
}

// Build the car and driver for one id. ctx: the arena ctx.
export function makeCar(ctx, id) {
  const k = kit();
  const d = DRIVERS[id];
  const m = carModel(k, d);
  const car = {
    id,
    name: d.name,
    color: d.color,
    d,
    root: m.root,
    tilt: m.tilt,
    seat: m.seat,
    poleTip: m.poleTip,
    kid: null,
    mascot: null,
    head: null,
    arms: null,
    mouth: null,
  };
  if (d.mascot) {
    const mm = mascotModel(k, d.mascot);
    m.seat.add(mm.root);
    mm.root.position.y = -SEAT.y + 0.3; // its own hips sit on the seat
    car.mascot = mm;
    car.head = mm.head;
    car.arms = mm.arms;
    car.hat = mm.hat;
  } else {
    const kid = ctx.makeKid(d.look || id);
    kid.pose = 'drive';
    kid.update(1 / 60, 0, 0, 0, 0);
    if (d.look) {
      // a visitor: one baked mesh, it just bobs along with its car
      K.bakeKid(kid, 0.5);
    } else {
      kid.blob.visible = false;
      K.lowpoly(kid.root, 0.65);
      K.bakeLiveKid(kid);
      // the legs are hidden inside the car, and only the body and head cast shadows
      for (const l of kid.legs) l.visible = false;
      kid.root.traverse((o) => {
        if (o.isMesh) o.castShadow = o === kid.torso || (o.parent === kid.head && !kid.eyes.includes(o)) || o.parent === kid.body;
      });
      car.kid = kid;
      car.head = kid.head;
      car.arms = kid.arms;
      car.mouth = kid.mouth;
    }
    m.seat.add(kid.root);
  }
  return car;
}
