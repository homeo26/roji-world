import { ICONS } from '../../icons.js';
import * as K from './kit.js';
import * as D from './decor.js';
import * as L from './layout.js';
import { buildShell, bakeCutWalls } from './shell.js';
import { buildCentre } from './centre.js';
import { buildWings } from './wings.js';
import { makePerson, Walker } from './staff.js';
import { Tunes, OUD_SONGS } from './music.js';
import { makeMoments } from './moments.js';
import { bakeZone } from './bake.js';

// Inside Roji's YumYum, a big restaurant laid out like a real one and open at the front like a dollhouse (see
// layout.js for the plan): the entrance with the host stand, the dining room, the open kitchen behind the long
// counter, the garden terrace with a fountain, the lounge with the oud stage and the table reserved for Roji and
// Homama, the main dining room with booths, and the dessert and coffee bar. Rooms at the back sit behind two
// cutaway walls that sink when the player walks behind them. Staff and guests are made with ctx.makeKid.

const { THREE, COL, umat, canvasTexture } = K;

// Line icons for these hotspots (24 x 24 strokes)
ICONS.shake ??= 'M7 9h10l-1.6 11H8.6z M6.5 9a5.5 3.5 0 0 1 11 0 M12 5.5l2.5-3 M9 13.5h6';
ICONS.chef ??= 'M7 13.5a4 4 0 0 1 .9-7.9 4.2 4.2 0 0 1 8.2 0A4 4 0 0 1 17 13.5V19H7z M7 16h10';
ICONS.cup ??= 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16 M9 3.5c0 1.5 1.5 1.5 1.5 3 M12.5 3.5c0 1.5 1.5 1.5 1.5 3';
ICONS.candle ??= 'M9 21h6 M10 21v-9h4v9 M12 12v-2 M12 3.5c1.7 1.9 1.7 3.6 0 4.6c-1.7-1-1.7-2.7 0-4.6z';
ICONS.cake ??= 'M4 20h16 M5 20v-6h14v6 M7.5 14v-3h9v3 M12 11V8.5 M12 4.5c1 1.1 1 2.2 0 2.9c-1-.7-1-1.8 0-2.9z M5 17c2 1 4-1 7 0s5 1 7 0';
ICONS.drop ??= 'M12 3.5c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0c0-2.9 2-5.5 5-9.5z M10 14.5a2 2 0 0 0 2 2';

// Fit a prop so its largest side is `size` metres, base at y = 0, centred.
function fit(obj, size) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  if (b.isEmpty()) return obj;
  const s = new THREE.Vector3();
  b.getSize(s);
  const k = size / Math.max(s.x, s.y, s.z, 1e-3);
  const wrap = new THREE.Group();
  obj.scale.multiplyScalar(k);
  obj.position.set(-((b.min.x + b.max.x) / 2) * k, -b.min.y * k, -((b.min.z + b.max.z) / 2) * k);
  wrap.add(obj);
  return wrap;
}

