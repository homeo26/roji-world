import { THREE, P, inst, bulbs, stripes, toGeo, vcMat, smooth, colorBake } from './parts.js';
import { mat, umat, mesh } from '../../util.js';
import { Tune, TUNES } from './music.js';

// The carousel at the heart of the park: sixteen painted horses in two rings going up and down on
// brass poles under a striped canopy edged with bulbs. Ride it together: Roji on an outer horse and
// Homama right beside her on the inner one, to a waltz. Halfway round he reaches over for her hand.

const OUT_R = 2.85;
const IN_R = 1.85;
const N = 8;
const HS = 1.3; // horse scale
const SADDLE = 0.3 * HS; // saddle top above the horse's origin
const RIDE_DROP = 0.34; // a riding kid's root sits this far below the saddle top

function horseModel(k) {
  const h = new THREE.Group();
  const coat = '#ffffff';
  const body = k.sph(0.27, coat, undefined, 10);
  body.scale.set(0.9, 0.85, 1.6);
  h.add(body);
  const neck = k.cyl(0.12, 0.17, 0.5, coat, 7);
  neck.position.set(0, 0.22, 0.36);
  neck.rotation.x = 0.55;
  h.add(neck);
  const head = k.rbox(0.2, 0.22, 0.4, coat, 0.04);
  head.position.set(0, 0.46, 0.58);
  head.rotation.x = 0.35;
  h.add(head);
  h.add(k.at(k.rbox(0.17, 0.15, 0.14, '#ffd1dc', 0.04), 0, 0.37, 0.76));
  for (const s of [-1, 1]) {
    h.add(k.at(k.cone(0.045, 0.14, coat, 6), s * 0.07, 0.62, 0.5));
    h.add(k.at(k.sph(0.03, P.ink, undefined, 6), s * 0.1, 0.51, 0.64));
  }
  // mane, tail and the saddle
  for (let i = 0; i < 3; i++) h.add(k.at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), mat(P.gold)), 0, 0.5 - i * 0.11, 0.47 - i * 0.1));
  const tail = k.cone(0.09, 0.42, P.gold, 6);
  tail.position.set(0, 0.0, -0.5);
  tail.rotation.x = -2.3;
  h.add(tail);
  h.add(k.at(k.box(0.42, 0.08, 0.36, P.rose), 0, 0.235, -0.04));
  h.add(k.at(k.box(0.46, 0.18, 0.04, P.gold), 0, 0.15, 0.12));
  // legs: front pair tucked (galloping), back pair stretched
  const leg = (x, z, rx) => {
    const l = k.cyl(0.05, 0.045, 0.42, coat, 5);
    l.geometry = l.geometry.clone();
    l.geometry.translate(0, -0.21, 0);
    l.position.set(x, -0.12, z);
    l.rotation.x = rx;
    h.add(l);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.07, 5), mat(P.gold));
    hoof.rotation.x = rx;
    hoof.position.set(x, -0.12 - Math.cos(rx) * 0.42, z - Math.sin(rx) * 0.42);
    h.add(hoof);
  };
  leg(0.1, 0.3, 1.1);
  leg(-0.1, 0.28, 0.7);
  leg(0.1, -0.3, -0.5);
  leg(-0.1, -0.3, -0.75);
  return h;
}

