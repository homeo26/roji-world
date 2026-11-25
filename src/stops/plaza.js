import { THREE, mat, mesh, Atlas, Screens, bulbMesh, glowTexture, bakePark } from './plaza/kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLOOR, FLOOR_HALF, FOUNTAIN, CART, STAGE } from './plaza/layout.js';
import { buildGarden } from './plaza/garden.js';
import { buildFountain } from './plaza/fountain.js';
import { buildFloor } from './plaza/floor.js';
import { buildStage } from './plaza/stage.js';
import { buildArcade } from './plaza/arcade.js';
import { buildPeople } from './plaza/people.js';

// The Play Park: an outdoor dance park, well north of the back of YumYum. A floor of light-up tiles under
// arches of fairy lights and a mirror ball, a stage with a DJ, the wishing fountain, the arcade kiosk, a
// popcorn cart, benches, flowers and people dancing. main.js reads st.fountain, st.danceFloor and
// st.kiosk, and sets st.dancing while Roji and Homama dance.

const FOOT = { x0: -7.5, x1: 13, z0: -10, z1: 3 };
const BEAT = 0.5; // 120 beats a minute while dancing

// Nature that world.scatterNature plants (the same cached materials), cleared from the park on the first frame
const NATURE = () => [
  mat('#8b5e3c', { rough: 0.9 }),
  mat('#ffffff', { rough: 0.85, flat: true }),
  mat('#ffffff', { rough: 0.9, flat: true }),
  mat('#ffffff', { rough: 0.6, flat: true }),
  mat('#4f9a45'),
  mat('#ffffff', { rough: 1 }),
];

