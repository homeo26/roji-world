import * as THREE from 'three';
import { buildPath, rideStep } from './coaster/track.js';
import { TRACKS, START } from './coaster/tracks.js';
import { buildWorld } from './coaster/scenery.js';
import { Fireworks } from '../places/park/fireworks.js';
import { kit, colorBake, heartGeo, starGeo, heartPath, roundRect, fitText, mergeGeometries } from '../places/school/kit.js';

// The Comet: ride Roji Land's rollercoaster in 3D with Roji and Homama in the front car. Lean left
// and right (and put your hands up) to catch the stars and hearts along the track: a chain lift, a
// big drop with a ride photo, loops, tunnels and camel humps. Three rides, each longer and trickier:
// Morning Meadow, Sunset Castle (the stars sway) and Starlight Night (shooting stars, lanterns and
// fireworks). Stars for each ride, best scores, and the next ride opens with a star on the last.

const VALUE = { star: 1, heart: 3, gold: 5 };
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));

function carModel(k, riders) {
  const g = new THREE.Group();
  g.add(k.at(k.rbox(1.3, 0.55, 1.85, '#ffffff', 0.2), 0, 0.42, 0));
  g.add(k.at(k.rbox(1.06, 0.3, 1.2, '#3b2b3f', 0.08), 0, 0.62, -0.12));
  g.add(k.at(k.rbox(1.1, 0.5, 0.16, '#ffffff', 0.06), 0, 0.85, -0.72));
  g.add(k.at(k.box(1.36, 0.1, 1.9, '#f4c24f'), 0, 0.16, 0));
  for (const s of [-1, 1]) for (const z of [-0.6, 0.6]) {
    const w = k.cyl(0.13, 0.13, 0.1, '#3f4a7a', 10);
    w.rotation.z = Math.PI / 2;
    w.position.set(s * 0.62, 0.08, z);
    g.add(w);
  }
  const bar = k.cyl(0.035, 0.035, 1.0, '#f4c24f', 8);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.95, 0.3);
  g.add(bar);
  if (riders) {
    for (const [x, shirt, hair] of [[-0.28, '#7fd8bf', '#4a2c1a'], [0.28, '#ffd166', '#141010']]) {
      g.add(k.at(k.cyl(0.15, 0.17, 0.36, shirt, 8), x, 0.95, -0.15));
      g.add(k.at(k.sph(0.17, '#f2cdb4', undefined, 10), x, 1.3, -0.15));
      g.add(k.at(k.sph(0.175, hair, undefined, 10), x, 1.35, -0.19));
      for (const s of [-1, 1]) {
        const arm = k.cyl(0.04, 0.04, 0.42, '#f2cdb4', 5);
        arm.position.set(x + s * 0.14, 1.32, -0.12);
        arm.rotation.z = -s * 0.3;
        g.add(arm);
      }
    }
  }
  return g;
}

export default {
  id: 'coaster',
  title: 'The Comet',
  tagline: 'Lean to catch the stars',

  async start(ctx) {
    const { scene, camera, renderer, hud, input, sound, fx } = ctx;
    const k = kit();
    scene.background = new THREE.Color('#bfe6f0');
    camera.position.set(0, 6, -12);
    camera.lookAt(0, 2, 0);

    // ------------------------------------------------ pick a ride
    const prog = ctx.load('progress', {});
    const open = (i) => i === 0 || (prog[TRACKS[i - 1].id]?.stars || 0) >= 1;
    const starsText = (n) => (n === 1 ? '1 star' : `${n} stars`);
    hud.buttons({ action: null, jump: null, stick: false });
    const flow = { disposed: false, ride: null, preview: makePreview(ctx) };
    hud
      .choose({
        title: 'The Comet',
        text: 'Roji and Homama take the front car. Which ride?',
        options: TRACKS.map((t, i) => {
          const p = prog[t.id];
          return { id: t.id, label: open(i) ? t.name : `${t.name} (locked)`, sub: open(i) ? (p ? `${starsText(p.stars)} of 3, best ${p.best}` : t.sub) : `Get a star on ${TRACKS[i - 1].name} to open it` };
        }),
      })
      .then((pick) => {
        if (flow.disposed) return;
        let ti = Math.max(0, TRACKS.findIndex((t) => t.id === pick));
        if (!open(ti)) {
          hud.message('Locked for now', 1200);
          while (ti > 0 && !open(ti)) ti--;
        }
        flow.preview.remove();
        flow.preview = null;
        flow.ride = setupRide(ctx, ti, prog, flow);
      });
    return {
      update(dt, t) {
        if (flow.ride) flow.ride.update(dt, t);
        else flow.preview?.update(dt, t);
      },
      dispose() {
        flow.disposed = true;
        ctx.camera.up.set(0, 1, 0);
      },
    };
  },
};

