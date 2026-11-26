import * as THREE from 'three';
import { starGeo, heartGeo } from '../../places/school/kit.js';
import { toGeo } from '../../places/park/parts.js';

// Little models for the log flume: the things to catch (stars, fruit, hearts, golden stars, crowns,
// fireflies), what floats in the channel (a sleepy hippo, a barrel, a frog on a lily pad), the water
// blaster for the splash round and what Homama holds over Roji at the big splash.

// Pickup geometries with vertex colours, keyed by kind
export function pickupGeos(k) {
  const colour = (geo, hex) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    const c = new THREE.Color(hex);
    const a = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  };
  const star = colour(starGeo(0.34, 0.15, 0.12), '#ffd166');
  const gold = colour(starGeo(0.5, 0.22, 0.16), '#fff1a8');
  const heart = colour(heartGeo(0.55, 0.16), '#ff5d7a');
  const mango = (() => {
    const g = new THREE.Group();
    const b = k.sph(0.22, '#ffb347', undefined, 12);
    b.scale.set(1, 1.15, 0.9);
    g.add(b);
    const blush = k.sph(0.16, '#ff6f5a', undefined, 10);
    blush.position.set(0.08, 0.06, 0.08);
    g.add(blush);
    const leaf = k.sph(0.1, '#5fb84a', undefined, 8);
    leaf.scale.set(1.6, 0.3, 0.7);
    leaf.position.set(0.08, 0.26, 0);
    g.add(leaf);
    g.add(k.at(k.cyl(0.015, 0.015, 0.08, '#6a4a2a', 5), 0, 0.27, 0));
    return toGeo(g);
  })();
  const berry = (() => {
    const g = new THREE.Group();
    const b = k.cone(0.2, 0.36, '#ef3b4f', 12);
    b.rotation.x = Math.PI;
    g.add(b);
    const top = k.sph(0.2, '#ef3b4f', undefined, 12);
    top.scale.y = 0.45;
    top.position.y = 0.17;
    g.add(top);
    for (let i = 0; i < 5; i++) {
      const lf = k.sph(0.07, '#5fb84a', undefined, 6);
      const a = (i / 5) * Math.PI * 2;
      lf.scale.set(1.5, 0.3, 0.6);
      lf.position.set(Math.cos(a) * 0.08, 0.24, Math.sin(a) * 0.08);
      lf.rotation.y = -a;
      g.add(lf);
    }
    for (let i = 0; i < 9; i++) g.add(k.at(k.sph(0.018, '#fff3a0', undefined, 4), Math.cos(i * 2.4) * 0.14, 0.05 - (i % 3) * 0.08, Math.sin(i * 2.4) * 0.14 + 0.02));
    return toGeo(g);
  })();
  const banana = (() => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 6, 12, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: '#ffe066' }));
      b.rotation.set(0, (i - 1) * 0.35, Math.PI * 1.15);
      b.position.set(0, 0.05, (i - 1) * 0.04);
      g.add(b);
    }
    g.add(k.at(k.cyl(0.03, 0.03, 0.1, '#7a5a2a', 5), 0.16, 0.2, 0));
    return toGeo(g);
  })();
  const crown = (() => {
    const g = new THREE.Group();
    g.add(k.at(k.cyl(0.24, 0.24, 0.18, '#ffd166', 14), 0, 0, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(k.at(k.cone(0.07, 0.18, '#ffd166', 6), Math.cos(a) * 0.21, 0.17, Math.sin(a) * 0.21));
      g.add(k.at(k.sph(0.035, i % 2 ? '#ef5b6f' : '#8fd3ff', undefined, 6), Math.cos(a) * 0.24, 0.0, Math.sin(a) * 0.24));
    }
    return toGeo(g);
  })();
  const firefly = (() => {
    const g = new THREE.Group();
    const b = k.sph(0.12, '#f4ff9a', undefined, 10);
    b.scale.set(0.8, 0.8, 1.2);
    g.add(b);
    g.add(k.at(k.sph(0.08, '#4a3a5a', undefined, 8), 0, 0.02, 0.14));
    for (const s of [-1, 1]) {
      const w = k.sph(0.12, '#e6f6ff', undefined, 8);
      w.scale.set(1, 0.15, 0.55);
      w.position.set(s * 0.13, 0.1, 0);
      w.rotation.z = s * 0.4;
      g.add(w);
    }
    return toGeo(g);
  })();
  return { star, gold, heart, mango, berry, banana, crown, firefly };
}

