import * as THREE from 'three';
import { makeLog } from './flume.js';
import { fitText, heartPath } from '../../places/school/kit.js';

// Roji and Homama in their log, the sounds of the ride and the ride photo.
// Roji sits in front and Homama right behind her (so he can shield her at the big splash). Whoever the
// player picked does the reaching and splashing; the other one ducks along, cheers and holds on.

export function makeCrew(ctx, k, th, rider, { playerBack = false } = {}) {
  const log = makeLog(k, th);
  const roji = ctx.makeKid('roji');
  const homama = ctx.makeKid('homama');
  for (const kid of [roji, homama]) {
    kid.pose = 'sit';
    kid.batch();
    kid.blob.visible = false;
    kid.root.traverse((o) => (o.castShadow = false));
    // their legs are hidden inside the log anyway: no need to draw them
    for (const leg of kid.legs) leg.visible = false;
    log.body.add(kid.root);
  }
  const me = rider === 'roji' ? roji : homama;
  const pal = rider === 'roji' ? homama : roji;
  // Roji sits in front of Homama, except in the splash round where the one with the blaster sits at the back
  (playerBack ? pal : roji).root.position.copy(log.front);
  (playerBack ? me : homama).root.position.copy(log.back);
  const st = { duck: 0, reach: 0, lean: 0, hands: 0, scream: 0, cheer: 0, heart: 0, shoulders: 0, shield: 0, laugh: 0, shake: 0, palDuck: 0, look: 0 };
  const PI = Math.PI;
  const arms = (kid, l, r) => {
    kid.arms[0].rotation.set(l[0], l[1], l[2]);
    kid.arms[1].rotation.set(r[0], r[1], r[2]);
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  return {
    log,
    roji,
    homama,
    me,
    pal,
    st,
    // Called every frame after the game set st (all 0..1)
    pose(dt, t) {
      for (const kid of [roji, homama]) {
        const isMe = kid === me;
        kid.hands = null;
        kid.update(dt, t, 0, 0, 0);
        const B = kid.body;
        const duck = isMe ? st.duck : st.palDuck;
        // lean with the log
        B.rotation.z = st.lean * 0.28;
        // ducking: fold forward with the arms over the head
        B.rotation.x += duck * 0.95;
        B.position.y -= duck * 0.1;
        B.position.z += duck * 0.06;
        let L = [-0.9, 0, 0.12];
        let R = [-0.9, 0, -0.12];
        if (duck > 0.05) {
          L = mix(L, [-2.5, 0, -0.5], duck);
          R = mix(R, [-2.5, 0, 0.5], duck);
        }
        // hands up on the drops
        if (st.hands > 0.05 && duck < 0.5) {
          const w = Math.sin(t * 12 + (isMe ? 0 : 1)) * 0.25;
          L = mix(L, [0, 0, 2.4 + w], st.hands);
          R = mix(R, [0, 0, -2.4 - w], st.hands);
        }
        if (isMe && st.aim !== undefined) {
          // holding the water blaster, turned toward the aim
          B.rotation.y = Math.max(-1.1, Math.min(1.1, st.aim * 0.85));
          L = [-1.3 + (st.recoil || 0) * 0.25, 0, -0.32];
          R = [-1.3 + (st.recoil || 0) * 0.25, 0, 0.32];
        }
        if (isMe && st.reach > 0.05) {
          // reach up high, a little to the side of the lean
          L = mix(L, [-0.4, 0, 2.7 + st.lean * 0.4], st.reach);
          R = mix(R, [-0.4, 0, -2.7 + st.lean * 0.4], st.reach);
          B.position.y += st.reach * 0.08;
          kid.squash = 1 + st.reach * 0.08;
        }
        if (!isMe && st.cheer > 0.05) {
          const w = Math.sin(t * 16) * 0.3;
          L = mix(L, [0, 0, 2.5 + w], st.cheer);
          R = mix(R, [0, 0, -2.5 - w], st.cheer);
          B.position.y += Math.abs(Math.sin(t * 9)) * 0.05 * st.cheer;
        }
        if (!isMe && st.heart > 0.05) {
          L = mix(L, [-0.35, 0, 2.45], st.heart);
          R = mix(R, [-0.35, 0, -2.45], st.heart);
        }
        // Homama's hands on Roji's shoulders on the way up, or the shield over her at the splash
        if (kid === homama && st.shoulders > 0.05 && duck < 0.3) {
          L = mix(L, [-1.45, 0, -0.12], st.shoulders);
          R = mix(R, [-1.45, 0, 0.12], st.shoulders);
          B.rotation.x += 0.15 * st.shoulders;
        }
        if (kid === homama && st.shield > 0.05) {
          L = mix(L, [-2.55, 0, -0.25], st.shield);
          R = mix(R, [-2.55, 0, 0.25], st.shield);
          B.rotation.x = mix([B.rotation.x, 0, 0], [0.32, 0, 0], st.shield)[0];
          B.position.y += 0.06 * st.shield;
        }
        arms(kid, L, R);
        // faces: a scream on the drops, a big laugh after a soaking, a shake of the head
        const open = Math.max(st.scream * (kid === roji ? 1.2 : 0.8), st.laugh * 0.9);
        kid.mouth.scale.set(1 + 0.3 * open, 1 + open, 1);
        if (st.shake > 0.05) kid.head.rotation.y += Math.sin(t * 22 + (kid === roji ? 0 : 1.3)) * 0.4 * st.shake;
        if (st.look && kid === roji) kid.head.rotation.y += st.look * 0.6;
      }
    },
  };
}

// ------------------------------------------------------------------ sound
export function makeSfx(sound) {
  const ok = () => sound?.ctx && !sound.muted;
  const tone = (f, d, o = {}) => ok() && sound.tone(f, sound.ctx.currentTime + (o.at || 0), d, o);
  const noise = ({ freq = 900, q = 0.8, gain = 0.1, dur = 0.4, type = 'lowpass', slideTo = null, at = 0 } = {}) => {
    if (!ok() || !sound.noise) return;
    const ac = sound.ctx;
    const t0 = ac.currentTime + at;
    const src = ac.createBufferSource();
    src.buffer = sound.noise;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(sound.sfx);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  };
  // the stream: looped noise, louder and brighter the faster the water runs
  let stream = null;
  if (ok() && sound.noise) {
    const ac = sound.ctx;
    const src = ac.createBufferSource();
    src.buffer = sound.noise;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = ac.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(sound.sfx);
    src.start();
    stream = { src, f, g };
  }
  return {
    stream(speed, on = 1) {
      if (!stream) return;
      const now = sound.ctx.currentTime;
      stream.g.gain.setTargetAtTime(on * (0.025 + Math.min(1, speed / 12) * 0.07), now, 0.2);
      stream.f.frequency.setTargetAtTime(380 + speed * 110, now, 0.2);
    },
    stop() {
      if (!stream) return;
      try {
        stream.g.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.05);
        stream.src.stop(sound.ctx.currentTime + 0.2);
      } catch {
        /* already stopped */
      }
      stream = null;
    },
    splash(big = 1) {
      noise({ freq: 2400 * big, slideTo: 300, gain: 0.12 * big, dur: 0.5 + big * 0.6, q: 0.6 });
      noise({ freq: 600, slideTo: 140, gain: 0.08 * big, dur: 0.4 + big * 0.4, type: 'lowpass', at: 0.02 });
    },
    plop() {
      tone(520, 0.12, { type: 'sine', gain: 0.06, slideTo: 980 });
      noise({ freq: 1800, slideTo: 600, gain: 0.04, dur: 0.18, type: 'bandpass', q: 1.2 });
    },
    clack() {
      tone(1250, 0.03, { type: 'square', gain: 0.018 });
    },
    bonk() {
      tone(160, 0.18, { type: 'triangle', gain: 0.12, slideTo: 90 });
      noise({ freq: 1400, slideTo: 300, gain: 0.05, dur: 0.25, type: 'bandpass', q: 1.5 });
    },
    boing() {
      tone(240, 0.3, { type: 'sine', gain: 0.08, slideTo: 520 });
    },
    croak() {
      tone(180, 0.12, { type: 'sawtooth', gain: 0.03, slideTo: 140 });
      tone(200, 0.12, { type: 'sawtooth', gain: 0.03, slideTo: 150, at: 0.16 });
    },
    honk() {
      tone(110, 0.35, { type: 'triangle', gain: 0.09, slideTo: 90 });
    },
    whistle() {
      tone(2100, 0.18, { type: 'sine', gain: 0.05 });
      tone(2400, 0.32, { type: 'sine', gain: 0.05, at: 0.2, slideTo: 2600 });
    },
    whee(k = 1) {
      tone(820, 1.3, { type: 'sine', gain: 0.05 * k, slideTo: 1260 });
      tone(1040, 1.2, { type: 'triangle', gain: 0.025 * k, slideTo: 1500, at: 0.08 });
    },
    sweet() {
      tone(880, 0.25, { type: 'sine', gain: 0.05 });
      tone(1175, 0.4, { type: 'sine', gain: 0.05, at: 0.12 });
    },
    ding() {
      for (const [f, g] of [[1320, 0.06], [2650, 0.03], [3960, 0.015]]) tone(f, 1.2, { type: 'sine', gain: g });
    },
    hiss() {
      noise({ freq: 4200, gain: 0.05, dur: 0.4, type: 'highpass', q: 0.7 });
      tone(700, 0.25, { type: 'sawtooth', gain: 0.02, slideTo: 420, at: 0.05 });
    },
    quack() {
      tone(520, 0.12, { type: 'sawtooth', gain: 0.03, slideTo: 380 });
    },
    clang() {
      tone(420, 0.4, { type: 'triangle', gain: 0.06 });
      tone(860, 0.25, { type: 'square', gain: 0.015 });
    },
    squirt() {
      noise({ freq: 3000, slideTo: 1400, gain: 0.04, dur: 0.18, type: 'bandpass', q: 1.2 });
    },
    ooh() {
      tone(600, 0.14, { type: 'sine', gain: 0.04, slideTo: 900 });
      tone(650, 0.16, { type: 'sine', gain: 0.04, slideTo: 980, at: 0.18 });
    },
  };
}

