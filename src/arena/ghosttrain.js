import * as THREE from 'three';
import { makeAtlas, starGeo, sfx as makeSfx, Tune, damp, clamp, smooth, backOut, rng } from './ghosttrain/parts.js';
import { TIME, ghostGeo, ghostMat, buildCar, SEAT, buildSpider, candyGeo, CANDY_COLORS, buildFlashlight, buildBeam } from './ghosttrain/models.js';
import { pictures, buildLibrary, buildKitchen, buildMirrors, buildGraveyard, buildHall, buildFacade, buildDoor, W, H } from './ghosttrain/rooms.js';
import { overlay } from './ghosttrain/ui.js';
import { bakeLiveKid } from './riding/kit.js';

// Ghost Train: a cute (not scary) ride through Roji Land's funny haunted house. Roji and Homama sit
// in a little car; one holds the flashlight, the other the candy bucket. Shine on the cute ghosts
// to turn them into candy, duck when the friendly spider drops down, and in the grand hall the big
// friendly ghost says BOO (Homama holds Roji's hand). Three rides: each with new rooms, more ghosts
// and a faster car (the library with flying books, the kitchen with dancing pots, the mirror room
// with ghost reflections, the graveyard of pumpkins, and the last ride with the lights out).

const ROUNDS = [
  { name: 'First ride', rooms: ['library', 'kitchen'], speed: 1.55, life: 3.5, per: 7, pinky: 0.1, gold: 0.04, spiders: [1], big: 5, dark: false, tip: 'Shine on the ghosts!' },
  { name: 'Faster ride', rooms: ['mirror', 'graveyard', 'kitchen'], speed: 1.9, life: 2.9, per: 8, pinky: 0.22, gold: 0.07, spiders: [0, 2], big: 7, dark: false, tip: 'Mirror ghosts: find the real one!' },
  { name: 'Lights out', rooms: ['graveyard', 'library', 'mirror', 'kitchen'], speed: 2.25, life: 2.5, per: 8, pinky: 0.28, gold: 0.1, spiders: [0, 1, 3], big: 9, dark: true, tip: 'Lights out! Only your flashlight shows them' },
];
const VALUE = { boo: 1, specs: 1, chef: 2, pinky: 2, gold: 5 };
const LINES = ["I've got you, Roji", 'Hold my hand, Roji', "I'm right here, Roji"];
const picks = new WeakMap(); // who held the flashlight last time (kept for Play again)

