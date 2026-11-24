import * as THREE from 'three';
import { kit, colorBake, fitText, roundRect, glowTexture } from '../../places/school/kit.js';
import { canvasTexture, mat, umat, mesh } from '../../util.js';

// The games alley as a 3D set: four booths side by side (Ring Toss, Hook a Duck, Balloon Darts and
// Whack-a-Mole) with striped awnings and name boards, a prize shelf on the right that fills up with
// what Roji and Homama win, bunting, lamps and the park behind.

export const BOOTHS = [
  { id: 'ring', name: 'Ring Toss', color: '#ef5b6f', x: -6.3 },
  { id: 'ducks', name: 'Hook a Duck', color: '#6fb8ff', x: -2.1 },
  { id: 'darts', name: 'Balloon Darts', color: '#ffc23d', x: 2.1 },
  { id: 'moles', name: 'Whack-a-Mole', color: '#3fbf9f', x: 6.3 },
];
export const BW = 4.0;
export const COUNTER_Z = 1.1;

function stripeTex(a, b, n, scallop) {
  return canvasTexture(256, 64, (c, w, h) => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? b : a;
      c.fillRect((i * w) / n, 0, w / n + 1, h);
    }
    if (scallop) {
      c.globalCompositeOperation = 'destination-out';
      const r = w / n / 2;
      for (let i = 0; i < n; i++) {
        c.beginPath();
        c.arc((i + 0.5) * (w / n), h + r * 0.4, r, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
}

export function buildAlley(scene) {
  const k = kit();
  const g = new THREE.Group();
  scene.add(g);
  // ground: cobbles in front, grass behind
  const cob = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#e6c8aa';
    c.fillRect(0, 0, w, h);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) {
      c.fillStyle = ['#f6e2cb', '#f3dcc0', '#f8e8d6', '#efd5b8'][(i * 3 + j * 5) % 4];
      roundRect(c, i * 42.6 + (j % 2) * 21 + 3, j * 42.6 + 3, 36, 36, 10);
      c.fill();
    }
  });
  cob.wrapS = cob.wrapT = THREE.RepeatWrapping;
  cob.repeat.set(12, 6);
  const floor = mesh(new THREE.PlaneGeometry(40, 20), umat('#ffffff', { map: cob, rough: 0.9 }), { cast: false });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 6);
  g.add(floor);
  const grass = mesh(new THREE.PlaneGeometry(200, 120), mat('#9ad06a', { rough: 0.95 }), { cast: false });
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, -0.01, -40);
  g.add(grass);

  // The booths
  const parts = {};
  for (const b of BOOTHS) {
    const bg = new THREE.Group();
    bg.position.x = b.x;
    g.add(bg);
    parts[b.id] = bg;
    bg.add(k.at(k.box(BW, 0.18, 3.6, '#d9c6ae'), 0, 0.09, -0.6));
    bg.add(k.at(k.box(BW, 4.0, 0.2, '#fff4e3', { emissive: '#fff4e3', ei: 0.22 }), 0, 2.0, -2.4));
    for (const s of [-1, 1]) {
      bg.add(k.at(k.box(0.18, 3.8, 3.5, b.color, { emissive: b.color, ei: 0.12 }), s * (BW / 2 - 0.09), 1.9, -0.65));
      bg.add(k.at(k.cyl(0.1, 0.1, 4.0, '#fff4e3', 10), s * (BW / 2 - 0.09), 2.0, COUNTER_Z + 0.05));
    }
    bg.add(k.at(k.rbox(BW - 0.4, 1.0, 0.55, '#fff7ea', 0.05), 0, 0.5, COUNTER_Z));
    bg.add(k.at(k.box(BW - 0.3, 0.09, 0.66, b.color), 0, 1.04, COUNTER_Z));
    for (let i = 0; i < 6; i++) bg.add(k.at(k.box(0.36, 0.7, 0.02, i % 2 ? b.color : '#fff4e3'), -1.5 + i * 0.6, 0.5, COUNTER_Z + 0.28));
    // awning and valance
    const aw = mesh(new THREE.PlaneGeometry(BW + 0.3, 1.5), umat('#ffffff', { map: stripeTex(b.color, '#fff4e3', 10, false), rough: 0.7, side: THREE.DoubleSide }));
    aw.position.set(0, 4.15, COUNTER_Z + 0.2);
    aw.rotation.x = -1.05;
    bg.add(aw);
    const vm = umat('#ffffff', { map: stripeTex(b.color, '#fff4e3', 10, true), rough: 0.7, side: THREE.DoubleSide });
    vm.alphaTest = 0.5;
    const val = mesh(new THREE.PlaneGeometry(BW + 0.3, 0.4), vm, { cast: false });
    val.position.set(0, 3.55, COUNTER_Z + 0.85);
    bg.add(val);
    // name board on top
    const sign = mesh(new THREE.PlaneGeometry(3.0, 0.72), umat('#ffffff', { map: canvasTexture(480, 116, (c, w, h) => {
      c.fillStyle = b.color;
      roundRect(c, 4, 4, w - 8, h - 8, 44);
      c.fill();
      c.lineWidth = 7;
      c.strokeStyle = '#ffffff';
      c.stroke();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, b.name, w / 2, h / 2 + 3, w * 0.84, 64);
    }), rough: 0.7 }), { cast: false });
    sign.position.set(0, 4.95, -2.2);
    bg.add(sign);
    bg.add(k.at(k.rbox(3.15, 0.85, 0.1, '#fff4e3', 0.04), 0, 4.95, -2.28));
    // prizes hanging along the top of each booth: what you can win
    ['mimi', 'teddy', 'bobo', 'duckie', 'balloon'].forEach((id, i) => {
      const pm = prizeModel(id);
      pm.scale.setScalar(id === 'teddy' ? 0.38 : id === 'balloon' ? 0.5 : 0.8);
      pm.position.set(-1.45 + i * 0.72, id === 'balloon' ? 3.0 : 3.25, -2.18);
      bg.add(pm);
      bg.add(k.at(k.cyl(0.006, 0.006, 0.5, '#7a6470', 4), -1.45 + i * 0.72, 3.75, -2.18));
    });
  }
  // Roof across the top and bunting
  g.add(k.at(k.box(BW * 4 + 0.6, 0.25, 3.8, '#fff4e3'), 0, 4.55, -0.6));
  const flags = [];
  for (let i = 0; i < 36; i++) flags.push(['#ef5b6f', '#ffd166', '#6fb8ff', '#7fd8bf', '#c7a6ff'][i % 5]);
  const fGeo = new THREE.ConeGeometry(0.11, 0.26, 3);
  fGeo.rotateX(Math.PI);
  const bunting = new THREE.InstancedMesh(fGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), flags.length);
  const m4 = new THREE.Matrix4();
  const c = new THREE.Color();
  flags.forEach((col, i) => {
    const x = -8.6 + i * 0.49;
    const sag = Math.sin(((i % 9) / 8) * Math.PI) * 0.35;
    bunting.setMatrixAt(i, m4.makeTranslation(x, 4.22 - sag * 0.5, COUNTER_Z + 0.95));
    bunting.setColorAt(i, c.set(col));
  });
  g.add(bunting);

  // The prize shelf on the right
  const shelf = new THREE.Group();
  shelf.position.set(10.6, 0, -0.2);
  shelf.rotation.y = -0.35;
  g.add(shelf);
  shelf.add(k.at(k.box(2.6, 3.4, 0.5, '#d4a373'), 0, 1.7, -0.3));
  for (const y of [0.7, 1.55, 2.4, 3.25]) shelf.add(k.at(k.box(2.7, 0.08, 0.75, '#9b6a43'), 0, y, -0.05));
  shelf.add(k.at(k.rbox(2.6, 0.6, 0.1, '#ef5b6f', 0.04), 0, 3.85, -0.1));
  const ss = mesh(new THREE.PlaneGeometry(2.4, 0.5), umat('#ffffff', { map: canvasTexture(400, 84, (cc, w, h) => {
    cc.fillStyle = '#ef5b6f';
    cc.fillRect(0, 0, w, h);
    cc.fillStyle = '#ffffff';
    cc.textAlign = 'center';
    cc.textBaseline = 'middle';
    fitText(cc, 'Our prizes', w / 2, h / 2 + 2, w * 0.8, 50);
  }), rough: 0.7 }), { cast: false });
  ss.position.set(0, 3.85, -0.04);
  shelf.add(ss);
  // Lamps and trees round the edges, and the castle far behind
  for (const x of [-10.2, 13.2]) {
    g.add(k.at(k.cyl(0.07, 0.09, 3.4, '#3f4a7a', 8), x, 1.7, 2.4));
    const glob = mesh(new THREE.SphereGeometry(0.24, 14, 10), umat('#fff6dc', { emissive: '#ffd27a', ei: 0.9 }), { cast: false });
    glob.position.set(x, 3.55, 2.4);
    g.add(glob);
  }
  for (const [x, z, s] of [[-13, -4, 1.3], [-11.5, -9, 1.6], [14, -6, 1.4], [9, -12, 1.8], [-4, -14, 2], [4, -16, 2.2]]) {
    g.add(k.at(k.cyl(0.18 * s, 0.25 * s, 1.6 * s, '#9b6a43', 8), x, 0.8 * s, z));
    g.add(k.at(k.sph(1.1 * s, '#6cc24a', undefined, 12), x, 2.1 * s, z));
    g.add(k.at(k.sph(0.7 * s, '#ffb7c8', undefined, 10), x + 0.5 * s, 2.6 * s, z + 0.2));
  }
  const castle = new THREE.Group();
  castle.position.set(-2, 0, -40);
  for (const [x, h, r, roof] of [[-6, 9, 1.6, '#ef5b6f'], [6, 9, 1.6, '#ef5b6f'], [0, 15, 1.9, '#c7a6ff'], [-2.8, 12, 1.3, '#c7a6ff'], [2.8, 12, 1.3, '#c7a6ff']]) {
    castle.add(k.at(k.cyl(r, r, h, '#fff1e4', 12), x, h / 2, 0));
    castle.add(k.at(k.cone(r + 0.4, r * 2.4, roof, 12), x, h + r * 1.2, 0));
  }
  castle.add(k.at(k.box(12, 6, 3, '#fff1e4'), 0, 3, 0.5));
  g.add(castle);
  colorBake(g, [bunting, ...Object.values(parts)]);
  for (const p of Object.values(parts)) colorBake(p);
  return { group: g, booths: parts, shelf };
}

