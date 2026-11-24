// Odeh's Home: a warm, sandy desert hill on the west of the island with Roji's family home on top.
// Odeh (Roji's father) gardens and pours coffee, Hanan (her mother) runs out to hug her, little
// Sultan never stops bouncing, and Basem (her brother) drops by with sweets some visits.
// The hill and its props: odeh/hill.js, the house: odeh/house.js, the family: odeh/family.js,
// what happens outside: odeh/outside.js, the home inside: odeh/interior.js and odeh/inside.js.
import { THREE, colorBake, glowTexture } from './odeh/kit.js';
import { hillColliders, LANDING, L2, DOOR, SPOT } from './odeh/layout.js';
import { buildHill } from './odeh/hill.js';
import { buildHouse } from './odeh/house.js';
import { setupOutside } from './odeh/outside.js';
import { buildInterior } from './odeh/interior.js';
import { Family } from './odeh/visit.js';

export default {
  id: 'odeh',
  stop: {
    title: "Odeh's Home",
    tag: "Roji's family",
    icon: 'home',
    color: '#c8743f',
    text: "A golden hill with date palms and a sleepy camel. Up the steps: Odeh's garden and his fire, and the family home where Hanan cooks, Odeh pours coffee, Sultan bounces off the sofa and Basem drops by.",
  },
  icons: {
    'o-tea': 'M7 8h10l-1.5 11a2 2 0 0 1-2 1.7h-3a2 2 0 0 1-2-1.7z M6 8h12 M10 3.5c0 1 1 1 1 2 M14 3.5c0 1 1 1 1 2',
    'o-drop': 'M12 3c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0C6 10.2 9 7 12 3z M9.5 14a2.5 2.5 0 0 0 2.5 2.5',
    'o-ball': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 8l3 2.2-1.1 3.6h-3.8L9 10.2z M12 3v5 M15 10.2l5.2-1.5 M13.9 13.8l3 4 M10.1 13.8l-3 4 M9 10.2 3.8 8.7',
    'o-camera': 'M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'o-pot': 'M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M2.5 10h19 M9 10V8.5a3 3 0 0 1 6 0V10 M9 3.5c0 1 1 1 1 2 M13 3c0 1 1 1 1 2',
    'o-album': 'M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z M5 18a2 2 0 0 1 2-2h12 M9 8h6v4H9z',
    'o-cup': 'M6 9h10v4a5 5 0 0 1-10 0z M16 10h1.5a2 2 0 0 1 0 4H16 M4 20h14 M9 3c0 1.2 1 1.2 1 2.4 M12.5 3c0 1.2 1 1.2 1 2.4',
    'o-plate': 'M3 13h18 M5 13a7 7 0 0 0 14 0 M12 6v2 M8.5 7l1 1.5 M15.5 7l-1 1.5',
  },

  build(ctx) {
    const g = new THREE.Group();
    const out = { g, dynamic: [], colliders: hillColliders(), halos: [] };
    buildHill(ctx, out);
    buildHouse(ctx, out);
    const F = new Family();
    F.glass = out.glass;
    F.glassBase = out.glassBase;
    const outside = setupOutside(ctx, F, out);

    // Soft halos round the lanterns, brighter after dark (one draw call)
    const hg = new THREE.BufferGeometry().setFromPoints(out.halos);
    const haloMat = new THREE.PointsMaterial({ map: glowTexture(), size: 1.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.15, color: '#ffd9a0' });
    const halos = new THREE.Points(hg, haloMat);
    g.add(halos);
    out.dynamic.push(halos);

    // Everything that does not move merges into a few vertex-coloured meshes
    colorBake(g, out.dynamic);

    // Coming out of the house: the game puts the kids at the door at ground height, so the landing in
    // front of the door lets them in for one frame and then lifts them back onto the plateau
    const api = ctx.api;
    let landing = null;
    const findLanding = () => (landing ||= api.space.colliders?.find((c) => c.tag === 'odeh-landing') || null);
    const landingRect = (a) => {
      const O = api.space.origin;
      return Math.abs(a.pos.x - (O.x + LANDING.x)) < LANDING.hw + 0.4 && Math.abs(a.pos.z - (O.z + LANDING.z)) < LANDING.hd + 0.4;
    };
    let exiting = false;
    const onLeaveHouse = () => {
      const c = findLanding();
      if (c) c.h = 0.01;
      exiting = true;
      outside.goodbye();
    };
    const lift = () => {
      if (!exiting) return;
      exiting = false;
      for (const a of [api.roji, api.homama]) {
        if (a && landingRect(a) && a.y < L2 - 0.2) {
          a.y = L2;
          a.vy = 0;
          a.kid.root.position.y = L2;
        }
      }
      const c = findLanding();
      if (c) c.h = L2;
    };

    // The goat wanders round its stake: a small collider follows it so kids do not walk through it
    out.colliders.push({ type: 'circle', x: out.goat.pos.x, z: out.goat.pos.z, r: 0.36, tag: 'odeh-goat' });
    let goatCol = null;
    const moveGoat = () => {
      goatCol ||= api.space.colliders?.find((c) => c.tag === 'odeh-goat') || null;
      if (!goatCol) return;
      const O = api.space.origin;
      goatCol.x = O.x + out.goat.pos.x;
      goatCol.z = O.z + out.goat.pos.z;
    };

    let wasNear = true;
    return {
      group: g,
      dynamic: out.dynamic,
      colliders: out.colliders,
      ground: out.ground,
      hotspots: outside.hotspots,
      pad: SPOT.pad,
      door: { x: DOOR.x, z: DOOR.z },
      badgeY: 10.5,
      interior: {
        title: "Odeh's Home",
        build: (ictx) => buildInterior(ictx, F, { onLeave: onLeaveHouse, outside }),
      },
      update(dt, t, api_) {
        lift();
        F.tick(dt, api_);
        out.fire.update(t, F.night());
        out.camel.update(dt, t);
        out.goat.update(dt, t);
        moveGoat();
        out.well.update(dt);
        haloMat.opacity = 0.12 + F.night() * 0.75;
        outside.update(dt, t);
        // Walking far away: the flower behind Roji's ear and the open bubbles stay here
        const O = api_.space.origin;
        const near = Math.hypot(api_.player.pos.x - O.x, api_.player.pos.z - O.z) < 34;
        if (wasNear && !near) outside.away();
        wasNear = near;
      },
      debug: { F, outside },
    };
  },
};
