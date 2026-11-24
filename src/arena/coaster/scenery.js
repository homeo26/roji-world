import * as THREE from 'three';
import { kit, colorBake, glowTexture, fitText, roundRect, mergeGeometries } from '../../places/school/kit.js';
import { canvasTexture, mat, umat, mesh, rng } from '../../util.js';
import { trackMesh } from './track.js';

// The world round the Comet: a sky dome for the time of day (with the sun low at sunset, the moon and
// stars at night), rolling meadows with trees and a lake, the station, tunnels with lights, a little
// Roji Land castle on the sunset ride, and lanterns along the track at night.

const THEMES = {
  day: { top: '#7fc8e8', mid: '#bfe6f0', low: '#fff1dc', ground: '#9ad06a', ground2: '#8cc45e', fog: '#cfe9ee', hemi: 1, sun: 1, rail: '#ff5d7a', spine: '#ffd166' },
  sunset: { top: '#6a6fc0', mid: '#f59a8a', low: '#ffd29a', ground: '#a9c46a', ground2: '#c8b866', fog: '#f6b894', hemi: 0.85, sun: 0.85, rail: '#ff5d7a', spine: '#fff4e3' },
  night: { top: '#0d1238', mid: '#2a3078', low: '#5a4a96', ground: '#3a6070', ground2: '#34586a', fog: '#1e2350', hemi: 0.42, sun: 0.35, rail: '#c7a6ff', spine: '#8fd3ff' },
};