// ------------------------------------------------ prizes
export const PRIZES = {
  sticker: { name: 'a star sticker', tier: 0 },
  keyring: { name: 'a heart keyring', tier: 0 },
  duckie: { name: 'a little rubber duck', tier: 0 },
  mimi: { name: 'a Mimi plush', tier: 1 },
  bobo: { name: 'a Bobo plush', tier: 1 },
  balloon: { name: 'a heart balloon', tier: 1 },
  teddy: { name: 'the giant teddy', tier: 2 },
};

export function prizeModel(id) {
  const k = kit();
  const g = new THREE.Group();
  const plush = (color, s, bunny, bear) => {
    g.add(k.at(k.sph(0.16 * s, color, undefined, 12), 0, 0.16 * s, 0));
    g.add(k.at(k.sph(0.13 * s, color, undefined, 12), 0, 0.42 * s, 0));
    g.add(k.at(k.sph(0.06 * s, '#fff4e3', undefined, 8), 0, 0.39 * s, 0.11 * s));
    g.add(k.at(k.sph(0.09 * s, '#fff4e3', undefined, 8), 0, 0.15 * s, 0.1 * s));
    for (const x of [-1, 1]) {
      if (bunny) {
        const ear = k.sph(0.045 * s, color, undefined, 8);
        ear.scale.set(1, 3, 0.7);
        ear.position.set(x * 0.06 * s, 0.62 * s, 0);
        g.add(ear);
      } else g.add(k.at(k.sph(0.05 * s, color, undefined, 8), x * 0.1 * s, 0.54 * s, 0));
      g.add(k.at(k.sph(0.016 * s, '#3b2b3f', undefined, 6), x * 0.045 * s, 0.45 * s, 0.12 * s));
      g.add(k.at(k.sph(0.05 * s, color, undefined, 8), x * 0.17 * s, 0.22 * s, 0.03 * s));
    }
    if (bear) g.add(k.at(k.sph(0.035 * s, '#ef5b6f', undefined, 6), 0, 0.31 * s, 0.13 * s));
  };
  if (id === 'teddy') {
    plush('#c98f68', 2.2);
    g.add(k.at(k.heart(0.28, 0.06, '#ef5b6f'), 0, 0.35, 0.3));
  } else if (id === 'mimi') plush('#ffb3cc', 1.1, true);
  else if (id === 'bobo') plush('#7fb8f0', 1.1, false, true);
  else if (id === 'duckie') {
    const b = k.sph(0.12, '#ffd166', undefined, 10);
    b.scale.set(1, 0.8, 1.25);
    b.position.y = 0.1;
    g.add(b);
    g.add(k.at(k.sph(0.08, '#ffd166', undefined, 10), 0, 0.22, 0.08));
    g.add(k.at(k.rot(k.cone(0.035, 0.08, '#ff9a3c', 6), Math.PI / 2, 0, 0), 0, 0.21, 0.17));
  } else if (id === 'sticker') {
    g.add(k.at(k.star(0.14, 0.06, 0.03, '#ffd166', { emissive: '#ffb347', ei: 0.3 }), 0, 0.15, 0));
  } else if (id === 'keyring') {
    g.add(k.at(k.heart(0.2, 0.05, '#ef5b6f'), 0, 0.15, 0));
    g.add(k.at(k.tor(0.04, 0.008, '#d3dbe5', Math.PI * 2, undefined, 10, 4), 0, 0.28, 0));
  } else if (id === 'balloon') {
    g.add(k.at(k.heart(0.4, 0.14, '#ff3d6e', { rough: 0.25 }), 0, 0.75, 0));
    g.add(k.at(k.cyl(0.006, 0.006, 0.55, '#7a6470', 4), 0, 0.28, 0));
  }
  return g;
}