export function buildCarousel(ctx, k, at) {
  const { api } = ctx;
  const root = new THREE.Group();
  root.position.set(at.x, 0, at.z);
  const dynamic = [];
  // Static base and steps
  root.add(k.at(k.cyl(4.05, 4.15, 0.2, P.stoneDark, 40), 0, 0.1, 0));
  root.add(k.at(k.cyl(3.95, 3.95, 0.04, P.pink, 40), 0, 0.21, 0));
  const rotor = new THREE.Group();
  rotor.position.y = 0.2;
  root.add(rotor);
  dynamic.push(rotor);
  rotor.add(k.at(k.cyl(3.75, 3.75, 0.18, '#ecd0ae', 40), 0, 0.09, 0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const line = k.box(0.03, 0.01, 1.6, '#d9b48a');
    line.position.set(Math.sin(a) * 2.9, 0.185, Math.cos(a) * 2.9);
    line.rotation.y = a;
    line.castShadow = false;
    rotor.add(line);
  }
  rotor.add(k.at(k.cyl(3.78, 3.78, 0.1, P.rose, 40), 0, 0.12, 0));
  // Centre drum with mirror panels and gold bands
  rotor.add(k.at(k.cyl(0.95, 0.95, 3.5, P.cream, 20), 0, 1.93, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = k.box(0.5, 1.5, 0.06, i % 2 ? '#c7e9ff' : '#ffd1dc', { rough: 0.25, metal: 0.3 });
    p.position.set(Math.sin(a) * 0.96, 1.7, Math.cos(a) * 0.96);
    p.rotation.y = a;
    rotor.add(p);
  }
  for (const y of [0.4, 3.0, 3.6]) rotor.add(k.at(k.cyl(0.99, 0.99, 0.1, P.gold, 24, { rough: 0.35, metal: 0.4 }), 0, y, 0));
  // Poles
  const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 3.5, 6);
  poleGeo.translate(0, 1.93, 0);
  const poles = inst(poleGeo, mat(P.gold, { rough: 0.3, metal: 0.6 }), N * 2, { cast: false });
  const m4 = new THREE.Matrix4();
  const poleAt = (i) => {
    const ring = i < N ? OUT_R : IN_R;
    const a = ((i % N) / N) * Math.PI * 2 + (i < N ? 0 : 0);
    return [Math.sin(a) * ring, Math.cos(a) * ring, a];
  };
  for (let i = 0; i < N * 2; i++) {
    const [x, z] = poleAt(i);
    poles.setMatrixAt(i, m4.makeTranslation(x, 0, z));
  }
  rotor.add(poles);
  // Canopy: a striped cone with a scalloped valance, a little dome and a flag on top
  const canTex = stripes('#ef5b6f', '#fff4e3', 16, { w: 512, h: 256 });
  const canMat = umat('#ffffff', { map: canTex, rough: 0.7, side: THREE.DoubleSide });
  const canopy = mesh(new THREE.ConeGeometry(4.15, 1.5, 32, 1, true), canMat);
  canopy.position.y = 3.65 + 0.75;
  rotor.add(canopy);
  const valTex = stripes('#ff9eb5', '#fff4e3', 32, { w: 1024, h: 96, scallop: true });
  const valMat = umat('#ffffff', { map: valTex, rough: 0.7, side: THREE.DoubleSide });
  valMat.alphaTest = 0.5;
  const valance = mesh(new THREE.CylinderGeometry(4.16, 4.16, 0.45, 48, 1, true), valMat, { cast: false });
  valance.position.y = 3.45;
  rotor.add(valance);
  rotor.add(k.at(k.rot(k.tor(4.17, 0.055, P.gold, Math.PI * 2, undefined, 48, 4), Math.PI / 2, 0, 0), 0, 3.67, 0));
  rotor.add(k.at(k.cyl(0.55, 0.65, 0.4, P.cream, 16), 0, 5.25, 0));
  rotor.add(k.at(k.sph(0.5, P.pink, undefined, 14), 0, 5.5, 0));
  rotor.add(k.at(k.sph(0.13, P.gold), 0, 6.06, 0));
  rotor.add(k.at(k.cyl(0.02, 0.02, 0.7, P.ink, 5), 0, 6.35, 0));
  const flag = k.heart(0.32, 0.03, P.rose);
  flag.position.set(0.17, 6.52, 0);
  rotor.add(flag);
  const bp = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    bp.push(new THREE.Vector3(Math.sin(a) * 4.22, 3.62, Math.cos(a) * 4.22));
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    bp.push(new THREE.Vector3(Math.sin(a) * 1.0, 3.3, Math.cos(a) * 1.0));
  }
  const lights = bulbs(bp, { r: 0.07, colors: ['#fff3c4', '#ffd1dc', '#fff3c4', '#c7e9ff'] });
  rotor.add(lights);
  // Horses (one instanced mesh for all sixteen)
  const hModel = horseModel(k);
  hModel.scale.setScalar(HS);
  const holder = new THREE.Group();
  holder.add(hModel);
  const hGeo = toGeo(holder);
  const colors = ['#ffffff', '#ffd1dc', '#c7e9ff', '#fff0b3', '#e3d4ff', '#c8f2e0', '#ffe0cc', '#ffffff'];
  // (no shadows: they are under the canopy)
  const horses = inst(hGeo, vcMat(0.55), N * 2, { cast: false, colors: [...colors, ...colors.slice(3), ...colors.slice(0, 3)] });
  rotor.add(horses);
  colorBake(rotor, [poles, lights, horses]);

  const state = { omega: 0.35, ride: null, phase: 0 };
  const hm = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  const horseY = (i, t) => 1.05 + Math.sin(t * 1.9 + (i % N) * 1.4 + (i < N ? 0 : 2.2)) * 0.22;
  const horseMatrix = (i, t, out) => {
    const [x, z, a] = poleAt(i);
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, a + Math.PI / 2);
    return out.compose(v.set(x, horseY(i, t), z), q, one);
  };
  const tune = { cur: null };
  const seatWorld = (i, t, out) => {
    horseMatrix(i, t, hm);
    hm.premultiply(rotor.matrixWorld);
    out.p = new THREE.Vector3(0, SADDLE - RIDE_DROP, -0.08).applyMatrix4(hm);
    out.q = new THREE.Quaternion().setFromRotationMatrix(hm);
    return out;
  };
  const tmp = {};
  const eul = new THREE.Euler();

  function start() {
    // The outer horse nearest the front (toward the camera) and its inner neighbour
    const turn = rotor.rotation.y;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + turn;
      const d = Math.abs(Math.atan2(Math.sin(a - 0.5), Math.cos(a - 0.5)));
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const R = { roji: best, homama: best + N, t: 0, held: false, waved: false };
    state.ride = R;
    tune.cur = new Tune(api.sound, TUNES.waltz, { volume: 1 });
    api.activity({
      label: 'Get off',
      endOnMove: false,
      music: 0.25,
      seats: [
        { who: 'roji', x: at.x, z: at.z + 3, y: 0.8, pose: 'ride' },
        { who: 'homama', x: at.x, z: at.z + 2, y: 0.8, pose: 'ride' },
      ],
      focus: { x: at.x, z: at.z + 0.6, y: 1.7, zoom: 0.78 },
      exit: { x: at.x - 0.4, z: at.z + 4.75 },
      onEnd: () => {
        state.ride = null;
        tune.cur?.stop();
        tune.cur = null;
      },
    });
    api.toast(api.playerId === 'roji' ? 'Round and round. Homama picked the horse right next to yours.' : 'Roji takes the pink horse. You take the one right beside her.', 2800);
  }

  return {
    debug: state,
    root,
    dynamic,
    colliders: [{ type: 'circle', x: at.x, z: at.z, r: 4.15 }],
    hotspots: [{ x: at.x, z: at.z + 4.75, r: 1.5, label: 'Ride the carousel', icon: 'horse', act: () => start() }],
    update(dt, t) {
      const R = state.ride;
      // While riding, the canopy fades so the camera can see the two of them under it
      const fade = R ? 0.12 : 1;
      if (Math.abs(canMat.opacity - fade) > 0.005 || canMat.transparent !== fade < 1) {
        canMat.opacity += (fade - canMat.opacity) * Math.min(1, dt * 4);
        if (Math.abs(canMat.opacity - fade) < 0.01) canMat.opacity = fade;
        valMat.opacity = canMat.opacity;
        const tr = canMat.opacity < 0.999;
        if (canMat.transparent !== tr) {
          canMat.transparent = valMat.transparent = tr;
          canMat.depthWrite = valMat.depthWrite = !tr;
          canMat.side = valMat.side = tr ? THREE.FrontSide : THREE.DoubleSide;
          canMat.needsUpdate = valMat.needsUpdate = true;
        }
      }
      const want = R ? (R.t < 2 ? 0.35 + (R.t / 2) * 0.4 : 0.75) : 0.35;
      state.omega += (want - state.omega) * Math.min(1, dt * 1.5);
      rotor.rotation.y += state.omega * dt;
      for (let i = 0; i < N * 2; i++) horses.setMatrixAt(i, horseMatrix(i, t, m4));
      horses.instanceMatrix.needsUpdate = true;
      // Bulbs twinkle round the canopy
      const step = Math.floor(t * 4);
      if (step !== state.phase) {
        state.phase = step;
        const c = new THREE.Color();
        for (let i = 0; i < 40; i++) lights.setColorAt(i, c.set((i + step) % 4 === 0 ? '#ffffff' : lights.userData.base[i % 4]));
        lights.instanceColor.needsUpdate = true;
      }
      if (!R) return;
      R.t += dt;
      tune.cur?.update();
      rotor.updateMatrixWorld(true);
      for (const w of ['roji', 'homama']) {
        seatWorld(R[w], t, tmp);
        const a = api[w];
        a.kid.root.position.copy(tmp.p);
        a.kid.root.quaternion.copy(tmp.q);
        eul.setFromQuaternion(tmp.q, 'YXZ');
        a.pos.set(tmp.p.x, 0, tmp.p.z);
        a.y = tmp.p.y;
        a.yaw = eul.y;
      }
      // Halfway round Homama reaches across for Roji's hand
      const hk = api.homama.kid;
      const rk = api.roji.kid;
      const hold = smooth((R.t - 8) / 0.8) * (1 - smooth((R.t - 15) / 0.8));
      if (hold > 0) {
        // Homama is on the inner ring, so Roji is on his right
        hk.arms[1].rotation.set(-0.6 * hold - 0.95 * (1 - hold), 0, -1.25 * hold);
        rk.arms[0].rotation.set(-0.6 * hold - 0.95 * (1 - hold), 0, 1.25 * hold);
        if (!R.held && hold > 0.9) {
          R.held = true;
          api.fx.heartsAt(rk.root.position.clone().lerp(hk.root.position, 0.5).setY(rk.root.position.y + 1.4), 4);
        }
      }
      // Near the end Roji waves at whoever is watching
      if (R.t > 18 && R.t < 20.5) {
        rk.arms[1].rotation.set(0, 0, -2.4 - Math.sin(t * 12) * 0.3);
      }
      if (R.t > 24) api.endActivity();
    },
  };
}