// Something floating in a lane: { root, bob(t), hit() } with a little reaction when bumped
export function makeFloat(k, kind) {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  if (kind === 'hippo') {
    const purple = '#b9a6d8';
    const head = k.sph(0.55, purple, undefined, 14);
    head.scale.set(1.1, 0.7, 1.2);
    head.position.y = 0.05;
    inner.add(head);
    const snout = k.sph(0.42, '#cbb8e6', undefined, 14);
    snout.scale.set(1.15, 0.6, 0.8);
    snout.position.set(0, 0.0, 0.55);
    inner.add(snout);
    for (const s of [-1, 1]) {
      inner.add(k.at(k.sph(0.07, '#6a5a8a', undefined, 6), s * 0.18, 0.12, 0.88));
      inner.add(k.at(k.sph(0.13, '#ffffff', undefined, 10), s * 0.24, 0.38, 0.32));
      inner.add(k.at(k.sph(0.065, '#3b2b3f', undefined, 8), s * 0.25, 0.4, 0.43));
      const ear = k.sph(0.11, purple, undefined, 8);
      ear.scale.set(1, 1.2, 0.5);
      ear.position.set(s * 0.36, 0.42, -0.1);
      inner.add(ear);
      inner.add(k.at(k.sph(0.08, '#ff9eb5', undefined, 8), s * 0.42, 0.18, 0.5));
    }
    // a little flower behind one ear
    inner.add(k.at(k.sph(0.09, '#ff7fa3', undefined, 8), 0.3, 0.55, 0.0));
  } else if (kind === 'barrel') {
    const b = k.cyl(0.42, 0.42, 0.9, '#c98a55', 14);
    b.rotation.z = Math.PI / 2;
    inner.add(b);
    for (const x of [-0.32, 0, 0.32]) {
      const hoop = k.cyl(0.44, 0.44, 0.06, '#7a6a72', 14);
      hoop.rotation.z = Math.PI / 2;
      hoop.position.x = x;
      inner.add(hoop);
    }
    inner.add(k.at(k.heart(0.32, 0.04, '#ef5b6f'), 0, 0.2, 0.42));
    inner.position.y = 0.05;
  } else {
    // a lily pad with a frog on it
    const pad = k.cyl(0.75, 0.75, 0.06, '#3fa860', 18);
    inner.add(pad);
    const fl = k.sph(0.12, '#ff9eb5', undefined, 8);
    fl.position.set(-0.45, 0.08, 0.3);
    inner.add(fl);
    const frog = new THREE.Group();
    const body = k.sph(0.28, '#7fd06a', undefined, 12);
    body.scale.set(1.1, 0.8, 1);
    frog.add(body);
    for (const s of [-1, 1]) {
      frog.add(k.at(k.sph(0.1, '#7fd06a', undefined, 8), s * 0.15, 0.22, 0.1));
      frog.add(k.at(k.sph(0.06, '#ffffff', undefined, 8), s * 0.15, 0.25, 0.16));
      frog.add(k.at(k.sph(0.035, '#3b2b3f', undefined, 6), s * 0.15, 0.26, 0.21));
      frog.add(k.at(k.sph(0.05, '#ffb7c8', undefined, 6), s * 0.2, 0.05, 0.22));
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 5, 10, Math.PI), new THREE.MeshStandardMaterial({ color: '#3b2b3f' }));
    smile.position.set(0, 0.06, 0.27);
    smile.rotation.z = Math.PI;
    frog.add(smile);
    frog.position.y = 0.22;
    inner.add(frog);
    root.userData.frog = frog;
  }
  // one mesh for the whole thing (and one for the frog, who jumps)
  const frog = root.userData.frog;
  if (frog) frog.removeFromParent();
  const merged = new THREE.Mesh(toGeo(inner), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
  merged.castShadow = true;
  inner.clear();
  inner.add(merged);
  if (frog) {
    const fm = new THREE.Mesh(toGeo(frog), merged.material);
    fm.position.copy(frog.position);
    fm.castShadow = true;
    inner.add(fm);
    root.userData.frog = fm;
  }
  let hitT = -1;
  return {
    root,
    kind,
    hit() {
      hitT = 0;
    },
    update(dt, t, ph) {
      inner.position.y = (kind === 'barrel' ? 0.05 : 0) + Math.sin(t * 2 + ph) * 0.05;
      inner.rotation.z = Math.sin(t * 1.4 + ph) * 0.06;
      if (kind === 'barrel') inner.rotation.x = t * 0.6 + ph;
      if (hitT >= 0) {
        hitT += dt;
        const k2 = hitT;
        if (kind === 'hippo') {
          // dips under and pops back up, blinking
          inner.position.y -= Math.sin(Math.min(1, k2 / 1.2) * Math.PI) * 0.7;
        } else if (kind === 'barrel') {
          inner.rotation.y = Math.sin(k2 * 10) * 0.4 * Math.max(0, 1 - k2);
        } else {
          const fr = root.userData.frog;
          const j = Math.min(1, k2 / 0.9);
          fr.position.y = 0.22 + Math.sin(j * Math.PI) * 1.2;
          fr.rotation.x = -j * Math.PI * 2;
        }
        if (k2 > 1.6) hitT = -1;
      }
    },
  };
}

