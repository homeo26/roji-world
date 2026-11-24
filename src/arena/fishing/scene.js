import * as THREE from 'three';
import { kit, makeAtlas, colorBake } from '../../places/school/kit.js';
import * as HM from '../../places/harbour/models.js';
import { Gulls } from '../../places/harbour/gulls.js';

// The fishing game's world: the end of the harbour pier at y = 0 looking out to sea (-Z), a sky dome,
// waves, the lighthouse and boats in the distance, gulls, clouds, rain, stars and a sun or moon.
// Weather presets change the light, sky, water and waves; set(name) blends to them.

export const SEA = -1.1;
const P = Math.PI;

export const WEATHER = {
  morning: { label: 'A sunny morning', top: '#7cc6f2', mid: '#bfe6f7', hor: '#fff0d4', water: '#4dbccc', fog: '#d4eff2', sun: '#fff3d8', sunI: 2.5, hemi: 1.3, sunEl: 0.22, sunAz: -0.5, wave: 0.07, rain: 0, clouds: 0.35, cloud: '#ffffff', night: 0, disc: '#fff4c8' },
  noon: { label: 'A bright noon', top: '#5fb6f0', mid: '#a9dcf7', hor: '#e8f7ff', water: '#3fb5cf', fog: '#d9f1fa', sun: '#ffffff', sunI: 2.7, hemi: 1.4, sunEl: 0.95, sunAz: 0.2, wave: 0.06, rain: 0, clouds: 0.25, cloud: '#ffffff', night: 0, disc: '#ffffff' },
  breezy: { label: 'A breezy afternoon', top: '#7fb5df', mid: '#c2dced', hor: '#f0f2ee', water: '#4aa9c0', fog: '#dde9ee', sun: '#fff2dc', sunI: 2.2, hemi: 1.3, sunEl: 0.6, sunAz: 0.6, wave: 0.16, rain: 0, clouds: 0.8, cloud: '#f7f9fb', night: 0, disc: '#fff6dc' },
  drizzle: { label: 'A soft drizzle', top: '#8e9db3', mid: '#b4c0cf', hor: '#d9dfe6', water: '#5f97a8', fog: '#c9d2dc', sun: '#e8eef6', sunI: 1.2, hemi: 1.45, sunEl: 0.7, sunAz: 0.1, wave: 0.1, rain: 1, clouds: 1, cloud: '#cfd6df', night: 0.15, disc: '#e6ecf2' },
  sunset: { label: 'Sunset', top: '#6a6fc9', mid: '#e98fa6', hor: '#ffc27a', water: '#8a8fc2', fog: '#f2b99a', sun: '#ffc48a', sunI: 1.9, hemi: 1.05, sunEl: 0.07, sunAz: -0.25, wave: 0.07, rain: 0, clouds: 0.5, cloud: '#ffc2b0', night: 0.2, disc: '#ffb25c' },
  night: { label: 'A starry night', top: '#141a44', mid: '#2a3170', hor: '#4b4f8f', water: '#22406a', fog: '#2b3366', sun: '#b9c8ff', sunI: 0.75, hemi: 0.55, sunEl: 0.13, sunAz: 0.4, wave: 0.06, rain: 0, clouds: 0.3, cloud: '#5d6396', night: 1, disc: '#fff8e6' },
};

const C1 = new THREE.Color();
const C2 = new THREE.Color();