export default {
  id: 'ghosttrain',
  title: 'Ghost Train',
  tagline: 'Shine on the cute ghosts',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    const sfx = makeSfx(sound);
    const isTouch = () => document.body.classList.contains('touch');
    const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    let disposed = false;

    // ---------------------------------------------------------------- light and the world
    const env = ctx.env.indoor({ color: '#2b2140' });
    scene.fog = new THREE.Fog('#2b2140', 16, 34);
    env.hemi.color.set('#e7d9ff');
    env.hemi.groundColor.set('#5b4a7a');
    env.hemi.intensity = 1.25;
    env.sun.intensity = 1.0;
    env.sun.color.set('#f4e8ff');
    const sunOff = new THREE.Vector3(-3, 9, 5);
    camera.fov = 52;
    camera.updateProjectionMatrix();

    const atlas = makeAtlas(2048, 2048, { rough: 0.8 });
    atlas.material.map.anisotropy = 4;
    atlas.glowMat = new THREE.MeshBasicMaterial({ map: atlas.material.map, transparent: true, depthWrite: false });
    const P = pictures(atlas);
    const benv = { P, atlas };
    const rooms = { library: buildLibrary(benv), kitchen: buildKitchen(benv), mirror: buildMirrors(benv), graveyard: buildGraveyard(benv) };
    const hall = buildHall(benv);
    const facade = buildFacade(benv);
    for (const r of [...Object.values(rooms), hall]) {
      r.group.visible = false;
      scene.add(r.group);
    }
    scene.add(facade.group);
    const doors = Array.from({ length: 6 }, () => {
      const d = buildDoor(P);
      d.root.visible = false;
      scene.add(d.root);
      return d;
    });

    // ---------------------------------------------------------------- the car, Roji and Homama
    const car = buildCar();
    scene.add(car.root);
    const kids = { roji: ctx.makeKid('roji'), homama: ctx.makeKid('homama') };
    for (const [id, kid] of Object.entries(kids)) {
      kid.pose = 'sit';
      kid.update(1 / 60, 0, 0, 0, 0);
      bakeLiveKid(kid);
      kid.root.position.set(id === 'roji' ? SEAT.x : -SEAT.x, SEAT.y, SEAT.z);
      car.root.add(kid.root);
    }
    // the candy pile in the bucket
    const cGeo = candyGeo();
    const candyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.08 });
    const PILE = 44;
    const pile = new THREE.InstancedMesh(cGeo, candyMat, PILE);
    pile.count = 0;
    pile.frustumCulled = false; // starts empty, so bounds taken then would hide it for good
    pile.castShadow = false;
    {
      const r = rng(3);
      const M = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const c = new THREE.Color();
      for (let i = 0; i < PILE; i++) {
        const a = r() * Math.PI * 2;
        const rad = Math.sqrt(r()) * 0.13;
        q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3));
        M.compose(new THREE.Vector3(Math.cos(a) * rad, 0.08 + i * 0.0055, Math.sin(a) * rad), q, new THREE.Vector3(0.7, 0.7, 0.7));
        pile.setMatrixAt(i, M);
        pile.setColorAt(i, c.set(CANDY_COLORS[i % CANDY_COLORS.length]));
      }
    }
    car.bucket.add(pile);
    // flying candies (from a ghost to the bucket, or spilled by the spider)
    const FLY = 30;
    const flyMesh = new THREE.InstancedMesh(cGeo, candyMat, FLY);
    flyMesh.frustumCulled = false;
    flyMesh.castShadow = false;
    scene.add(flyMesh);
    const flying = Array.from({ length: FLY }, (_, i) => ({ on: false, i, t: 0, dur: 0.6, a: new THREE.Vector3(), b: new THREE.Vector3(), h: 1, spill: false }));
    {
      const c = new THREE.Color();
      for (let i = 0; i < FLY; i++) flyMesh.setColorAt(i, c.set(CANDY_COLORS[(i * 5) % CANDY_COLORS.length]));
    }

    // the flashlight (in the holder's outer hand), its beam and its light
    const torch = buildFlashlight();
    const beam = buildBeam();
    scene.add(beam);
    const spot = new THREE.SpotLight('#fff1cf', 30, 26, 0.24, 0.65, 1.1);
    scene.add(spot, spot.target);

    // ---------------------------------------------------------------- ghosts, the spider, the big ghost
    const geos = {};
    const geoOf = (v) => (geos[v] ||= ghostGeo(v));
    const pool = [];
    const decoys = [];
    const getGhost = (variant) => {
      let g = pool.find((x) => !x.used && x.variant === variant);
      if (!g) {
        const m = new THREE.Mesh(geoOf(variant), ghostMat());
        m.castShadow = false;
        m.visible = false;
        scene.add(m);
        g = { mesh: m, variant, used: false };
        pool.push(g);
      }
      g.used = true;
      return g;
    };
    const getDecoy = () => {
      let d = decoys.find((x) => !x.used);
      if (!d) {
        const m = new THREE.Mesh(geoOf('boo'), ghostMat({ decoy: true }));
        m.visible = false;
        m.renderOrder = 2;
        scene.add(m);
        d = { mesh: m, used: false };
        decoys.push(d);
      }
      d.used = true;
      return d;
    };
    const spider = buildSpider();
    spider.root.visible = false;
    scene.add(spider.root);
    const big = new THREE.Mesh(geoOf('big'), ghostMat());
    big.visible = false;
    scene.add(big);
    // sparkles: little glowing stars that burst out of a caught ghost and fade in the air
    const NSP = 90;
    const spark = new THREE.InstancedMesh(starGeo(0.07, 0.03, 0.02), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), NSP);
    spark.frustumCulled = false;
    scene.add(spark);
    const sparks = Array.from({ length: NSP }, () => ({ life: 0, p: V(), v: V(), r: Math.random() * 6 }));
    let sparkNext = 0;
    const sparkle = (pos, colors, n = 14, speed = 2.2) => {
      const c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const k = sparkNext;
        sparkNext = (sparkNext + 1) % NSP;
        const s = sparks[k];
        s.life = 0.55 + Math.random() * 0.35;
        s.p.copy(pos);
        s.v.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.6));
        spark.setColorAt(k, c.set(colors[i % colors.length]));
      }
      spark.instanceColor.needsUpdate = true;
    };
    const smx = new THREE.Matrix4();
    const sq = new THREE.Quaternion();
    const sqz = new THREE.Quaternion();
    const ZAX = V(0, 0, 1);
    const sv = V();
    const updateSparks = (dt) => {
      for (let i = 0; i < NSP; i++) {
        const s = sparks[i];
        if (s.life <= 0) {
          spark.setMatrixAt(i, smx.makeScale(0, 0, 0));
          continue;
        }
        s.life -= dt;
        s.v.multiplyScalar(1 - 2.5 * dt);
        s.v.y += 0.6 * dt;
        s.p.addScaledVector(s.v, dt);
        s.r += dt * 6;
        sq.copy(cam.quaternion).multiply(sqz.setFromAxisAngle(ZAX, s.r));
        spark.setMatrixAt(i, smx.compose(s.p, sq, sv.setScalar(Math.max(0, Math.min(1, s.life * 2.5)) * 1.6)));
      }
      spark.instanceMatrix.needsUpdate = true;
    };

    // ---------------------------------------------------------------- the screen layer and sounds
    const ui = overlay();
    const tune = new Tune(sound, { volume: 1 });
    sound?.setMusicLevel?.(0.06);

    // ---------------------------------------------------------------- state
    const best = ctx.load('best', { score: 0, stars: 0, rides: 0 });
    const st = {
      phase: 'choose', // choose | intro | ride | boo | shine | leave | fade | done
      ri: 0,
      s: 0,
      v: 0,
      t: 0,
      candy: 0,
      combo: 0,
      bestCombo: 0,
      spawned: 0,
      caught: 0,
      bonks: 0,
      dodged: 0,
      pileN: 0,
      cool: 0,
      duckT: 0,
      duckK: 0,
      cheerT: 0,
      pointT: 0,
      pointAt: null,
      helpCool: 2,
      holdK: 0,
      holdT: 0,
      jumpT: 0,
      shake: 0,
      flashK: 0,
      fadeK: 0,
      camMode: 'intro',
      camBlend: 0,
      hallDone: false,
      booT: 0,
      bigHits: 0,
      bigNeed: 5,
      shineT: 0,
      darkK: 0,
      spiderBonkT: 0,
      introT: 0,
      clack: 0,
      roomIdx: -1,
    };
    let me = ctx.me;
    let helper = ctx.partner;
    let track = null;
    let events = [];
    let live = [];
    let spiders = [];
    let spans = [];
    let usedDoors = [];
    const later = [];
    const after = (sec, fn) => later.push({ t: st.t + sec, fn });
    const reticle = { x: innerWidth / 2, y: innerHeight * 0.45, mode: isTouch() ? 'touch' : 'key', shown: 0, lastPX: -1, lastPY: -1 };
    const dbg = { auto: false, speed: 1, st, live: () => live };
    window.__ghosttrain = dbg;

    // ---------------------------------------------------------------- the track for a round
    const STEP = 0.2;
    function layout(ri) {
      const R = ROUNDS[ri];
      for (const r of [...Object.values(rooms), hall]) r.group.visible = false;
      for (const d of doors) d.root.visible = false;
      const pts = [V(0, 0, 10.5), V(0, 0, 6.8), V(0, 0, 3.2)];
      spans = [];
      usedDoors = [];
      let z = 0;
      const seq = [...R.rooms.map((id) => rooms[id]), hall];
      seq.forEach((room, k) => {
        const zc = z - room.len / 2;
        room.group.position.set(0, 0, zc);
        room.group.visible = true;
        for (const [x, lz] of room.path) {
          const p = V(x, 0, lz + zc);
          if (pts.at(-1).distanceTo(p) > 0.05) pts.push(p);
        }
        spans.push({ room, zc, z0: z, z1: z - room.len, k });
        z -= room.len;
      });
      // doors: the house front and each room's exit
      const doorZ = [0, ...spans.map((sp) => sp.z1)];
      doorZ.forEach((dz, i) => {
        const d = doors[i];
        d.root.visible = true;
        d.root.position.set(0, 0, dz);
        d.set(0);
        d.z = dz;
        d.sound = false;
        usedDoors.push(d);
      });
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      const len = curve.getLength();
      const n = Math.ceil(len / STEP);
      const P0 = curve.getSpacedPoints(n);
      const T0 = P0.map((p, i) => P0[Math.min(n, i + 1)].clone().sub(P0[Math.max(0, i - 1)]).normalize());
      track = { len: (P0.length - 1) * STEP, P: P0, T: T0, n: P0.length };
      // s ranges of each room
      for (const sp of spans) {
        sp.s0 = sAtZ(sp.z0);
        sp.s1 = sAtZ(sp.z1);
      }
      const hs = spans.at(-1);
      hs.stopS = sAtZ(hs.zc + hall.stopZ);
      buildRails();
      st.s = sAtZ(6.8);
      st.v = 0;
      st.hallDone = false;
      planGhosts(ri);
    }
    function sAtZ(z) {
      for (let i = 0; i < track.n; i++) if (track.P[i].z <= z) return i * STEP;
      return track.len;
    }
    const tmpP = V();
    const tmpT = V();
    function at(s, p = tmpP, t = tmpT) {
      const f = clamp(s / STEP, 0, track.n - 1.001);
      const i = Math.floor(f);
      const u = f - i;
      p.copy(track.P[i]).lerp(track.P[i + 1], u);
      t.copy(track.T[i]).lerp(track.T[i + 1], u).normalize();
      return p;
    }
    let rails = null;
    function buildRails() {
      if (rails) {
        for (const m of rails) {
          m.removeFromParent();
          m.geometry.dispose();
        }
      }
      const pos = [];
      const col = [];
      const cA = new THREE.Color('#d9d2f2');
      const cB = new THREE.Color('#3a2d55');
      const right = V();
      const up = V(0, 1, 0);
      const quad = (a, b, c, d, color) => {
        for (const v of [a, b, c, a, c, d]) pos.push(v.x, v.y, v.z), col.push(color.r, color.g, color.b);
      };
      const lp = [];
      for (let i = 0; i < track.n; i += 2) {
        const p = track.P[i];
        right.crossVectors(track.T[i], up).normalize();
        lp.push({ p: p.clone(), r: right.clone() });
      }
      for (let i = 0; i < lp.length - 1; i++) {
        const A = lp[i];
        const B = lp[i + 1];
        const o = (q, off, y) => q.p.clone().addScaledVector(q.r, off).setY(y);
        // the dark guide bed between the rails
        quad(o(A, -0.62, 0.015), o(B, -0.62, 0.015), o(B, 0.62, 0.015), o(A, 0.62, 0.015), cB);
        for (const s of [-0.48, 0.48]) {
          quad(o(A, s - 0.035, 0.07), o(B, s - 0.035, 0.07), o(B, s + 0.035, 0.07), o(A, s + 0.035, 0.07), cA);
          quad(o(A, s - 0.035, 0.015), o(B, s - 0.035, 0.015), o(B, s - 0.035, 0.07), o(A, s - 0.035, 0.07), cA);
          quad(o(A, s + 0.035, 0.07), o(B, s + 0.035, 0.07), o(B, s + 0.035, 0.015), o(A, s + 0.035, 0.015), cA);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      const railMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.25, side: THREE.DoubleSide }));
      railMesh.receiveShadow = true;
      // sleepers
      const count = Math.floor(track.len / 0.7);
      const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.04, 0.14), new THREE.MeshStandardMaterial({ color: '#6b4a8a', roughness: 0.8 }), count);
      const M = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      for (let i = 0; i < count; i++) {
        at(i * 0.7);
        q.setFromAxisAngle(up, Math.atan2(tmpT.x, tmpT.z));
        M.compose(V(tmpP.x, 0.025, tmpP.z), q, V(1, 1, 1));
        sl.setMatrixAt(i, M);
      }
      sl.receiveShadow = true;
      sl.castShadow = false;
      scene.add(railMesh, sl);
      rails = [railMesh, sl];
    }

    // ---------------------------------------------------------------- plan the ghosts of a round
    function planGhosts(ri) {
      const R = ROUNDS[ri];
      const r = rng(1000 + ri * 77 + Math.floor(Math.random() * 100000));
      events = [];
      spiders = [];
      for (const sp of spans) {
        const room = sp.room;
        if (room.type === 'hall') {
          for (let i = 0; i < 2; i++) events.push({ s: sp.s0 + 0.6 + i * 2.2, kind: 'boo', variant: 'boo', mode: 'drift', value: 1, life: R.life, side: i ? 1 : -1 });
          continue;
        }
        const a = sp.s0 + 0.4;
        const b = sp.s1 - 3.2;
        let lastAnchor = null;
        for (let i = 0; i < R.per; i++) {
          const s = a + ((b - a) * (i + 0.15 + r() * 0.7)) / R.per;
          const x = r();
          let kind = x < R.gold ? 'gold' : x < R.gold + R.pinky ? 'pinky' : 'boo';
          if (ri === 0 && i < 2) kind = 'boo';
          let mode;
          if (room.type === 'mirror' && kind === 'boo' && r() < 0.7) mode = 'mirror';
          else if (kind !== 'boo') mode = r() < 0.7 ? 'zig' : 'drift';
          else mode = r() < 0.68 ? 'anchor' : 'drift';
          const ev = { s, kind, variant: kind, mode, value: VALUE[kind], life: R.life * (kind === 'gold' ? 0.72 : 1), side: r() < 0.5 ? -1 : 1, room, zc: sp.zc };
          const cz = at(s).z;
          if (mode === 'anchor') {
            const opts = room.anchors.filter((an) => an !== lastAnchor && an.z + sp.zc < cz - 2.6 && an.z + sp.zc > cz - 9.5);
            if (opts.length) {
              const an = opts[Math.floor(r() * opts.length)];
              lastAnchor = an;
              ev.anchor = an;
              if (an.chef) {
                ev.variant = 'chef';
                ev.kind = 'chef';
                ev.value = VALUE.chef;
              } else if (room.type === 'library' && (an.spec || r() < 0.4)) ev.variant = 'specs';
            } else ev.mode = 'drift';
          }
          if (mode === 'mirror') {
            const ms = room.mirrors.filter((m) => m.z + sp.zc < cz - 3.2 && m.z + sp.zc > cz - 8.5);
            if (ms.length) ev.mirror = ms[Math.floor(r() * ms.length)];
            else ev.mode = 'drift';
          }
          events.push(ev);
        }
      }
      R.spiders.forEach((k) => {
        const sp = spans[k];
        if (!sp) return;
        const s = sp.s0 + (sp.s1 - sp.s0) * (0.45 + r() * 0.2);
        spiders.push({ s, phase: 'wait', t: 0, y: H, told: false });
      });
      events.sort((a, b) => a.s - b.s);
    }

    // ---------------------------------------------------------------- spawning and moving ghosts
    const cam = camera;
    const carPos = V();
    const carFwd = V(0, 0, -1);
    const carRight = V(1, 0, 0);
    const UP = V(0, 1, 0);
    function spawn(ev) {
      const g = getGhost(ev.variant);
      const o = { ev, g, mesh: g.mesh, state: 'in', t: 0, age: 0, life: ev.life, base: V(), d: V(), pos: V(), scale: 1, glow: 0, decoys: [], ph: Math.random() * 6, spun: 0, told: false };
      if (ev.mode === 'anchor') {
        const an = ev.anchor;
        o.base.set(an.x, an.y, an.z + ev.zc);
        o.d.set(...an.d);
        if (an.pot !== undefined) ev.room.popPot(an.pot, ev.life + 0.5);
      } else if (ev.mode === 'mirror') {
        const m = ev.mirror;
        o.base.set(m.s * 3.35, 1.65, m.z + ev.zc);
        for (const [x, rot] of [[m.x, -m.s * (Math.PI / 2)], [-m.x, m.s * (Math.PI / 2)]]) {
          const d = getDecoy();
          d.mesh.visible = true;
          d.mesh.rotation.set(0, rot, 0);
          o.decoys.push({ d, x, rot });
        }
      }
      o.mesh.visible = true;
      o.mesh.scale.setScalar(0.01);
      live.push(o);
      st.spawned++;
      sfx.appear();
    }
    const relPos = (u, out) => out.copy(carPos).addScaledVector(carRight, u.x).addScaledVector(UP, u.y).addScaledVector(carFwd, u.z);
    const uvec = V();
    function moveGhost(o, dt) {
      o.t += dt;
      o.age += dt;
      const ev = o.ev;
      const k = o.state === 'in' ? backOut(Math.min(1, o.t / 0.38)) : o.state === 'out' ? 1 - smooth(o.t / 0.38) : 1;
      if (o.state === 'in' && o.t >= 0.38) {
        o.state = 'live';
        o.t = 0;
      } else if (o.state === 'live' && o.t >= o.life) {
        o.state = 'out';
        o.t = 0;
        sfx.escape();
        if (ev.mode === 'drift' || ev.mode === 'zig') sparkle(o.pos, ['#e4d6ff', '#ffffff'], 6, 1);
      } else if (o.state === 'out' && o.t >= 0.38) return kill(o);
      const lt = o.age;
      const T = st.t + o.ph;
      if (ev.mode === 'anchor') {
        o.pos.copy(o.base).addScaledVector(o.d, ev.anchor.mode === 'pop' || ev.anchor.mode === 'drop' ? k : Math.min(1, k));
        o.pos.y += Math.sin(T * 3.2) * 0.07;
        if (ev.anchor.mode === 'peek') o.pos.addScaledVector(o.d, Math.sin(T * 1.7) * 0.12);
        o.scale = ev.anchor.mode === 'peek' ? 0.45 + 0.55 * Math.min(1, k * 1.5) : Math.max(0.01, k);
      } else if (ev.mode === 'mirror') {
        o.pos.copy(o.base);
        o.pos.y += Math.sin(T * 2.1) * 0.22;
        o.pos.z += Math.sin(T * 1.3) * 0.45;
        o.scale = Math.max(0.01, k);
      } else {
        const u = clamp(lt / (o.life + 0.76), 0, 1);
        if (ev.mode === 'drift') {
          uvec.set(ev.side * (3.3 - u * 4.1), 1.55 + Math.sin(u * Math.PI) * 0.7 + Math.sin(T * 3) * 0.12, 7.4 - u * 2.4);
        } else {
          const f = ev.kind === 'gold' ? 4.2 : 3.0;
          uvec.set(ev.side * 2.5 * Math.cos(lt * f + 0.2), 1.9 + Math.sin(lt * f * 2) * 0.45, 7.2 - u * 1.8);
        }
        relPos(uvec, o.pos);
        o.scale = Math.max(0.01, k);
      }
      if (o.state === 'caught') {
        o.spun += dt;
        const c = o.spun / 0.42;
        o.scale = c < 0.35 ? 1 + c * 0.8 : Math.max(0.01, 1.28 * (1 - (c - 0.35) / 0.65));
        o.pos.y += c * 0.4;
        if (c >= 1) return kill(o);
      }
      const m = o.mesh;
      m.position.copy(o.pos);
      m.scale.setScalar(o.scale * (ev.kind === 'gold' ? 0.9 : 1));
      // face the camera, with a little wobble
      const yaw = Math.atan2(cam.position.x - o.pos.x, cam.position.z - o.pos.z);
      m.rotation.set(Math.sin(T * 2.3) * 0.08, yaw + (o.state === 'caught' ? o.spun * 16 : 0), Math.sin(T * 1.9) * (ev.anchor?.mode === 'peek' ? 0.3 : 0.12));
      for (const dc of o.decoys) {
        dc.d.mesh.position.set(dc.x, o.pos.y, o.pos.z);
        dc.d.mesh.scale.set(o.scale * 0.95, o.scale * 0.95, o.scale * 0.3);
        dc.d.mesh.rotation.set(0, dc.rot, Math.sin(T * 1.9 + 1) * 0.12);
        dc.d.mesh.visible = o.state !== 'caught' && !dc.gone;
      }
    }
    function kill(o) {
      o.mesh.visible = false;
      o.g.used = false;
      for (const dc of o.decoys) {
        dc.d.mesh.visible = false;
        dc.d.used = false;
      }
      o.dead = true;
    }

    // ---------------------------------------------------------------- catching, candy and score
    const comboMul = () => 1 + Math.min(2, Math.floor(st.combo / 5));
    const showScore = () => hud.score(`${st.candy} <span style="font-weight:400;font-size:.8em">candy</span>${comboMul() > 1 ? ` <span style="color:#ef5b6f">x${comboMul()}</span>` : ''}`);
    const scr = V();
    const toScreen = (p, out = { x: 0, y: 0, z: 0, ok: false }) => {
      scr.copy(p).project(cam);
      out.x = ((scr.x + 1) / 2) * innerWidth;
      out.y = ((1 - scr.y) / 2) * innerHeight;
      out.z = scr.z;
      out.ok = scr.z < 1 && scr.z > -1;
      return out;
    };
    const bucketWorld = (out) => car.bucket.localToWorld(out.set(0, 0.2, 0));
    function throwCandy(from, n, { spill = false } = {}) {
      for (let j = 0; j < n; j++) {
        const f = flying.find((x) => !x.on);
        if (!f) return;
        f.on = true;
        f.t = -j * 0.07;
        f.spill = spill;
        f.dur = spill ? 0.8 : 0.55 + Math.random() * 0.15;
        f.a.copy(from).add(V((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3));
        if (spill) f.b.copy(from).addScaledVector(carRight, (Math.random() - 0.5) * 3).addScaledVector(carFwd, -1 - Math.random()).setY(0.05);
        f.h = spill ? 1.0 : 0.9 + Math.random() * 0.4;
      }
    }
    const fm = new THREE.Matrix4();
    const fq = new THREE.Quaternion();
    const fe = new THREE.Euler();
    const fv = V();
    const fs = V();
    const bw = V();
    function updateCandy(dt) {
      bucketWorld(bw);
      for (const f of flying) {
        if (!f.on) {
          flyMesh.setMatrixAt(f.i, fm.makeScale(0, 0, 0));
          continue;
        }
        f.t += dt;
        const u = clamp(f.t / f.dur, 0, 1);
        if (f.t < 0) {
          flyMesh.setMatrixAt(f.i, fm.makeScale(0, 0, 0));
          continue;
        }
        const target = f.spill ? f.b : bw;
        fv.copy(f.a).lerp(target, u);
        fv.y += Math.sin(u * Math.PI) * f.h;
        fq.setFromEuler(fe.set(f.t * 9, f.t * 7, 0));
        fs.setScalar(f.spill ? 1 - u * 0.4 : 1.15 - u * 0.4);
        flyMesh.setMatrixAt(f.i, fm.compose(fv, fq, fs));
        if (u >= 1) {
          f.on = false;
          if (!f.spill) {
            sfx.candy();
            car.bucket.scale.setScalar(1.12);
          }
        }
      }
      flyMesh.instanceMatrix.needsUpdate = true;
      const want = Math.min(PILE, Math.round(st.candy / 2));
      if (pile.count !== want) pile.count = want;
      car.bucket.scale.setScalar(damp(car.bucket.scale.x, 1, 10, dt));
    }
    const sp2 = { x: 0, y: 0, z: 0, ok: false };
    function catchGhost(o, n) {
      o.state = 'caught';
      o.spun = 0;
      st.combo++;
      st.bestCombo = Math.max(st.bestCombo, st.combo);
      st.caught++;
      const pts = o.ev.value * comboMul();
      st.candy += pts;
      throwCandy(o.pos, Math.min(4, o.ev.value));
      sparkle(o.pos, o.ev.kind === 'gold' ? ['#ffd166', '#fff3c4', '#ffffff'] : o.ev.kind === 'pinky' ? ['#ff9eb5', '#ffd1dc', '#ffffff'] : ['#ffffff', '#e4d6ff', '#ffd1dc', '#fff3c4'], o.ev.kind === 'gold' ? 26 : 14);
      toScreen(o.pos, sp2);
      ui.pop(`+${pts}`, sp2.x, sp2.y - 20);
      sfx.caught(n);
      for (const dc of o.decoys) dc.gone = true;
      if (st.combo === 5 || st.combo === 10) hud.message(`Combo x${comboMul()}!`, 900);
      st.cheerT = 0.7;
      showScore();
    }
    const hitsAt = (x, y) => {
      const out = { real: [], decoy: [], spider: false, big: false };
      const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
      const slack = isTouch() ? 38 : 26;
      const radPx = (p, r) => {
        const d = Math.max(0.5, p.distanceTo(cam.position));
        return (r / (d * tanH)) * (innerHeight / 2);
      };
      for (const o of live) {
        if (o.dead || o.state === 'caught' || o.state === 'out' || (o.state === 'in' && o.t < 0.08)) continue;
        toScreen(o.pos, sp2);
        if (!sp2.ok) continue;
        if (Math.hypot(sp2.x - x, sp2.y - y) < radPx(o.pos, 0.45 * o.scale) + slack) out.real.push(o);
        for (const dc of o.decoys) {
          if (dc.gone) continue;
          toScreen(dc.d.mesh.position, sp2);
          if (sp2.ok && Math.hypot(sp2.x - x, sp2.y - y) < radPx(dc.d.mesh.position, 0.4) + slack * 0.6) out.decoy.push({ o, dc });
        }
      }
      if (big.visible && (st.phase === 'shine')) {
        toScreen(big.position.clone().setY(big.position.y + big.scale.y * 0.15), sp2);
        if (sp2.ok && Math.hypot(sp2.x - x, sp2.y - y) < radPx(big.position, 0.5 * big.scale.x) + slack) out.big = true;
      }
      return out;
    };
    function flash(x, y) {
      if (st.cool > 0 || st.duckK > 0.5) return;
      st.cool = 0.26;
      st.flashK = 1;
      ui.zap();
      sfx.flash();
      const h = hitsAt(x, y);
      if (h.big) return hitBig();
      if (h.real.length) {
        h.real.forEach((o, i) => catchGhost(o, i + 1));
        if (h.real.length > 1) {
          st.candy += h.real.length;
          hud.message(h.real.length === 2 ? 'Double!' : 'Triple!', 900);
          showScore();
        }
        return;
      }
      if (h.decoy.length) {
        const { o, dc } = h.decoy[0];
        dc.gone = true;
        sparkle(dc.d.mesh.position, ['#e4d6ff', '#ffffff', '#b9c8ff'], 16, 1.6);
        sfx.reflection();
        toScreen(dc.d.mesh.position, sp2);
        ui.pop('Only a reflection!', sp2.x, sp2.y - 10, true);
        if (st.combo >= 5) hud.message('Combo lost', 700);
        st.combo = 0;
        showScore();
        void o;
        return;
      }
      if (live.some((o) => !o.dead && o.state !== 'caught') || st.phase === 'shine') {
        sfx.fizz();
        if (st.combo >= 5) hud.message('Combo lost', 700);
        st.combo = 0;
        showScore();
      }
    }

    // ---------------------------------------------------------------- the big friendly ghost
    function hitBig() {
      st.bigHits++;
      big.scale.multiplyScalar(0.93);
      st.bigSquash = 1;
      sfx.giggle(true);
      const p = big.position.clone().setY(big.position.y + 1.2);
      throwCandy(p, 1);
      st.candy += 1;
      sparkle(p, ['#ffffff', '#e4d6ff', '#ffd166'], 14, 3);
      showScore();
      ui.meter(true, `${st.bigHits} / ${st.bigNeed}`, st.bigHits / st.bigNeed);
      if (st.bigHits >= st.bigNeed) bigDone(true);
    }
    function bigDone(won) {
      st.phase = 'leave';
      st.leaveT = 0;
      ui.meter(false);
      const p = big.position.clone().setY(big.position.y + 1.4);
      if (won) {
        const bonus = 10;
        st.candy += bonus;
        throwCandy(p, 12);
        fx.burst(p, ['#ff9eb5', '#ffd166', '#7fd8bf', '#c7a6ff', '#ffffff'], 50);
        sparkle(p, ['#ff9eb5', '#ffd166', '#7fd8bf', '#c7a6ff', '#ffffff'], 40, 4);
        sfx.shower();
        hud.message('Candy shower!', 1300);
        bubbleOn(big, 'Thank you! Bye bye!', { life: 2, dy: 2.9 });
      } else {
        st.candy += 3;
        throwCandy(p, 3);
        sfx.giggle(true);
        bubbleOn(big, 'Hee hee! Come back soon!', { life: 2, dy: 2.9 });
      }
      showScore();
    }
    const bubbles = [];
    function bubbleOn(target, text, { life = 1.6, cls = '', dy = 0.6 } = {}) {
      const b = ui.bubble(text, { life, cls });
      bubbles.push({ b, target, dy, life });
      return b;
    }
    const headOf = (kid, out) => kid.head.localToWorld(out.set(0, 0.72, 0));

    // ---------------------------------------------------------------- rounds
    function startRound(ri) {
      st.ri = ri;
      const R = ROUNDS[ri];
      for (const o of live) kill(o);
      live = [];
      layout(ri);
      st.phase = 'intro';
      st.introT = 0;
      st.camMode = 'intro';
      st.camBlend = 0;
      st.darkK = 0;
      st.roomIdx = -1;
      spider.root.visible = false;
      big.visible = false;
      hud.title('Ghost Train', `Ride ${ri + 1} of 3: ${R.name}`);
      placeCar(0);
      camPos.set(4.5, 3.4, 16.5);
      camLook.set(0, 4.2, 0);
    }
    function go() {
      st.phase = 'ride';
      const R = ROUNDS[st.ri];
      hud.message(R.tip, 1600);
    }
    async function begin() {
      st.fadeK = 1;
      ui.fade(1, '#2b2140');
      startRound(0);
      showScore();
      hud.hint('Aim with the mouse or arrows, click or Space to shine, E or Shift to duck');
      hud.buttons({ action: 'Duck', jump: null, stick: false });
      st.fadeTarget = 0;
      await new Promise((r) => setTimeout(r, 400));
      if (disposed) return;
      await hud.countdown(3);
      if (disposed) return;
      go();
    }
    function endRound() {
      st.phase = 'fade';
      st.fadeTarget = 1;
      ui.fade(st.fadeK, '#fff8ec');
      after(0.7, () => {
        if (st.ri < ROUNDS.length - 1) {
          startRound(st.ri + 1);
          st.fadeTarget = 0;
          hud.message(`Ride ${st.ri + 1}: ${ROUNDS[st.ri].name}`, 1500);
          after(1.6, go);
        } else finish();
      });
    }
    function finish() {
      st.phase = 'done';
      st.fadeTarget = 0;
      const pct = st.spawned ? st.caught / st.spawned : 0;
      const stars = pct >= 0.78 && st.bonks <= 1 ? 3 : pct >= 0.5 ? 2 : 1;
      const isBest = st.candy > best.score;
      const rec = { score: Math.max(best.score, st.candy), stars: Math.max(best.stars, stars), rides: (best.rides || 0) + 1 };
      ctx.save('best', rec);
      Object.assign(best, rec);
      const line = stars === 3 ? 'Homama gives Roji the biggest lollipop in the bucket.' : stars === 2 ? 'Roji laughed all the way round. Homama never let go of her hand.' : 'What a funny ride! Roji wants to go again, and Homama says yes.';
      // back on the platform outside, holding hands
      for (const o of live) kill(o);
      live = [];
      events = [];
      spiders = [];
      spider.root.visible = false;
      big.visible = false;
      st.s = sAtZ(6.8);
      st.v = 0;
      placeCar(0);
      st.camMode = 'end';
      camPos.copy(carPos).addScaledVector(carFwd, 4.4).addScaledVector(carRight, 0.9).addScaledVector(UP, 1.25);
      camLook.copy(carPos).addScaledVector(UP, 0.25);
      st.holdT = 999;
      kids.homama.squash = 1.2;
      kids.roji.squash = 1.2;
      after(0.5, () => {
        fx.heartsAt(car.root.localToWorld(V(0, 1.9, 0)), 6);
        sfx.heart();
      });
      ctx.finish({
        win: true,
        score: st.candy,
        stars,
        title: stars === 3 ? 'Three stars!' : stars === 2 ? 'Two stars!' : 'One star!',
        text: `${st.candy} candy${isBest && best.rides > 1 ? ' (a new best!)' : ''}. ${st.caught} of ${st.spawned} ghosts, best combo ${st.bestCombo}${st.dodged ? `, ${st.dodged} spider${st.dodged > 1 ? 's' : ''} dodged` : ''}. Best ${rec.score}.<br>${line}`,
      });
    }

    // ---------------------------------------------------------------- the car and the camera
    const kidR = kids.roji;
    const kidH = kids.homama;
    const holderKid = () => kids[me];
    const helperKid = () => kids[helper];
    const outerArm = (id) => kids[id].arms[id === 'roji' ? 0 : 1];
    const innerArm = (id) => kids[id].arms[id === 'roji' ? 1 : 0];
    function attachTorch() {
      torch.root.removeFromParent();
      outerArm(me).add(torch.root);
      torch.root.position.set(0, -0.27, 0.03);
      torch.root.rotation.set(0, 0, 0);
    }
    const camPos = V(5, 3.5, 17);
    const camLook = V(0, 4.5, 0);
    const want = V();
    const wantL = V();
    function placeCar(dt) {
      at(st.s);
      carPos.copy(tmpP);
      carFwd.copy(tmpT);
      carRight.crossVectors(carFwd, UP).normalize();
      car.root.position.copy(carPos);
      car.root.position.y = Math.abs(Math.sin(st.s * 5)) * 0.012 * Math.min(1, st.v);
      const yaw = Math.atan2(carFwd.x, carFwd.z);
      car.root.rotation.y = yaw;
    }
    function updateCamera(dt) {
      const shake = st.shake > 0 ? st.shake : 0;
      if (st.camMode === 'intro') {
        want.set(4.5, 3.4, 16.5);
        wantL.set(0, 4.2, 0);
      } else if (st.camMode === 'boo') {
        // from the side and a little behind: the car, and the big ghost rising ahead
        want.copy(carPos).addScaledVector(carRight, 3.4).addScaledVector(carFwd, -1.2).addScaledVector(UP, 1.9);
        wantL.copy(carPos).addScaledVector(carFwd, 3.2).addScaledVector(UP, 1.6);
      } else if (st.camMode === 'end') {
        // the last picture: the two of them in the car, above the result card
        want.copy(carPos).addScaledVector(carFwd, 4.4).addScaledVector(carRight, 0.9).addScaledVector(UP, 1.25);
        wantL.copy(carPos).addScaledVector(UP, 0.25);
      } else if (st.camMode === 'love') {
        // in front of the car: their faces, holding hands
        want.copy(carPos).addScaledVector(carFwd, 3.1).addScaledVector(carRight, 0.8).addScaledVector(UP, 2.15);
        wantL.copy(carPos).addScaledVector(UP, 1.25);
      } else {
        want.copy(carPos).addScaledVector(carFwd, -3.7).addScaledVector(UP, 3.15);
        wantL.copy(carPos).addScaledVector(carFwd, 7).addScaledVector(UP, 1.2);
      }
      const r = st.camMode === 'boo' || st.camMode === 'love' ? 4.5 : st.camMode === 'intro' ? 3 : 6;
      camPos.x = damp(camPos.x, want.x, r, dt);
      camPos.y = damp(camPos.y, want.y, r, dt);
      camPos.z = damp(camPos.z, want.z, r, dt);
      camLook.x = damp(camLook.x, wantL.x, r + 2, dt);
      camLook.y = damp(camLook.y, wantL.y, r + 2, dt);
      camLook.z = damp(camLook.z, wantL.z, r + 2, dt);
      cam.position.copy(camPos);
      if (shake) cam.position.add(V((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0));
      cam.lookAt(camLook);
      env.sun.position.copy(carPos).add(sunOff);
      env.sun.target.position.copy(carPos);
    }

    // the room the car is in: its light, its animation and the darkness of the last ride
    const hemiCol = new THREE.Color();
    const hemiGround = new THREE.Color();
    function roomLight(dt) {
      const z = carPos.z;
      let sp = spans.find((x) => z <= x.z0 && z > x.z1);
      const idx = sp ? spans.indexOf(sp) : -1;
      if (idx !== st.roomIdx) {
        st.roomIdx = idx;
      }
      const tint = sp ? sp.room.tint : { sky: '#ffe9d6', ground: '#4e6a5a', k: 1.1 };
      hemiCol.set(tint.sky);
      hemiGround.set(tint.ground);
      env.hemi.color.lerp(hemiCol, 1 - Math.exp(-2 * dt));
      env.hemi.groundColor.lerp(hemiGround, 1 - Math.exp(-2 * dt));
      const dark = ROUNDS[st.ri].dark && sp && st.phase !== 'intro' ? 1 : 0;
      st.darkK = damp(st.darkK, dark, 1.5, dt);
      const booDim = st.phase === 'boo' && st.booT < 0.7 ? 0.55 : 1;
      env.hemi.intensity = damp(env.hemi.intensity, tint.k * 1.25 * (1 - st.darkK * 0.68) * booDim, 3, dt);
      env.sun.intensity = 1.0 * (1 - st.darkK * 0.75);
      // animate the rooms near the car
      for (const s2 of spans) if (Math.abs(s2.zc - z) < s2.room.len * 1.2) s2.room.update(dt, st.t);
      facade.update(dt, st.t);
    }

    // doors swing open as the car comes near and close behind it
    function updateDoors(dt) {
      for (const d of usedDoors) {
        const dz = carPos.z - d.z; // positive: the door is ahead
        const open = dz < 3.2 && dz > -3.0 ? 1 : 0;
        const k = damp(d.open, open, open ? 7 : 3, dt);
        if (open && !d.sound && dz < 3.2) {
          d.sound = true;
          sfx.creak();
        }
        if (!open) d.sound = false;
        d.set(k);
      }
    }

    // ---------------------------------------------------------------- kids: aim, duck, hold hands, cheer
    const aim = V(0, 1.5, -6);
    const q1 = new THREE.Quaternion();
    const DOWN = V(0, -1, 0);
    const dv = V();
    function pointArm(arm, target) {
      arm.getWorldPosition(dv);
      dv.subVectors(target, dv).normalize();
      arm.parent.getWorldQuaternion(q1);
      dv.applyQuaternion(q1.invert());
      arm.quaternion.setFromUnitVectors(DOWN, dv);
    }
    function updateKids(dt) {
      st.duckK = damp(st.duckK, st.duckT > 0 ? 1 : 0, 14, dt);
      st.holdK = damp(st.holdK, st.holdT > 0 ? 1 : 0, 6, dt);
      const jump = st.jumpT > 0 ? Math.sin((1 - st.jumpT / 0.35) * Math.PI) : 0;
      for (const [id, kid] of Object.entries(kids)) {
        kid.hands = null;
        if (id === helper && st.cheerT > 0 && st.holdK < 0.5) kid.hands = 'wave2';
        if (st.spiderBonkT > 0) kid.hands = 'wave2';
        kid.update(dt, st.t, 0, 0, 0);
        kid.root.position.y = SEAT.y - 0.3 * st.duckK + jump * 0.16;
        kid.body.rotation.x += 0.62 * st.duckK;
      }
      // the holder points the flashlight at the aim point and turns a little toward it
      const hk = holderKid();
      if (st.duckK < 0.5) pointArm(outerArm(me), aim);
      else outerArm(me).rotation.set(-2.6, 0, me === 'roji' ? -0.3 : 0.3);
      if (st.duckK > 0.3) innerArm(me).rotation.set(-2.6, 0, me === 'roji' ? 0.3 : -0.3);
      const local = car.root.worldToLocal(aim.clone());
      hk.body.rotation.y = clamp(Math.atan2(local.x - hk.root.position.x, local.z - hk.root.position.z) * 0.35, -0.5, 0.5);
      // the helper points at a ghost that is about to get away
      if (st.pointT > 0 && st.pointAt && st.duckK < 0.3) pointArm(outerArm(helper), st.pointAt);
      if (st.duckK > 0.3) for (const a of helperKid().arms) a.rotation.set(-2.6, 0, a === helperKid().arms[0] ? -0.3 : 0.3);
      // holding hands: Homama's left hand (toward Roji) and Roji's right hand meet between the seats
      if (st.holdK > 0.05) {
        const k = st.holdK;
        const a = innerArm('homama');
        const b = innerArm('roji');
        a.rotation.set(-0.55 * k, 0, 0.18 + 0.8 * k);
        b.rotation.set(-0.55 * k, 0, -0.18 - 0.8 * k);
        kidR.body.rotation.z = -0.14 * k;
        kidH.body.rotation.z = 0.06 * k;
        kidR.head.rotation.z = -0.25 * k;
        kidH.head.rotation.y = 0.5 * k * (st.phase === 'boo' ? 1 : 0.4);
      }
      if (st.spiderBonkT > 0) hk.head.rotation.y = Math.sin(st.t * 28) * 0.35;
    }

    // ---------------------------------------------------------------- the spider
    function updateSpider(dt) {
      const v = Math.max(0.6, ROUNDS[st.ri].speed);
      let shown = null;
      for (const sp of spiders) {
        if (sp.phase === 'done') continue;
        const ahead = sp.s - st.s;
        if (sp.phase === 'wait' && ahead < v * 2.7) {
          sp.phase = 'drop';
          sp.t = 0;
          sfx.zip();
        }
        if (sp.phase === 'wait') continue;
        shown = sp;
        sp.t += dt;
        if (sp.phase === 'drop' || sp.phase === 'hang') {
          sp.y = damp(sp.y, 1.62, sp.phase === 'drop' ? 3.2 : 6, dt);
          if (sp.phase === 'drop' && sp.t > 0.9) sp.phase = 'hang';
          if (!sp.told && ahead < v * 1.25) {
            sp.told = true;
            hud.message('Duck!', 900);
            sfx.warn();
            ui.hot('action', true);
            if (dbg.auto) st.duckT = 1.6;
          }
          if (ahead <= 0.15) {
            ui.hot('action', false);
            if (st.duckK > 0.45) {
              sp.phase = 'up';
              sp.t = 0;
              st.dodged++;
              sfx.phew();
              ui.pop('Phew!', innerWidth / 2, innerHeight * 0.35);
              bubbleOn(helperKid(), 'Phew!', { life: 1.2 });
            } else {
              sp.phase = 'bonk';
              sp.t = 0;
              st.bonks++;
              st.spiderBonkT = 1.3;
              sfx.bonk();
              hud.message('Eek!', 900);
              const lose = Math.min(3, st.candy);
              st.candy -= lose;
              if (lose) {
                throwCandy(bucketWorld(V()), lose, { spill: true });
                ui.pop(`-${lose}`, innerWidth / 2, innerHeight * 0.5, true);
              }
              st.combo = 0;
              showScore();
              // Homama brushes the spider off Roji, or Roji laughs and helps him
              bubbleOn(helperKid(), me === 'roji' ? "Shoo, little spider! I've got you, Roji" : 'Hee hee! Shoo, spider!', { life: 1.8 });
            }
          }
        } else if (sp.phase === 'bonk') {
          if (sp.t > 1.3) {
            sp.phase = 'up';
            sp.t = 0;
            sp.y = spider.root.position.y;
            sp.upAt = spider.root.position.clone();
          }
        } else if (sp.phase === 'up') {
          sp.y += dt * 4.5;
          if (sp.y > H + 0.4) sp.phase = 'done';
        }
        // place it
        if (sp.phase === 'bonk') {
          headOf(holderKid(), spider.root.position);
          spider.root.position.y += 0.05;
          spider.thread.scale.y = Math.max(0.01, H - spider.root.position.y);
        } else if (sp.upAt) {
          spider.root.position.set(sp.upAt.x, sp.y, sp.upAt.z);
          spider.thread.scale.y = Math.max(0.01, H - sp.y);
        } else {
          at(sp.s);
          spider.root.position.set(tmpP.x, sp.y, tmpP.z);
          spider.thread.scale.y = Math.max(0.01, H - sp.y);
        }
        spider.root.rotation.y = Math.atan2(cam.position.x - spider.root.position.x, cam.position.z - spider.root.position.z);
        spider.body.rotation.z = Math.sin(st.t * (sp.phase === 'up' ? 14 : 3)) * (sp.phase === 'up' ? 0.25 : 0.12);
        spider.body.position.y = sp.phase === 'hang' ? Math.sin(st.t * 4) * 0.04 : 0;
      }
      spider.root.visible = !!shown;
    }

    // ---------------------------------------------------------------- the hall: BOO
    function updateBoo(dt) {
      const hs = spans.at(-1);
      const bz = hs.zc + hall.bigAt.z;
      if (st.phase === 'boo') {
        st.booT += dt;
        const T = st.booT;
        if (T > 0.7 && !st.booSaid) {
          st.booSaid = true;
          big.visible = true;
          sfx.boo();
          st.shake = 0.12;
          st.jumpT = 0.35;
          kidR.squash = 1.3;
          kidH.squash = 1.3;
          st.camMode = 'boo';
          bubbleOn(big, 'BOO!', { life: 1.5, cls: 'big', dy: 2.8 });
          tune.on = false;
        }
        if (T > 1.6 && st.camMode === 'boo') st.camMode = 'love';
        if (T > 1.15 && !st.held) {
          st.held = true;
          st.holdT = 4.5;
          fx.heartsAt(car.root.localToWorld(V(0, 1.75, 0)), 4);
          sfx.heart();
          bubbleOn(kidH, LINES[st.ri % LINES.length], { life: 1.9, cls: 'love' });
        }
        if (T > 2.8 && !st.giggled) {
          st.giggled = true;
          sfx.giggle(true);
          bubbleOn(big, 'Hee hee! Just kidding!', { life: 1.5, dy: 2.8 });
        }
        if (T > 3.9) {
          st.phase = 'shine';
          st.camMode = 'chase';
          st.shineT = 7;
          st.bigHits = 0;
          st.bigNeed = ROUNDS[st.ri].big;
          hud.message('Shine on the big ghost!', 1300);
          ui.meter(true, `0 / ${st.bigNeed}`, 0);
          tune.on = true;
          tune.next = null;
        }
        const rise = T < 0.7 ? 0 : backOut(Math.min(1, (T - 0.7) / 0.45));
        big.position.set(0, -1.7 + rise * 2.8, bz);
        big.scale.setScalar(3.0);
      } else if (st.phase === 'shine') {
        st.shineT -= dt;
        st.bigSquash = Math.max(0, (st.bigSquash || 0) - dt * 4);
        big.position.set(Math.sin(st.t * 1.1) * 0.9, 1.15 + Math.sin(st.t * 2) * 0.15 + st.bigSquash * 0.1, bz);
        if (st.shineT <= 0) bigDone(false);
        if (dbg.auto && st.cool <= 0) {
          toScreen(big.position.clone().setY(big.position.y + big.scale.y * 0.15), sp2);
          reticle.x = sp2.x;
          reticle.y = sp2.y;
          flash(reticle.x, reticle.y);
        }
      } else if (st.phase === 'leave') {
        st.leaveT += dt;
        const k = Math.min(1, st.leaveT / 1.4);
        big.scale.setScalar(damp(big.scale.x, 1.1, 3, dt));
        big.position.y += dt * (0.5 + k * 3);
        big.rotation.z = Math.sin(st.t * 6) * 0.15;
        if (st.leaveT > 1.6) {
          big.visible = false;
          st.phase = 'ride';
          st.hallDone = true;
          st.camMode = 'chase';
        }
      }
      if (big.visible && st.phase !== 'leave') big.rotation.set(0, Math.atan2(cam.position.x - big.position.x, cam.position.z - big.position.z), Math.sin(st.t * 1.4) * 0.06);
    }

    // ---------------------------------------------------------------- the main loop pieces
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const rd = V();
    function aimPoint() {
      ndc.set((reticle.x / innerWidth) * 2 - 1, -(reticle.y / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const o = ray.ray.origin;
      rd.copy(ray.ray.direction);
      // the beam stops on the ghost under the reticle, or on the walls of the room
      let best = 14;
      const sp = spans[st.roomIdx];
      const top = sp ? H : 7;
      const side = sp ? W / 2 : 7;
      let zMin = sp ? sp.z1 : 0;
      if (rd.z < 0) {
        // through the open door the beam reaches the next room
        const tz = (zMin - o.z) / rd.z;
        const hx = o.x + rd.x * tz;
        const hy = o.y + rd.y * tz;
        if (Math.abs(hx) < 1.25 && hy < 2.8 && spans[st.roomIdx + 1]) zMin = spans[st.roomIdx + 1].z1;
      }
      for (const t of [rd.y < 0 ? -o.y / rd.y : Infinity, rd.y > 0 ? (top - o.y) / rd.y : Infinity, rd.x > 0 ? (side - o.x) / rd.x : rd.x < 0 ? (-side - o.x) / rd.x : Infinity, rd.z < 0 ? (zMin - o.z) / rd.z : Infinity]) {
        if (t > 0.5 && t < best) best = t;
      }
      for (const g of live) {
        if (g.dead || g.state === 'caught') continue;
        const t = rd.dot(dv.subVectors(g.pos, o));
        if (t > 0 && t < best) {
          const dist = dv.addScaledVector(rd, -t).length();
          if (dist < 0.5 * g.scale) best = t;
        }
      }
      aim.copy(o).addScaledVector(rd, best);
      return aim;
    }
    // aim assist for the keyboard: the reticle drifts toward a ghost close to it
    function assist(dt) {
      let bestD = 150;
      let tx = 0;
      let ty = 0;
      for (const o of live) {
        if (o.dead || o.state === 'caught' || o.state === 'out') continue;
        toScreen(o.pos, sp2);
        if (!sp2.ok) continue;
        const d = Math.hypot(sp2.x - reticle.x, sp2.y - reticle.y);
        if (d < bestD) {
          bestD = d;
          tx = sp2.x;
          ty = sp2.y;
        }
      }
      if (bestD < 150) {
        reticle.x = damp(reticle.x, tx, 3.2, dt);
        reticle.y = damp(reticle.y, ty, 3.2, dt);
      }
    }
    function autoPlay() {
      let pick = null;
      let left = 99;
      for (const o of live) {
        if (o.dead || o.state === 'caught' || o.state === 'out' || (o.state === 'in' && o.t < 0.1)) continue;
        toScreen(o.pos, sp2);
        if (!sp2.ok || sp2.x < 20 || sp2.x > innerWidth - 20 || sp2.y < 20 || sp2.y > innerHeight - 20) continue;
        const l = o.life - (o.state === 'live' ? o.t : 0);
        if (l < left) {
          left = l;
          pick = { x: sp2.x, y: sp2.y };
        }
      }
      if (pick) {
        reticle.x = pick.x;
        reticle.y = pick.y;
        if (st.cool <= 0) flash(pick.x, pick.y);
      }
    }
    function helperHints(dt) {
      st.helpCool -= dt;
      st.pointT -= dt;
      if (st.helpCool > 0) return;
      for (const o of live) {
        if (o.dead || o.state !== 'live' || o.told) continue;
        const left = o.life - o.t;
        if (left < 1.0 || o.ev.kind === 'gold') {
          o.told = true;
          st.helpCool = 4.5;
          st.pointT = 1.2;
          st.pointAt = o.pos;
          bubbleOn(helperKid(), o.ev.kind === 'gold' ? 'A golden one!' : 'There!', { life: 1.1 });
          return;
        }
      }
    }

    // test hooks: jump to a ride, a room or the grand hall
    dbg.round = (n) => {
      startRound(n);
      go();
    };
    dbg.room = (k, back = 0.5) => {
      const sp = spans[k];
      if (!sp) return false;
      st.s = (k === spans.length - 1 && sp.stopS ? sp.stopS - 3 : sp.s0) - back;
      events = events.filter((e) => e.s > st.s);
      for (const x of spiders) if (x.s < st.s) x.phase = 'done';
      if (st.phase !== 'ride') go();
      return true;
    };
    dbg.spans = () => spans.map((x) => ({ type: x.room.type, s0: x.s0, s1: x.s1 }));
    // where a test should tap next: the ghost closest to getting away, or the big ghost
    dbg.target = () => {
      if (st.phase === 'shine' && big.visible) {
        toScreen(big.position.clone().setY(big.position.y + big.scale.y * 0.15), sp2);
        return { x: Math.round(sp2.x), y: Math.round(sp2.y), big: true };
      }
      let pick = null;
      let left = 99;
      for (const o of live) {
        if (o.dead || o.state === 'caught' || o.state === 'out' || (o.state === 'in' && o.t < 0.15)) continue;
        toScreen(o.pos, sp2);
        if (!sp2.ok || sp2.x < 30 || sp2.x > innerWidth - 30 || sp2.y < 60 || sp2.y > innerHeight - 30) continue;
        const l = o.life - (o.state === 'live' ? o.t : 0);
        if (l < left) {
          left = l;
          pick = { x: Math.round(sp2.x), y: Math.round(sp2.y), kind: o.ev.kind };
        }
      }
      return pick;
    };
 dbg.decoy = () => {
      for (const o of live) for (const dc of o.decoys) {
        if (dc.gone || o.state !== 'live') continue;
        toScreen(dc.d.mesh.position, sp2);
        if (sp2.ok && sp2.x > 40 && sp2.x < innerWidth - 40) return { x: Math.round(sp2.x), y: Math.round(sp2.y) };
      }
      return null;
    };
   dbg.reticle = () => ({ x: reticle.x, y: reticle.y, mode: reticle.mode });
    dbg.spiderSoon = () => spiders.some((x) => x.told && (x.phase === 'drop' || x.phase === 'hang'));

    // ---------------------------------------------------------------- choose who holds the flashlight
    const remembered = picks.get(ctx.opts);
    if (remembered) {
      me = remembered;
      helper = me === 'roji' ? 'homama' : 'roji';
      attachTorch();
      begin();
    } else {
      layout(0);
      placeCar(0);
      attachTorch();
      hud.buttons({ action: null, jump: null, stick: false });
      const sub = best.score ? `Best ${best.score} candy, ${best.stars} star${best.stars === 1 ? '' : 's'}` : null;
      hud
        .choose({
          title: 'Ghost Train',
          text: 'Who holds the flashlight? The other one holds the candy bucket.',
          options: [
            { id: 'roji', label: 'Roji', sub: sub || 'Homama holds the bucket' },
            { id: 'homama', label: 'Homama', sub: sub || 'Roji holds the bucket' },
          ],
        })
        .then((id) => {
          if (disposed) return;
          me = id || ctx.me;
          helper = me === 'roji' ? 'homama' : 'roji';
          picks.set(ctx.opts, me);
          attachTorch();
          begin();
        });
    }

    // ---------------------------------------------------------------- update
    const lastPointer = { x: -1, y: -1 };
    return {
      update(rdt) {
        const dt = Math.min(0.25, rdt * (dbg.speed || 1));
        st.t += dt;
        TIME.value = st.t;
        for (let i = later.length - 1; i >= 0; i--) {
          if (st.t >= later[i].t) {
            const f = later[i].fn;
            later.splice(i, 1);
            f();
          }
        }
        if (st.phase !== 'choose' && st.phase !== 'done') tune.update(st.phase === 'ride' || st.phase === 'shine' ? 1 + st.ri * 0.08 : 1);
        st.cool -= dt;
        st.duckT -= dt;
        st.cheerT -= dt;
        st.holdT -= dt;
        st.jumpT -= dt;
        st.spiderBonkT -= dt;
        st.shake = Math.max(0, st.shake - dt * 0.4);
        st.flashK = Math.max(0, st.flashK - dt * 5);

        // ---------- input
        const playing = st.phase === 'ride' || st.phase === 'shine' || st.phase === 'boo' || st.phase === 'leave';
        if (playing && !dbg.auto) {
          const pt = input.pointer;
          if (!isTouch() && (pt.x !== lastPointer.x || pt.y !== lastPointer.y) && lastPointer.x >= 0) reticle.mode = 'mouse';
          lastPointer.x = pt.x;
          lastPointer.y = pt.y;
          if (reticle.mode === 'mouse' && !isTouch()) {
            reticle.x = pt.x;
            reticle.y = pt.y;
          }
          const ax = input.axis();
          if (Math.abs(ax.x) > 0.1 || Math.abs(ax.y) > 0.1) {
            reticle.mode = 'key';
            reticle.x = clamp(reticle.x + ax.x * innerHeight * 1.25 * dt, 10, innerWidth - 10);
            reticle.y = clamp(reticle.y - ax.y * innerHeight * 1.25 * dt, 10, innerHeight - 10);
          }
          if (reticle.mode === 'key') assist(dt);
          if (pt.justDown) {
            reticle.x = pt.x;
            reticle.y = pt.y;
            if (isTouch()) reticle.shown = 0.7;
            flash(pt.x, pt.y);
          }
          if (input.pressed('jump') || input.pressed('f')) flash(reticle.x, reticle.y);
          const duckNow = input.pressed('action') || input.pressed('shift') || input.pressed('c');
          if (duckNow) st.duckT = 1.6;
          if (input.held('action') || input.held('shift') || input.held('c')) st.duckT = Math.max(st.duckT, 0.25);
        }
        if (playing && dbg.auto && st.phase === 'ride') autoPlay();
        reticle.shown -= dt;
        const showRet = playing && st.duckK < 0.5 && (isTouch() ? reticle.shown > 0 : true);
        ui.reticle(reticle.x, reticle.y, showRet, false);

        // ---------- the ride
        if (track) {
          const R = ROUNDS[st.ri];
          let target = 0;
          if (st.phase === 'ride') {
            target = R.speed;
            const hs = spans.at(-1);
            if (!st.hallDone && hs.stopS) {
              const left = hs.stopS - st.s;
              target *= clamp(left / 2.2, 0.0, 1);
              if (left < 0.06) {
                st.phase = 'boo';
                st.booT = 0;
                st.booSaid = st.held = st.giggled = false;
                st.v = 0;
              }
            }
          }
          st.v = damp(st.v, target, st.phase === 'ride' ? 2.2 : 6, dt);
          if (st.phase === 'ride' && st.v < 0.25 && target > 0.2) st.v = 0.25;
          st.s = Math.min(track.len - 0.01, st.s + st.v * dt);
          placeCar(dt);
          // rail clacks
          st.clack -= st.v * dt;
          if (st.clack <= 0 && st.v > 0.3) {
            st.clack = 0.7;
            sfx.clack();
          }
          // spawn ghosts as the car reaches their spot
          while (events.length && st.phase === 'ride' && events[0].s <= st.s) spawn(events.shift());
          for (const o of live) if (!o.dead) moveGhost(o, dt);
          live = live.filter((o) => !o.dead);
          updateSpider(dt);
          updateBoo(dt);
          updateDoors(dt);
          roomLight(dt);
          helperHints(dt);
          // out the exit door: into the light
          const hs = spans.at(-1);
          if (st.phase === 'ride' && st.hallDone && carPos.z < hs.z1 + 0.2) endRound();
        }
        updateCandy(dt);
        updateSparks(dt);

        // ---------- the flashlight: beam, light and ghost glow
        aimPoint();
        updateKids(dt);
        updateCamera(dt);
        torch.lens.getWorldPosition(dv);
        const lens = dv.clone();
        const len = Math.max(0.5, lens.distanceTo(aim));
        beam.position.copy(lens);
        beam.lookAt(aim);
        const rad = 0.08 + len * 0.085;
        beam.scale.set(rad, rad, len);
        const beamOn = st.phase !== 'choose' && st.phase !== 'done' && st.duckK < 0.5;
        beam.visible = beamOn;
        beam.material.opacity = (0.13 + st.flashK * 0.35) * (1 + st.darkK * 0.6);
        spot.visible = beamOn;
        spot.position.copy(lens);
        spot.target.position.copy(aim);
        spot.intensity = (26 + st.darkK * 26) * (1 + st.flashK * 3.5);
        const bdir = aim.clone().sub(lens).normalize();
        for (const o of live) {
          const toG = dv.subVectors(o.pos, lens);
          const d = toG.length();
          const inBeam = beamOn && d < 16 && toG.normalize().dot(bdir) > Math.cos(0.18 + 0.4 / Math.max(1, d)) ? 1 : 0;
          o.glow = damp(o.glow, inBeam, 10, dt);
          const base = 0.35 - st.darkK * 0.3;
          o.mesh.material.emissiveIntensity = base + o.glow * (0.4 + st.darkK * 0.4) + (o.ev.kind === 'gold' ? 0.2 + Math.sin(st.t * 10) * 0.1 : 0);
          for (const dc of o.decoys) dc.d.mesh.material.emissiveIntensity = 0.25 - st.darkK * 0.15 + inBeam * 0.2;
        }
        big.material.emissiveIntensity = 0.3 + (st.phase === 'shine' ? 0.25 : 0) - st.darkK * 0.15;

        // ---------- screen bits
        for (let i = bubbles.length - 1; i >= 0; i--) {
          const b = bubbles[i];
          b.life -= dt;
          if (b.life <= 0) {
            bubbles.splice(i, 1);
            continue;
          }
          const p = b.target.isMesh ? b.target.position.clone().setY(b.target.position.y + b.dy) : headOf(b.target, V());
          toScreen(p, sp2);
          b.b.place(clamp(sp2.x, 90, innerWidth - 90), clamp(sp2.y, 70, innerHeight - 20));
        }
        ui.tick(dt);
        if (st.phase === 'intro') {
          st.introT += dt;
          if (st.introT > 0.6) st.camMode = 'intro';
        }
        if (st.phase === 'ride' && st.camMode === 'intro') st.camMode = 'chase';
        st.fadeK = damp(st.fadeK, st.fadeTarget ?? 0, 4.5, dt);
        ui.fade(st.fadeK < 0.01 ? 0 : st.fadeK);
      },
      dispose() {
        disposed = true;
        tune.on = false;
        ui.dispose();
        sound?.setMusicLevel?.(0.25);
        if (window.__ghosttrain === dbg) delete window.__ghosttrain;
      },
    };
  },
};