export default {
  build(st, scene) {
    const g = st.group;
    const W = st.world;
    const sceneStart = scene.children.length;
    const ctx = {
      g,
      st,
      col: (c) => st.addCollider(c),
      atlas: new Atlas(1024, 1536),
      bulbs: [],
      glows: [],
      pools: [],
      blossoms: [],
      leaves: [],
      balloons: [],
      glass: [],
      blobs: [],
      screen: new Screens(512, 256),
      dyn: [],
      updaters: [],
    };
    buildGarden(ctx);
    buildFountain(ctx);
    buildFloor(ctx);
    const stage = buildStage(ctx);
    const arcade = buildArcade(ctx);
    buildPeople(ctx, { djAt: stage.djAt, cart: CART });
    const colEnd = W.colliders.length;

    // ------------------------------------------------ flowers and leaves, two instanced meshes
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const inst = (geo, material, list, flatten) => {
      const im = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach((b, i) => {
        m4.compose(v.set(b.x, b.y, b.z), q.setFromEuler(e.set(i * 0.7, i * 1.3, 0)), s.set(b.s, b.flat || flatten ? b.s * 0.35 : b.s * 0.85, b.s));
        im.setMatrixAt(i, m4);
        im.setColorAt(i, new THREE.Color(b.c));
      });
      im.computeBoundingSphere();
      g.add(im);
      ctx.dyn.push(im);
      return im;
    };
    const blossomMesh = inst(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, flatShading: true }), ctx.blossoms);
    blossomMesh.castShadow = false;
    const leafMesh = inst(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), ctx.leaves);
    leafMesh.castShadow = false;
    leafMesh.receiveShadow = true;

    // ------------------------------------------------ lights: bulbs, their halos, glows and pools
    const bulbs = ctx.bulbs;
    const bulbIM = bulbMesh(bulbs);
    g.add(bulbIM);
    ctx.dyn.push(bulbIM);
    const pointCloud = (list, size, at) => {
      const pos = new Float32Array(list.length * 3);
      const colr = new Float32Array(list.length * 3);
      list.forEach((b, i) => pos.set(at(b), i * 3));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: glowTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      pts.frustumCulled = false;
      pts.renderOrder = 4;
      g.add(pts);
      ctx.dyn.push(pts);
      return { pts, colr, geo };
    };
    const halos = pointCloud(bulbs, 0.45, (b) => [b.p.x, b.p.y, b.p.z]);
    const glowS = pointCloud(ctx.glows, 1.6, (b) => [b.x, b.y, b.z]);
    const poolGeo = new THREE.PlaneGeometry(2, 2);
    poolGeo.rotateX(-Math.PI / 2);
    const pools = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), ctx.pools.length);
    ctx.pools.forEach((p, i) => {
      m4.compose(v.set(p.x, 0.05 + i * 0.002, p.z), q.identity(), s.set(p.r, 1, p.r));
      pools.setMatrixAt(i, m4);
      pools.setColorAt(i, new THREE.Color(p.color));
      p.c = new THREE.Color(p.color);
    });
    pools.computeBoundingSphere();
    pools.renderOrder = 1;
    g.add(pools);
    ctx.dyn.push(pools);

    // ------------------------------------------------ balloons on the entrance arch
    const balloons = ctx.balloons;
    const balloonIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }), balloons.length);
    balloons.forEach((b, i) => balloonIM.setColorAt(i, new THREE.Color(b.color)));
    balloonIM.frustumCulled = false;
    balloonIM.castShadow = true;
    g.add(balloonIM);
    ctx.dyn.push(balloonIM);
    const strPos = new Float32Array(balloons.length * 6);
    const strGeo = new THREE.BufferGeometry();
    strGeo.setAttribute('position', new THREE.BufferAttribute(strPos, 3));
    const strings = new THREE.LineSegments(strGeo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }));
    strings.frustumCulled = false;
    g.add(strings);
    ctx.dyn.push(strings);

    // ------------------------------------------------ screens, glass cases and the people's soft shadows
    const screens = ctx.screen.mesh(mergeGeometries);
    g.add(screens);
    ctx.dyn.push(screens);
    const glass = mesh(mergeGeometries(ctx.glass), new THREE.MeshStandardMaterial({ color: '#e8f7ff', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false }), { cast: false });
    g.add(glass);
    ctx.dyn.push(glass);
    const blobGeo = new THREE.CircleGeometry(1, 20);
    blobGeo.rotateX(-Math.PI / 2);
    const blobs = new THREE.InstancedMesh(blobGeo, new THREE.MeshBasicMaterial({ color: '#2b3b2a', transparent: true, opacity: 0.22, depthWrite: false }), ctx.blobs.length);
    ctx.blobs.forEach((b, i) => blobs.setMatrixAt(i, m4.compose(v.set(b.x, b.y, b.z), q.identity(), s.set(b.r, 1, b.r))));
    blobs.computeBoundingSphere();
    blobs.renderOrder = 1;
    g.add(blobs);
    ctx.dyn.push(blobs);

    // ------------------------------------------------ statics: one vertex-coloured mesh per kind of surface
    const skip = new Set();
    for (const d of ctx.dyn) d.traverse((o) => skip.add(o));
    ctx.dyn.push(...bakePark(g, skip, mergeGeometries));

    // ------------------------------------------------ the contract with main.js
    const O = st.origin;
    st.fountain = new THREE.Vector3(O.x + FOUNTAIN.x, 0, O.z + FOUNTAIN.z);
    st.danceFloor = { x: O.x + FLOOR.x, z: O.z + FLOOR.z, half: FLOOR_HALF };
    st.kiosk = new THREE.Vector3(O.x + arcade.kiosk.x, 0, O.z + arcade.kiosk.z);
    st.dancing = false;

    // ------------------------------------------------ the park is ours: no trees or bushes growing through it
    const clearNature = () => {
      const inside = (x, z) => x > O.x + FOOT.x0 && x < O.x + FOOT.x1 && z > O.z + FOOT.z0 && z < O.z + FOOT.z1;
      const nature = new Set(NATURE());
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = sceneStart; i < scene.children.length; i++) {
        const o = scene.children[i];
        if (!o.isInstancedMesh || !nature.has(o.material)) continue;
        let hit = false;
        for (let k = 0; k < o.count; k++) {
          o.getMatrixAt(k, m4);
          if (inside(m4.elements[12], m4.elements[14])) {
            o.setMatrixAt(k, zero);
            hit = true;
          }
        }
        if (hit) o.instanceMatrix.needsUpdate = true;
      }
      const list = W.colliders;
      const plain = (c) => c.type === 'circle' && Object.keys(c).every((k) => ['type', 'x', 'z', 'r', 'h'].includes(k));
      for (let i = list.length - 1; i >= colEnd; i--) if (plain(list[i]) && inside(list[i].x, list[i].z)) list.splice(i, 1);
    };

    // ------------------------------------------------ every frame
    const S = { night: 0, dancing: false, beat: 0, near: 0, forceMessage: 0 };
    st.plazaState = S; // test hook: S.forceMessage = 1 shows the R, heart, H message
    let first = true;
    let far = 0;
    const c = new THREE.Color();
    const tmp = new THREE.Color();
    const off = new THREE.Color('#e9e2d6');
    const rainbow = ['#ff6fa8', '#ffd166', '#6fd3ff', '#b48cff', '#6fe3b8'].map((x) => new THREE.Color(x));
    const update = (dt, t, near) => {
      if (first) {
        first = false;
        clearNature();
        // The park's floating badge hovers over the bandshell instead of over the middle of the park
        if (st.badge) st.badge.position.set(O.x + STAGE.x, st.badge.position.y, O.z + STAGE.z0 + 0.6);
      }
      // Far away: animate at a quarter of the rate
      if (near < 0.02) {
        far += dt;
        if (far < 0.12) return;
        dt = far;
        far = 0;
      }
      dt = Math.min(dt, 0.2);
      S.near = near;
      S.night = THREE.MathUtils.clamp(W.nightGlow ?? 0, 0, 1);
      S.dancing = !!st.dancing;
      S.beat += dt / (S.dancing ? BEAT : 0.9);
      if (S.forceMessage) S.forceMessage += dt / BEAT;
      for (const fn of ctx.updaters) fn(dt, t, S);
      ctx.screen.update(dt, t, S);

      // Fairy lights: warm and twinkly at night, a running chase, all colours to the beat when dancing
      const punch = Math.exp(-(S.beat % 1) * 3.5);
      const dark = S.night;
      const hc = halos.colr;
      bulbs.forEach((b, i) => {
        let I;
        if (b.set === 'fairy' || b.set === 'rib') {
          const wave = 0.5 + 0.5 * Math.cos((b.k * 3 - t * (S.dancing ? 1.2 : 0.25)) * Math.PI * 2);
          I = S.dancing ? 0.45 + 0.55 * wave * (0.6 + 0.4 * punch) : 0.2 + dark * (0.55 + 0.25 * wave) + 0.06 * Math.sin(t * 3 + i * 1.7);
          if (S.dancing) c.copy(rainbow[(i + Math.floor(S.beat)) % rainbow.length]).lerp(b.base, 0.35);
          else c.copy(b.base);
        } else {
          const step = Math.floor(t * (S.dancing ? 8 : 4));
          const on = (i + step) % 3 === 0;
          I = on ? 0.55 + dark * 0.45 : 0.2 + dark * 0.25;
          c.copy(b.base);
        }
        I = Math.min(1, I);
        // Off bulbs by day look like clear glass, lit ones show their colour
        const lit = Math.min(1, I * (0.5 + dark * 0.8 + (S.dancing ? 0.5 : 0)));
        bulbIM.setColorAt(i, tmp.copy(off).lerp(c, lit));
        const h = I * (dark * 0.9 + (S.dancing ? 0.25 : 0));
        hc[i * 3] = c.r * h;
        hc[i * 3 + 1] = c.g * h;
        hc[i * 3 + 2] = c.b * h;
      });
      bulbIM.instanceColor.needsUpdate = true;
      halos.geo.attributes.color.needsUpdate = true;
      halos.pts.visible = dark > 0.03 || S.dancing;
      const glowSet = (cloud, list) => {
        list.forEach((b, i) => {
          c.set(b.color).multiplyScalar(b.k * (dark * 0.85 + 0.03) * (b.big && S.dancing ? 0.75 + punch * 0.5 : 1));
          cloud.colr.set([c.r, c.g, c.b], i * 3);
        });
        cloud.geo.attributes.color.needsUpdate = true;
        cloud.pts.visible = dark > 0.03;
      };
      glowSet(glowS, ctx.glows);
      ctx.pools.forEach((p, i) => {
        const k = p.floor ? p.k * (dark * 0.7 + (S.dancing ? 0.25 + punch * 0.35 * (0.4 + dark) : 0)) : p.k * dark;
        pools.setColorAt(i, c.copy(p.c).multiplyScalar(k));
      });
      pools.instanceColor.needsUpdate = true;
      pools.visible = dark > 0.03 || S.dancing;

      // Balloons tug on their strings
      balloons.forEach((b, i) => {
        const sx = Math.sin(t * 1.1 + b.ph) * 0.1;
        const sz = Math.cos(t * 0.9 + b.ph) * 0.07;
        const top = v.set(b.x + sx, b.y + b.len, b.z + sz);
        m4.compose(top, q.identity(), s.set(1, 1.18, 1));
        balloonIM.setMatrixAt(i, m4);
        strPos.set([b.x, b.y, b.z, top.x, top.y - 0.22, top.z], i * 6);
      });
      balloonIM.instanceMatrix.needsUpdate = true;
      strGeo.attributes.position.needsUpdate = true;
    };
    return { badgeY: 5.3, dynamic: ctx.dyn, update };
  },
};
