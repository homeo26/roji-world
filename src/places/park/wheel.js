import { THREE, P, inst, bulbs, toGeo, vcMat, smooth, colorBake, fitText, roundRect } from './parts.js';
import { mat, umat, mesh } from '../../util.js';
import { Tune, TUNES, sfx } from './music.js';

// The big wheel: eight pastel gondolas hanging in front of a white wheel lit with bulbs. Ride it
// together. At the very top it stops for a moment: at sunset Homama kisses Roji and the view opens
// out over the park; at night the fireworks start; by day he points out the whole park to her.

const R = 5.5;
const HUB = 7.2;
const N = 8;
const OUT = 0.95; // gondolas hang this far in front of the wheel
const HANG = 1.25; // pivot to floor

function gondolaModel(k) {
  const g = new THREE.Group();
  const shell = '#ffffff';
  g.add(k.at(k.cyl(0.04, 0.04, 0.36, P.steel, 6), 0, -0.18, 0));
  const roof = k.sph(0.78, shell, undefined, 12);
  roof.scale.set(1, 0.42, 1);
  roof.position.y = -0.42;
  g.add(roof);
  g.add(k.at(k.cyl(0.8, 0.8, 0.08, '#ffffff', 18), 0, -0.48, 0));
  g.add(k.at(k.sph(0.09, P.gold, undefined, 8), 0, -0.08, 0));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    g.add(k.at(k.cyl(0.03, 0.03, 0.75, P.steel, 6), Math.sin(a) * 0.68, -0.86, Math.cos(a) * 0.68));
  }
  g.add(k.at(k.cyl(0.76, 0.7, 0.42, shell, 18), 0, -HANG + 0.21, 0));
  g.add(k.at(k.cyl(0.78, 0.78, 0.06, P.gold, 18), 0, -HANG + 0.44, 0));
  g.add(k.at(k.cyl(0.72, 0.72, 0.05, '#e8d6c8', 18), 0, -HANG + 0.03, 0));
  // the bench at the back
  g.add(k.at(k.rbox(1.15, 0.12, 0.38, P.cream, 0.04), 0, -HANG + 0.36, -0.36));
  g.add(k.at(k.rbox(1.15, 0.36, 0.08, P.cream, 0.04), 0, -HANG + 0.58, -0.56));
  return g;
}

