import { THREE, C, kit, makeAtlas, colorBake, mat, mergeGeometries, roundRect, FONT } from './school/kit.js';
import { buildSchool } from './school/building.js';
import { buildPlayground, SLIDE, SEESAW } from './school/playground.js';
import { makeBus } from './school/bus.js';
import { buildClassroom } from './school/classroom.js';

// Little Stars Primary: a sweet school with a bell tower, a playground and a yellow bus.
// It stays locked until Roji and Homama have a little one; the playground and the bus are open.

const P = Math.PI;
const BUS = { x: 6.3, z: 5.15 };
const easeIn = (u) => u * u;
const easeOut = (u) => 1 - (1 - u) * (1 - u);
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (u) => Math.max(0, Math.min(1, u));

export default {
  id: 'school',
  stop: {
    title: 'Little Stars Primary',
    tag: 'Waiting for our little one',
    icon: 'school',
    color: '#f5a524',
    text: 'A sweet little school with a bell tower, a playground and a yellow bus. Its doors open when Roji and Homama have a little one.',
  },
  icons: {
    school: 'M3 20.5h18 M5 20.5V11l7-4.5 7 4.5v9.5 M12 6.5V3h3.5v2H12 M10 20.5V16h4v4.5 M12 12.6a1.4 1.4 0 1 0 0-.01',
    bell: 'M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z M10 20.5a2 2 0 0 0 4 0 M12 3.5v2',
    bus: 'M5.5 4h13A1.5 1.5 0 0 1 20 5.5V17H4V5.5A1.5 1.5 0 0 1 5.5 4z M4 11h16 M7 17v2.5 M17 17v2.5 M7.5 14h.01 M16.5 14h.01 M8 7.5h8',
    slide: 'M4 20.5V7 M8.5 20.5V7 M4 9.5h4.5 M4 13h4.5 M4 16.5h4.5 M8.5 7c5 0 5.5 13.5 11.5 13.5',
    seesaw: 'M3 15.5l18-5 M12 13v7 M9 20h6 M5.5 12.5v-2 M18.5 9v-2',
  },

  build(ctx) {
    const { util, size } = ctx;
    const k = kit();
    const { box, rbox, cyl, sph, at, rot } = k;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const add = (...o) => (g.add(...o), o[0]);
    const dyn = (o) => (dynamic.push(o), o);
    const col = (...c) => colliders.push(...c);
    const atlas = makeAtlas(2048, 1024);
    const flowers = []; // [x, y, z, colour index, scale]
    const pickets = []; // [x, z, height, yaw, colour]
    const R = { k, add, dyn, col, atlas, flowers, ctx };

    // Picket fences: one instanced mesh for every picket, rails merged
    R.fence = ([[x0, z0], [x1, z1]], { color = C.white, height = 0.8, colors = null } = {}) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(2, Math.round(len / 0.2));
      const yaw = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        pickets.push([lerp(x0, x1, u), lerp(z0, z1, u), height, yaw, colors ? colors[i % colors.length] : color]);
      }
      for (const y of [0.3, 0.72]) {
        const r = rbox(0.06, 0.07, len, colors ? C.white : color, 0.02);
        r.rotation.y = yaw;
        add(at(r, (x0 + x1) / 2, height * y, (z0 + z1) / 2));
      }
    };

    const school = buildSchool(R);
    const play = buildPlayground(R);

    // ---------------------------------------------------------------- playground fence
    const PASTEL = ['#ff9eb5', '#ffd166', '#7fd8bf', '#8fd3ff', '#c7a6ff'];
    const PX0 = -10.7;
    const PX1 = -3.7;
    const PZ0 = -2.1;
    const PZ1 = 7.6;
    R.fence([[PX0, PZ0], [PX0, PZ1]], { height: 0.7, colors: PASTEL });
    R.fence([[PX0, PZ0], [PX1, PZ0]], { height: 0.7, colors: PASTEL });
    R.fence([[PX0, PZ1], [-6.9, PZ1]], { height: 0.7, colors: PASTEL });
    R.fence([[PX1, PZ0], [PX1, 2.0]], { height: 0.7, colors: PASTEL });
    col(
      { type: 'box', x: PX0, z: (PZ0 + PZ1) / 2, hw: 0.08, hd: (PZ1 - PZ0) / 2 },
      { type: 'box', x: (PX0 + PX1) / 2, z: PZ0, hw: (PX1 - PX0) / 2, hd: 0.08 },
      { type: 'box', x: (PX0 - 6.9) / 2, z: PZ1, hw: (-6.9 - PX0) / 2, hd: 0.08 },
      { type: 'box', x: PX1, z: (PZ0 + 2.0) / 2, hw: 0.08, hd: (2.0 - PZ0) / 2 },
    );
    // Rainbow arch over the playground entrance
    ['#ef5b6f', '#ffb347', '#ffd166', '#7fd36b', '#6fb8ff', '#c7a6ff'].forEach((c, i) => {
      const a = k.tor(1.75 - i * 0.09, 0.05, c, P, { rough: 0.6 }, 24, 6);
      a.rotation.y = P / 2;
      a.scale.y = 1.35; // tall enough for the kids to walk under the middle
      add(at(a, PX1 + 0.02, 0, 4.8));
    });
    // The low ends of the arch are solid
    for (const s of [-1, 1]) col({ type: 'box', x: PX1, z: 4.8 + s * 1.42, hw: 0.1, hd: 0.36 });
    for (const s of [-1, 1]) {
      add(at(cyl(0.16, 0.2, 0.22, C.white, 12), PX1, 0.11, 4.8 + s * 1.72));
      col({ type: 'circle', x: PX1, z: 4.8 + s * 1.72, r: 0.2 });
    }

    // ---------------------------------------------------------------- bus
    const bus = makeBus(k, atlas);
    bus.root.position.set(BUS.x, 0, BUS.z);
    add(dyn(bus.root));
    col({ type: 'box', x: BUS.x - 0.05, z: BUS.z + 0.05, hw: 3.3, hd: 1.25 });
    // Parking bay lines
    for (const x of [BUS.x - 3.55, BUS.x + 3.6]) add(at(box(0.1, 0.012, 2.6, '#ffffff'), x, 0.006, BUS.z));
    const bay = atlas.panel(2.6, 0.42, 620, 100, (c, w, h) => {
      c.fillStyle = '#dcdde6';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.7}px ${FONT}`;
      c.fillText('SCHOOL BUS', w / 2, h / 2 + 3);
    });
    bay.rotation.x = -P / 2;
    add(at(bay, BUS.x - 0.4, 0.013, BUS.z - 1.45));
    // Bus stop sign by the path
    const stop = new THREE.Group();
    stop.add(at(cyl(0.04, 0.05, 2.0, C.steel, 8), 0, 1.0, 0));
    stop.add(at(rot(cyl(0.33, 0.33, 0.06, C.white, 24), P / 2, 0, 0), 0, 2.05, 0));
    const stopFace = atlas.wrap(new THREE.CircleGeometry(0.3, 28), 256, 256, (c, w, h) => {
      c.fillStyle = '#ffc83d';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#4a4458';
      roundRect(c, w * 0.24, h * 0.2, w * 0.52, h * 0.36, 16);
      c.fill();
      c.fillStyle = '#cfeeff';
      c.fillRect(w * 0.3, h * 0.26, w * 0.4, h * 0.12);
      c.fillStyle = '#4a4458';
      c.beginPath();
      c.arc(w * 0.34, h * 0.58, 14, 0, P * 2);
      c.arc(w * 0.66, h * 0.58, 14, 0, P * 2);
      c.fill();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.14}px ${FONT}`;
      c.fillText('BUS STOP', w / 2, h * 0.78);
    });
    stop.add(at(stopFace, 0, 2.05, 0.035));
    add(at(stop, 2.05, 0, 7.55));
    col({ type: 'circle', x: 2.05, z: 7.55, r: 0.1 });

    // ---------------------------------------------------------------- garden and street side
    const tree = (x, z, s = 1, apples = false) => {
      const t = new THREE.Group();
      t.add(at(cyl(0.16, 0.22, 1.5, C.woodDark, 10), 0, 0.75, 0));
      t.add(at(sph(0.95, C.leaf, { rough: 0.85 }, 16), 0, 2.15, 0));
      t.add(at(sph(0.7, C.leafDark, { rough: 0.85 }, 14), 0.55, 1.8, 0.25));
      t.add(at(sph(0.62, '#7fd36b', { rough: 0.85 }, 14), -0.5, 2.55, 0.1));
      if (apples) for (const [ax, ay, az] of [[0.5, 2.2, 0.75], [-0.4, 1.9, 0.8], [0.1, 2.7, 0.75], [0.9, 1.7, 0.55], [-0.75, 2.4, 0.5]]) t.add(at(sph(0.1, C.red, { rough: 0.4 }, 10), ax, ay, az));
      t.scale.setScalar(s);
      add(at(t, x, 0, z));
      col({ type: 'circle', x, z, r: 0.28 * s });
      // Crown balls low enough to reach a kid's head or body block the way too (widest part below 1.3 m)
      for (const [dx, dy, dz, rr] of [[0, 2.15, 0, 0.95], [0.55, 1.8, 0.25, 0.7], [-0.5, 2.55, 0.1, 0.62]]) {
        const q = 1 - ((Math.min(1.3, Math.max(0.6, dy * s)) - dy * s) / (rr * s)) ** 2;
        if (q > 0 && rr * s * Math.sqrt(q) > 0.3) col({ type: 'circle', x: x + dx * s, z: z + dz * s, r: rr * s * Math.sqrt(q) - 0.18 });
      }
    };
    tree(-9.3, -6.4, 1.05);
    tree(9.2, -6.6, 1.1);
    tree(8.4, -1.4, 0.95, true);
    tree(10.1, 2.0, 0.8);
    tree(-10.2, 8.5, 0.7);
    // Bench by the path
    const bench = (x, z) => {
      const b = new THREE.Group();
      for (const dz of [-0.14, 0, 0.14]) b.add(at(rbox(1.6, 0.06, 0.12, C.wood, 0.02), 0, 0.45, dz));
      for (const y of [0.68, 0.86]) b.add(at(rbox(1.6, 0.11, 0.05, C.wood, 0.02), 0, y, -0.23));
      for (const s of [-1, 1]) {
        b.add(at(rbox(0.08, 0.45, 0.44, '#6fb8ff', 0.03), s * 0.66, 0.225, 0));
        b.add(at(rbox(0.08, 0.6, 0.06, '#6fb8ff', 0.03), s * 0.66, 0.72, -0.23));
      }
      add(at(b, x, 0, z));
      col({ type: 'box', x, z, hw: 0.82, hd: 0.27, h: 0.48 });
    };
    bench(3.3, 1.7);
    // Lamp posts by the street
    for (const s of [-1, 1]) {
      add(at(cyl(0.06, 0.08, 2.4, '#6fb8ff', 10), s * 1.55, 1.2, 8.2));
      add(at(sph(0.22, '#fff6d8', { emissive: '#ffe2a0', ei: 0.7 }, 14), s * 1.55, 2.55, 8.2));
      add(at(cyl(0.16, 0.2, 0.08, '#6fb8ff', 12), s * 1.55, 2.38, 8.2));
      col({ type: 'circle', x: s * 1.55, z: 8.2, r: 0.12 });
    }
    // Street sign
    const sign = ctx.sign(['Primary school', 'Little Stars'], { width: 2.7, height: 1.1, accent: '#ef6f5e', postHeight: 0.75 });
    add(at(sign, -3.0, 0, 8.3));
    col({ type: 'box', x: -3.0, z: 8.25, hw: 1.1, hd: 0.15 });
    // Bushes along the street and the path borders
    for (const [x, z, s] of [[-5.5, 8.6, 1], [-6.6, 8.4, 0.8], [5.0, 8.6, 1], [6.2, 8.5, 0.85], [9.6, 8.5, 1.1], [-0.9, -1.25, 0.6], [0.9, -1.25, 0.6]]) {
      const b = sph(0.45, s > 0.9 ? C.leaf : C.leafDark, { rough: 0.9 }, 12);
      b.scale.set(1.3 * s, 0.85 * s, s);
      add(at(b, x, 0.3 * s, z));
      if (s > 0.7) col({ type: 'circle', x, z, r: 0.45 * s });
    }
    for (let z = 0.4; z < 7.8; z += 0.34) for (const s of [-1, 1]) flowers.push([s * 1.15, 0, z + (s > 0 ? 0.17 : 0), Math.floor((z * 7 + s) % 5 + 5) % 5, 0.85]);
    for (let x = 3.4; x < 9.6; x += 0.32) flowers.push([x, 0, 7.85, Math.floor(x * 3) % 5, 0.95]);
    for (let x = -9.8; x < -4.2; x += 0.3) flowers.push([x, 0, -2.45, Math.floor(x * 5 + 50) % 5, 0.8]);

    // ---------------------------------------------------------------- instanced pickets and flowers
    const pg = mergeGeometries([new THREE.BoxGeometry(0.09, 1, 0.035).translate(0, 0.5, 0), new THREE.ConeGeometry(0.064, 0.09, 4, 1).rotateY(P / 4).translate(0, 1.045, 0)]);
    const fenceMesh = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ roughness: 0.7 }), pickets.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const colr = new THREE.Color();
    pickets.forEach(([x, z, h, yaw, c], i) => {
      m4.compose(v.set(x, 0, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + P / 2), sc.set(1, h, 1));
      fenceMesh.setMatrixAt(i, m4);
      fenceMesh.setColorAt(i, colr.set(c));
    });
    fenceMesh.castShadow = true;
    fenceMesh.receiveShadow = true;
    add(fenceMesh);
    const PETALS = [C.rose, C.pink, '#ffffff', C.sun, C.lilac];
    const petalGeo = mergeGeometries(
      Array.from({ length: 5 }, (_, i) => {
        const s = new THREE.SphereGeometry(0.045, 5, 3);
        s.scale(1, 0.55, 1);
        const a = (i / 5) * P * 2;
        s.translate(Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045);
        return s;
      }),
    );
    const n = flowers.length;
    const blooms = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ roughness: 0.65 }), n);
    const middles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 5, 3), mat(C.sun), n);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.012, 1, 4, 1, true), mat(C.leafDark), n);
    const rnd = util.rng(11);
    flowers.forEach(([x, y, z, ci, s], i) => {
      const h = 0.18 * s;
      m4.compose(v.set(x, y + h, z), q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4)), sc.set(s, s, s));
      blooms.setMatrixAt(i, m4);
      blooms.setColorAt(i, colr.set(PETALS[ci % PETALS.length]));
      m4.compose(v.set(x, y + h + 0.01, z), q.identity(), sc.set(s, s, s));
      middles.setMatrixAt(i, m4);
      m4.compose(v.set(x, y + h / 2, z), q, sc.set(1, h, 1));
      stems.setMatrixAt(i, m4);
    });
    for (const im of [blooms, middles, stems]) {
      im.castShadow = false;
      im.receiveShadow = true;
      add(im);
    }

    // ---------------------------------------------------------------- activities
    const name = (api) => (api.playerId === 'roji' ? 'Roji' : 'Homama');
    const other = (api) => (api.playerId === 'roji' ? 'Homama' : 'Roji');
    const world = (api, x, z, y) => api.world(x, z, y);
    const yawQ = new THREE.Quaternion();
    const tiltQ = new THREE.Quaternion();
    const Y = new THREE.Vector3(0, 1, 0);
    const Z = new THREE.Vector3(0, 0, 1);
    const X = new THREE.Vector3(1, 0, 0);
    let busOn = false;
    let busArm = 0;
    let busSeats = [];
    let slide = null;
    let seesaw = null;

    function rideBus(api) {
      busOn = true;
      busSeats = [0, 1].map((i) => {
        const s = bus.seat(i);
        return { x: BUS.x + s.x, z: BUS.z + s.z, y: s.y, yaw: s.yaw };
      });
      api.sound.honk();
      api.activity({
        label: 'Get off the bus',
        seats: [
          { who: 'player', ...busSeats[0], pose: 'sit' },
          { who: 'partner', ...busSeats[1], pose: 'sit' },
        ],
        focus: { x: BUS.x + 0.2, z: BUS.z + 0.6, y: 1.4, zoom: 0.5 },
        exit: { x: BUS.x + bus.door.x - 0.4, z: BUS.z + 1.75 },
        onEnd: (silent) => {
          busOn = false;
          if (!silent) {
            api.sound.honk();
            api.toast('Next stop: home, sweet home.', 2400);
          }
        },
      });
      api.toast(`All aboard! ${name(api)} and ${other(api)} practise the school run for their little one.`, 3400);
    }

    function playSlide(api) {
      const S = SLIDE;
      slide = { t: 0, cheered: false };
      api.activity({
        label: 'Get off',
        seats: [
          { who: 'player', x: S.ladderX - 0.2, z: S.platZ, y: 0, yaw: P / 2, pose: 'stand', hands: 'carry' },
          { who: 'partner', x: S.x + 1.05, z: S.run1 + 1.0, y: 0, yaw: -2.74, pose: 'stand' },
        ],
        focus: { x: S.x + 0.4, z: 1.2, y: 1.2, zoom: 0.6 },
        exit: { x: S.x - 0.2, z: S.run1 + 0.6 },
        update: (dt) => stepSlide(api, dt),
        onEnd: () => {
          slide = null;
        },
      });
    }

    function stepSlide(api, dt) {
      const S = SLIDE;
      const s = slide;
      if (!s) return;
      s.t += dt;
      const t = s.t;
      const kid = api.player.kid;
      const root = kid.root;
      let x = S.x;
      let y = S.top;
      let z = S.platZ;
      let yaw = 0;
      let tilt = 0;
      if (t < 1.1) {
        const u = clamp01(t / 1.1);
        x = lerp(S.ladderX - 0.2, S.x - 0.5, u);
        y = S.top * u + Math.abs(Math.sin(u * P * 5)) * 0.05;
        z = S.platZ;
        yaw = P / 2;
        kid.pose = 'stand';
        kid.hands = 'carry';
      } else if (t < 1.5) {
        const u = clamp01((t - 1.1) / 0.4);
        x = lerp(S.x - 0.5, S.x, u);
        z = lerp(S.platZ, S.chute0 - 0.05, u);
        yaw = lerp(P / 2, 0, u);
        kid.hands = null;
      } else if (t < 2.7) {
        const u = easeIn(clamp01((t - 1.5) / 1.2));
        if (!s.whee) {
          s.whee = true;
          api.sound.ui('swoosh');
        }
        const ang = Math.atan2(S.top - S.runY, S.chute1 - S.chute0);
        z = lerp(S.chute0, S.chute1, u);
        y = lerp(S.top, S.runY, u) - 0.12;
        tilt = ang;
        kid.pose = 'sit';
        kid.hands = 'wave2';
      } else if (t < 3.05) {
        const u = easeOut(clamp01((t - 2.7) / 0.35));
        z = lerp(S.chute1, S.run1 - 0.2, u);
        y = S.runY - 0.12;
        kid.pose = 'sit';
        kid.hands = 'wave2';
      } else if (t < 3.45) {
        const u = clamp01((t - 3.05) / 0.4);
        z = lerp(S.run1 - 0.2, S.run1 + 0.55, u);
        y = lerp(S.runY, 0, u) + Math.sin(u * P) * 0.35;
        kid.pose = 'stand';
        kid.hands = null;
      } else {
        z = S.run1 + 0.55;
        y = 0;
        if (!s.cheered) {
          s.cheered = true;
          kid.squash = 0.75;
          api.sound.land();
          api.fx.puff(world(api, x, z));
          api.sound.ui('good');
          kid.emote('cheer');
          api.partner.kid.emote('cheer');
          api.toast(['Wheee!', `${name(api)} zooms down the slide. ${other(api)} claps.`, 'One more time? Wheee!'][Math.floor(Math.random() * 3)], 2200);
        }
        if (t > 4.6) api.endActivity();
      }
      root.position.copy(world(api, x, z, y));
      yawQ.setFromAxisAngle(Y, yaw);
      tiltQ.setFromAxisAngle(X, tilt);
      root.quaternion.copy(yawQ).multiply(tiltQ);
    }

    function rideSeesaw(api) {
      const SS = SEESAW;
      seesaw = { t: 0, last: 0 };
      const a0 = play.plank.rotation.z;
      const [l, r] = [play.seesawSeat(-1, a0), play.seesawSeat(1, a0)];
      api.activity({
        label: 'Get off',
        seats: [
          { who: 'player', x: l.x, z: l.z, y: l.y - 0.12, yaw: P / 2, pose: 'sit' },
          { who: 'partner', x: r.x, z: r.z, y: r.y - 0.12, yaw: -P / 2, pose: 'sit' },
        ],
        focus: { x: SS.x, z: SS.z, y: 0.9, zoom: 0.55 },
        exit: { x: SS.x - 0.4, z: SS.z + 0.9 },
        update: (dt) => {
          seesaw.t += dt;
          const a = Math.sin(seesaw.t * 2.2 + 0.6) * 0.2;
          play.plank.rotation.z = a;
          for (const [actor, side, yaw] of [[api.player, -1, P / 2], [api.partner, 1, -P / 2]]) {
            const p = play.seesawSeat(side, a);
            actor.kid.root.position.copy(world(api, p.x, p.z, p.y - 0.12));
            yawQ.setFromAxisAngle(Y, yaw);
            tiltQ.setFromAxisAngle(Z, a);
            actor.kid.root.quaternion.copy(tiltQ).multiply(yawQ);
          }
          const down = Math.sign(Math.cos(seesaw.t * 2.2 + 0.6));
          if (down !== seesaw.last) {
            seesaw.last = down;
            (down > 0 ? api.player : api.partner).kid.squash = 0.85;
            api.sound.ui('tick');
          }
        },
        onEnd: () => {
          seesaw = null;
          play.plank.rotation.z = 0.17;
        },
      });
      api.toast(`Up and down! ${name(api)} and ${other(api)} giggle on the see-saw.`, 2600);
    }

    const hotspots = [
      { x: school.bellPost.x, z: school.bellPost.z + 0.65, r: 1.15, icon: 'bell', label: 'Ring the school bell', act: (api) => school.ring(api) },
      {
        x: 4.6,
        z: -2.55,
        r: 1.3,
        icon: 'school',
        label: 'Peek through the window',
        act: (api) => {
          api.emote('player', 'bow');
          api.fx.heartsAt(api.world(4.6, -3.1, 1.9), 2);
          api.toast('Tiny desks, crayons and a rainbow on the wall. It is all ready for our little one.', 3400);
        },
      },
      { x: BUS.x + bus.door.x, z: BUS.z + 1.75, r: 1.4, icon: 'bus', label: 'Sit in the bus', act: rideBus },
      { x: SLIDE.x, z: SLIDE.run1 + 0.6, r: 1.25, icon: 'slide', label: 'Play on the slide', act: playSlide },
      { x: SEESAW.x, z: SEESAW.z + 0.85, r: 1.1, icon: 'seesaw', label: 'Ride the see-saw', act: rideSeesaw },
    ];

    // Plain-coloured static parts become a few vertex-coloured meshes
    dynamic.push(...colorBake(g, dynamic));

    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      pad: { x: 0, z: size.d / 2 + 1.2 },
      ground: [
        { x: 0, z: 4.3, hw: 1.0, hd: 4.9, color: '#f2e2c6', feather: 0.3 },
        { x: 0, z: -2.15, hw: 2.55, hd: 1.2, color: '#f3e6d3', feather: 0.2 },
        { x: 0, z: -2.95, hw: 6.1, hd: 0.5, color: '#f2e2c6', feather: 0.3 },
        { x: -7.2, z: 2.75, hw: 3.5, hd: 4.85, color: '#f7cdb0', feather: 0.25 },
        { x: BUS.x, z: BUS.z, hw: 3.7, hd: 1.55, color: '#dcdde6', feather: 0.25 },
        { x: 4.4, z: 7.0, hw: 3.4, hd: 0.5, color: '#f2e2c6', feather: 0.25 },
      ],
      door: { x: 0, z: -0.35 },
      interior: {
        title: 'Little Stars Primary',
        locked: () => true,
        lockedLabel: 'Locked for now',
        onLocked: (api) => school.rattle(api),
        build: (ictx) => buildClassroom(ictx),
      },
      update(dt, t, api) {
        school.update(dt, t);
        busArm = Math.max(0, Math.min(1, busArm + (busOn ? 1 : -1) * dt * 2));
        const bob = bus.update(dt, t, busOn, busArm);
        if (busOn && api.activityRunning) {
          for (const [i, a] of [[0, api.player], [1, api.partner]]) a.kid.root.position.y = busSeats[i].y + bob;
        }
      },
    };
  },
};
