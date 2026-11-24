import { THREE, mat, umat, mesh, canvasTexture, sph, bubbleTex, sprite, tor, bake } from './kit.js';
import { damp, dampAngle, clamp } from '../../util.js';

// Mishmish: an orange tabby who wanders between the rooms, naps on the sofa or her bed and meows now and then.
// Local frame of the cat: faces +Z, paws at y = 0, about 0.55 m long.

const ORANGE = '#f29b45';
const CREAM = '#fff1de';

function tabby(base, stripe, belly) {
  // Body: rings around the body axis; the belly (u ~ 0.25) stays cream.
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = stripe;
    for (let i = 0; i < 9; i++) {
      const y = 22 + i * 25;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const k = Math.sin((x / w) * Math.PI * 2 - Math.PI / 2 + Math.PI); // strongest along the back
        const th = Math.max(0, 6 + 5 * k);
        ctx.rect(x, y + Math.sin(x * 0.08 + i) * 3 - th / 2, 8, th);
      }
      ctx.fill();
    }
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0.08, 'rgba(255,241,222,0)');
    g.addColorStop(0.25, belly);
    g.addColorStop(0.42, 'rgba(255,241,222,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function headTex() {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = ORANGE;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d9732a';
    // The tabby "M" on the forehead, at the front (u = 0.25)
    const cx = w * 0.25;
    for (const [dx, len] of [[-14, 26], [0, 32], [14, 26]]) ctx.fillRect(cx + dx - 3, 10, 6, len);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 2; i++) ctx.fillRect(cx + s * (34 + i * 4) - 8, 52 + i * 10, 16, 4);
    }
    // Back of the head stripes
    for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.6 + i * 20, 8, 7, 44);
  });
}

