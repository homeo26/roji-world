import * as THREE from 'three';
import { kit as baseKit, makeAtlas, colorBake, boardDraw, fitText, heartPath, heartGeo, glowTexture, uvScale, pattern } from '../../places/school/kit.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT } from '../../util.js';
import { skinify } from '../../places/zoo/rig.js';

// Shared pieces for Roji's Riding Stable: colours, ponies, the barn cat, hens, lanterns, tack and sounds.

export { THREE, mat, umat, mesh, canvasTexture, roundRect, FONT, makeAtlas, colorBake, boardDraw, fitText, heartPath, heartGeo, glowTexture, uvScale, pattern, skinify };
export const P = Math.PI;

export const COL = {
  red: '#d4524a',
  redDark: '#a93d38',
  trim: '#fff6ea',
  roof: '#66728d',
  roofDark: '#4f5970',
  wood: '#c48d5c',
  woodLight: '#dcaa77',
  woodDark: '#8f5d3a',
  plank: '#e2b37f',
  hay: '#f0cf6a',
  hayDark: '#d4a945',
  straw: '#f3d98a',
  leather: '#8a4b2e',
  leatherDark: '#5e301c',
  gold: '#f4c24f',
  pink: '#ff8fb1',
  rose: '#ef5b6f',
  blush: '#ffd1dc',
  blue: '#6fb8ff',
  navy: '#3f6fb8',
  mint: '#7fd8bf',
  lilac: '#c7a6ff',
  sun: '#ffd166',
  cream: '#fff4e3',
  steel: '#c9d2dc',
  ink: '#4a3423',
  stone: '#cbbfb2',
  leaf: '#6cc24a',
  water: '#8fd3ff',
  dirt: '#d9b98c',
};