// The water blaster Roji or Homama holds in the splash round (nozzle at its +Z end)
export function makeBlaster(k) {
  const g = new THREE.Group();
  g.add(k.at(k.rbox(0.16, 0.14, 0.42, '#6fb8ff', 0.05), 0, 0, 0.05));
  g.add(k.at(k.cyl(0.1, 0.1, 0.22, '#ffd166', 12), 0, 0.14, -0.05));
  const nozzle = k.cyl(0.035, 0.045, 0.18, '#ef5b6f', 8);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0, 0.02, 0.33);
  g.add(nozzle);
  g.add(k.at(k.box(0.05, 0.14, 0.06, '#3b2b3f'), 0, -0.1, -0.02));
  const tip = new THREE.Object3D();
  tip.position.set(0, 0.02, 0.43);
  g.add(tip);
  return { root: g, tip };
}

// What Homama holds over Roji at the big splash: a giant leaf, his jacket or a little umbrella
export function makeShield(k, kind) {
  const g = new THREE.Group();
  if (kind === 'leaf') {
    const leaf = k.sph(0.75, '#5fb84a', undefined, 12);
    leaf.scale.set(1.0, 0.08, 1.35);
    g.add(leaf);
    const vein = k.box(0.03, 0.03, 1.9, '#8fd36a');
    vein.position.y = 0.06;
    g.add(vein);
    g.add(k.at(k.cyl(0.03, 0.03, 0.7, '#4a8a3a', 5), 0, -0.3, -0.9));
  } else if (kind === 'jacket') {
    const j = k.box(1.3, 0.05, 1.0, '#3f7bf0');
    g.add(j);
    for (const s of [-1, 1]) g.add(k.at(k.box(0.22, 0.05, 0.9, '#2c5fc0'), s * 0.75, -0.08, 0));
    g.add(k.at(k.box(0.4, 0.06, 0.12, '#ffd166'), 0, 0.03, 0.48));
  } else {
    const canopy = k.sph(0.85, '#ff9eb5', undefined, 14);
    canopy.scale.y = 0.42;
    g.add(canopy);
    g.add(k.at(k.sph(0.05, '#ffffff', undefined, 6), 0, 0.36, 0));
    g.add(k.at(k.cyl(0.02, 0.02, 1.0, '#ffffff', 5), 0, -0.45, 0));
    g.add(k.at(k.heart(0.3, 0.04, '#ef5b6f'), 0, 0.1, 0.8));
  }
  return g;
}