export function makeCat() {
  const root = new THREE.Group();
  const bodyMat = umat('#ffffff', { rough: 0.85, map: tabby(ORANGE, '#d9732a', CREAM) });
  const headMat = umat('#ffffff', { rough: 0.85, map: headTex() });
  const orange = mat(ORANGE, { rough: 0.85 });
  const cream = mat(CREAM, { rough: 0.85 });
  const pink = mat('#ff9fb0', { rough: 0.6 });
  const dark = mat('#2a1a16', { rough: 0.3 });

  const hips = new THREE.Group(); // pivot at the back hips, tilts the body up when sitting
  hips.position.set(0, 0.2, -0.17);
  root.add(hips);
  const body = mesh(new THREE.SphereGeometry(0.15, 18, 14).rotateX(Math.PI / 2), bodyMat);
  body.scale.set(1, 0.92, 1.55);
  body.position.set(0, 0.02, 0.17);
  hips.add(body);
  const chest = sph(0.1, cream, undefined, 12);
  chest.scale.set(1, 1.1, 0.8);
  chest.position.set(0, -0.01, 0.34);
  hips.add(chest);

  // Head
  const neck = new THREE.Group();
  neck.position.set(0, 0.1, 0.36);
  hips.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.135, 18, 14), headMat);
  skull.scale.set(1.08, 0.95, 0.95);
  skull.position.set(0, 0.05, 0.04);
  head.add(skull);
  for (const s of [1, -1]) {
    const ear = mesh(new THREE.ConeGeometry(0.055, 0.1, 4), orange);
    ear.position.set(0.075 * s, 0.17, 0.02);
    ear.rotation.set(-0.1, Math.PI / 4, -0.35 * s);
    const inner = mesh(new THREE.ConeGeometry(0.032, 0.06, 4), pink);
    inner.position.set(0.072 * s, 0.16, 0.045);
    inner.rotation.copy(ear.rotation);
    const cheek = sph(0.05, cream, undefined, 10);
    cheek.scale.set(1, 0.75, 0.8);
    cheek.position.set(0.035 * s, -0.01, 0.14);
    head.add(ear, inner, cheek);
  }
  const nose = sph(0.016, pink, undefined, 8);
  nose.scale.set(1.3, 0.8, 1);
  nose.position.set(0, 0.025, 0.178);
  head.add(nose);
  const eyes = [];
  for (const s of [1, -1]) {
    const g = new THREE.Group();
    g.position.set(0.055 * s, 0.07, 0.147);
    const e = sph(0.025, dark, undefined, 10);
    e.scale.set(0.9, 1.15, 0.5);
    const sh = sph(0.008, '#ffffff', undefined, 6);
    sh.position.set(0.008 * s, 0.01, 0.01);
    g.add(e, sh);
    g.rotation.y = 0.3 * s;
    head.add(g);
    eyes.push(g);
  }
  // Collar with a little gold bell
  const collar = tor(0.085, 0.014, '#ef5b6f', { rough: 0.5 }, Math.PI * 2, 6, 18);
  collar.rotation.x = Math.PI / 2 + 0.5;
  collar.position.set(0, -0.06, -0.01);
  const bell = sph(0.022, '#f4c24f', { metal: 0.6, rough: 0.3 }, 10);
  bell.position.set(0, -0.12, 0.07);
  neck.add(collar, bell);

  // Legs: front pair under the chest, back pair under the hips
  const legs = [];
  const legGeo = new THREE.CapsuleGeometry(0.034, 0.1, 3, 8);
  const pawGeo = new THREE.SphereGeometry(0.04, 10, 8);
  for (const [x, z, back] of [[0.065, 0.3, 0], [-0.065, 0.3, 0], [0.07, 0.02, 1], [-0.07, 0.02, 1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.04, z);
    const leg = mesh(legGeo, orange);
    leg.position.y = -0.08;
    const paw = mesh(pawGeo, cream);
    paw.scale.set(1, 0.6, 1.25);
    paw.position.set(0, -0.15, 0.015);
    pivot.add(leg, paw);
    hips.add(pivot);
    legs.push({ pivot, back });
  }

  // Tail: a chain of segments
  const tail = [];
  let parent = hips;
  const segGeo = new THREE.CapsuleGeometry(0.03, 0.07, 3, 8);
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(0, i === 0 ? 0.04 : 0.09, i === 0 ? -0.05 : 0);
    const seg = mesh(segGeo, i === 4 ? mat('#d9732a', { rough: 0.85 }) : bodyMat);
    seg.position.y = 0.045;
    seg.scale.setScalar(1 - i * 0.06);
    pivot.add(seg);
    parent.add(pivot);
    parent = pivot;
    tail.push(pivot);
  }

  // Speech bubble and a small zzz
  const bubble = sprite(bubbleTex('Meow!'), { scale: 0.5 });
  bubble.scale.set(0.66, 0.41, 1);
  bubble.visible = false;
  root.add(bubble);
  const zzz = sprite(bubbleTex('z z z', { color: '#7b6aa8' }), { scale: 0.4 });
  zzz.scale.set(0.42, 0.26, 1);
  zzz.visible = false;
  root.add(zzz);

  // Fewer draw calls: merge the fixed bits of each moving part
  for (const e of eyes) bake(e);
  for (const l of legs) bake(l.pivot);
  bake(head, eyes);
  bake(neck, [head]);
  bake(hips, [body, neck, ...legs.map((l) => l.pivot), tail[0]]);

  const pose = { sit: 0, nap: 0, walk: 0, happy: 0, look: 0, crouch: 0 };
  let phase = 0;
  const update = (dt, t, want) => {
    for (const k of ['sit', 'nap', 'happy', 'crouch']) pose[k] = damp(pose[k], want[k] || 0, 6, dt);
    pose.walk = damp(pose.walk, want.walk || 0, 10, dt);
    phase += dt * (5 + (want.speed || 0) * 9);
    const w = pose.walk * (1 - pose.nap);
    const s = Math.sin(phase);
    const { sit, nap, crouch } = pose;
    // Body: sit tilts up around the hips, nap lowers it, crouch before a pounce
    hips.position.y = 0.2 - nap * 0.1 - crouch * 0.05 + Math.abs(Math.cos(phase)) * 0.012 * w + Math.sin(t * 2) * 0.004 * nap;
    hips.rotation.x = -sit * 0.62;
    hips.rotation.z = nap * 0.12;
    body.scale.y = 0.92 * (1 + Math.sin(t * 2.2) * 0.02 * (0.5 + nap));
    for (const { pivot, back } of legs) {
      const side = pivot.position.x > 0 ? 1 : -1;
      const ph = back ? s * side : -s * side;
      let rx = ph * 0.6 * w;
      if (back) rx += sit * 0.9;
      else rx += sit * 0.62;
      pivot.rotation.x = rx - nap * 1.2;
      pivot.scale.y = 1 - nap * 0.55 - (back ? sit * 0.35 : 0);
    }
    // Head looks around; tucked down while napping; tilted up when petted
    neck.rotation.x = sit * 0.55 + nap * 0.45 - pose.happy * 0.3 + Math.sin(phase * 2) * 0.03 * w;
    head.rotation.y = damp(head.rotation.y, (want.look || 0) * (1 - nap) + nap * 0.6, 3, dt);
    head.rotation.z = Math.sin(t * 0.7) * 0.08 * (1 - w) + pose.happy * 0.15;
    // Tail: up and swaying when walking, curled around when sitting or napping
    const curl = Math.max(sit, nap);
    tail.forEach((p, i) => {
      const sway = Math.sin(t * (2.2 + w * 3) - i * 0.6) * (0.18 + pose.happy * 0.2);
      p.rotation.x = i === 0 ? -0.9 + w * 0.5 + curl * -0.5 + pose.happy * 0.6 : 0.18 * (1 - curl) - curl * 0.12 + pose.happy * 0.05;
      p.rotation.z = sway * (1 - curl * 0.6) + curl * (i === 0 ? 0.9 : 0.42);
    });
    const closed = nap > 0.5 || pose.happy > 0.5;
    for (const e of eyes) e.scale.y = closed ? 0.18 : 1;
    if (Math.sin(t * 0.9) > 0.995 && !closed) for (const e of eyes) e.scale.y = 0.15;
    zzz.visible = nap > 0.7;
    if (zzz.visible) {
      const k = (t * 0.35) % 1;
      zzz.position.set(0.12 + Math.sin(k * 6) * 0.04, 0.42 + k * 0.35, 0.3);
      zzz.material.opacity = Math.sin(k * Math.PI);
    }
  };

  return { root, update, bubble, head, pose };
}