// Primitive makers (geometry cached per build) plus a few stable extras.
export function kit() {
  const k = baseKit();
  const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
  k.M = M;
  k.lathe = (pts, c, seg = 16, o) => mesh(k.geo(`l${pts.join(';')},${seg}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)), M(c, o));
  k.ext = (key, shape, depth, c, o) =>
    mesh(
      k.geo(`e${key}`, () => {
        const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
        g.translate(0, 0, -depth / 2);
        return g;
      }),
      M(c, o),
    );
  k.caps = (r, h, c, o, seg = 12) => mesh(k.geo(`cp${r},${h},${seg}`, () => new THREE.CapsuleGeometry(r, h, 4, seg)), M(c, o));
  return k;
}

// Small tone helpers (api.sound or ctx.sound). Guard: no context before the first click.
export function tone(s, f, dur, o = {}, delay = 0) {
  if (!s?.ctx || s.muted) return;
  s.tone(f, s.ctx.currentTime + delay, dur, { gain: 0.06, ...o });
}
export function noise(s, { dur = 0.4, freq = 1800, q = 0.8, gain = 0.08, type = 'bandpass', delay = 0 } = {}) {
  if (!s?.ctx || s.muted || !s.noise || !s.sfx) return;
  const ctx = s.ctx;
  const src = ctx.createBufferSource();
  src.buffer = s.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  const t = ctx.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(s.sfx);
  src.start(t, Math.random() * 0.2);
  src.stop(t + dur + 0.05);
}
// A soft pony nicker: a wobbling low tone
export function nicker(s, pitch = 1) {
  if (!s?.ctx || s.muted) return;
  const t = s.ctx.currentTime;
  for (let i = 0; i < 4; i++) s.tone(170 * pitch + (i % 2) * 22, t + i * 0.07, 0.11, { type: 'triangle', gain: 0.05, slideTo: 140 * pitch });
}
export function whinny(s, pitch = 1) {
  if (!s?.ctx || s.muted) return;
  const t = s.ctx.currentTime;
  s.tone(520 * pitch, t, 0.5, { type: 'sawtooth', gain: 0.018, slideTo: 900 * pitch, attack: 0.03 });
  s.tone(880 * pitch, t + 0.45, 0.6, { type: 'triangle', gain: 0.03, slideTo: 380 * pitch });
}
export function crunch(s) {
  noise(s, { dur: 0.12, freq: 2600, q: 1.4, gain: 0.07 });
}
export function meow(s) {
  if (!s?.ctx || s.muted) return;
  const t = s.ctx.currentTime;
  s.tone(620, t, 0.35, { type: 'triangle', gain: 0.04, slideTo: 880, attack: 0.04 });
  s.tone(880, t + 0.3, 0.3, { type: 'triangle', gain: 0.03, slideTo: 520 });
}

// ------------------------------------------------------------------ ponies
// A stable pony (no saddle). Faces +Z, about the same size as the town pony.
// neck: pivot at the withers (rotate x to lower the head); head: group (rotate for nods); ears: pivots.
// opts: { coat, mane, muzzle, hoof, blaze, socks, lashes, spots, headOnly }
export function makeStablePony(opts = {}) {
  const { coat = '#c98a4b', mane = '#fff1d6', muzzle = '#f6e2cc', hoof = '#5a3624', blaze = true, socks = false, lashes = false, spots = null, headOnly = false } = opts;
  const root = new THREE.Group();
  const coatM = mat(coat, { rough: 0.62 });
  const maneM = mat(mane, { rough: 0.78 });
  const lightM = mat(muzzle, { rough: 0.7 });
  const darkM = mat(hoof, { rough: 0.6 });
  const eyeM = mat('#2a1a14', { rough: 0.25 });
  const shineM = mat('#ffffff', { rough: 0.2 });
  const legs = [];
  if (!headOnly) {
    const body = mesh(new THREE.CapsuleGeometry(0.36, 0.75, 6, 14), coatM);
    body.rotation.x = P / 2;
    body.position.y = 0.95;
    root.add(body);
    if (spots) {
      for (const [x, y, z, r] of [[0.28, 1.05, -0.3, 0.13], [-0.3, 0.98, -0.05, 0.11], [0.31, 0.92, 0.18, 0.09], [-0.27, 1.1, -0.42, 0.1], [0.12, 1.26, 0.0, 0.1]]) {
        const s = mesh(new THREE.SphereGeometry(r, 10, 8), mat(spots, { rough: 0.62 }));
        s.position.set(x, y, z);
        s.scale.set(0.35, 1, 1);
        if (Math.abs(x) < 0.2) s.scale.set(1, 0.35, 1);
        root.add(s);
      }
    }
    for (const [x, z] of [[0.19, 0.42], [-0.19, 0.42], [0.19, -0.42], [-0.19, -0.42]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.85, z);
      const leg = mesh(new THREE.CylinderGeometry(0.078, 0.066, 0.7, 10), coatM);
      leg.position.y = -0.38;
      const hoofM = mesh(new THREE.CylinderGeometry(0.08, 0.092, 0.1, 10), darkM);
      hoofM.position.y = -0.77;
      pivot.add(leg, hoofM);
      if (socks) {
        const sock = mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.2, 10), lightM);
        sock.position.y = -0.62;
        pivot.add(sock);
      }
      root.add(pivot);
      legs.push(pivot);
    }
  }
  // Neck and head on a pivot at the withers
  const neck = new THREE.Group();
  neck.position.set(0, 1.15, 0.42);
  root.add(neck);
  const neckM = mesh(new THREE.CapsuleGeometry(0.19, 0.45, 4, 12), coatM);
  neckM.position.set(0, 0.2, 0.13);
  neckM.rotation.x = 0.55;
  neck.add(neckM);
  const maneTufts = [];
  for (let i = 0; i < 5; i++) {
    const tuft = mesh(new THREE.SphereGeometry(0.095, 10, 8), maneM);
    tuft.position.set(0, 0.15 + i * 0.1, -0.05 + i * 0.075);
    tuft.scale.set(0.62, 1, 1.3);
    neck.add(tuft);
    maneTufts.push(tuft);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.53, 0.36);
  head.rotation.x = 0.55;
  neck.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.22, 16, 12), coatM);
  skull.scale.set(0.86, 0.86, 1.35);
  const muz = mesh(new THREE.SphereGeometry(0.165, 14, 10), lightM);
  muz.position.set(0, -0.08, 0.26);
  muz.scale.set(1, 0.85, 1);
  head.add(skull, muz);
  if (blaze) {
    const b = mesh(new THREE.SphereGeometry(0.06, 10, 8), lightM);
    b.scale.set(0.8, 2.2, 0.5);
    b.position.set(0, 0.07, 0.25);
    b.rotation.x = 0.6;
    head.add(b);
  }
  for (const s of [1, -1]) {
    const nos = mesh(new THREE.SphereGeometry(0.025, 8, 6), mat('#8a5a48', { rough: 0.6 }));
    nos.position.set(0.06 * s, -0.08, 0.41);
    head.add(nos);
    const eye = mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeM);
    eye.position.set(0.155 * s, 0.05, 0.08);
    const glint = mesh(new THREE.SphereGeometry(0.014, 6, 4), shineM);
    glint.position.set(0.185 * s, 0.075, 0.1);
    head.add(eye, glint);
    if (lashes) {
      for (let k = 0; k < 2; k++) {
        const l = mesh(new THREE.BoxGeometry(0.008, 0.035, 0.008), eyeM);
        l.position.set(0.17 * s, 0.1, 0.06 + k * 0.035);
        l.rotation.z = -0.5 * s;
        head.add(l);
      }
    }
  }
  const ears = [];
  for (const s of [1, -1]) {
    const ep = new THREE.Group();
    ep.position.set(0.1 * s, 0.2, -0.06);
    ep.rotation.z = -0.2 * s;
    const ear = mesh(new THREE.ConeGeometry(0.06, 0.18, 8), coatM);
    ear.position.y = 0.08;
    const inner = mesh(new THREE.ConeGeometry(0.035, 0.12, 6), mat('#f7c1b0', { rough: 0.7 }));
    inner.position.set(0, 0.07, 0.03);
    ep.add(ear, inner);
    head.add(ep);
    ears.push(ep);
  }
  const forelock = mesh(new THREE.SphereGeometry(0.085, 10, 8), maneM);
  forelock.position.set(0, 0.22, 0.0);
  forelock.scale.set(1, 0.8, 1.2);
  head.add(forelock);
  let tail = null;
  if (!headOnly) {
    tail = new THREE.Group();
    tail.position.set(0, 1.12, -0.72);
    tail.rotation.x = 0.3;
    // A tail that flows out from the dock and falls in a soft plume
    const t1 = mesh(new THREE.CapsuleGeometry(0.055, 0.16, 4, 10), maneM);
    t1.position.set(0, -0.06, -0.08);
    t1.rotation.x = -1.0;
    const t2 = mesh(new THREE.SphereGeometry(0.1, 12, 10), maneM);
    t2.position.set(0, -0.28, -0.2);
    t2.scale.set(0.85, 1.9, 0.85);
    t2.rotation.x = -0.35;
    const t3 = mesh(new THREE.SphereGeometry(0.075, 10, 8), maneM);
    t3.position.set(0, -0.54, -0.27);
    t3.scale.set(0.8, 1.3, 0.8);
    tail.add(t1, t2, t3);
    root.add(tail);
  }
  return { root, legs, neck, head, ears, tail, maneTufts, forelock };
}

// Halter (leather over the nose and behind the ears), added to a pony head group.
export function addHalter(p, color = COL.rose) {
  const m = mat(color, { rough: 0.55 });
  const band = mesh(new THREE.TorusGeometry(0.175, 0.018, 6, 20), m);
  band.position.set(0, -0.05, 0.25);
  band.scale.set(1, 0.85, 1);
  const crown = mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 20), m);
  crown.position.set(0, 0.02, -0.05);
  crown.rotation.x = 0.4;
  crown.scale.set(1, 1.05, 1);
  const ring = mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 12), mat(COL.gold, { rough: 0.35, metal: 0.5 }));
  ring.position.set(0, -0.2, 0.2);
  p.head.add(band, crown, ring);
  return ring;
}

// Idle life for a pony: ear flicks, a slow head bob, the tail swishing. k: 0..1 liveliness.
export function ponyIdle(p, t, seed = 0, k = 1) {
  const s = Math.sin(t * 1.1 + seed);
  if (p.tail) {
    p.tail.rotation.z = Math.sin(t * 1.7 + seed) * 0.28 * k;
    p.tail.rotation.x = 0.3 + Math.sin(t * 1.3 + seed) * 0.08;
  }
  const flick = Math.max(0, Math.sin(t * 0.9 + seed * 3)) ** 12;
  p.ears[0].rotation.x = -flick * 0.6;
  p.ears[1].rotation.x = -(Math.max(0, Math.sin(t * 0.7 + seed * 5)) ** 12) * 0.6;
  return s;
}

// ------------------------------------------------------------------ animals
// The barn cat, curled up. tail and head are pivots.
export function makeCat(color = '#f2a65a', stripe = '#d9823b') {
  const root = new THREE.Group();
  const m = mat(color, { rough: 0.7 });
  const st = mat(stripe, { rough: 0.7 });
  const body = mesh(new THREE.SphereGeometry(0.2, 14, 10), m);
  body.scale.set(1.25, 0.7, 1);
  body.position.y = 0.13;
  root.add(body);
  for (let i = 0; i < 3; i++) {
    const s = mesh(new THREE.TorusGeometry(0.17, 0.018, 4, 14, P), st);
    s.position.set(-0.1 + i * 0.1, 0.14, 0);
    s.rotation.y = P / 2;
    s.scale.set(1, 0.75, 1);
    root.add(s);
  }
  const head = new THREE.Group();
  head.position.set(0.22, 0.17, 0.06);
  root.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.11, 12, 10), m);
  skull.scale.set(1, 0.9, 1);
  head.add(skull);
  for (const s of [1, -1]) {
    const ear = mesh(new THREE.ConeGeometry(0.04, 0.08, 6), m);
    ear.position.set(0.0, 0.1, 0.055 * s);
    ear.rotation.x = 0.3 * s;
    head.add(ear);
    const eye = mesh(new THREE.BoxGeometry(0.01, 0.008, 0.035), mat('#3b2b3f'));
    eye.position.set(0.1, 0.02, 0.04 * s);
    head.add(eye);
  }
  const nose = mesh(new THREE.SphereGeometry(0.014, 6, 4), mat('#f28da0'));
  nose.position.set(0.11, -0.01, 0);
  head.add(nose);
  const tail = new THREE.Group();
  tail.position.set(-0.22, 0.08, 0);
  root.add(tail);
  const tm = mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 14, P * 1.1), m);
  tm.rotation.x = -P / 2;
  tm.position.set(0.08, 0, 0.06);
  tail.add(tm);
  const tip = mesh(new THREE.SphereGeometry(0.04, 8, 6), st);
  tip.position.set(0.18, 0, 0.2);
  tail.add(tip);
  return { root, head, tail };
}

// A hen. body: the pivot that tips forward to peck; head on it.
export function makeHen(color = '#ffffff') {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.2;
  root.add(body);
  const m = mat(color, { rough: 0.8 });
  const torso = mesh(new THREE.SphereGeometry(0.13, 12, 10), m);
  torso.scale.set(0.9, 0.85, 1.15);
  const tailF = mesh(new THREE.ConeGeometry(0.08, 0.16, 8), m);
  tailF.position.set(0, 0.08, -0.13);
  tailF.rotation.x = -0.7;
  body.add(torso, tailF);
  for (const s of [1, -1]) {
    const wing = mesh(new THREE.SphereGeometry(0.07, 8, 6), m);
    wing.position.set(0.11 * s, 0.0, -0.01);
    wing.scale.set(0.35, 0.8, 1.2);
    body.add(wing);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.11, 0.1);
  body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.065, 10, 8), m);
  const comb = mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#e5484d'));
  comb.position.set(0, 0.06, 0.0);
  comb.scale.set(0.6, 1, 1.4);
  const beak = mesh(new THREE.ConeGeometry(0.022, 0.05, 6), mat('#ffb627'));
  beak.position.set(0, -0.005, 0.07);
  beak.rotation.x = P / 2;
  const wattle = mesh(new THREE.SphereGeometry(0.016, 6, 4), mat('#e5484d'));
  wattle.position.set(0, -0.04, 0.05);
  head.add(skull, comb, beak, wattle);
  for (const s of [1, -1]) {
    const eye = mesh(new THREE.SphereGeometry(0.011, 6, 4), mat('#2a1a14'));
    eye.position.set(0.05 * s, 0.015, 0.035);
    head.add(eye);
  }
  const legs = [];
  for (const s of [1, -1]) {
    const lp = new THREE.Group();
    lp.position.set(0.045 * s, 0.1, 0);
    const leg = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 5), mat('#ffb627'));
    leg.position.y = -0.05;
    const foot = mesh(new THREE.BoxGeometry(0.05, 0.012, 0.06), mat('#ffb627'));
    foot.position.set(0, -0.1, 0.015);
    lp.add(leg, foot);
    root.add(lp);
    legs.push(lp);
  }
  return { root, body, head, legs };
}

// ------------------------------------------------------------------ tack and props
// A saddle with its pad, flaps and stirrups. Front toward +Z; seat top about y = 0.12.
export function makeSaddle(k, leather = COL.leather, pad = COL.pink) {
  const g = new THREE.Group();
  // A colourful pad with a white edge peeking out
  g.add(k.at(k.rbox(0.6, 0.03, 0.64, pad, 0.014), 0, -0.02, 0));
  g.add(k.at(k.rbox(0.64, 0.014, 0.68, '#ffffff', 0.006), 0, -0.04, 0));
  // The seat dips between a raised cantle (back) and pommel (front)
  const seat = k.at(k.sph(0.25, leather, undefined, 16), 0, 0.02, 0);
  seat.scale.set(0.92, 0.26, 1.12);
  g.add(seat);
  const cantle = new THREE.Group();
  cantle.add(k.tor(0.16, 0.05, leather, P, undefined, 14, 6));
  cantle.position.set(0, 0.02, -0.2);
  cantle.rotation.x = -0.5;
  g.add(cantle);
  const pommel = new THREE.Group();
  pommel.add(k.tor(0.11, 0.045, leather, P, undefined, 12, 6));
  pommel.position.set(0, 0.03, 0.22);
  pommel.rotation.x = 0.5;
  g.add(pommel);
  g.add(k.at(k.sph(0.045, COL.leatherDark), 0, 0.12, 0.26));
  for (const s of [1, -1]) {
    g.add(k.rot(k.at(k.rbox(0.03, 0.36, 0.38, leather, 0.014), 0.27 * s, -0.17, 0.02), 0, 0, 0.12 * s));
    g.add(k.at(k.box(0.012, 0.3, 0.025, COL.leatherDark), 0.3 * s, -0.4, 0.06));
    g.add(k.rot(k.at(k.tor(0.055, 0.012, COL.steel, P * 2, undefined, 14, 6), 0.3 * s, -0.58, 0.06), 0, P / 2, 0));
  }
  return g;
}

// A riding helmet (velvet shell, a little peak, a chin strap), centred on the head sphere.
export function makeHelmet(color = COL.pink, deco = '#ffffff', kind = 'hearts') {
  const g = new THREE.Group();
  const R = 0.33;
  const shellM = mat(color, { rough: 0.45 });
  const shell = mesh(new THREE.SphereGeometry(R, 22, 10, 0, P * 2, 0, P * 0.5), shellM);
  shell.scale.set(1.03, 0.92, 1.06);
  const rim = mesh(new THREE.TorusGeometry(R * 1.03, 0.022, 6, 24), mat(deco, { rough: 0.5 }));
  rim.rotation.x = P / 2;
  rim.scale.set(1, 1.03, 1);
  // A short peak at the front
  const peak = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.025, 16, 1, false, -P * 0.3, P * 0.6), shellM);
  peak.position.set(0, -0.005, 0.18);
  peak.rotation.x = 0.12;
  const button = mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(deco, { rough: 0.4 }));
  button.position.set(0, R * 0.92, 0);
  g.add(shell, rim, peak, button);
  // Chin strap from each side down under the chin
  const strapM = mat('#3b2b3f', { rough: 0.6 });
  for (const s of [1, -1]) {
    const st = mesh(new THREE.BoxGeometry(0.02, 0.26, 0.025), strapM);
    st.position.set(0.28 * s, -0.13, 0.04);
    st.rotation.z = 0.3 * s;
    g.add(st);
  }
  const chin = mesh(new THREE.BoxGeometry(0.2, 0.02, 0.03), strapM);
  chin.position.set(0, -0.25, 0.1);
  g.add(chin);
  if (kind === 'hearts') {
    for (const [a, y] of [[0.7, 0.16], [-0.7, 0.16], [P, 0.18]]) {
      const h = mesh(heartGeo(0.08, 0.015), mat(deco, { rough: 0.4 }));
      h.position.set(Math.sin(a) * R * 0.97, y, Math.cos(a) * R * 1.0);
      h.lookAt(Math.sin(a) * 2, y, Math.cos(a) * 2);
      g.add(h);
    }
  } else if (kind === 'stripe') {
    const st = mesh(new THREE.TorusGeometry(R + 0.004, 0.03, 6, 22, P), mat(deco, { rough: 0.4 }));
    st.rotation.y = P / 2;
    st.scale.set(1.06, 0.92, 1);
    g.add(st);
  } else if (kind === 'bow') {
    for (const s of [1, -1]) {
      const lobe = mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(deco, { rough: 0.4 }));
      lobe.position.set(0.07 * s, 0.16, -0.27);
      lobe.scale.set(1.2, 0.7, 0.5);
      g.add(lobe);
    }
    const knot = mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(deco, { rough: 0.4 }));
    knot.position.set(0, 0.16, -0.29);
    g.add(knot);
  }
  return g;
}

// Put a helmet on a kid's head, hiding the hair top and the bow. Returns remove().
export function wearHelmet(kid, helmet) {
  const HC = new THREE.Vector3(0, 0.29, 0);
  const hairColor = new THREE.Color(kid.look.hair);
  const hidden = [];
  const tails = new Set(kid.tails.map((t) => t.pivot));
  for (const o of kid.head.children) {
    if (!o.visible || tails.has(o) || o === helmet) continue;
    const rel = o.position.clone().sub(HC);
    const bow = !o.isMesh && o.isGroup && rel.y > 0.15;
    if (!bow && (!o.isMesh || !o.material.map || !o.material.color?.equals(hairColor))) continue;
    const prm = o.geometry?.parameters || {};
    const isCap = rel.length() < 1e-3 && prm.thetaStart === 0;
    const onTop = rel.length() > 1e-3 && rel.y > 0.1;
    if (bow || isCap || onTop || o.userData.hairTop) {
      o.visible = false;
      hidden.push(o);
    }
  }
  if (kid.bow && kid.bow.visible) {
    kid.bow.visible = false;
    hidden.push(kid.bow);
  }
  helmet.position.copy(HC).add(new THREE.Vector3(0, 0.06, -0.01));
  helmet.rotation.set(-0.12, 0, 0);
  helmet.scale.setScalar(1);
  kid.head.add(helmet);
  return () => {
    helmet.removeFromParent();
    for (const o of hidden) o.visible = true;
  };
}

// A carrot, an apple and a sugar cube to hold out on a flat hand.
export function makeCarrot() {
  const g = new THREE.Group();
  const body = mesh(new THREE.ConeGeometry(0.035, 0.2, 8), mat('#ff8a2b', { rough: 0.6 }));
  body.rotation.x = P;
  g.add(body);
  for (let i = 0; i < 3; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.012, 0.09, 4), mat(COL.leaf));
    leaf.position.set((i - 1) * 0.012, 0.14, 0);
    leaf.rotation.z = (i - 1) * 0.4;
    g.add(leaf);
  }
  return g;
}
export function makeApple(color = '#e5484d') {
  const g = new THREE.Group();
  const a = mesh(new THREE.SphereGeometry(0.055, 12, 10), mat(color, { rough: 0.35 }));
  a.scale.set(1, 0.9, 1);
  const st = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 4), mat(COL.woodDark));
  st.position.y = 0.06;
  const lf = mesh(new THREE.SphereGeometry(0.018, 6, 4), mat(COL.leaf));
  lf.position.set(0.02, 0.065, 0);
  lf.scale.set(1.4, 0.3, 0.8);
  g.add(a, st, lf);
  return g;
}
export function makeSugar() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), mat('#ffffff', { rough: 0.9 })));
  return g;
}

// A grooming brush: wooden back, soft bristles, a strap.
export function makeBrush(color = COL.pink) {
  const g = new THREE.Group();
  const back = mesh(new THREE.BoxGeometry(0.16, 0.04, 0.08), mat(color, { rough: 0.5 }));
  const bristle = mesh(new THREE.BoxGeometry(0.15, 0.04, 0.07), mat('#f3e2c4', { rough: 0.95 }));
  bristle.position.y = -0.035;
  const strap = mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 10, P), mat(COL.leather));
  strap.position.y = 0.02;
  strap.rotation.y = P / 2;
  g.add(back, bristle, strap);
  return g;
}

// A pitchfork, upright, tines at the bottom.
export function makeFork() {
  const g = new THREE.Group();
  const shaft = mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.1, 6), mat(COL.woodLight));
  shaft.position.y = 0.55;
  g.add(shaft);
  const bar = mesh(new THREE.BoxGeometry(0.16, 0.025, 0.025), mat(COL.steel, { rough: 0.35, metal: 0.4 }));
  bar.position.y = 0.0;
  g.add(bar);
  for (let i = 0; i < 4; i++) {
    const tine = mesh(new THREE.CylinderGeometry(0.007, 0.004, 0.2, 4), mat(COL.steel, { rough: 0.35, metal: 0.4 }));
    tine.position.set(-0.06 + i * 0.04, -0.1, 0);
    g.add(tine);
  }
  return g;
}

// A lantern. glowMat is emissive (main.js brightens it after dark outdoors).
export function makeLantern(k, glowMat, { frame = '#3b2b3f', s = 1 } = {}) {
  const g = new THREE.Group();
  g.add(k.at(k.cyl(0.09 * s, 0.1 * s, 0.03 * s, frame, 10), 0, 0, 0));
  g.add(k.at(mesh(k.geo(`lglass${s}`, () => new THREE.CylinderGeometry(0.075 * s, 0.075 * s, 0.17 * s, 10)), glowMat, { cast: false }), 0, 0.1 * s, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * P * 2 + P / 4;
    g.add(k.at(k.box(0.012 * s, 0.18 * s, 0.012 * s, frame), Math.cos(a) * 0.08 * s, 0.1 * s, Math.sin(a) * 0.08 * s));
  }
  g.add(k.at(k.cone(0.11 * s, 0.08 * s, frame, 10), 0, 0.23 * s, 0));
  g.add(k.at(k.tor(0.03 * s, 0.008 * s, frame, P * 2, undefined, 10, 4), 0, 0.29 * s, 0));
  return g;
}

// A rosette ribbon (round with two tails), facing +Z.
export function makeRosette(k, color = COL.blue, center = COL.gold) {
  const g = new THREE.Group();
  for (const s of [1, -1]) g.add(k.rot(k.at(k.box(0.05, 0.16, 0.01, color), 0.025 * s, -0.1, -0.005), 0, 0, 0.18 * s));
  g.add(k.rot(k.cyl(0.085, 0.085, 0.015, color, 14), P / 2, 0, 0));
  g.add(k.at(k.rot(k.cyl(0.05, 0.05, 0.02, center, 12), P / 2, 0, 0), 0, 0, 0.006));
  return g;
}

// A soft round glow sprite. Opacity is set by the caller.
export function glowSprite(color = '#ffcf7a', size = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, fog: false }));
  s.scale.setScalar(size);
  return s;
}

// A plain painted label on its own small canvas (for text that changes).
export function livePanel(wm, hm, pw, ph, draw) {
  const c = document.createElement('canvas');
  c.width = pw;
  c.height = ph;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wm, hm), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  const redraw = () => {
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, pw, ph);
    draw(ctx, pw, ph);
    tex.needsUpdate = true;
  };
  redraw();
  m.userData.redraw = redraw;
  return m;
}

// Board-and-batten barn planks (vertical boards, varying along u). 1 m per repeat.
export function boardsTexture(base, line, knots = true) {
  const t = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = (i * w) / 4;
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.fillRect(x + 6, 0, 18, h);
      c.fillStyle = line;
      c.fillRect(x, 0, 5, h);
      if (knots) {
        c.fillStyle = 'rgba(0,0,0,0.08)';
        c.beginPath();
        c.ellipse(x + 34, ((i * 97) % 200) + 30, 4, 7, 0, 0, P * 2);
        c.fill();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Straw scattered on a floor.
export function strawTexture(base = '#f1d488', fresh = true) {
  const t = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 520; i++) {
      const x = r() * w;
      const y = r() * h;
      const a = r() * P;
      const l = 8 + r() * 16;
      c.strokeStyle = r() < 0.5 ? (fresh ? '#ffe9a8' : '#e3c06a') : '#d6ad4f';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      c.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
