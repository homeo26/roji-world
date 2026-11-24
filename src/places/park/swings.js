import { THREE, P, inst, bulbs, stripes, toGeo, vcMat, smooth, colorBake, fitText, roundRect } from './parts.js';
import { mat, umat, mesh } from '../../util.js';

// The sky swings: a striped crown on a tall tower with twelve chairs on chains. When it runs the crown
// rises up the tower and spins, and the chairs fly out wide. Roji and Homama ride two chairs in a row,
// hands up at full speed.

const N = 12;
const R0 = 2.7;
const L = 2.8;
const H_REST = 3.65;
const H_RUN = 6.3;

function chairModel(k) {
  const g = new THREE.Group();
  g.add(k.at(k.rbox(0.56, 0.1, 0.5, '#ffffff', 0.04), 0, 0, 0));
  g.add(k.at(k.rbox(0.56, 0.55, 0.08, '#ffffff', 0.04), 0, 0.27, -0.24));
  g.add(k.at(k.box(0.5, 0.05, 0.16, '#ffffff'), 0, -0.36, 0.3));
  for (const s of [-1, 1]) {
    g.add(k.at(k.cyl(0.02, 0.02, 0.42, P.steel, 5), s * 0.27, -0.18, 0.28));
    g.add(k.at(k.cyl(0.025, 0.025, 0.5, P.gold, 6), s * 0.29, 0.25, 0));
  }
  // the safety bar
  const bar = k.cyl(0.025, 0.025, 0.58, P.gold, 6);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.32, 0.22);
  g.add(bar);
  return g;
}