// ------------------------------------------------------------------ the ride photo
// Renders the scene from cam into a picture with a white frame and a caption. Returns a data URL.
export function snapPhoto(ctx, env, cam, caption, hide = []) {
  const { renderer, scene } = ctx;
  const W = 480;
  const H = 300;
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 0 });
  const buf = new Uint8Array(W * H * 4);
  const prev = renderer.getRenderTarget();
  const vis = hide.map((o) => o.visible);
  for (const o of hide) o.visible = false;
  // the camera flash: a bright warm fill for the faces
  const hi = env.hemi.intensity;
  const hg = env.hemi.groundColor.clone();
  const hs = env.hemi.color.clone();
  env.hemi.intensity = hi * 1.6 + 0.6;
  env.hemi.groundColor.set('#ffe2cf');
  env.hemi.color.set('#fff6ee');
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  renderer.setRenderTarget(prev);
  env.hemi.intensity = hi;
  env.hemi.groundColor.copy(hg);
  env.hemi.color.copy(hs);
  hide.forEach((o, i) => (o.visible = vis[i]));
  rt.dispose();
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    lut[i] = Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  }
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = lut[buf[i]];
    buf[i + 1] = lut[buf[i + 1]];
    buf[i + 2] = lut[buf[i + 2]];
  }
  const c = document.createElement('canvas');
  c.width = W + 24;
  c.height = H + 70;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, c.width, c.height);
  const img = x.createImageData(W, H);
  for (let row = 0; row < H; row++) img.data.set(buf.subarray((H - 1 - row) * W * 4, (H - row) * W * 4), row * W * 4);
  x.putImageData(img, 12, 12);
  x.fillStyle = '#2f6a7a';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  fitText(x, caption, c.width / 2 - 14, H + 38, W - 70, 24);
  x.fillStyle = '#ef5b6f';
  heartPath(x, c.width - 30, H + 38, 22);
  x.fill();
  return c.toDataURL('image/jpeg', 0.86);
}

export function flash(sfx) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.9;z-index:45;pointer-events:none;transition:opacity .45s';
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '0')));
  setTimeout(() => el.remove(), 600);
  sfx?.clack();
}