export function buildYumYumInterior(ctx) {
  const g = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const zones = {};
  for (const n of ['shell', 'kitchen', 'dining', 'terrace', 'lounge', 'east', 'dessert']) {
    zones[n] = new THREE.Group();
    g.add(zones[n]);
  }
  // The entrance is always seen with the dining room, so they bake together
  zones.foyer = zones.dining;
  const S = {
    ctx,
    g,
    atlas: new K.Atlas(2048, 2048),
    dynamic,
    colliders,
    zones,
    cutaway: [],
    bulbs: [],
    O: new THREE.Vector3(),
    col(x, z, hw, hd, h) {
      const c = h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h };
      colliders.push(c);
      return c;
    },
    circ(x, z, r, h) {
      const c = h === undefined ? { type: 'circle', x, z, r } : { type: 'circle', x, z, r, h };
      colliders.push(c);
      return c;
    },
  };
  S.colBox = S.col;
  S.lampMat = umat('#fff0d0', { emissive: '#ffd48a', ei: 0.75, rough: 0.25 });

  buildShell(S);
  const CR = buildCentre(S);
  const WR = buildWings(S);
  const bulbs = D.fairyBulbs(S.bulbs);
  for (const b of bulbs) {
    zones.terrace.add(b);
    dynamic.push(b);
  }

  // ---------------------------------------------------------------- people
  const r = K.rng(7);
  const guest = () => K.guestLook(r);
  const eaters = [];
  const person = (zone, look, o) => {
    const k = makePerson(ctx, look, o);
    zone.add(k.root);
    if (o.mode && o.mode !== 'still') dynamic.push(k.root);
    if (o.eat) {
      const arm = k.arms[1];
      K.colorBake(arm);
      dynamic.push(arm);
      eaters.push({ k, arm, phase: r() * 6, base: arm.rotation.clone() });
    }
    return k;
  };
  const sitAt = (zone, s, o = {}) => person(zone, guest(), { x: s.x, z: s.z, y: o.y ?? L.CHAIR_Y, yaw: s.yaw, pose: 'sit', ...o });
  const staffCol = (x, z) => S.circ(x, z, 0.28);
  // Staff
  const host = person(zones.foyer, { ...guest(), gender: 'girl', name: 'Lina', hairstyle: 'bob', outfit: 'skirt', top: COL.rasp, bottom: '#3b2b3f', shoes: '#3b2b3f', skin: '#e3b08e', hair: '#141010' }, { x: L.HOST.x, z: L.HOST.z - 0.62, yaw: 0, mode: 'arm' });
  staffCol(L.HOST.x, L.HOST.z - 0.62);
  const cook = person(zones.kitchen, { ...guest(), gender: 'boy', name: 'Cook', hairstyle: 'curly', outfit: 'tee-pants', top: '#7fd3a7', bottom: '#2c3e66' }, { x: L.ISLAND.x, z: L.ISLAND.z - 0.85, yaw: 0, mode: 'arm', arms: [0, 1], dress: (k) => K.dressChef(k) });
  staffCol(L.ISLAND.x, L.ISLAND.z - 0.85);
  const barista = person(zones.dessert, { ...guest(), gender: 'girl', name: 'Barista', hairstyle: 'buns', outfit: 'skirt', top: '#ffd166', bottom: '#3b2b3f', skin: '#f2cdb4', hair: '#7a4a26' }, { x: L.BARISTA.x, z: L.BARISTA.z, yaw: 0, mode: 'arm', dress: (k) => K.dressChef(k, { hat: false, trim: COL.rasp }) });
  staffCol(L.BARISTA.x, L.BARISTA.z);
  const oud = D.makeOud();
  const oudist = person(
    zones.lounge,
    { ...guest(), gender: 'boy', name: 'Karim', hairstyle: 'short', outfit: 'tee-pants', top: '#ffffff', bottom: '#2c3e66', shoes: '#3b2b3f', skin: '#c98f68', hair: '#2a1a13', mustache: true },
    {
      x: L.STAGE.x,
      z: L.STAGE.z - 0.05,
      y: L.STAGE.h + 0.12,
      yaw: 0,
      pose: 'sit',
      mode: 'arm',
      arms: [0, 1],
      scale: 1.18,
      dress: (k) => {
        const fez = D.makeFez();
        fez.position.set(0, 0.62, -0.03);
        k.head.add(fez);
        oud.position.set(0.05, 0.52, 0.24);
        oud.rotation.set(0.25, 0, -1.05);
        k.root.add(oud);
      },
    },
  );
  staffCol(L.STAGE.x, L.STAGE.z - 0.05);
  // Waiters: they walk, carrying a tray with a silver cloche
  const tray = () => {
    const t = new THREE.Group();
    // Plain (not metal) so the whole tray bakes into one piece
    t.add(K.at(K.cyl(0.2, 0.2, 0.02, COL.brass, 16, { rough: 0.4 }), 0, 0, 0));
    const cl = K.sph(0.13, K.mat('#e4e8ee', { rough: 0.3 }), undefined, 12);
    cl.scale.y = 0.75;
    t.add(K.at(cl, 0, 0.01, 0));
    t.add(K.at(K.sph(0.025, K.mat('#e4e8ee', { rough: 0.3 }), undefined, 6), 0, 0.11, 0));
    bakeZone(t);
    t.position.set(0, -0.06, 0.05);
    return t;
  };
  const waiter = (look, route, hub) => {
    const s = route[0];
    const k = makePerson(ctx, look, { x: s.x, z: s.z, yaw: s.face ?? 0, mode: 'live', lowPoly: 10, dress: (kk) => K.dressChef(kk, { hat: false, trim: COL.rasp }) });
    g.add(k.root);
    dynamic.push(k.root);
    const w = new Walker(k, route, { hub });
    w.tray = tray();
    k.carry(w.tray);
    w.colIdx = colliders.length;
    S.circ(s.x, s.z, 0.28);
    return w;
  };
  const waiterA = waiter({ ...guest(), gender: 'boy', name: 'Server', hairstyle: 'sidepart', outfit: 'tee-pants', top: '#ffffff', bottom: '#3b2b3f', shoes: '#3b2b3f', skin: '#f2cdb4', hair: '#4a2c1a' }, L.ROUTE_A, L.HUB_A);
  const waiterB = waiter({ ...guest(), gender: 'girl', name: 'Server', hairstyle: 'ponytail', outfit: 'skirt', top: '#ffffff', bottom: COL.rasp, shoes: '#3b2b3f', skin: '#9c6a4a', hair: '#141010' }, L.ROUTE_B, L.HUB_B);
  const walkers = [waiterA, waiterB];
  // Guests at the counter, the tables, the booths, the garden, the majlis and the dessert bar
  for (const [x, eat] of [[-4.0, true], [-1.6, false]]) person(zones.dining, guest(), { x, z: L.STOOL_Z, y: L.STOOL_Y, yaw: Math.PI, pose: 'sit', eat });
  sitAt(zones.dining, CR.t1.N);
  sitAt(zones.dining, CR.t2.W);
  sitAt(zones.dining, CR.t2.E);
  person(zones.foyer, guest(), { x: -3.35, z: 8.75, y: L.SEAT_Y, yaw: 0, pose: 'sit' });
  sitAt(zones.terrace, WR.garden[0].W);
  sitAt(zones.terrace, WR.garden[3].W);
  for (const dz of [-0.7, 0.7]) person(zones.lounge, guest(), { x: L.MAJLIS.x + 0.12, z: L.MAJLIS.z + dz, y: 0.06, yaw: Math.PI / 2, pose: 'sit' });
  sitAt(zones.east, WR.booths[1][0], { y: L.SEAT_Y, eat: true });
  sitAt(zones.east, WR.booths[1][1], { y: L.SEAT_Y });
  sitAt(zones.east, WR.wallBooths[0][0], { y: L.SEAT_Y });
  sitAt(zones.east, WR.wallBooths[0][1], { y: L.SEAT_Y });
  person(zones.dessert, guest(), { x: L.LATTE_STOOLS[0], z: L.LATTE_Z, y: L.STOOL_Y, yaw: Math.PI, pose: 'sit' });

  // ---------------------------------------------------------------- food on the tables (shared props, merged once in)
  const props = ctx.props;
  const propAt = (id, size, x, y, z, ry = 0) =>
    props
      ?.food(id)
      .then((o) => {
        const f = fit(o, size);
        f.position.set(x, y, z);
        f.rotation.y = ry;
        g.add(f);
        return f;
      })
      .catch(() => null);
  const B2 = L.BOOTHS[1];
  const WB = L.WALL_BOOTHS[0];
  const still = [
    propAt('burger', 0.26, B2.x - 0.2, 0.775, B2.z + 0.2, 0.6),
    propAt('milkshake', 0.26, B2.x - 0.2, 0.775, B2.z - 0.2),
    propAt('fries', 0.22, B2.x + 0.2, 0.775, B2.z + 0.1, -0.6),
    propAt('shawarma', 0.26, WB.x - 0.15, 0.775, WB.z - 0.2, 0.4),
    propAt('mansaf', 0.36, WB.x + 0.05, 0.775, WB.z + 0.15),
    propAt('milkshake', 0.24, -4.0, 1.01, L.COUNTER.z + 0.05),
    propAt('spanish-latte', 0.16, L.GARDEN_TABLES[0].x - 0.12, 0.775, L.GARDEN_TABLES[0].z + 0.1),
  ];
  // Cakes under the domes and in the glass case are simple ones of our own (the shared props are detailed)
  for (const d of CR.domes) zones.kitchen.add(K.at(D.miniCake(d.id), d.x, 1.03, d.z));
  WR.cakeSlots.forEach((s, i) => zones.dessert.add(K.at(D.miniCake(['pecan-cake', 'german-cake', 'cupcake', 'donut', 'macarons', 'cookies', 'cupcake', 'pecan-cake'][i % 8]), s.x, s.y, s.z)));
  for (const [x, z, kind] of [[L.T1.x + 0.08, L.T1.z - 0.12, 'cupcake'], [L.T2.x - 0.1, L.T2.z + 0.05, 'pecan-cake'], [L.T3.x, L.T3.z, 'german-cake'], [L.E1.x, L.E1.z + 0.12, 'donut'], [L.GARDEN_TABLES[3].x - 0.1, L.GARDEN_TABLES[3].z, 'macarons'], [L.CAFE[0].x - 0.12, L.CAFE[0].z, 'cookies']]) {
    const zone = x < -L.SX ? zones.terrace : x > L.SX ? (z < L.CW ? zones.dessert : zones.east) : zones.dining;
    zone.add(K.at(D.miniCake(kind), x, 0.775, z));
  }
  Promise.all(still).then((objs) => mergeProps(g, objs.filter(Boolean)));

  // ---------------------------------------------------------------- sprites: music notes, steam, sparkler sparks
  const noteTex = canvasTexture(64, 64, (c) => {
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.beginPath();
    c.ellipse(22, 46, 11, 8, -0.4, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(31, 44);
    c.lineTo(31, 10);
    c.quadraticCurveTo(44, 16, 50, 28);
    c.stroke();
  });
  const notes = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, color: [COL.rasp, COL.band, COL.sun][i % 3], transparent: true, depthWrite: false, opacity: 0 }));
    s.scale.setScalar(0.3);
    s.visible = false;
    g.add(s);
    dynamic.push(s);
    notes.push({ s, life: 0, x: 0 });
  }
  const steam = [];
  for (let i = 0; i < 2; i++) {
    const s = K.glowSprite('#ffffff', 0);
    s.visible = false;
    g.add(s);
    dynamic.push(s);
    steam.push(s);
  }
  // Sparkler sparks: one Points object (a single draw call); a spark that is out sits far below the floor
  const SPARKS = 14;
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3).fill(-50), 3));
  const sparkPts = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: K.glowTexture(), color: '#fff0b8', size: 0.09, transparent: true, depthWrite: false }));
  sparkPts.frustumCulled = false;
  sparkPts.visible = false;
  g.add(sparkPts);
  dynamic.push(sparkPts);
  const sparks = [];
  for (let i = 0; i < SPARKS; i++) sparks.push({ i, life: 0, p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3() });
  const coins = [];

  // ---------------------------------------------------------------- shared parts for the moments
  const later = [];
  const tunes = new Tunes();
  const carried = { roji: null, homama: null };
  const C = {
    S,
    CR,
    WR,
    staff: { host, cook, barista, oudist, waiterA, waiterB },
    tunes,
    carried,
    propAt,
    musicOwner: null,
    ambient: false,
    baristaYaw: 0,
    steamPoint: null,
    steamLeft: 0,
    after: (sec, fn) => later.push({ t: sec, fn }),
    evening: (api) => /Golden|Sunset|Dusk|Night/.test(api.game?.phase?.() || ''),
    // A puff of steam rising from a point (local) n times, or null to stop
    steamAt(p, n = 4) {
      C.steamPoint = p ? p.clone() : null;
      C.steamLeft = p ? n : 0;
    },
    noteAt(api, p) {
      const n = notes.find((q) => q.life <= 0);
      if (!n) return;
      n.life = 1;
      n.x = p.x + (Math.random() - 0.5) * 0.4;
      n.s.position.set(n.x, (p.y || 0) + 1.7, p.z + 0.1);
      n.s.visible = true;
    },
    sparkle(cakeGroup, tip, dt) {
      if (!cakeGroup) {
        for (const q of sparks) q.life = 0;
        return;
      }
      if (Math.random() < dt * 40) {
        const q = sparks.find((z) => z.life <= 0);
        if (q) {
          const w = cakeGroup.localToWorld(tip.clone());
          q.p.copy(g.worldToLocal(w));
          q.v.set((Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 1.2);
          q.life = 1;
        }
      }
    },
    keepCoin(c) {
      coins.push(c);
      if (coins.length > 10) coins.shift().removeFromParent();
    },
  };
  const moments = makeMoments(C);

  // ---------------------------------------------------------------- bake
  // Small moving things cast no shadow (each caster is one more draw call in the shadow pass)
  for (const o of [CR.mixer.spin, CR.mixer.cup, CR.balloons, CR.hourP, CR.minP, CR.fryer.basket, WR.rojiChair, ...eaters.map((e) => e.arm), ...walkers.map((w) => w.tray)]) o.traverse((m) => (m.castShadow = false));
  bakeCutWalls(S);
  for (const z of new Set(Object.values(zones))) {
    K.trimShadows(z, dynamic, { size: 0.3, wallZ: L.Z0 + 0.4 });
    bakeZone(z, dynamic);
  }

  // ---------------------------------------------------------------- update
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  let steamT = 0;
  let greeted = false;
  let hostWave = 0;
  function update(dt, t, api) {
    S.O.copy(api.space.origin);
    for (let i = later.length - 1; i >= 0; i--) {
      later[i].t -= dt;
      if (later[i].t <= 0) {
        const f = later[i].fn;
        later.splice(i, 1);
        f();
      }
    }
    const ev = C.evening(api);
    const ms = moments.state;
    // Waiters: they stop for Roji and Homama (and the girl lets the boy pass first)
    const kids = [api.localPos(api.roji), api.localPos(api.homama)];
    walkers.forEach((w, wi) => {
      if (!w.collider && api.space.colliders?.[w.colIdx]) {
        w.collider = api.space.colliders[w.colIdx];
        w.collider.ox = S.O.x;
        w.collider.oz = S.O.z;
      }
      const blocked = (p, dx, dz) => {
        for (const k of kids) {
          const ox = k.x - p.x;
          const oz = k.z - p.z;
          const d = Math.hypot(ox, oz);
          if (d < 0.6 || (d < 0.85 && (ox * dx + oz * dz) / d > 0.5)) return true;
        }
        if (wi === 1) {
          const o = walkers[0].pos;
          const ox = o.x - p.x;
          const oz = o.z - p.z;
          const d = Math.hypot(ox, oz);
          if (d < 0.9 && (ox * dx + oz * dz) / d > 0.3) return true;
        }
        return false;
      };
      w.update(dt, t, blocked);
      if (w.mode === 'patrol' && !w.kid.carried) w.kid.carry(w.tray);
    });
    // The host waves hello when Roji and Homama come in, and sways along when the staff sing
    if (hostWave > 0) hostWave -= dt;
    const ha = host.arms[1];
    if (hostWave > 0) ha.rotation.set(0, 0, -2.3 - Math.sin(t * 12) * 0.3);
    else if (ms.party?.singing) ha.rotation.set(-0.4, 0, -1.6 - Math.sin(t * 6) * 0.4);
    else ha.rotation.set(0.1, 0, -0.12);
    host.root.rotation.z = ms.party?.singing ? Math.sin(t * 3.2) * 0.06 : 0;
    // The cook chops and flips, the barista polishes a glass or turns to the machine
    const [cl, cr] = cook.arms;
    cl.rotation.set(-1.1 + Math.max(0, Math.sin(t * 9)) * 0.35, 0, -0.25);
    cr.rotation.set(-1.0 + Math.sin(t * 3) * 0.25, Math.cos(t * 3) * 0.3, 0.2);
    barista.arms[1].rotation.set(-1.1, Math.sin(t * 2.4) * 0.5, 0.3);
    barista.root.rotation.y += Math.atan2(Math.sin(C.baristaYaw - barista.root.rotation.y), Math.cos(C.baristaYaw - barista.root.rotation.y)) * (1 - Math.exp(-6 * dt));
    // Karim plays the oud in the evenings, and whenever someone dances; in the day he tunes it now and then
    const playingOud = tunes.playing && tunes.cur.kind === 'oud';
    const [ol, or] = oudist.arms;
    ol.rotation.set(-1.25, 0, 0.75);
    const strum = playingOud ? Math.sin(t * 16) * 0.22 : ev ? Math.sin(t * 7) * 0.12 : Math.sin(t * 1.3) * 0.04;
    or.rotation.set(-0.85 + strum, 0, -0.55);
    // Soft oud music in the lounge in the evening, when nothing else is playing
    const lp = kids[api.playerId === 'roji' ? 0 : 1];
    const inLounge = lp.x < -L.SX && lp.z < L.CW;
    if (C.musicOwner) C.ambient = false;
    else if (ev && inLounge && !C.ambient) {
      tunes.oud(OUD_SONGS[0], { gain: 0.3 });
      C.ambient = true;
    } else if (C.ambient && (!ev || !inLounge)) {
      tunes.stop();
      C.ambient = false;
    }
    const started = tunes.update(api.sound, dt);
    if (started && playingOud && Math.random() < 0.6) C.noteAt(api, v1.set(L.STAGE.x + 0.3, L.STAGE.h, L.STAGE.z));
    // Diners eat; while music plays they wave along
    const party = moments.dancing || !!ms.party?.singing;
    for (const e of eaters) {
      const k = Math.max(0, Math.sin(t * 1.4 + e.phase));
      if (party) e.arm.rotation.set(0, 0, -2.2 - Math.sin(t * 9 + e.phase) * 0.35);
      else e.arm.rotation.set(e.base.x - k * 1.4, e.base.y, e.base.z - k * 0.25);
    }
    // Steam from the grill, or wherever a moment asks for it
    steamT -= dt;
    if (steamT <= 0) {
      steamT = 0.22;
      const s = steam.find((q) => !(q.userData.life > 0));
      if (s) {
        let p;
        if (C.steamPoint && C.steamLeft > 0) {
          p = C.steamPoint;
          C.steamLeft -= 0.25;
        } else p = CR.sizzle[Math.floor(Math.random() * CR.sizzle.length)];
        s.userData.life = 1;
        s.position.set(p.x + (Math.random() - 0.5) * 0.15, p.y, p.z);
      }
    }
    for (const s of steam) {
      if (!(s.userData.life > 0)) {
        s.visible = false;
        continue;
      }
      s.visible = true;
      s.userData.life -= dt * 0.9;
      s.position.y += dt * 0.5;
      s.scale.setScalar(0.12 + (1 - s.userData.life) * 0.35);
      s.material.opacity = Math.max(0, s.userData.life) * 0.4;
    }
    const sp = sparkGeo.attributes.position;
    let live = 0;
    for (const q of sparks) {
      if (q.life > 0) {
        q.life -= dt * 2.2;
        q.v.y -= dt * 2.5;
        q.p.addScaledVector(q.v, dt);
        live++;
      }
      if (q.life > 0) sp.setXYZ(q.i, q.p.x, q.p.y, q.p.z);
      else sp.setXYZ(q.i, 0, -50, 0);
    }
    sp.needsUpdate = true;
    sparkPts.visible = live > 0;
    for (const n of notes) {
      if (n.life > 0) {
        n.life -= dt * 0.5;
        n.s.position.y += dt * 0.6;
        n.s.position.x = n.x + Math.sin(n.life * 8) * 0.12;
        n.s.material.opacity = Math.min(1, n.life * 2);
        if (n.life <= 0) n.s.visible = false;
      }
    }
    // Kitchen, clock, balloons, the fountain, the candle and the lights
    CR.fryer.basket.position.x = Math.sin(t * 25) * 0.003;
    CR.minP.rotation.z = -(t / 60) * Math.PI * 2;
    CR.hourP.rotation.z = -((t / 60 + 2) / 12) * Math.PI * 2;
    CR.balloons.position.y = Math.sin(t * 1.3) * 0.05;
    CR.balloons.rotation.y = Math.sin(t * 0.5) * 0.25;
    WR.fountain.update(t);
    const fl = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 23) * 0.05;
    WR.candle.flame.scale.set(1, 1.8 * fl, 1);
    WR.candle.flameMat.emissiveIntensity = 1.4 * fl;
    WR.candleGlow.material.opacity = 0.42 * fl;
    S.lampMat.emissiveIntensity = 0.72 + Math.sin(t * 2.3) * 0.05 + (party ? Math.abs(Math.sin(t * 8)) * 0.35 : 0);
    for (const [i, b] of bulbs.entries()) b.material.emissiveIntensity = 0.8 + Math.sin(t * 2.2 + i * 1.7) * 0.15;
    // Milkshakes in hand: a slow sip every few seconds until they are gone
    for (const id of ['roji', 'homama']) {
      const c = carried[id];
      if (!c) continue;
      const a = api.actor(id);
      if (a.kid.carried !== c.group) {
        carried[id] = null;
        continue;
      }
      c.t -= dt;
      if (c.t <= 0) {
        c.t = 3.2;
        c.sips++;
        c.shake.setFill(Math.max(0, 1 - c.sips / 3));
        if (c.sips === 1) c.shake.setTop(false);
        a.kid.squash = 1.1;
        const s = api.sound;
        if (s?.ctx && !s.muted) s.tone(520, s.ctx.currentTime, 0.12, { type: 'triangle', gain: 0.025, slideTo: 300 });
        if (c.sips >= 3) {
          api.carry(id, null);
          carried[id] = null;
          api.fx.heartsAt(a.kid.head.localToWorld(v2.set(0, 0.75, 0)), 3);
          if (id === api.playerId) api.toast('Slurp! All gone. That was yummy.', 2000);
        }
      }
    }
  }

  return {
    group: g,
    dynamic,
    colliders,
    hotspots: moments.hotspots,
    cutaway: S.cutaway,
    size: { w: L.X1 - L.X0, d: L.Z1 - L.Z0 },
    spawn: { x: 0, z: 8.3, yaw: Math.PI },
    exit: { x: 0, z: 9.35 },
    background: '#f7e2da',
    update,
    onEnter(api) {
      S.O.copy(api.space.origin);
      hostWave = 1.8;
      if (!greeted) {
        greeted = true;
        api.toast(`<b>Lina:</b> Welcome to Roji's YumYum! A table for two?`, 2600);
      }
    },
    onExit(api) {
      moments.onExit(api);
      tunes.stop();
      C.ambient = false;
      C.musicOwner = null;
    },
  };
}

// Merge the food props that sit still on tables and shelves into one mesh per material.
function mergeProps(g, objs) {
  if (!objs.length) return;
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  for (const o of objs) {
    if (!o.parent) continue;
    o.traverse((m) => {
      if (!m.isMesh || Array.isArray(m.material)) return;
      if (!buckets.has(m.material.uuid)) buckets.set(m.material.uuid, { material: m.material, items: [] });
      buckets.get(m.material.uuid).items.push(m);
    });
  }
  for (const b of buckets.values()) {
    const geos = b.items.map((m) => {
      const q = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      q.applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
      return q;
    });
    const names = Object.keys(geos[0].attributes).filter((n) => geos.every((q) => q.attributes[n]?.itemSize === geos[0].attributes[n].itemSize));
    for (const q of geos) {
      for (const n of Object.keys(q.attributes)) if (!names.includes(n)) q.deleteAttribute(n);
      q.morphAttributes = {};
      q.clearGroups();
    }
    const merged = K.mergeGeometries(geos, false);
    if (!merged) continue;
    const me = new THREE.Mesh(merged, b.material);
    me.castShadow = false;
    me.receiveShadow = true;
    g.add(me);
    for (const m of b.items) m.removeFromParent();
  }
}