// A slow look round the morning meadow while a ride is chosen
function makePreview(ctx) {
  const { scene, camera } = ctx;
  const track = buildPath({ ...START, closed: true }, [...TRACKS[0].pieces, { to: START }], { step: 0.5 });
  const env = ctx.env.outdoor({ sky: '#cfe9ee', fog: [80, 280], shadow: 30 });
  const world = buildWorld(ctx, track, 'day');
  let a = 0;
  return {
    update(dt) {
      a += dt * 0.08;
      const c = world.centre;
      camera.position.set(c.x + Math.cos(a) * 60, 26, c.z + Math.sin(a) * 60);
      camera.up.set(0, 1, 0);
      camera.lookAt(c.x, 6, c.z);
      env.follow(c);
    },
    remove() {
      for (const o of [world.group, env.hemi, env.sun, env.sun.target]) o.removeFromParent();
      world.group.traverse((o) => {
        o.geometry?.dispose?.();
        for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
          for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
          m.dispose?.();
        }
      });
    },
  };
}

// Build the chosen ride and run it
function setupRide(ctx, ti, prog, flow) {
    const { scene, camera, renderer, hud, input, sound, fx } = ctx;
    const k = kit();
    const T = TRACKS[ti];
    hud.title('The Comet', T.name);

    // ------------------------------------------------ the world and the track
    const track = buildPath({ ...START, closed: true }, [...T.pieces, { to: START }], { step: 0.25 });
    const skyCol = { day: '#cfe9ee', sunset: '#f6b894', night: '#1e2350' }[T.time];
    const env = ctx.env.outdoor({ sky: skyCol, fog: [80, 280], sun: T.time === 'sunset' ? [-30, 14, -40] : [-11, 22, 12], shadow: 26, intensity: T.time === 'night' ? 0.62 : T.time === 'sunset' ? 0.9 : 1 });
    if (T.time === 'night') {
      env.hemi.color.set('#9aa8e8');
      env.hemi.groundColor.set('#1a2040');
      env.sun.color.set('#b8c4ff');
    } else if (T.time === 'sunset') {
      env.sun.color.set('#ffb27a');
      env.hemi.color.set('#ffd6c0');
    }
    const world = buildWorld(ctx, track, T.time);
    const fireworks = T.time === 'night' ? new Fireworks(scene, { area: { x: world.centre.x, z: world.centre.z - 30, w: 40, h0: 26, h1: 40, depth: 10, ground: 4 }, size: 0.9, sound, listener: () => 0.7 }) : null;

    // ------------------------------------------------ the train, with Roji and Homama in front
    const CARS = 3;
    const GAP = 2.15;
    const geoOf = (riders) => {
      const grp = carModel(k, riders);
      grp.updateMatrixWorld(true);
      const list = [];
      grp.traverse((o) => {
        if (!o.isMesh) return;
        const gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        for (const n of Object.keys(gg.attributes)) if (!['position', 'normal'].includes(n)) gg.deleteAttribute(n);
        gg.applyMatrix4(o.matrixWorld);
        const c = new THREE.Color(o.material.color);
        const n = gg.attributes.position.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
        gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
        list.push(gg);
      });
      return mergeGeometries(list, false);
    };
    const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
    const cars = [];
    for (let i = 0; i < CARS; i++) {
      const m = new THREE.Mesh(geoOf(i === 2), carMat.clone());
      m.material.color.set(['#ff9eb5', '#ffd166', '#8fd3ff'][i]);
      m.castShadow = true;
      m.matrixAutoUpdate = false;
      scene.add(m);
      cars.push(m);
    }
    const nose = k.star(0.45, 0.2, 0.12, '#ffd166', { emissive: '#ffb347', ei: 0.5 });
    nose.position.set(0, 0.7, 1.05);
    const front = new THREE.Group();
    front.add(nose);
    scene.add(front);
    const roji = ctx.makeKid('roji');
    const homama = ctx.makeKid('homama');
    for (const [kid, x] of [[roji, 0.3], [homama, -0.3]]) {
      kid.pose = 'sit';
      kid.root.position.set(x, 0.42, -0.12);
      front.add(kid.root);
    }
    const kids = { roji, homama };

    // ------------------------------------------------ stars and hearts along the track
    const R = (() => {
      let a = (ti + 1) * 9973 + Math.floor(Math.random() * 1000);
      return () => ((a = (a * 16807) % 2147483647) / 2147483647);
    })();
    const P = T.pickups;
    const picks = [];
    {
      let lane = -1;
      let run = 0;
      const fr = track.at(0);
      let tutorial = ti === 0 ? [-1, 1, 0] : [];
      for (let d = 34; d < track.length - 26; ) {
        track.at(d, fr);
        const tag = fr.tag || {};
        if (tag.lift) {
          d += 3;
          continue;
        }
        let kind = 'star';
        const r = R();
        if (r < P.gold) kind = 'gold';
        else if (r < P.gold + P.heart) kind = 'heart';
        let L;
        if (fr.loop) L = 0;
        else if (tutorial.length) L = tutorial.shift();
        else {
          if (run <= 0) {
            const opts = [-1, 1, 0].filter((x) => x !== lane);
            lane = R() < P.high ? 0 : opts[Math.floor(R() * opts.length)];
            if (lane === 0 && R() > P.high) lane = R() < 0.5 ? -1 : 1;
            run = 2 + Math.floor(R() * 3);
          }
          L = lane;
          run--;
        }
        const p = { d, kind, lane: L, lv: L, cur: L, ph: R() * 6, moving: false, shooting: false, got: false, missed: false, tut: ti === 0 && picks.length < 3 };
        if (L !== 0 && !fr.loop && !p.tut) {
          if (R() < P.moving) p.moving = true;
          else if (R() < P.shooting) {
            p.shooting = true;
            p.from = L;
            p.to = -L;
          }
        }
        picks.push(p);
        d += (tag.tunnel ? 0.8 : 1) * P.every * (fr.loop ? 1.6 : 1) * (0.85 + R() * 0.3);
      }
    }
    const MAX = picks.reduce((s, p) => s + VALUE[p.kind], 0);
    const mkInst = (geo, color, emissive, n) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: T.time === 'night' ? 1.2 : 0.55, roughness: 0.35, metalness: 0.2 }), Math.max(1, n));
      m.castShadow = false;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    const counts = { star: 0, heart: 0, gold: 0 };
    for (const p of picks) p.slot = counts[p.kind]++;
    const inst = {
      star: mkInst(starGeo(0.38, 0.17, 0.12), '#ffd166', '#ffb347', counts.star),
      heart: mkInst(heartGeo(0.62, 0.16), '#ff5d7a', '#ff3d6e', counts.heart),
      gold: mkInst(starGeo(0.55, 0.25, 0.16), '#fff1a8', '#ffd166', counts.gold),
    };
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const kd of Object.keys(inst)) {
      for (let i = 0; i < inst[kd].count; i++) inst[kd].setMatrixAt(i, zero);
      if (!counts[kd]) inst[kd].count = 0;
    }
    // the reach marker: a soft ring that shows where your lean is pointing
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
    scene.add(ring);

    // ------------------------------------------------ state
    const st = { d: 6, v: 0, dist: 0, phase: 'ready', t: 0, lean: 0, hands: false, score: 0, got: 0, gotPts: 0, hearts: 0, combo: 0, best: 0, slow: 0, photo: null, photoDone: false, drop: 0, clack: 0, whee: 0, tutT: 0, finale: false };
    const fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();
    const camUp = new THREE.Vector3(0, 1, 0);
    const Y = new THREE.Vector3(0, 1, 0);
    const sc = new THREE.Vector3();
    if (/dev\.html/.test(location.pathname)) window.__coaster = { st, picks, track };
    const comboMul = () => (st.combo >= 12 ? 3 : st.combo >= 6 ? 2 : 1);
    const showScore = () => hud.score(`${st.score} <span style="font-weight:400;font-size:.8em">points</span>${comboMul() > 1 ? ` <span style="color:#ef5b6f">x${comboMul()}</span>` : ''}`);
    showScore();
    hud.hint('A and D (or the arrows) to lean, Space for hands up');
    hud.buttons({ action: 'Hands up', jump: null });

    const pickPos = (p, out, t) => {
      track.at(p.d, fr);
      let lv = p.lv;
      if (p.moving) lv = Math.sin(t * 1.25 + p.ph);
      if (p.shooting) {
        const ahead = p.d - st.d;
        lv = p.from + (p.to - p.from) * smooth((32 - ahead) / 16);
      }
      p.cur = lv;
      out.copy(fr.p).addScaledVector(fr.l, -lv * 1.05).addScaledVector(fr.u, p.lane === 0 ? 2.45 : 1.5);
      return out;
    };

    const placeTrain = (t) => {
      for (let i = 0; i < CARS; i++) {
        track.matrix(st.d - i * GAP, m4);
        if (i === 0) {
          // the front car tilts a little with the lean
          m4.multiply(new THREE.Matrix4().makeRotationZ(st.lean * 0.08));
        }
        cars[i].matrix.copy(m4);
        cars[i].matrixWorldNeedsUpdate = true;
        if (i === 0) {
          m4.decompose(front.position, front.quaternion, sc);
        }
      }
    };

    // The ride photo at the big drop: a second camera in front of the car, rendered into a picture
    const takePhoto = () => {
      const W = 480;
      const H = 300;
      const rt = new THREE.WebGLRenderTarget(W, H, { samples: 0 });
      const pc = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
      track.at(st.d, fr);
      pc.position.copy(fr.p).addScaledVector(fr.f, 2.7).addScaledVector(fr.u, 1.75);
      pc.up.copy(fr.u);
      pc.lookAt(v.copy(fr.p).addScaledVector(fr.u, 1.15).addScaledVector(fr.f, -0.2));
      nose.visible = false;
      const buf = new Uint8Array(W * H * 4);
      const prev = renderer.getRenderTarget();
      ring.visible = false;
      // the camera flash: a bright warm fill for the faces while the picture is taken
      const hi = env.hemi.intensity;
      const hg = env.hemi.groundColor.clone();
      const hs = env.hemi.color.clone();
      env.hemi.intensity = hi * 1.9 + 0.6;
      env.hemi.groundColor.set('#ffe2cf');
      env.hemi.color.set('#fff6ee');
      renderer.setRenderTarget(rt);
      renderer.render(scene, pc);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      renderer.setRenderTarget(prev);
      env.hemi.intensity = hi;
      env.hemi.groundColor.copy(hg);
      env.hemi.color.copy(hs);
      ring.visible = true;
      nose.visible = true;
      rt.dispose();
      // a render target holds linear colour: turn it into sRGB for the picture
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
      x.fillStyle = '#3f4a9a';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      fitText(x, `The Comet, ${T.name}: Roji and Homama`, c.width / 2, H + 38, W - 40, 24);
      x.fillStyle = '#ef5b6f';
      heartPath(x, c.width - 34, H + 38, 22);
      x.fill();
      return c.toDataURL('image/jpeg', 0.86);
    };

    const flash = () => {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.9;z-index:45;pointer-events:none;transition:opacity .45s';
      document.body.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '0')));
      setTimeout(() => el.remove(), 600);
      tune(2400, 0.05, { type: 'square', gain: 0.03 });
      tune(1600, 0.06, { type: 'square', gain: 0.025, at: 0.06 });
    };

    const tune = (f, d, o) => sound?.ctx && sound.tone(f, sound.ctx.currentTime + (o?.at || 0), d, o);
    const whee = (k2 = 1) => {
      tune(820, 1.4, { type: 'sine', gain: 0.05 * k2, slideTo: 1240 });
      tune(1040, 1.3, { type: 'triangle', gain: 0.025 * k2, slideTo: 1500, at: 0.08 });
    };

    // Expressions: arms, lean, mouths
    const pose = (dt, t, tag) => {
      const lean = st.lean;
      const drop = st.drop;
      for (const [w, kid] of Object.entries(kids)) {
        kid.hands = st.hands || drop > 0.5 ? 'wave2' : null;
        kid.update(dt, t, 0, 0, 0);
        kid.body.rotation.z = lean * 0.3;
        const scream = drop > 0.3 ? 1 : 0;
        kid.mouth.scale.set(1 + 0.3 * scream, 1 + (w === 'roji' ? 1.1 : 0.7) * scream, 1);
      }
      // on the lift Homama holds Roji's hand, and at the photo he may hug her
      if (tag.lift && !st.hands) {
        homama.arms[0].rotation.set(-0.55, 0, 0.95);
        roji.arms[1].rotation.set(-0.55, 0, -0.95);
      }
      if (st.hug > 0) {
        homama.arms[0].rotation.set(-0.5, 0, 1.75);
        homama.body.rotation.z = -0.15;
        roji.body.rotation.z = -0.1;
      }
    };

    // ------------------------------------------------ countdown
    placeTrain(0);
    track.at(st.d, fr);
    camPos.copy(fr.p).addScaledVector(fr.f, -4.4).addScaledVector(Y, 2.35);
    camLook.copy(fr.p).addScaledVector(fr.f, 6);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    env.follow(fr.p);
    const ready = (async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (flow.disposed) return;
      await hud.countdown(3);
      if (flow.disposed) return;
      st.phase = 'ride';
      st.v = 3;
      if (ti === 0) hud.message('Catch the stars!', 1400);
    })();
    void ready;

    const finish = async () => {
      st.phase = 'done';
      const pct = MAX ? st.gotPts / MAX : 0;
      const stars = pct >= 0.85 ? 3 : pct >= 0.62 ? 2 : pct >= 0.38 ? 1 : 0;
      const old = prog[T.id] || { best: 0, stars: 0 };
      const rec = { best: Math.max(old.best, st.score), stars: Math.max(old.stars, stars) };
      prog[T.id] = rec;
      ctx.save('progress', prog);
      const newBest = st.score > old.best && old.best > 0;
      const nextOpen = stars >= 1 && old.stars < 1 && ti < TRACKS.length - 1 ? `<br><b>${TRACKS[ti + 1].name}</b> is open now.` : '';
      const photo = st.photo ? `<img src="${st.photo}" alt="Ride photo of Roji and Homama" style="width:100%;border-radius:12px;display:block;margin:0 0 10px">` : '';
      const line = stars === 3 ? 'Homama says it was the best ride of his life. Roji wants to go again.' : stars === 2 ? 'Roji is still laughing. Homama is still holding her hand.' : stars === 1 ? 'Roji screamed the whole way down. Homama loved every second.' : 'You caught a few. One more go?';
      if (fireworks) fireworks.show(true);
      await new Promise((r) => setTimeout(r, fireworks ? 1800 : 600));
      if (flow.disposed) return;
      ctx.finish({
        win: stars > 0,
        score: st.score,
        stars,
        title: stars ? `${stars === 1 ? 'One star' : stars === 2 ? 'Two stars' : 'Three stars'}!` : 'What a ride!',
        text: `${photo}${st.got} of ${picks.length} caught, ${st.score} points${newBest ? ' (a new best!)' : ''}. Best ${rec.best}.<br>${line}${nextOpen}`,
      });
    };

    const tmpP = new THREE.Vector3();
    return {
      update(dt, t) {
        st.t += dt;
        // ---------------------------------------- input
        const ax = input.axis().x;
        let want = Math.abs(ax) > 0.2 ? Math.max(-1, Math.min(1, ax * 1.3)) : 0;
        const pt = input.pointer;
        if (pt.down && st.phase === 'ride') {
          if (pt.x < innerWidth * 0.36) want = -1;
          else if (pt.x > innerWidth * 0.64) want = 1;
        }
        // (the test scripts can ride on autopilot in the dev harness)
        let autoHands = false;
        if (window.__coasterAuto) {
          const nx = picks.find((p) => !p.got && !p.missed && p.d > st.d - 0.5);
          if (nx && nx.d - st.d < 14) {
            want = nx.lane === 0 ? 0 : nx.cur;
            autoHands = nx.lane === 0;
          }
        }
        st.lean = damp(st.lean, want, 9, dt);
        st.hands = input.held('action') || input.held('jump') || autoHands;

        // ---------------------------------------- the ride
        let tag = {};
        if (st.phase === 'ride' || st.phase === 'brake') {
          st.slow = Math.max(0, st.slow - dt);
          const sdt = dt * (st.slow > 0 ? 0.35 : 1);
          const before = st.d;
          tag = rideStep(track, st, sdt, { minV: st.phase === 'brake' ? 0.8 : 6, lift: 5.4, drag: 0.0035, roll: 0.03 });
          st.v = Math.min(st.v, T.cap);
          let moved = st.d - before;
          if (moved < -track.length / 2) moved += track.length;
          st.dist += moved;
          // back into the station
          const left = track.length - st.dist - 4;
          if (left < 22) {
            st.phase = 'brake';
            st.v = Math.min(st.v, Math.max(1.2, left * 0.42));
            if (left < 0.4 && st.phase !== 'done') {
              st.v = 0;
              finish();
            }
          }
          // the drop: hands up and a scream, and the photo
          st.drop = damp(st.drop, tag.drop ? 1 : 0, 6, dt);
          if (tag.drop && st.whee <= 0) {
            st.whee = 5;
            whee(1);
          }
          st.whee -= dt;
          if (tag.photo && !st.photoDone && track.at(st.d, fr).f.y < -0.55) {
            st.photoDone = true;
            st.slow = 0.7;
            st.hug = Math.random() < 0.5 ? 1.4 : 0;
            pose(0, t, tag);
            st.photo = takePhoto();
            flash();
            hud.message('Ride photo!', 900);
          }
          st.hug = Math.max(0, (st.hug || 0) - dt);
          if (tag.lift) {
            st.clack -= dt;
            if (st.clack <= 0) {
              st.clack = 0.24;
              tune(1250, 0.03, { type: 'square', gain: 0.02 });
            }
          }
          // ---------------------------------------- catching
          for (const p of picks) {
            if (p.got || p.missed) continue;
            if (p.d > st.d + 0.3 || p.d < before - 60) continue;
            if (p.d <= st.d + 0.3 && p.d > before - 1) {
              const ok = p.lane === 0 ? st.hands && Math.abs(st.lean) < 0.65 : Math.abs(st.lean - p.cur) < 0.55;
              if (ok) {
                p.got = true;
                st.combo++;
                const pts = VALUE[p.kind] * comboMul();
                st.score += pts;
                st.got++;
                st.gotPts += VALUE[p.kind];
                if (p.kind === 'heart') st.hearts++;
                pickPos(p, tmpP, t);
                fx.burst(tmpP, p.kind === 'heart' ? ['#ff5d7a', '#ffd1dc', '#ffffff'] : ['#ffd166', '#fff3c4', '#ffffff'], p.kind === 'gold' ? 26 : 14);
                if (p.kind === 'heart') fx.heartsAt(tmpP, 3);
                sound.ui(p.kind === 'star' ? 'coin' : 'good');
                if (st.combo === 6 || st.combo === 12) hud.message(`Combo x${comboMul()}!`, 900);
                showScore();
              } else {
                p.missed = true;
                if (st.combo >= 6) hud.message('Combo lost', 700);
                st.combo = 0;
                showScore();
              }
            }
          }
          // a tip for the first few stars on the first ride
          for (const p of picks) {
            if (!p.tut || p.told || p.got || p.missed) continue;
            const ahead = p.d - st.d;
            if (ahead < 26 && ahead > 0) {
              p.told = true;
              hud.message(p.lane === -1 ? 'Lean left!' : p.lane === 1 ? 'Lean right!' : 'Hands up!', 1300);
            }
          }
        }
        if (fireworks) fireworks.update(dt);

        // ---------------------------------------- pickups spin and bob
        for (const p of picks) {
          const m = inst[p.kind];
          if (p.got || p.d < st.d - 6 || p.d > st.d + 110) {
            m.setMatrixAt(p.slot, zero);
            continue;
          }
          pickPos(p, v, t);
          q.setFromUnitVectors(Y, fr.u);
          const spin = new THREE.Quaternion().setFromAxisAngle(Y, t * 2.4 + p.ph);
          q.multiply(spin);
          const s = p.missed ? 0.6 : 1 + Math.sin(t * 5 + p.ph) * 0.06;
          v.addScaledVector(fr.u, Math.sin(t * 3 + p.ph) * 0.08);
          m.setMatrixAt(p.slot, m4.compose(v, q, sc.setScalar(s)));
        }
        for (const m of Object.values(inst)) m.instanceMatrix.needsUpdate = true;

        // ---------------------------------------- train, riders, reach ring, camera
        placeTrain(t);
        pose(dt, t, tag);
        track.at(st.d, fr);
        ring.position.copy(fr.p).addScaledVector(fr.l, -st.lean * 1.05).addScaledVector(fr.u, st.hands ? 2.45 : 1.5);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fr.f);
        ring.visible = st.phase === 'ride';
        const upB = v2.copy(fr.u).multiplyScalar(0.75).addScaledVector(Y, 0.25).normalize();
        const back = st.phase === 'ready' ? 4.4 : 3.3;
        const wantPos = v.copy(fr.p).addScaledVector(fr.f, -back).addScaledVector(upB, 2.35);
        camPos.x = damp(camPos.x, wantPos.x, 7, dt);
        camPos.y = damp(camPos.y, wantPos.y, 7, dt);
        camPos.z = damp(camPos.z, wantPos.z, 7, dt);
        const wantLook = tmpP.copy(fr.p).addScaledVector(fr.f, 7).addScaledVector(upB, 0.9);
        camLook.x = damp(camLook.x, wantLook.x, 9, dt);
        camLook.y = damp(camLook.y, wantLook.y, 9, dt);
        camLook.z = damp(camLook.z, wantLook.z, 9, dt);
        camUp.lerp(upB, 1 - Math.exp(-6 * dt)).normalize();
        camera.position.copy(camPos);
        camera.up.copy(camUp);
        camera.lookAt(camLook);
        env.follow(fr.p);
      },
    };
}