export function buildWorld(ctx, track, time) {
  const { scene } = ctx;
  const T = THEMES[time];
  const k = kit();
  const g = new THREE.Group();
  scene.add(g);
  const R = rng(time === 'day' ? 5 : time === 'sunset' ? 9 : 13);
  // where the track is, for keeping trees off it
  const plan = [];
  for (let d = 0; d < track.length; d += 2) {
    const a = track.at(d);
    plan.push([a.p.x, a.p.z]);
  }
  const nearTrack = (x, z, r) => plan.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < r * r);
  let cx = 0;
  let cz = 0;
  for (const [x, z] of plan) {
    cx += x;
    cz += z;
  }
  cx /= plan.length;
  cz /= plan.length;
  const centre = new THREE.Vector3(cx, 0, cz);

  // Sky dome with a soft gradient
  const skyTex = canvasTexture(16, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, T.top);
    gr.addColorStop(0.55, T.mid);
    gr.addColorStop(0.8, T.low);
    gr.addColorStop(1, T.low);
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.position.copy(centre);
  sky.renderOrder = -1;
  g.add(sky);
  if (time === 'sunset') {
    const sun = new THREE.Mesh(new THREE.CircleGeometry(26, 32), new THREE.MeshBasicMaterial({ color: '#ffcf7a', fog: false, transparent: true, opacity: 0.95 }));
    sun.position.set(cx - 40, 26, cz - 260);
    g.add(sun);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb36b', transparent: true, opacity: 0.6, fog: false, depthWrite: false }));
    halo.scale.setScalar(150);
    halo.position.copy(sun.position).add(new THREE.Vector3(0, 0, 2));
    g.add(halo);
  }
  if (time === 'night') {
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2;
      const e = 0.12 + R() * 1.2;
      pos.set([cx + Math.cos(a) * Math.cos(e) * 280, Math.sin(e) * 280, cz + Math.sin(a) * Math.cos(e) * 280], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff6d8', size: 1.6, sizeAttenuation: true, fog: false, map: glowTexture(), transparent: true, depthWrite: false })));
    const moon = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshBasicMaterial({ color: '#fff4d6', fog: false }));
    moon.position.set(cx + 70, 120, cz - 230);
    moon.lookAt(centre);
    g.add(moon);
    const mh = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#c7d2ff', transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
    mh.scale.setScalar(70);
    mh.position.copy(moon.position);
    g.add(mh);
  }

  // Ground, fields of flowers, a lake and soft hills far off
  const ground = mesh(new THREE.CircleGeometry(320, 48), mat(T.ground, { rough: 0.95 }), { cast: false });
  ground.rotation.x = -Math.PI / 2;
  ground.position.copy(centre);
  g.add(ground);
  for (let i = 0; i < 10; i++) {
    const x = cx + (R() - 0.5) * 150;
    const z = cz + (R() - 0.5) * 150;
    const patch = mesh(new THREE.CircleGeometry(6 + R() * 10, 20), mat(i % 3 ? T.ground2 : time === 'night' ? '#35586a' : '#ffd1dc', { rough: 1 }), { cast: false });
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.02 + i * 0.002, z);
    g.add(patch);
  }
  const lake = mesh(new THREE.CircleGeometry(16, 32), mat(time === 'night' ? '#2a3f78' : time === 'sunset' ? '#e8a08a' : '#7fd3e0', { rough: 0.15 }), { cast: false });
  lake.rotation.x = -Math.PI / 2;
  lake.scale.set(1.6, 1, 1);
  let lx = cx + 10;
  let lz = cz + 6;
  for (let tries = 0; tries < 30 && nearTrack(lx, lz, 20); tries++) {
    lx = cx + (R() - 0.5) * 100;
    lz = cz + (R() - 0.5) * 100;
  }
  lake.position.set(lx, 0.04, lz);
  g.add(lake);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + R();
    const hill = k.sph(30 + R() * 25, i % 2 ? T.ground : T.ground2, { rough: 1 }, 18);
    hill.scale.y = 0.35;
    hill.position.set(cx + Math.cos(a) * (150 + R() * 40), -4, cz + Math.sin(a) * (150 + R() * 40));
    hill.castShadow = false;
    g.add(hill);
  }

  // Trees (one instanced mesh), kept off the track
  const tree = new THREE.Group();
  tree.add(k.at(k.cyl(0.18, 0.26, 1.6, '#9b6a43', 7), 0, 0.8, 0));
  tree.add(k.at(k.sph(1.25, '#ffffff', undefined, 9), 0, 2.4, 0));
  tree.add(k.at(k.sph(0.8, '#ffffff', undefined, 8), 0.55, 2.95, 0.3));
  const tg = (() => {
    tree.updateMatrixWorld(true);
    const list = [];
    tree.traverse((o) => {
      if (!o.isMesh) return;
      const gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      gg.applyMatrix4(o.matrixWorld);
      const n = gg.attributes.position.count;
      const col = new Float32Array(n * 3);
      const c = new THREE.Color(o.material.color);
      for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
      gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      for (const nme of Object.keys(gg.attributes)) if (!['position', 'normal', 'color'].includes(nme)) gg.deleteAttribute(nme);
      list.push(gg);
    });
    return list;
  })();
  const treeGeo = mergeGeometries(tg, false);
  const spots = [];
  for (let i = 0; i < 400 && spots.length < 130; i++) {
    const x = cx + (R() - 0.5) * 170;
    const z = cz + (R() - 0.5) * 170;
    if (nearTrack(x, z, 7) || (x - lx) ** 2 / 2.56 + (z - lz) ** 2 < 19 * 19) continue;
    spots.push([x, z, 0.8 + R() * 0.7]);
  }
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), spots.length);
  trees.castShadow = true;
  trees.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const leaf = time === 'night' ? ['#3f6a5a', '#4a5f8a', '#5a4a7a'] : time === 'sunset' ? ['#8cbf5a', '#e0a868', '#ff9eb5'] : ['#6cc24a', '#5fb85a', '#ffb7c8', '#7fd06a'];
  const cc = new THREE.Color();
  spots.forEach(([x, z, s], i) => {
    trees.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, s * 7), sc.setScalar(s)));
    trees.setColorAt(i, cc.set(leaf[i % leaf.length]));
  });
  g.add(trees);

  // The track itself
  const tm = trackMesh(track, { rail: T.rail, spine: T.spine, column: time === 'night' ? '#c9d2e6' : '#ffffff', every: 4, detail: 1, glow: time === 'night' ? '#8a6cff' : null });
  g.add(tm.group);

  // Station at the start: a platform and a striped roof
  const st = new THREE.Group();
  const a0 = track.at(6);
  st.position.copy(a0.p).setY(0);
  st.rotation.y = Math.atan2(a0.f.x, a0.f.z);
  g.add(st);
  st.add(k.at(k.box(2.2, 0.7, 14, '#fff4e3'), -1.7, 0.35, 0));
  // an arch over the far end of the platform with the sign on it (no roof, so the camera can follow)
  for (const x of [-2.6, 1.3]) st.add(k.at(k.cyl(0.12, 0.12, 4.6, '#3f4a7a', 8), x, 2.3, 7.3));
  st.add(k.at(k.box(4.3, 0.24, 0.24, '#ef5b6f'), -0.65, 4.55, 7.3));
  const sign = mesh(new THREE.PlaneGeometry(3.4, 0.9), umat('#ffffff', { map: canvasTexture(512, 136, (c, w, h) => {
    c.fillStyle = '#3f4a9a';
    roundRect(c, 4, 4, w - 8, h - 8, 50);
    c.fill();
    c.strokeStyle = '#ffd166';
    c.lineWidth = 8;
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'The Comet', w / 2, h / 2 + 4, w * 0.7, 80);
  }), rough: 0.7 }), { cast: false });
  sign.position.set(-0.65, 5.2, 7.3);
  sign.rotation.y = Math.PI;
  st.add(sign);

  // Tunnels: a striped shell round the track with lights along its roof
  const glowMat = new THREE.MeshBasicMaterial({ color: time === 'night' ? '#ffd27a' : '#fff3c4' });
  const bulbPts = [];
  let inT = false;
  let t0 = 0;
  const shellTex = canvasTexture(64, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? (time === 'night' ? '#3a3f8a' : '#c7a6ff') : time === 'night' ? '#2a2f6a' : '#ffd1dc';
      c.fillRect(0, (i * h) / 8, w, h / 8 + 1);
    }
  });
  shellTex.wrapS = shellTex.wrapT = THREE.RepeatWrapping;
  const shellMat = new THREE.MeshStandardMaterial({ map: shellTex, roughness: 0.8, side: THREE.DoubleSide });
  const fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };
  const addTunnel = (d0, d1) => {
    const pts = [];
    for (let d = d0 - 2; d <= d1 + 2; d += 1) {
      track.at(d, fr);
      pts.push(fr.p.clone().addScaledVector(fr.u, 0.9));
      if (Math.round(d) % 3 === 0) bulbPts.push(fr.p.clone().addScaledVector(fr.u, 3.0));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 2.3, 14, false), shellMat);
    const uv = tube.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (d1 - d0) * 0.4, uv.getY(i));
    tube.castShadow = true;
    g.add(tube);
    // a grassy mound over the tunnel so it reads as a hill
    const mid = track.at((d0 + d1) / 2);
    const mound = k.sph((d1 - d0) / 2 + 3, T.ground2, { rough: 1 }, 16);
    mound.scale.set(1, 0.22, 1);
    mound.position.copy(mid.p).setY(0);
    g.add(mound);
  };
  for (let i = 0; i < track.N; i++) {
    const tun = !!track.tags[i].tunnel;
    if (tun && !inT) {
      inT = true;
      t0 = track.s[i];
    } else if (!tun && inT) {
      inT = false;
      addTunnel(t0, track.s[i]);
    }
  }
  // Lanterns along the track at night (and fairy lights on the station at any time)
  if (time === 'night') {
    for (let d = 10; d < track.length; d += 7) {
      track.at(d, fr);
      if (fr.loop || fr.u.y < 0.7) continue;
      bulbPts.push(fr.p.clone().addScaledVector(fr.l, 0.75).addScaledVector(fr.u, 0.25));
      bulbPts.push(fr.p.clone().addScaledVector(fr.l, -0.75).addScaledVector(fr.u, 0.25));
    }
  }
  if (bulbPts.length) {
    const bm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(time === 'night' ? 0.12 : 0.1, 0), glowMat, bulbPts.length);
    bulbPts.forEach((p, i) => bm.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
    const cols = ['#ffd27a', '#ff9eb5', '#8fd3ff', '#c7a6ff'];
    bulbPts.forEach((p, i) => bm.setColorAt(i, cc.set(cols[i % cols.length])));
    g.add(bm);
  }

  // The little Roji Land castle on the sunset ride
  if (time === 'sunset' || time === 'night') {
    const c = new THREE.Group();
    const wall = '#fff1e4';
    c.add(k.at(k.box(14, 7, 6, wall), 0, 3.5, 0));
    c.add(k.at(k.box(6, 14, 5, wall), 0, 7, -0.5));
    for (const [x, z, r, h, roof] of [[-7, 3, 1.8, 10, '#ef5b6f'], [7, 3, 1.8, 10, '#ef5b6f'], [-7, -3, 1.6, 9, '#c7a6ff'], [7, -3, 1.6, 9, '#c7a6ff'], [0, -0.5, 1.8, 17, '#ef5b6f']]) {
      c.add(k.at(k.cyl(r, r, h, wall, 14), x, h / 2, z));
      c.add(k.at(k.cone(r + 0.4, r * 2.6, roof, 14), x, h + r * 1.3, z));
    }
    c.add(k.at(k.heart(2.2, 0.3, '#ef5b6f'), 0, 10.5, 2.1));
    const winMat = umat('#ffe9b8', { emissive: '#ffc56b', ei: time === 'night' ? 1.4 : 0.5 });
    for (const x of [-4.5, -2, 2, 4.5]) c.add(k.at(mesh(new THREE.PlaneGeometry(0.9, 1.4), winMat, { cast: false }), x, 4.4, 3.02));
    // stand it a little way off the track, facing the middle of the ride
    let px = cx - 20;
    let pz = cz - 40;
    for (let tries = 0; tries < 40 && nearTrack(px, pz, 16); tries++) {
      px = cx + (R() - 0.5) * 120;
      pz = cz - 30 - R() * 40;
    }
    c.position.set(px, 0, pz);
    c.lookAt(cx, 0, cz);
    colorBake(c);
    g.add(c);
  }
  return { group: g, centre, supports: tm.supports };
}