export function buildScene(ctx, env) {
  const { scene, util } = ctx;
  const k = kit();
  const root = new THREE.Group();
  scene.add(root);
  const add = (o, x = 0, y = 0, z = 0) => (o.position.set(x, y, z), root.add(o), o);
  const atlas = makeAtlas(1024, 512, { rough: 0.8 });
  atlas.material.alphaTest = 0.5;
  atlas.material.side = THREE.DoubleSide;

  // ---------------------------------------------------------------- sky dome with a vertical gradient
  const skyGeo = new THREE.SphereGeometry(220, 32, 16);
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10;
  scene.add(sky);
  const paintSky = (w) => {
    const pos = skyGeo.attributes.position;
    const col = skyGeo.attributes.color;
    const top = new THREE.Color(w.top);
    const mid = new THREE.Color(w.mid);
    const hor = new THREE.Color(w.hor);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 220;
      if (y < 0.08) C1.copy(hor);
      else if (y < 0.35) C1.copy(hor).lerp(mid, (y - 0.08) / 0.27);
      else C1.copy(mid).lerp(top, Math.min(1, (y - 0.35) / 0.5));
      col.setXYZ(i, C1.r, C1.g, C1.b);
    }
    col.needsUpdate = true;
  };

  // Stars (night only) and the sun or moon
  const starPos = [];
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * P * 2;
    const e = 0.08 + Math.random() * 1.2;
    starPos.push(new THREE.Vector3(Math.cos(a) * Math.cos(e) * 200, Math.sin(e) * 200, Math.sin(a) * Math.cos(e) * 200));
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setFromPoints(starPos), new THREE.PointsMaterial({ color: '#fff8e0', size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  const discTex = util.canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,1)');
    g.addColorStop(0.36, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex, color: '#fff4c8', fog: false, depthWrite: false, transparent: true }));
  disc.scale.setScalar(34);
  disc.renderOrder = -9;
  scene.add(disc);

  // ---------------------------------------------------------------- water: waves near the pier, flat far away
  const W = 300;
  const waterGeo = new THREE.PlaneGeometry(W, W, 90, 90);
  waterGeo.rotateX(-P / 2);
  const wp = waterGeo.attributes.position;
  const base = new Float32Array(wp.count * 2);
  for (let i = 0; i < wp.count; i++) {
    // Squeeze the grid toward the pier so the near water has the most detail
    const x = wp.getX(i);
    const z = wp.getZ(i);
    const sx = Math.sign(x) * Math.pow(Math.abs(x) / (W / 2), 1.8) * (W / 2);
    const sz = Math.sign(z) * Math.pow(Math.abs(z) / (W / 2), 1.8) * (W / 2);
    base[i * 2] = sx;
    base[i * 2 + 1] = sz - 10;
    wp.setXYZ(i, sx, 0, sz - 10);
  }
  const waterMat = new THREE.MeshStandardMaterial({ color: '#4dbccc', roughness: 0.22, metalness: 0.05 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = SEA;
  water.receiveShadow = true;
  scene.add(water);
  let amp = 0.07;
  const wave = (x, z, t) => amp * (Math.sin(x * 0.33 + t * 1.25) * 0.55 + Math.sin(z * 0.41 - t * 1.05 + x * 0.12) * 0.45 + Math.sin((x + z) * 0.9 + t * 2.1) * 0.18);
  const normal = new Float32Array(wp.count * 3);
  waterGeo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));

  // ---------------------------------------------------------------- the pier we fish from
  const plankTex = util.canvasTexture(256, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = ['#c99566', '#c28e5e', '#cf9c6c', '#bf8a5a'][i % 4];
      c.fillRect((i * w) / 8, 0, w / 8, h);
      c.fillStyle = 'rgba(90,55,30,0.55)';
      c.fillRect((i * w) / 8, 0, 3, h);
      c.fillStyle = 'rgba(60,40,30,0.6)';
      c.beginPath();
      c.arc((i * w) / 8 + w / 16, 24 + (i % 3) * 60, 3, 0, P * 2);
      c.fill();
    }
  });
  plankTex.wrapS = plankTex.wrapT = THREE.RepeatWrapping;
  const deckGeo = new THREE.BoxGeometry(3.4, 0.2, 16);
  const uv = deckGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.9, uv.getY(i) * 9);
  add(util.mesh(deckGeo, util.umat('#ffffff', { map: plankTex, rough: 0.85 }), { cast: false }), 0, -0.1, 7.4);
  const pierGroup = new THREE.Group();
  root.add(pierGroup);
  const pAdd = (o, x, y, z) => (o.position.set(x, y, z), pierGroup.add(o), o);
  for (let z = -0.5; z <= 15; z += 1.8) {
    for (const x of [-1.62, 1.62]) {
      pAdd(k.cyl(0.13, 0.15, 3.2, '#7a5236', 10), x, -1.6, z);
      pAdd(k.cyl(0.165, 0.175, 0.26, '#5f9a6a', 10), x, SEA, z);
      pAdd(k.box(0.12, 0.85, 0.12, '#9b6a43'), x, 0.42, z);
      pAdd(k.sph(0.08, '#fff4e3', undefined, 8), x, 0.88, z);
    }
  }
  const rope = util.mat('#ead6ad', { rough: 0.8 });
  for (const x of [-1.62, 1.62]) {
    for (let z = -0.5; z < 14; z += 1.8) {
      const a = new THREE.Vector3(x, 0.76, z);
      const b = new THREE.Vector3(x, 0.76, z + 1.8);
      const c = a.clone().lerp(b, 0.5);
      c.y -= 0.14;
      pierGroup.add(util.mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, c, b), 6, 0.03, 5), rope, { cast: false }));
    }
  }
  pAdd(k.box(3.4, 0.14, 0.14, '#8a5a3c'), 0, -0.27, -0.55);
  // The lantern at the end corner (lit at night), a crate to sit on, the bucket and a tackle box
  const glassMat = util.umat('#fff1c4', { emissive: '#ffc35a', ei: 0.6, rough: 0.3 });
  const lamp = HM.lanternPost(k, glassMat, 1.7);
  lamp.root.rotation.y = P;
  pAdd(lamp.root, 1.62, 0, -0.5);
  pAdd(HM.crate(k, '#d6a06a', 0.62), -1.0, 0, 0.35);
  pAdd(k.rbox(0.44, 0.22, 0.28, '#3fbf9f', 0.03), 1.05, 0.11, 0.9);
  pAdd(k.rbox(0.46, 0.04, 0.3, '#2f8f7a', 0.015), 1.05, 0.23, 0.9);
  pAdd(HM.bollard(k), -1.3, 0, 2.2);
  for (let i = 0; i < 4; i++) pAdd(k.rot(k.tor(0.24, 0.07, i % 2 ? '#ffffff' : '#ff7a4d', P / 2, undefined, 6, 6), 0, P / 2, (i * P) / 2), 1.7, 0.5, 2.6);
  colorBake(pierGroup, [lamp.root.children.find((c) => c.isGroup)]);
  const bucket = new THREE.Group();
  bucket.add(k.at(k.cyl(0.21, 0.17, 0.34, '#8fd3ff', 14), 0, 0.17, 0));
  bucket.add(k.at(k.cyl(0.19, 0.19, 0.02, '#5fb8e0', 14), 0, 0.3, 0));
  bucket.add(k.at(k.rot(k.tor(0.21, 0.015, '#3d4a52', P, undefined, 12, 4), 0, 0, 0), 0, 0.34, 0));
  add(bucket, 0.85, 0, 0.25);
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: HM.dotTexture(), color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  lampGlow.scale.setScalar(1.0);
  lampGlow.position.set(1.4, 1.42, -0.5);
  root.add(lampGlow);

  // ---------------------------------------------------------------- in the distance
  const lh = HM.lighthouse(k, atlas);
  lh.root.scale.setScalar(1.3);
  add(lh.root, -24, SEA, -44);
  lh.root.rotation.y = 0.5;
  const boats = [];
  const sb = HM.sailBoat(k);
  HM.bakeGroup(sb.root);
  sb.root.rotation.order = 'YXZ';
  add(sb.root, 22, SEA + 0.3, -60);
  boats.push({ root: sb.root, x: 22, z: -60, yaw: -1.2, drift: -0.5, ph: 0 });
  const fb = HM.fishingBoat(k, atlas);
  HM.bakeGroup(fb.root);
  fb.root.rotation.order = 'YXZ';
  add(fb.root, -10, SEA + 0.38, -34);
  boats.push({ root: fb.root, x: -10, z: -34, yaw: 1.9, drift: 0.25, ph: 2 });
  // Hills on the far islands
  for (const [x, z, r, c] of [[-90, -170, 40, '#8fbf86'], [-40, -185, 30, '#9fcf8f'], [70, -175, 46, '#86b57f'], [120, -150, 26, '#a0c88f']]) {
    const hill = util.mesh(new THREE.SphereGeometry(r, 18, 10, 0, P * 2, 0, P / 2), util.mat(c, { rough: 1 }), { cast: false, receive: false });
    hill.scale.y = 0.38;
    add(hill, x, SEA - 0.5, z);
  }
  // Buoys
  const buoyMesh = new THREE.InstancedMesh(HM.buoyGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), 3);
  buoyMesh.castShadow = true;
  const BUOYS = [[-9, -16], [10, -21], [3, -30]];
  root.add(buoyMesh);
  // Clouds
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.3, flatShading: true, transparent: true, opacity: 1 });
  const cgeo = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Group();
    const n = 4 + (i % 3);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(cgeo, cloudMat);
      const s = 3 + Math.random() * 3;
      m.scale.set(s * 1.3, s * 0.75, s);
      m.position.set((j - n / 2) * 4, Math.random() * 2, (Math.random() - 0.5) * 4);
      c.add(m);
    }
    c.position.set(-90 + i * 20 + Math.random() * 8, 24 + Math.random() * 14, -90 - Math.random() * 60);
    c.userData.k = i / 10;
    scene.add(c);
    clouds.push(c);
  }

  // Gulls: they sit on the pier posts and circle over the water
  const perches = [[-1.62, 0.94, 6.7], [1.62, 0.94, 4.9], [-1.62, 0.94, 10.3], [1.62, 0.94, 12.1]].map(([x, y, z]) => ({ x, y, z, yaw: P }));
  const gulls = new Gulls(perches, { count: 3, bounds: { x0: -14, x1: 14, z0: -24, z1: -6 } });
  root.add(gulls.group);

  // Rain: falling streaks around the camera's view
  const RAIN = 420;
  const rainPos = new Float32Array(RAIN * 6);
  const rainSeed = [];
  for (let i = 0; i < RAIN; i++) rainSeed.push([(Math.random() - 0.5) * 34, Math.random() * 14, -Math.random() * 30 + 4]);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#e8f1fa', transparent: true, opacity: 0.55 }));
  rain.frustumCulled = false;
  scene.add(rain);
  const dropRings = [];
  const ringGeo = new THREE.RingGeometry(0.7, 1, 20);
  ringGeo.rotateX(-P / 2);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    m.userData.t = Math.random();
    scene.add(m);
    dropRings.push(m);
  }

  // ---------------------------------------------------------------- weather blending
  let cur = { ...WEATHER.morning };
  let from = { ...cur };
  let to = { ...cur };
  let blend = 1;
  let blendTime = 1;
  const num = ['sunI', 'hemi', 'sunEl', 'sunAz', 'wave', 'rain', 'clouds', 'night'];
  const cols = ['top', 'mid', 'hor', 'water', 'fog', 'sun', 'cloud', 'disc'];
  const mix = (k2) => {
    const o = {};
    for (const n of num) o[n] = from[n] + (to[n] - from[n]) * k2;
    for (const c of cols) o[c] = '#' + C1.set(from[c]).lerp(C2.set(to[c]), k2).getHexString();
    return o;
  };
  const apply = (w) => {
    paintSky(w);
    scene.background = new THREE.Color(w.hor);
    if (scene.fog) scene.fog.color.set(w.fog);
    else scene.fog = new THREE.Fog(w.fog, 45, 170);
    waterMat.color.set(w.water);
    env.sun.color.set(w.sun);
    env.sun.intensity = w.sunI;
    env.hemi.intensity = w.hemi;
    env.hemi.color.set(w.night > 0.5 ? '#9fb0ff' : '#fff6ea');
    env.hemi.groundColor.set(w.night > 0.5 ? '#2c3a5a' : '#d9c3a6');
    amp = w.wave;
    cloudMat.color.set(w.cloud);
    cloudMat.emissive.set(w.cloud);
    stars.material.opacity = Math.max(0, (w.night - 0.4) / 0.6);
    disc.material.color.set(w.disc);
    rain.material.opacity = 0.55 * w.rain;
    rain.visible = w.rain > 0.02;
    glassMat.emissiveIntensity = 0.6 + w.night * 2.2;
    lampGlow.material.opacity = w.night * 0.6;
    lh.beamMat.opacity = Math.max(0, w.night - 0.15) * 0.32;
    lh.beam.visible = w.night > 0.2;
  };
  apply(cur);

  // sunset: 0..1 how far the sun has gone down (for the golden fish round)
  const api = {
    root,
    lighthouse: lh,
    gulls,
    bucket,
    glassMat,
    get weather() {
      return cur;
    },
    set(name, time = 1.5) {
      from = { ...cur };
      to = { ...WEATHER[name] };
      blend = 0;
      blendTime = time;
    },
    sinkSun: 0,
    waveY: (x, z, t) => SEA + wave(x, z, t),
    update(dt, t, focus) {
      if (blend < 1) {
        blend = Math.min(1, blend + dt / blendTime);
        cur = mix(blend * blend * (3 - 2 * blend));
        apply(cur);
      }
      // Waves (with analytic normals)
      const e = 0.6;
      for (let i = 0; i < wp.count; i++) {
        const x = base[i * 2];
        const z = base[i * 2 + 1];
        const near = Math.abs(z) < 70 && Math.abs(x) < 70;
        const y = near ? wave(x, z, t) : 0;
        wp.setY(i, y);
        if (near) {
          const dx = (wave(x + e, z, t) - y) / e;
          const dz = (wave(x, z + e, t) - y) / e;
          const l = Math.hypot(dx, 1, dz);
          normal[i * 3] = -dx / l;
          normal[i * 3 + 1] = 1 / l;
          normal[i * 3 + 2] = -dz / l;
        } else {
          normal[i * 3] = 0;
          normal[i * 3 + 1] = 1;
          normal[i * 3 + 2] = 0;
        }
      }
      wp.needsUpdate = true;
      waterGeo.attributes.normal.needsUpdate = true;
      // Sun or moon in the sky, toward the sea
      const el = Math.max(-0.06, cur.sunEl - api.sinkSun * 0.12);
      const az = cur.sunAz;
      disc.position.set(Math.sin(az) * 180 * Math.cos(el), 180 * Math.sin(el) - 2, -Math.cos(az) * 180 * Math.cos(el));
      disc.scale.setScalar(cur.night > 0.5 ? 18 : 34 - cur.sunEl * 10);
      // Boats drift and bob
      for (const b of boats) {
        b.root.position.x = b.x + Math.sin(t * 0.03 + b.ph) * 8 * b.drift;
        b.root.position.y = (b.root === sb.root ? 0.3 : 0.38) + SEA + Math.sin(t * 1.1 + b.ph) * 0.06;
        b.root.rotation.set(Math.sin(t * 0.8 + b.ph) * 0.03, b.yaw, Math.sin(t * 1.2 + b.ph) * 0.05);
      }
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const one = new THREE.Vector3(1, 1, 1);
      const v = new THREE.Vector3();
      BUOYS.forEach(([x, z], i) => {
        q.setFromEuler(new THREE.Euler(Math.sin(t * 1.4 + i) * 0.1, i, Math.cos(t * 1.1 + i) * 0.1));
        buoyMesh.setMatrixAt(i, m4.compose(v.set(x, SEA + wave(x, z, t) + 0.05, z), q, one));
      });
      buoyMesh.instanceMatrix.needsUpdate = true;
      lh.beam.rotation.y = t * 0.5;
      // Clouds slide slowly; how many show depends on the weather
      clouds.forEach((c, i) => {
        c.position.x += dt * (0.6 + (i % 3) * 0.3) * (1 + cur.wave * 6);
        if (c.position.x > 110) c.position.x = -110;
        c.visible = c.userData.k < cur.clouds;
      });
      gulls.update(dt, t, [{ x: focus.x, z: focus.z, y: 0 }]);
      // Rain
      if (rain.visible) {
        for (let i = 0; i < RAIN; i++) {
          const s = rainSeed[i];
          s[1] -= dt * 15;
          if (s[1] < SEA) s[1] += 14;
          rainPos.set([s[0] - 0.05, s[1], s[2], s[0], s[1] + 0.45, s[2]], i * 6);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      for (const r of dropRings) {
        r.userData.t += dt * 1.3;
        if (r.userData.t > 1) {
          r.userData.t = 0;
          r.position.set((Math.random() - 0.5) * 18, 0, -2 - Math.random() * 16);
        }
        const kk = r.userData.t;
        r.position.y = SEA + wave(r.position.x, r.position.z, t) + 0.02;
        r.scale.setScalar(0.1 + kk * 0.45);
        r.material.opacity = cur.rain * (1 - kk) * 0.5;
        r.visible = cur.rain > 0.02;
      }
    },
  };
  return api;
}