// Where Mishmish likes to be. Local interior coordinates. hop: the floor point she jumps up from.
// route(sx, sz, tx, tz) -> floor waypoints between two points (through the doors), optional.
export function catBrain(cat, spots, { corridorZ = 2.3, api, route = null }) {
  const st = {
    x: spots[0].x,
    z: spots[0].z,
    y: spots[0].y || 0,
    yaw: 0,
    path: [],
    hop: null,
    spot: spots[0],
    rest: 6,
    mode: 'rest', // rest | walk | petted | play
    meow: 8 + Math.random() * 10,
    bubble: 0,
    petted: 0,
    stay: false, // stay at the current spot until released (movie night, sleep)
    hold: null, // (t) -> { x, z, y, yaw, sit, nap, crouch, happy, walk }: driven by an activity (play)
  };
  cat.root.position.set(st.x, st.y, st.z);

  const planTo = (spot) => {
    const path = [];
    const from = st.spot;
    if (from?.hop && st.y > 0.05) path.push({ x: from.hop.x, z: from.hop.z, y: 0, hop: true });
    const sx = path.length ? path[0].x : st.x;
    const sz = path.length ? path[0].z : st.z;
    const ax = spot.hop ? spot.hop.x : spot.x;
    const az = spot.hop ? spot.hop.z : spot.z;
    if (route) for (const w of route(sx, sz, ax, az)) path.push({ x: w.x, z: w.z, y: 0 });
    else if (Math.abs(sx - ax) > 0.3 || Math.abs(sz - az) > 2.5) {
      path.push({ x: sx, z: corridorZ, y: 0 });
      path.push({ x: ax, z: corridorZ, y: 0 });
    }
    if (spot.hop) {
      path.push({ x: spot.hop.x, z: spot.hop.z, y: 0 });
      path.push({ x: spot.x, z: spot.z, y: spot.y || 0, hop: true, over: spot.over || 0 });
    } else path.push({ x: spot.x, z: spot.z, y: spot.y || 0 });
    st.path = path;
    st.hop = null;
    st.spot = spot;
    st.mode = 'walk';
  };

  const bubbles = { 'Meow!': cat.bubble.material.map };
  const meow = (text) => {
    st.bubble = 1.8;
    if (text) {
      cat.bubble.material.map = bubbles[text] ??= bubbleTex(text);
      cat.bubble.material.needsUpdate = true;
    }
    const s = api.sound;
    if (!s?.ctx) return;
    const t0 = s.ctx.currentTime + 0.02;
    const f = 1 + (Math.random() - 0.5) * 0.15;
    s.tone(560 * f, t0, 0.22, { type: 'triangle', gain: 0.09, slideTo: 860 * f, attack: 0.04 });
    s.tone(860 * f, t0 + 0.18, 0.34, { type: 'triangle', gain: 0.08, slideTo: 430 * f, attack: 0.02 });
    s.tone(1120 * f, t0 + 0.02, 0.3, { type: 'sine', gain: 0.025, slideTo: 1500 * f });
  };

  const purr = () => {
    const s = api.sound;
    if (!s?.ctx) return;
    const t0 = s.ctx.currentTime + 0.02;
    for (let i = 0; i < 14; i++) s.tone(48 + (i % 2) * 6, t0 + i * 0.13, 0.12, { type: 'sawtooth', gain: 0.045, attack: 0.03 });
  };

  return {
    st,
    meow,
    purr,
    get busy() {
      return st.stay || !!st.hold;
    },
    pet() {
      if (st.mode === 'walk' && st.hop) return;
      st.path = [];
      st.mode = 'petted';
      st.petted = 3.2;
      purr();
    },
    // Walk to a spot (or a spot id) and stay there until released
    goTo(spot, stay = true) {
      const sp = typeof spot === 'string' ? spots.find((q) => q.id === spot) : spot;
      st.hold = null;
      st.stay = stay;
      if (st.spot === sp && st.mode === 'rest') return;
      planTo(sp);
    },
    // Let an activity drive her every frame; she first walks over to where it starts
    hold(fn, start) {
      st.stay = false;
      st.hold = fn;
      if (start) planTo({ ...start, id: 'held' });
      else st.mode = 'held';
    },
    release() {
      st.stay = false;
      if (st.hold) st.spot = { id: 'here', x: st.x, z: st.z, y: st.y, hop: st.y > 0.05 ? { x: st.x, z: st.z + 1 } : null };
      st.hold = null;
      if (st.mode === 'held') st.mode = 'rest';
      st.rest = 2 + Math.random() * 3;
    },
    get pos() {
      return cat.root.position;
    },
    update(dt, t, playerLocal) {
      const want = { walk: 0, sit: 0, nap: 0, happy: 0, look: 0, speed: 0, crouch: 0 };
      if (st.mode === 'held' && st.hold) {
        const o = st.hold(t, dt);
        const dx = o.x - st.x;
        const dz = o.z - st.z;
        const d = Math.hypot(dx, dz);
        const sp = Math.min(d, (o.speed || 2.6) * dt);
        if (d > 1e-4) {
          st.x += (dx / d) * sp;
          st.z += (dz / d) * sp;
        }
        st.y = o.y ?? 0;
        if (o.yaw !== undefined) st.yaw = dampAngle(st.yaw, o.yaw, 10, dt);
        else if (d > 0.02) st.yaw = dampAngle(st.yaw, Math.atan2(dx, dz), 10, dt);
        Object.assign(want, { sit: o.sit ? 1 : 0, nap: o.nap ? 1 : 0, crouch: o.crouch || 0, walk: d > 0.03 ? 1 : 0, speed: d > 0.03 ? 2 : 0, happy: o.happy ? 1 : 0 });
      } else if (st.mode === 'petted') {
        st.petted -= dt;
        want.sit = 1;
        want.happy = 1;
        if (playerLocal) st.yaw = dampAngle(st.yaw, Math.atan2(playerLocal.x - st.x, playerLocal.z - st.z), 6, dt);
        if (st.petted <= 0) {
          st.mode = 'rest';
          st.rest = 3;
        }
      } else if (st.mode === 'rest') {
        if (!st.stay) st.rest -= dt;
        want.nap = st.spot?.nap ? 1 : 0;
        want.sit = st.spot?.nap ? 0 : 1;
        want.look = Math.sin(t * 0.4) * 0.6;
        if (st.rest <= 0) {
          const others = spots.filter((s) => s.id !== st.spot?.id);
          planTo(others[Math.floor(Math.random() * others.length)]);
        }
      } else if (st.mode === 'walk') {
        if (st.hop) {
          const h = st.hop;
          h.t += dt / h.dur;
          const k = Math.min(1, h.t);
          st.x = h.x0 + (h.x1 - h.x0) * k;
          st.z = h.z0 + (h.z1 - h.z0) * k;
          st.y = h.y0 + (h.y1 - h.y0) * k + Math.sin(k * Math.PI) * h.peak;
          want.crouch = k < 0.15 ? 1 : 0;
          if (k >= 1) st.hop = null;
        } else if (st.path.length) {
          const p = st.path[0];
          const dx = p.x - st.x;
          const dz = p.z - st.z;
          const d = Math.hypot(dx, dz);
          if (p.hop) {
            st.hop = { t: 0, dur: 0.6, x0: st.x, z0: st.z, y0: st.y, x1: p.x, z1: p.z, y1: p.y, peak: 0.25 + Math.max(0, p.y - st.y) * 0.9 + (p.over || 0) };
            st.yaw = Math.atan2(dx, dz);
            st.path.shift();
          } else if (d < 0.05) st.path.shift();
          else {
            const sp = Math.min(d, (st.hold ? 1.8 : st.path.length > 2 ? 1.5 : 1.0) * dt);
            st.x += (dx / d) * sp;
            st.z += (dz / d) * sp;
            st.yaw = dampAngle(st.yaw, Math.atan2(dx, dz), 8, dt);
            want.walk = 1;
            want.speed = st.hold ? 1.6 : 1;
          }
        } else if (st.hold) st.mode = 'held';
        else {
          st.mode = 'rest';
          st.rest = st.spot?.nap ? 14 + Math.random() * 12 : 5 + Math.random() * 5;
          if (st.spot?.yaw !== undefined) st.yaw = st.spot.yaw;
        }
      }
      // Meow every 20 to 45 seconds
      st.meow -= dt;
      if (st.meow <= 0) {
        st.meow = 20 + Math.random() * 25;
        if (want.nap < 0.5) meow(['Meow!', 'Mrrp!', 'Mew!'][Math.floor(Math.random() * 3)]);
      }
      if (st.bubble > 0) st.bubble -= dt;
      cat.bubble.visible = st.bubble > 0;
      cat.bubble.position.set(0, 0.88 + Math.sin(t * 6) * 0.02, 0.15);
      cat.bubble.material.opacity = clamp(st.bubble * 4, 0, 1);
      cat.root.position.set(st.x, st.y, st.z);
      cat.root.rotation.y = st.yaw;
      cat.update(dt, t, want);
    },
  };
}
