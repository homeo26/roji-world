import * as THREE from 'three';
import { clamp, damp, lerp, mat, mesh } from '../../util.js';
import * as K from '../riding/kit.js';
import { HX, WY, FLOOR, laneZ } from './pool.js';

// Ring Dive: swim along the lane and dive to the floor for rings before your air runs out.
// Three waves of rings drop in: plain ones on the floor, golden ones that drift in the water,
// and in the last wave a little treasure chest with a heart ring inside.

const PI = Math.PI;
const COLORS = ['#ff7fa3', '#5cc9c0', '#ffd166', '#a77bff', '#f08a5d', '#3f7bf0'];

export async function runRings(G, cfg) {
  const { ctx, pool, ui, sfx, me, pal, npcs } = G;
  const { hud, fx } = ctx;
  const L = G.level;
  const Z = laneZ(1);
  const TIME = 50 - L * 4;
  const AIR = 7 - L * 0.6;

  for (const s of npcs) s.visible = false;
  me.visible = pal.visible = true;
  me.place('tread', -9, WY, Z, PI / 2);
  pal.place('tread', -6, WY, laneZ(2), 0);
  for (const s of [me, pal]) {
    s.autoRate = 0;
    s.speed = 0;
    s.pose2 = null;
  }

  // ---------------------------------------------------------------- rings and the chest
  const live = new THREE.Group();
  ctx.scene.add(live);
  const torus = new THREE.TorusGeometry(0.21, 0.05, 8, 22);
  const rings = [];
  function spawnRing(x, y, kind = 'plain', i = 0) {
    const gold = kind === 'gold';
    const heart = kind === 'heart';
    const m = mesh(torus, heart ? mat('#ff6b8a', { rough: 0.3, emissive: '#ff6b8a', ei: 0.5 }) : gold ? mat('#ffd166', { rough: 0.25, metal: 0.4, emissive: '#ffb347', ei: 0.55 }) : mat(COLORS[i % COLORS.length], { rough: 0.4, emissive: COLORS[i % COLORS.length], ei: 0.18 }), { cast: false });
    m.position.set(x, WY + 0.1, Z);
    if (heart) {
      const hs = new THREE.Shape();
      hs.moveTo(0, -0.06);
      hs.bezierCurveTo(-0.09, 0, -0.06, 0.08, 0, 0.04);
      hs.bezierCurveTo(0.06, 0.08, 0.09, 0, 0, -0.06);
      const gem = mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.03, bevelEnabled: false }), mat('#ffffff', { rough: 0.2, emissive: '#ffd0dc', ei: 0.6 }), { cast: false });
      gem.position.set(0, 0.25, -0.015);
      gem.scale.setScalar(1.4);
      m.add(gem);
    }
    live.add(m);
    const r = { m, x, y, kind, value: heart ? 3 : gold ? 2 : 1, sink: 0, ph: Math.random() * 6, got: false, fly: -1 };
    rings.push(r);
    return r;
  }
  // treasure chest
  const chest = new THREE.Group();
  const wood = '#b97a4a';
  chest.add(K.at(K.rbox(0.62, 0.34, 0.4, wood, 0.05), 0, 0.17, 0));
  chest.add(K.at(K.box(0.64, 0.05, 0.42, '#ffd166', { metal: 0.4, rough: 0.35 }), 0, 0.3, 0));
  const lid = new THREE.Group();
  lid.position.set(0, 0.34, -0.2);
  const half = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 12, 1, false, 0, PI), mat(wood, { rough: 0.8 }));
  half.rotation.set(0, 0, PI / 2);
  half.position.set(0, 0, 0.2);
  lid.add(half);
  const band = K.box(0.08, 0.06, 0.06, '#ffd166', { metal: 0.4, rough: 0.35 });
  band.position.set(0, 0.0, 0.41);
  lid.add(band);
  chest.add(lid);
  chest.position.set(9.2, FLOOR, Z);
  chest.visible = false;
  live.add(chest);
  let chestOpen = -1;

  const WAVES = [
    [['plain', -6.5, 0], ['plain', -3, 0], ['plain', 0.5, 0], ['plain', 4, 0], ['plain', 7.5, 0]],
    [['plain', -7, 0], ['gold', -4, 0.55], ['plain', -0.5, 0], ['gold', 3, 0.45], ['plain', 6, 0], ['plain', 9.5, 0]],
    [['gold', -8, 0.5], ['plain', -5, 0], ['plain', -1.5, 0], ['gold', 2.5, 0.6], ['plain', 6, 0], ['chest', 9.2, 0]],
  ];
  let wave = -1;
  function nextWave() {
    wave++;
    if (wave >= WAVES.length) return false;
    WAVES[wave].forEach(([kind, x, up], i) => {
      if (kind === 'chest') {
        chest.visible = true;
        chestOpen = -1;
        lid.rotation.x = 0;
        return;
      }
      const r = spawnRing(x + (Math.random() - 0.5) * 0.8, FLOOR + 0.27 + (up ? 0.5 + up : 0), kind, i + wave * 2);
      r.sink = -i * 0.12;
      pool.splash(r.x, Z, 0.5);
    });
    ui.pop(wave === 0 ? 'Rings!' : wave === 1 ? 'Golden rings drift about' : 'A treasure chest!', '#ffd166', 1300);
    sfx.sparkle();
    return true;
  }

  // ---------------------------------------------------------------- state
  let now = 0;
  let timeLeft = TIME;
  let on = false;
  let score = 0;
  let count = 0;
  let air = 1;
  let gasp = false;
  const pos = me.cen;
  const vel = new THREE.Vector2();
  let face = 1;
  let kickT = 0;
  let kickCool = 0;
  let bubT = 0;
  let wasUnder = false;
  let palCheer = 0;
  let heartGot = false;

  hud.title(G.title, cfg.sub);
  ui.pads([]);
  ui.lane(false);
  hud.buttons({ action: 'Kick', jump: null, stick: true });
  hud.hint('Arrows or WASD to swim and dive, Space to kick');
  pool.drawBoard('Ring Dive', [{ left: '', name: `${G.names.me} dives`, right: '' }, { left: '', name: `${G.names.pal} counts`, right: '' }], 'Rings on the floor, gold in the water');
  G.cam.cut(-7, 3.6, Z + 8.2, -7, -0.6, Z - 0.6);

  const hp = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  function head() {
    const c = Math.cos(me.pitch);
    return hp.set(pos.x + face * 0.8 * c, pos.y - Math.sin(me.pitch) * 0.8, pos.z);
  }

  function collect(r) {
    r.got = true;
    r.fly = 0;
    r.from = r.m.position.clone();
    score += r.value;
    count++;
    sfx.ring(count);
    pool.sparkle(r.m.position.x, r.m.position.y, Z, r.kind === 'plain' ? 8 : 16, r.kind === 'heart' ? '#ff9ab5' : '#ffe08a');
    pool.bubble(r.m.position.x, r.m.position.y, Z, 8, 0.3);
    palCheer = 1.4;
    ui.pop(r.kind === 'heart' ? 'The heart ring!' : r.kind === 'gold' ? `Golden! +${r.value}` : `+${r.value}`, r.kind === 'gold' ? '#ffd166' : '#ffffff', 700);
    if (r.kind === 'heart') {
      heartGot = true;
      sfx.sparkle();
      const line = G.palIsHomama ? `${G.names.pal}: I hid that one for you, ${G.names.me}.` : `${G.names.me} found the heart ring for ${G.names.pal}.`;
      G.line(line, 3200);
      setTimeout(() => G.alive() && fx.heartsAt(pal.kid.head.localToWorld(new THREE.Vector3(0, 0.7, 0)), 6), 600);
    }
  }

  function input(dt) {
    let ax = ctx.input.axis();
    let kick = ctx.input.pressed('jump') || ctx.input.pressed('action');
    if (G.auto) {
      // swim to the nearest ring, come up for air when low
      const h = head();
      const left = rings.filter((r) => !r.got && r.sink >= 1);
      let target = null;
      if (chest.visible && chestOpen < 0) target = { x: chest.position.x - 0.5, y: FLOOR + 0.35 };
      let best = 1e9;
      for (const r of left) {
        const d = Math.abs(r.m.position.x - h.x) + Math.abs(r.m.position.y - h.y) * 0.6;
        if (d < best) {
          best = d;
          target = { x: r.m.position.x, y: r.m.position.y };
        }
      }
      ax = { x: 0, y: 0 };
      if (air < 0.3 || gasp || (!target && pos.y < WY - 0.1)) ax.y = 1;
      else if (target) {
        const dx = target.x - h.x;
        const dy = target.y - h.y;
        ax.x = clamp(dx * 1.5, -1, 1);
        ax.y = Math.abs(dx) < 2.5 ? clamp(dy * 1.5, -1, 1) : pos.y < WY - 0.3 ? 0.2 : 0;
      }
      kick = Math.abs(ax.x) > 0.9 && kickCool <= 0 && Math.random() < 0.05;
    }
    return { ax, kick };
  }

  G.evState = () => {
    const h = head();
    const targets = rings.filter((r) => !r.got && r.sink >= 1).map((r) => ({ x: +r.m.position.x.toFixed(2), y: +r.m.position.y.toFixed(2) }));
    if (chest.visible && chestOpen < 0) targets.push({ x: chest.position.x - 0.4, y: FLOOR + 0.35 });
    return { kind: 'rings', on, now: +G.now.toFixed(3), timeLeft: +timeLeft.toFixed(1), score, count, wave, air: +air.toFixed(2), gasp, x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), hx: +h.x.toFixed(2), hy: +h.y.toFixed(2), targets, heart: heartGot };
  };

  G.tick = (dt, t) => {
    now = G.now;
    const { ax, kick } = on ? input(dt) : { ax: { x: 0, y: 0 }, kick: false };
    if (on) timeLeft -= dt;
    // movement
    kickCool -= dt;
    if (kick && kickCool <= 0) {
      kickT = 0.38;
      kickCool = 0.7;
      sfx.splash(0.3);
      pool.bubble(pos.x - face * 0.6, pos.y, Z, 10, 0.3);
      if (pos.y > WY - 0.2) pool.splash(pos.x - face * 0.6, Z, 0.6);
    }
    kickT -= dt;
    const boost = kickT > 0 ? 1.75 : 1;
    const under = pos.y < WY - 0.16;
    const canDive = !gasp;
    const tx = ax.x * 2.6 * boost;
    let ty = ax.y * 1.9 * boost;
    if (!canDive && ty < 0) ty = 0;
    if (gasp) ty = 1.6;
    if (Math.abs(ax.y) < 0.15 && !gasp) ty = under ? 0.42 : 0;
    vel.x = damp(vel.x, tx, 3.2, dt);
    vel.y = damp(vel.y, ty, 3.2, dt);
    pos.x = clamp(pos.x + vel.x * dt, -HX + 1.0, HX - 1.0);
    pos.y = clamp(pos.y + vel.y * dt, FLOOR + 0.3, WY);
    if (pos.y >= WY - 0.001 && vel.y > 0) vel.y = 0;
    if (Math.abs(vel.x) > 0.2) face = Math.sign(vel.x);
    // air
    if (under) {
      air -= dt / AIR;
      if (air <= 0 && !gasp) {
        air = 0;
        gasp = true;
        ui.pop('Need air!', '#ffb3c0', 900);
        sfx.oops();
      }
      bubT -= dt;
      if (bubT <= 0) {
        bubT = 0.22;
        const h = head();
        pool.bubble(h.x, h.y + 0.1, Z, 2, 0.08);
        if (Math.random() < 0.2) sfx.bubble();
      }
    } else {
      air = Math.min(1, air + dt * 0.45);
      if (gasp && air > 0.35) gasp = false;
    }
    if (under && !wasUnder) {
      pool.splash(pos.x + face * 0.5, Z, 0.9);
      sfx.splash(0.6);
    }
    if (!under && wasUnder) {
      pool.splash(pos.x, Z, 0.6);
      if (air < 0.35) sfx.gasp();
    }
    wasUnder = under;
    // pose: swim toward the motion, tread when still at the surface
    const sp = Math.hypot(vel.x, vel.y);
    if (!under && sp < 0.35) {
      me.setMode('tread');
      me.pitch = damp(me.pitch, 0, 6, dt);
      me.yaw = damp(me.yaw, 0.35 * face, 3, dt);
    } else {
      me.setMode('swim');
      const pitch = Math.atan2(-vel.y, Math.abs(vel.x) + 0.15);
      me.pitch = damp(me.pitch, clamp(pitch, -0.5, 1.35), 5, dt);
      me.yaw = damp(me.yaw, face * (PI / 2), 6, dt);
      me.speed = sp;
      me.autoRate = clamp(sp * 0.9, 0.8, 2.6);
    }
    if (!under && sp > 0.8 && Math.random() < dt * 4) pool.ripple(pos.x, Z, 0.6);
    // rings
    const h = head();
    for (const r of rings) {
      if (r.got) {
        if (r.fly >= 0) {
          r.fly += dt / 0.7;
          const u = Math.min(1, r.fly);
          const to = pal.kid.head.localToWorld(tmp.set(0, 0.9, 0));
          r.m.position.lerpVectors(r.from, to, u);
          r.m.position.y += Math.sin(u * PI) * 1.2;
          r.m.rotation.y += dt * 8;
          r.m.scale.setScalar(1 - u * 0.5);
          if (u >= 1) {
            r.fly = -1;
            r.m.visible = false;
            pool.sparkle(to.x, to.y, to.z, 6);
          }
        }
        continue;
      }
      if (r.sink < 1) {
        r.sink += dt / 1.3;
        const u = clamp(r.sink, 0, 1);
        r.m.position.y = lerp(WY + 0.05, r.y, u * u * (3 - 2 * u));
        r.m.rotation.z = Math.sin(u * 9) * 0.4 * (1 - u);
        if (r.sink > 0 && Math.random() < dt * 8) pool.bubble(r.m.position.x, r.m.position.y + 0.2, Z, 1, 0.1);
        continue;
      }
      if (r.kind === 'gold') {
        r.m.position.y = r.y + Math.sin(now * 0.9 + r.ph) * 0.35;
        r.m.position.x = r.x + Math.sin(now * 0.5 + r.ph) * 1.1;
        r.m.rotation.y = Math.sin(now * 1.3 + r.ph) * 0.5;
      } else if (r.kind === 'heart') {
        r.m.position.y = Math.min(r.y, r.m.position.y + dt * 0.2);
        r.m.rotation.y = now * 1.5;
      } else r.m.rotation.y = Math.sin(now * 0.8 + r.ph) * 0.18;
      if (on && (r.m.position.distanceTo(h) < 0.5 || r.m.position.distanceTo(pos) < 0.42)) collect(r);
    }
    // the chest opens when you reach it
    if (chest.visible) {
      if (chestOpen < 0 && on && Math.hypot(h.x - chest.position.x, h.y - (FLOOR + 0.3)) < 0.75) {
        chestOpen = 0;
        sfx.sparkle();
        pool.bubble(chest.position.x, FLOOR + 0.5, Z, 14, 0.4);
        const r = spawnRing(chest.position.x, FLOOR + 0.9, 'heart');
        r.sink = 1;
        r.m.position.set(chest.position.x, FLOOR + 0.35, Z);
        ui.pop('Something sparkly inside...', '#ffd0dc', 1000);
      }
      if (chestOpen >= 0) {
        chestOpen = Math.min(1, chestOpen + dt * 1.6);
        lid.rotation.x = -1.9 * chestOpen;
      }
    }
    // next wave when this one is cleared
    if (on && wave >= 0 && rings.every((r) => r.got) && (wave < 2 || chestOpen >= 0 || !chest.visible)) {
      if (!nextWave()) {
        on = false;
        G.allClear = true;
      }
    }
    // partner follows along at the surface and cheers
    palCheer -= dt;
    pal.cheer = damp(pal.cheer, palCheer > 0 ? 1 : 0, 5, dt);
    pal.cen.x = damp(pal.cen.x, clamp(pos.x - 1.8 * face, -HX + 1.5, HX - 1.5), 0.9, dt);
    pal.cen.y = WY;
    pal.yaw = damp(pal.yaw, Math.atan2(pos.x - pal.cen.x, 3), 3, dt);
    me.update(dt, t);
    pal.update(dt, t);
    G.foam = [{ x: pos.x, z: Z, speed: under ? 0 : sp, dir: [face, 0], on: !under }, { x: pal.cen.x, z: pal.cen.z, speed: 0.3, dir: [1, 0], on: true }];
    G.clockT = TIME - timeLeft;
    // HUD and camera
    ui.air(on, air);
    hud.score(`Rings ${count} &nbsp;&middot;&nbsp; ${score} pts &nbsp;&middot;&nbsp; ${Math.max(0, Math.ceil(timeLeft))} s`);
    const deep = clamp((WY - pos.y) / 1.6, 0, 1);
    G.cam.goal(pos.x + face * 0.8, 3.7 - deep * 0.9, Z + 8.0 - deep * 0.8, pos.x + face * 1.0, -0.55 - deep * 0.8, Z - 0.8, 3);
  };

  ui.big(`<div class="e">${cfg.eyebrow}</div><div class="n">${cfg.title}</div><div class="s">${cfg.tip}</div>`, 2600);
  G.line(G.palIsHomama ? `${G.names.pal}: I hid a surprise down there somewhere.` : `${G.names.pal}: I will count every ring you find.`, 2800);
  await G.wait(2.6);
  if (!G.alive()) return null;
  await ctx.hud.countdown(3);
  if (!G.alive()) return null;
  on = true;
  nextWave();
  await G.until(() => !on || timeLeft <= 0);
  if (!G.alive()) return null;
  const cleared = !on && G.allClear;
  on = false;
  G.allClear = false;
  sfx.whistle();
  const bonus = cleared ? Math.max(0, Math.round(timeLeft / 5)) : 0;
  score += bonus;
  ui.pop(cleared ? `Every ring! Time bonus +${bonus}` : 'Time!', '#ffd166', 1600);
  ui.air(false);
  hud.buttons({ action: null, jump: null, stick: false });
  // come up and wave the rings
  await G.wait(0.4);
  G.tick = ((prev) => (dt, t) => {
    vel.set(0, 0);
    pos.y = damp(pos.y, WY, 3, dt);
    me.pitch = damp(me.pitch, 0, 5, dt);
    if (pos.y > WY - 0.15) me.setMode('tread');
    me.yaw = damp(me.yaw, 0, 3, dt);
    me.cheer = damp(me.cheer, 1, 3, dt);
    pal.cheer = damp(pal.cheer, 1, 3, dt);
    pal.cen.x = damp(pal.cen.x, pos.x + 1.1, 1.5, dt);
    pal.yaw = damp(pal.yaw, 0, 3, dt);
    me.update(dt, t);
    pal.update(dt, t);
    G.foam = [{ x: pos.x, z: Z, speed: 0.4, dir: [1, 0], on: true }];
    G.cam.goal(pos.x + 0.6, 2.6, Z + 6.2, pos.x + 0.6, 0.1, Z - 0.5, 2.5);
  })(G.tick);
  pool.crowd.cheer(score >= 12 ? 1 : 0.6);
  sfx.cheer(0.07, 1.8);
  pool.drawBoard('Ring Dive', [{ left: '', name: `${count} rings`, right: `${score} pts`, hi: true }, { left: '', name: heartGot ? 'Heart ring found' : 'The chest stayed shut', right: '' }], cleared ? 'Every ring found!' : 'Lovely diving!');
  await G.wait(2.2);
  live.removeFromParent();
  live.traverse((o) => o.geometry?.dispose());
  me.cheer = pal.cheer = 0;
  const stars = score >= 19 ? 3 : score >= 11 ? 2 : 1;
  return { stars, text: `${count} rings, ${score} points${heartGot ? ', heart ring found' : ''}`, short: `${count} rings, ${score} pts`, score };
}