export function buildSwings(ctx, k, atlas, at) {
  const { api } = ctx;
  const root = new THREE.Group();
  root.position.set(at.x, 0, at.z);
  const dynamic = [];
  // Base, tower and the crown on top
  root.add(k.at(k.cyl(1.6, 1.7, 0.3, P.cream, 28), 0, 0.15, 0));
  root.add(k.at(k.cyl(1.62, 1.62, 0.06, P.sky, 28), 0, 0.3, 0));
  root.add(k.at(k.cyl(0.22, 0.34, 7.3, '#fff4e3', 14), 0, 3.95, 0));
  for (let y = 1; y < 7.5; y += 0.9) root.add(k.at(k.cyl(0.33 - y * 0.012, 0.33 - y * 0.012, 0.08, y % 1.8 < 0.9 ? P.sky : P.pink, 14), 0, y, 0));
  root.add(k.at(k.cone(0.45, 0.9, P.blue, 14), 0, 8.05, 0));
  root.add(k.at(k.star(0.28, 0.12, 0.06, P.sun, { emissive: '#ffb347', ei: 0.3 }), 0, 8.75, 0));
  // A low ring fence round the ride, open at the front
  const fp = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.12) continue;
    fp.push([Math.sin(a) * 4.95, Math.cos(a) * 4.95]);
  }
  const fpGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6);
  fpGeo.translate(0, 0.425, 0);
  const fposts = inst(fpGeo, mat(P.blue, { rough: 0.5 }), fp.length, { cast: false });
  const m4 = new THREE.Matrix4();
  fp.forEach(([x, z], i) => fposts.setMatrixAt(i, m4.makeTranslation(x, 0, z)));
  root.add(fposts);
  dynamic.push(fposts);
  for (const y of [0.45, 0.82]) {
    const rail = k.tor(4.95, 0.03, P.cream, Math.PI * 2 - 0.24, undefined, 64, 4);
    rail.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.12);
    rail.position.y = y;
    rail.castShadow = false;
    root.add(rail);
  }
  const sign = atlas.panel(1.9, 0.52, 380, 104, (c, w, h) => {
    c.fillStyle = '#6fb8ff';
    roundRect(c, 4, 4, w - 8, h - 8, 36);
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = '#ffffff';
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Sky Swings', w / 2, h / 2 + 3, w * 0.84, 60);
  });
  for (const s of [-1, 1]) root.add(k.at(k.box(0.09, 1.55, 0.09, P.woodDark), 1.6 + s * 0.75, 0.78, 5.25));
  root.add(k.at(k.box(2.0, 0.6, 0.06, P.woodDark), 1.6, 1.35, 5.22));
  sign.position.set(1.6, 1.35, 5.26);
  root.add(sign);

  // The crown that rises and spins
  const crown = new THREE.Group();
  crown.position.y = H_REST;
  root.add(crown);
  dynamic.push(crown);
  const canTex = stripes('#6fb8ff', '#fff4e3', 24, { w: 768, h: 128 });
  crown.add(k.at(mesh(new THREE.ConeGeometry(3.1, 1.0, 36, 1, true), umat('#ffffff', { map: canTex, rough: 0.7, side: THREE.DoubleSide })), 0, 0.5, 0));
  const valTex = stripes('#ff9eb5', '#fff4e3', 36, { w: 1024, h: 96, scallop: true });
  const valMat = umat('#ffffff', { map: valTex, rough: 0.7, side: THREE.DoubleSide });
  valMat.alphaTest = 0.5;
  crown.add(k.at(mesh(new THREE.CylinderGeometry(3.12, 3.12, 0.4, 48, 1, true), valMat, { cast: false }), 0, -0.2, 0));
  crown.add(k.at(k.rot(k.tor(3.14, 0.05, P.gold, Math.PI * 2, undefined, 48, 4), Math.PI / 2, 0, 0), 0, 0.0, 0));
  crown.add(k.at(k.cyl(0.5, 0.5, 0.5, P.gold, 16), 0, 0.2, 0));
  const bp = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    bp.push(new THREE.Vector3(Math.sin(a) * 3.2, 0.02, Math.cos(a) * 3.2));
  }
  const lights = bulbs(bp, { r: 0.07, colors: ['#fff3c4', '#c7e9ff', '#ffd1dc'] });
  crown.add(lights);
  colorBake(crown, [lights]);

  // Chairs and chains
  const chGeo = toGeo(chairModel(k));
  const chairs = inst(chGeo, vcMat(0.5), N, { colors: ['#ff9eb5', '#ffd166', '#7fd8bf', '#8fd3ff', '#c7a6ff', '#ffb38a'] });
  root.add(chairs);
  dynamic.push(chairs);
  const chainGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 4);
  chainGeo.translate(0, 0.5, 0);
  const chains = inst(chainGeo, mat(P.steel, { rough: 0.4, metal: 0.5 }), N * 2, { cast: false });
  root.add(chains);
  dynamic.push(chains);

  const st = { h: H_REST, turn: 0, omega: 0, theta: 0, ride: null };
  const q = new THREE.Quaternion();
  const q2 = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const Yax = new THREE.Vector3(0, 1, 0);
  const tan = new THREE.Vector3();
  const piv = new THREE.Vector3();
  const chairM = [];
  for (let i = 0; i < N; i++) chairM.push(new THREE.Matrix4());
  const layout = () => {
    for (let i = 0; i < N; i++) {
      const phi = (i / N) * Math.PI * 2 + st.turn;
      const sphi = Math.sin(phi);
      const cphi = Math.cos(phi);
      piv.set(sphi * R0, st.h - 0.05, cphi * R0);
      const th = st.theta + Math.sin(st.turn * 3 + i) * 0.01;
      // the chair hangs from the pivot, swung outward by theta
      v.set(sphi * L * Math.sin(th), -L * Math.cos(th), cphi * L * Math.sin(th)).add(piv);
      // facing the way it travels, tilted outward round the travel axis
      tan.set(cphi, 0, -sphi);
      q.setFromAxisAngle(Yax, phi + Math.PI / 2);
      q2.setFromAxisAngle(tan, -th);
      q.premultiply(q2);
      chairM[i].compose(v, q, one);
      chairs.setMatrixAt(i, chairM[i]);
      for (const s of [-1, 1]) {
        // chain from the pivot (spread a little) to the chair's hanger
        v2.set(s * 0.29, 0.5, 0).applyMatrix4(chairM[i]);
        const top = piv.clone().addScaledVector(tan, s * 0.18);
        const len = top.distanceTo(v2);
        const dir = top.clone().sub(v2).normalize();
        m4.compose(v2, q2.setFromUnitVectors(Yax, dir), v.set(1, len, 1));
        chains.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m4);
      }
    }
    chairs.instanceMatrix.needsUpdate = true;
    chains.instanceMatrix.needsUpdate = true;
  };
  layout();

  function start() {
    // the two chairs nearest the front, one after the other
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < N; i++) {
      const phi = (i / N) * Math.PI * 2 + st.turn;
      const d = Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi)));
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    st.ride = { roji: best, homama: (best + N - 1) % N, t: 0, cheered: false };
    api.activity({
      label: 'Get off',
      endOnMove: false,
      music: 0.6,
      seats: [
        { who: 'roji', x: at.x, z: at.z + 3, y: 0.6, pose: 'sit' },
        { who: 'homama', x: at.x + 1, z: at.z + 3, y: 0.6, pose: 'sit' },
      ],
      focus: { x: at.x, z: at.z + 1, y: 2.4, zoom: 0.95 },
      exit: { x: at.x - 0.5, z: at.z + 5.7 },
      onEnd: () => {
        st.ride = null;
      },
    });
    api.toast('Hold on tight. Up, up and round you go.', 2400);
  }

  const kp = new THREE.Vector3();
  const kq = new THREE.Quaternion();
  const ks = new THREE.Vector3();
  const e = new THREE.Euler();
  return {
    debug: st,
    root,
    dynamic,
    colliders: [{ type: 'circle', x: at.x, z: at.z, r: 4.95 }],
    hotspots: [{ x: at.x, z: at.z + 5.6, r: 1.5, label: 'Ride the sky swings', icon: 'park-swing', act: () => start() }],
    update(dt, t) {
      const R = st.ride;
      let wantH = H_REST;
      let wantW = 0.0;
      if (R) {
        R.t += dt;
        const T = R.t;
        if (T > 0.6 && T < 20) wantH = H_RUN;
        if (T > 3 && T < 16.5) wantW = 1.55;
        if (T > 22.5) api.endActivity();
      }
      st.h += (wantH - st.h) * Math.min(1, dt * 0.9);
      st.omega += (wantW - st.omega) * Math.min(1, dt * 0.45);
      if (!R && st.omega < 0.02) st.omega = 0;
      st.turn += st.omega * dt;
      const reach = R0 + L * Math.sin(st.theta);
      const wantTheta = Math.atan((st.omega * st.omega * reach) / 9.8);
      st.theta += (wantTheta - st.theta) * Math.min(1, dt * 2);
      crown.position.y = st.h;
      crown.rotation.y = st.turn;
      layout();
      if (!R) return;
      for (const w of ['roji', 'homama']) {
        const a = api[w];
        kp.set(0, -0.12, 0.02);
        kp.applyMatrix4(chairM[R[w]]);
        root.localToWorld(kp);
        chairM[R[w]].decompose(v, kq, ks);
        a.kid.root.position.copy(kp);
        a.kid.root.quaternion.copy(kq);
        e.setFromQuaternion(kq, 'YXZ');
        a.pos.set(kp.x, 0, kp.z);
        a.y = kp.y;
        a.yaw = e.y;
        // hands up at full speed
        a.kid.hands = st.omega > 1.2 ? 'wave2' : null;
      }
      if (!R.cheered && st.omega > 1.4) {
        R.cheered = true;
        api.fx.heartsAt(api.roji.kid.root.position.clone().setY(api.roji.kid.root.position.y + 1.2), 5);
      }
      api.focus({ x: at.x, z: at.z + 1, y: 2.6 + (st.h - H_REST) * 0.4, zoom: 0.95 + (st.h - H_REST) * 0.12 });
    },
  };
}
const m4 = new THREE.Matrix4();