export function buildWheel(ctx, k, atlas, at, hooks = {}) {
  const { api } = ctx;
  const root = new THREE.Group();
  root.position.set(at.x, 0, at.z);
  const dynamic = [];
  // The A-frame behind the wheel
  const legGeo = new THREE.CylinderGeometry(0.13, 0.2, 1, 10);
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * 3.4, 0, -1.1);
    const b = new THREE.Vector3(0, HUB, -1.05);
    const leg = mesh(legGeo, mat('#ffffff', { rough: 0.5, metal: 0.1 }));
    leg.position.copy(a).lerp(b, 0.5);
    leg.scale.y = a.distanceTo(b);
    leg.lookAt(b);
    leg.rotateX(Math.PI / 2);
    root.add(leg);
    root.add(k.at(k.rbox(0.7, 0.3, 0.7, P.stoneDark, 0.05), s * 3.4, 0.15, -1.1));
    // cross braces
    for (const y of [2.2, 4.4]) {
      const t = y / HUB;
      root.add(k.at(k.box(Math.abs(s * 3.4 * (1 - t)) * 2, 0.08, 0.08, '#ffffff'), 0, y, -1.08));
    }
  }
  root.add(k.at(k.rot(k.cyl(0.22, 0.22, 1.3, P.steel, 12), Math.PI / 2, 0, 0), 0, HUB, -0.5));

  // The wheel itself
  const rotor = new THREE.Group();
  rotor.position.set(0, HUB, 0);
  root.add(rotor);
  dynamic.push(rotor);
  for (const z of [-0.25, 0.25]) {
    rotor.add(k.at(k.tor(R, 0.08, '#ffffff', Math.PI * 2, { rough: 0.45 }, 48, 5), 0, 0, z));
    rotor.add(k.at(k.tor(R - 0.6, 0.05, '#ffd1dc', Math.PI * 2, undefined, 40, 4), 0, 0, z));
  }
  rotor.add(k.at(k.rot(k.cyl(0.55, 0.55, 0.7, P.pink, 18), Math.PI / 2, 0, 0), 0, 0, 0));
  rotor.add(k.at(k.rot(k.cyl(0.3, 0.3, 0.8, P.gold, 14), Math.PI / 2, 0, 0), 0, 0, 0));
  const heart = k.heart(0.6, 0.06, P.rose);
  heart.position.z = 0.42;
  rotor.add(heart);
  const spokeGeo = new THREE.CylinderGeometry(0.035, 0.035, R, 4, 1, true);
  spokeGeo.translate(0, R / 2, 0);
  for (let i = 0; i < 16; i++) {
    for (const z of [-0.25, 0.25]) {
      const sp = mesh(spokeGeo, mat('#ffffff', { rough: 0.5 }), { cast: false });
      sp.rotation.z = (i / 16) * Math.PI * 2;
      sp.position.z = z;
      rotor.add(sp);
    }
  }
  // zigzag lattice between the rims
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const b = ((i + 1) / 32) * Math.PI * 2;
    const p1 = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    const p2 = new THREE.Vector3(Math.cos(b) * (R - 0.6), Math.sin(b) * (R - 0.6), 0);
    const bar = mesh(new THREE.CylinderGeometry(0.025, 0.025, p1.distanceTo(p2), 3, 1, true), mat('#ffffff', { rough: 0.5 }), { cast: false });
    bar.position.copy(p1).lerp(p2, 0.5);
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
    rotor.add(bar);
  }
  // axle stubs out to the gondolas
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    rotor.add(k.at(k.rot(k.cyl(0.05, 0.05, OUT + 0.5, P.steel, 6), Math.PI / 2, 0, 0), Math.cos(a) * R, Math.sin(a) * R, OUT / 2 - 0.1));
  }
  const bp = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    bp.push(new THREE.Vector3(Math.cos(a) * (R + 0.12), Math.sin(a) * (R + 0.12), 0.3));
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 16;
    for (let j = 1; j <= 5; j++) bp.push(new THREE.Vector3(Math.cos(a) * j * 0.9, Math.sin(a) * j * 0.9, 0.3));
  }
  const lights = bulbs(bp, { r: 0.075, colors: ['#ffd1dc', '#fff3c4', '#c7e9ff', '#fff3c4'] });
  rotor.add(lights);
  colorBake(rotor, [lights]);

  // Gondolas (one instanced mesh); they hang straight down as the wheel turns
  const gGeo = toGeo(gondolaModel(k));
  const gondolas = inst(gGeo, vcMat(0.6), N, { colors: ['#ffb7c8', '#bfe3ff', '#fff0a8', '#d9c8ff', '#bff0dc', '#ffd0b8', '#ffc4e1', '#c4f0ff'] });
  root.add(gondolas);
  dynamic.push(gondolas);

  // Boarding platform with steps, a railing behind it and the sign
  root.add(k.at(k.rbox(4.2, 0.4, 1.9, P.cream, 0.04), 0, 0.2, 2.7));
  root.add(k.at(k.box(4.2, 0.05, 1.9, '#f3d2c0'), 0, 0.42, 2.7));
  root.add(k.at(k.box(2, 0.2, 0.5, P.stoneDark), 0, 0.1, 3.9));
  for (const s of [-1, 1]) {
    for (let x = 0.6; x < 2.2; x += 0.45) root.add(k.at(k.cyl(0.03, 0.03, 0.75, P.gold, 6), s * x, 0.8, 1.8));
    root.add(k.at(k.box(1.6, 0.05, 0.05, P.gold), s * 1.4, 1.17, 1.8));
  }
  const sign = atlas.panel(2.2, 0.6, 440, 120, (c, w, h) => {
    c.fillStyle = '#8fd3ff';
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = '#ffffff';
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'The Big Wheel', w / 2, h / 2 + 3, w * 0.84, 64);
  });
  root.add(k.at(k.box(0.1, 1.9, 0.1, P.woodDark), -2.6, 0.95, 3.4));
  root.add(k.at(k.box(0.1, 1.9, 0.1, P.woodDark), -0.8, 0.95, 3.4));
  sign.position.set(-1.7, 1.75, 3.47);
  root.add(sign);
  root.add(k.at(k.box(2.3, 0.7, 0.06, P.woodDark), -1.7, 1.75, 3.42));

  const st = { angle: 0, omega: 0.16, ride: null, tune: null };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const zAxis = new THREE.Vector3(0, 0, 1);
  const pivotLocal = (i, out) => {
    const a = (i / N) * Math.PI * 2 + st.angle;
    return out.set(Math.cos(a) * R, HUB + Math.sin(a) * R, OUT);
  };
  const gondolaAngle = (i) => (i / N) * Math.PI * 2 + st.angle;
  const swingOf = (i, t) => Math.sin(t * 1.3 + i) * 0.03 + (st.ride?.i === i ? st.ride.sway : 0);
  const seatWorld = (i, side, t, out) => {
    pivotLocal(i, v);
    out.set(side * 0.3, -HANG + 0.42 - 0.18, -0.3);
    out.applyAxisAngle(zAxis, swingOf(i, t)).add(v);
    return root.localToWorld(out);
  };

  function start() {
    // The gondola nearest the bottom
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < N; i++) {
      const d = Math.abs(Math.atan2(Math.sin(gondolaAngle(i) + Math.PI / 2), Math.cos(gondolaAngle(i) + Math.PI / 2)));
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    // Ease the wheel so that gondola sits at the bottom, then go round once
    const target = -Math.PI / 2 - (best / N) * Math.PI * 2;
    let delta = Math.atan2(Math.sin(target - st.angle), Math.cos(target - st.angle));
    st.ride = { i: best, t: 0, from: st.angle, align: delta, phase: 'board', top: 0, moment: null, sway: 0, done: false };
    st.tune = new Tune(api.sound, TUNES.wheel, { volume: 0.9 });
    api.activity({
      label: 'Get off',
      endOnMove: false,
      music: 0.3,
      seats: [
        { who: 'roji', x: at.x - 0.3, z: at.z + 0.6, y: 0.6, pose: 'sit', yaw: 0 },
        { who: 'homama', x: at.x + 0.3, z: at.z + 0.6, y: 0.6, pose: 'sit', yaw: 0 },
      ],
      focus: { x: at.x, z: at.z + 1, y: 1.5, zoom: 0.8 },
      exit: { x: at.x - 0.4, z: at.z + 3.0 },
      onEnd: () => {
        st.ride = null;
        st.tune?.stop();
        st.tune = null;
        for (const w of ['roji', 'homama']) {
          const kid = api[w].kid;
          kid.body.rotation.set(0, 0, 0);
          kid.mouth.scale.set(1, 1, 1);
        }
        // land them on the platform
        for (const w of ['roji', 'homama']) api[w].y = 0.4;
      },
    });
    api.toast(api.playerId === 'roji' ? 'Up you go. Homama holds the door for you.' : 'You hold the gondola door for Roji, then hop in beside her.', 2600);
  }

  const kp = new THREE.Vector3();
  return {
    debug: st,
    root,
    dynamic,
    colliders: [
      { type: 'box', x: at.x, z: at.z + 0.1, hw: 5.9, hd: 1.65 },
      { type: 'box', x: at.x, z: at.z + 2.7, hw: 2.1, hd: 0.95, h: 0.4 },
      { type: 'box', x: at.x - 1.7, z: at.z + 3.42, hw: 1.0, hd: 0.08 },
    ],
    hotspots: [{ x: at.x + 0.5, z: at.z + 4.4, r: 1.5, label: 'Ride the big wheel', icon: 'park-wheel', act: () => start() }],
    update(dt, t, people, dark) {
      const Rd = st.ride;
      if (Rd) {
        Rd.t += dt;
        st.tune?.update();
        if (Rd.phase === 'board') {
          const k2 = smooth(Rd.t / 1.6);
          st.angle = Rd.from + Rd.align * k2;
          if (Rd.t > 1.8) {
            Rd.phase = 'up';
            Rd.t = 0;
          }
        } else if (Rd.phase === 'up' || Rd.phase === 'down') {
          st.angle += 0.22 * dt;
          const ga = gondolaAngle(Rd.i);
          const fromTop = Math.atan2(Math.sin(ga - Math.PI / 2), Math.cos(ga - Math.PI / 2));
          if (Rd.phase === 'up' && fromTop > -0.02 && fromTop < 0.5) {
            Rd.phase = 'top';
            Rd.t = 0;
            Rd.moment = hooks.moment?.() || 'day';
            if (Rd.moment === 'night') hooks.fireworks?.();
          }
          if (Rd.phase === 'down' && Math.abs(Math.atan2(Math.sin(ga + Math.PI / 2), Math.cos(ga + Math.PI / 2))) < 0.03) {
            Rd.phase = 'end';
            Rd.t = 0;
          }
        } else if (Rd.phase === 'top') {
          // a gentle stop at the very top
          if (Rd.t < 0.8) st.angle += 0.22 * dt * (1 - Rd.t / 0.8);
          topMoment(Rd, dt, t);
          if (Rd.t > 8) {
            Rd.phase = 'down';
            Rd.t = 0;
          }
        } else if (Rd.phase === 'end' && Rd.t > 0.6) {
          api.endActivity();
        }
        Rd.sway = Rd.phase === 'top' && Rd.t < 1.2 ? Math.sin(Rd.t * 7) * 0.08 * (1 - Rd.t / 1.2) : 0;
      } else st.angle += st.omega * dt;
      rotor.rotation.z = st.angle;
      for (let i = 0; i < N; i++) {
        pivotLocal(i, v);
        q.setFromAxisAngle(zAxis, swingOf(i, t));
        gondolas.setMatrixAt(i, m4.compose(v, q, one));
      }
      gondolas.instanceMatrix.needsUpdate = true;
      if (st.ride) {
        const Rr = st.ride;
        for (const [w, side] of [['roji', -1], ['homama', 1]]) {
          const a = api[w];
          seatWorld(Rr.i, side, t, kp);
          a.kid.root.position.copy(kp);
          a.kid.root.rotation.set(0, 0, swingOf(Rr.i, t));
          a.pos.set(kp.x, 0, kp.z);
          a.y = kp.y;
          a.yaw = 0;
        }
        const fy = kp.y + 0.6;
        const zoom = Rr.phase === 'top' && Rr.t > 2.2 && Rr.moment !== 'night' ? 1.75 : Rr.phase === 'top' && Rr.moment === 'night' ? 1.4 : 0.85;
        Rr.zoom = (Rr.zoom ?? 0.85) + (zoom - (Rr.zoom ?? 0.85)) * Math.min(1, dt * 1.2);
        const lp = api.local(kp);
        api.focus({ x: lp.x, z: lp.z, y: fy, zoom: Rr.zoom });
      }
    },
  };

  // At the top: the kiss at sunset, the fireworks at night, the view by day
  function topMoment(Rd, dt, t) {
    const hk = api.homama.kid;
    const rk = api.roji.kid;
    const T = Rd.t;
    if (Rd.moment === 'day') {
      // Homama points out over the park, then they lean their heads together
      const p = smooth((T - 0.8) / 0.6) * (1 - smooth((T - 4) / 0.6));
      hk.arms[0].rotation.set(-1.9 * p - 0.55 * (1 - p), 0, 0.35 * p + 0.12);
      const lean = smooth((T - 4.4) / 0.8) * (1 - smooth((T - 7.4) / 0.5));
      hk.body.rotation.z = 0.12 * lean;
      rk.body.rotation.z = -0.12 * lean;
      if (!Rd.said && T > 1) {
        Rd.said = true;
        api.toast('Homama: Look, Roji, you can see the whole park from up here. Next time, let us come at sunset.', 3600);
      }
      if (!Rd.hearts && T > 5) {
        Rd.hearts = true;
        api.fx.heartsAt(rk.root.position.clone().lerp(hk.root.position, 0.5).setY(rk.root.position.y + 1.3), 4);
      }
      return;
    }
    // The kiss (sunset and night)
    const lean = smooth((T - 1.2) / 0.7) * (1 - smooth((T - 4.2) / 0.6));
    hk.body.rotation.set(0.12 * lean, -0.75 * lean, 0.2 * lean);
    rk.body.rotation.set(0.05 * lean, 0.45 * lean, -0.08 * lean);
    hk.mouth.scale.set(1 - 0.45 * lean, 1, 1);
    if (!Rd.kissed && T > 2.0) {
      Rd.kissed = true;
      sfx.chime(api.sound);
      api.fx.heartsAt(rk.root.position.clone().lerp(hk.root.position, 0.5).setY(rk.root.position.y + 1.25), 8);
      api.toast(Rd.moment === 'night' ? 'Fireworks over the castle, and a kiss at the top of the wheel.' : 'The sun goes down over Roji Land, and at the very top Homama kisses Roji.', 3800);
    }
    if (lean < 0.01 && T > 4.8) {
      hk.body.rotation.set(0, 0, 0);
      rk.body.rotation.set(0, 0, 0);
    }
  }
}
