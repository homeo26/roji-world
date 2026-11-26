import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture, roundRect, FONT } from '../../util.js';
import { colorBake, freeze, heartPath, glowTexture } from '../../places/school/kit.js';

// The parade route through Roji Land: a pastel cobbled street with sweet shops on both sides, round
// trees, lamp posts with bunting (and paper lanterns after dark) across the road, and a cheering crowd
// behind little white fences. The float moves along +Z; the street is built from repeating segments
// that wrap round behind the camera, so it never ends. The castle and the big wheel stand far behind.

const SEG = 8;
const N = 10;
const SPAN = SEG * N;
const ROAD = 4.6; // half width of the road
const SHOP_X = 9.6;

const keep = ['position', 'normal'];
// The crowd is seen from afar: rebuild its round parts with very few segments
function lowpoly(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry.parameters) return;
    const p = o.geometry.parameters;
    const r = (n, k, min) => Math.max(min, Math.round(n * k));
    let g = null;
    switch (o.geometry.type) {
      case 'SphereGeometry':
        g = new THREE.SphereGeometry(p.radius, r(p.widthSegments, 0.4, p.radius < 0.06 ? 5 : 7), r(p.heightSegments, 0.4, p.radius < 0.06 ? 3 : 5), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
        break;
      case 'CapsuleGeometry':
        g = new THREE.CapsuleGeometry(p.radius, p.height, 1, r(p.radialSegments, 0.5, 5));
        break;
      case 'CylinderGeometry':
        g = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, r(p.radialSegments, 0.5, 5), 1, p.openEnded, p.thetaStart, p.thetaLength);
        break;
      case 'TorusGeometry':
        g = new THREE.TorusGeometry(p.radius, p.tube, 3, r(p.tubularSegments, 0.4, 6), p.arc);
        break;
      case 'LatheGeometry':
        g = new THREE.LatheGeometry(p.points.filter((_, i, a) => i % 2 === 0 || i === a.length - 1), r(p.segments, 0.4, 7), p.phiStart, p.phiLength);
        break;
      case 'CircleGeometry':
        g = new THREE.CircleGeometry(p.radius, r(p.segments, 0.4, 6), p.thetaStart, p.thetaLength);
        break;
    }
    if (g) o.geometry = g;
  });
}
function toGeo(group) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const rel = new THREE.Matrix4();
  const list = [];
  group.traverse((o) => {
    if (!o.isMesh || !o.visible || o.isInstancedMesh) return;
    for (let p = o.parent; p && p !== group; p = p.parent) if (!p.visible) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (!keep.includes(n)) g.deleteAttribute(n);
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    const c = o.material.color || new THREE.Color('#ffffff');
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    list.push(g);
  });
  return mergeGeometries(list, false);
}

const LOOKS = [
  { id: 'c1', name: 'Visitor', gender: 'girl', skin: '#f2cdb4', hair: '#7a4a26', hairstyle: 'bob', outfit: 'dress', top: '#7fd3a7', bottom: '#7fd3a7', shoes: '#ffffff', accent: '#ffd166' },
  { id: 'c2', name: 'Visitor', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', outfit: 'tee-shorts', top: '#ffd166', bottom: '#3b2b3f', shoes: '#e5484d', accent: '#6fb8ff' },
  { id: 'c3', name: 'Visitor', gender: 'girl', skin: '#e3b08e', hair: '#b5773d', hairstyle: 'ponytail', outfit: 'skirt', top: '#6fb8ff', bottom: '#ffffff', shoes: '#3f7bf0', accent: '#ff9eb5' },
  { id: 'c4', name: 'Visitor', gender: 'boy', skin: '#9c6a4a', hair: '#2a1a13', hairstyle: 'spiky', outfit: 'hoodie', top: '#c7a6ff', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
];
const SHOP_COLORS = ['#ffd1dc', '#c9f0e1', '#d6ecff', '#fff1b8', '#ffd9c2', '#e6dcff'];
const ROOF_COLORS = ['#ef5b6f', '#3fbf9f', '#6f9cff', '#f6907a', '#9b7be0', '#f4b23f'];
const FLAG_COLORS = ['#ff6f9a', '#ffd166', '#5fb4ff', '#7fd8bf', '#c7a6ff', '#ffffff'];
const SIGNS = ['Sweets', 'Toys', 'Ice cream', 'Balloons', 'Candy', 'Cupcakes', 'Popcorn', 'Gifts'];

export class Street {
  constructor(ctx, { time = 'day' } = {}) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.time = time;
    const night = time === 'night';
    const G = this.group;
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();

    // ------------------------------------------------ the ground: road, kerbs, pavements (they follow the float)
    const cobble = canvasTexture(256, 256, (x) => {
      x.fillStyle = '#e9d6c6';
      x.fillRect(0, 0, 256, 256);
      const cols = ['#f4e3d4', '#efd9c8', '#f7e9dc', '#ead0c2', '#f1ddd4'];
      for (let r = 0; r < 8; r++) {
        for (let k = 0; k < 6; k++) {
          const off = r % 2 ? 21 : 0;
          x.fillStyle = cols[(r * 3 + k * 7) % cols.length];
          roundRect(x, k * 43 + off - 21 + 3, r * 32 + 3, 37, 26, 9);
          x.fill();
        }
      }
      // a tiny heart cobble hidden in the street
      x.fillStyle = '#f6b8c6';
      heartPath(x, 150, 112, 16);
      x.fill();
    });
    cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping;
    cobble.repeat.set(ROAD, 70);
    const ground = new THREE.Group();
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD * 2, 140), new THREE.MeshStandardMaterial({ map: cobble, roughness: 0.92 }));
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    ground.add(road);
    const pave = canvasTexture(128, 128, (x) => {
      x.fillStyle = '#f7efe4';
      x.fillRect(0, 0, 128, 128);
      x.strokeStyle = '#e8d9c6';
      x.lineWidth = 4;
      for (let i = 0; i <= 2; i++) {
        x.beginPath();
        x.moveTo(0, i * 64);
        x.lineTo(128, i * 64);
        x.moveTo(i * 64, 0);
        x.lineTo(i * 64, 128);
        x.stroke();
      }
    });
    pave.wrapS = pave.wrapT = THREE.RepeatWrapping;
    pave.repeat.set(3, 70);
    const pg = [];
    for (const s of [-1, 1]) {
      const p = new THREE.PlaneGeometry(SHOP_X - ROAD - 0.3, 140);
      p.rotateX(-Math.PI / 2);
      p.translate(s * (ROAD + 0.3 + (SHOP_X - ROAD - 0.3) / 2), 0.16, 0);
      pg.push(p);
    }
    const paves = new THREE.Mesh(mergeGeometries(pg), new THREE.MeshStandardMaterial({ map: pave, roughness: 0.9 }));
    paves.receiveShadow = true;
    ground.add(paves);
    const kerb = [];
    for (const s of [-1, 1]) {
      const b = new THREE.BoxGeometry(0.3, 0.18, 140);
      b.translate(s * (ROAD + 0.15), 0.08, 0);
      kerb.push(b);
    }
    const kerbs = new THREE.Mesh(mergeGeometries(kerb), new THREE.MeshStandardMaterial({ color: '#fff7ee', roughness: 0.8 }));
    ground.add(kerbs);
    G.add(ground);
    this.ground = ground;

    // ------------------------------------------------ shops: a textured front, a roof and a striped awning
    const front = canvasTexture(512, 256, (x) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 512, 256);
      // two windows and a door, with flower boxes
      for (const wx of [40, 340]) {
        x.fillStyle = '#bfe4f6';
        roundRect(x, wx, 92, 132, 96, 14);
        x.fill();
        x.strokeStyle = '#ffffff';
        x.lineWidth = 8;
        x.stroke();
        x.fillStyle = '#ffffff';
        x.fillRect(wx + 62, 92, 8, 96);
        x.fillStyle = '#c98a5a';
        x.fillRect(wx - 4, 190, 140, 16);
        for (let i = 0; i < 6; i++) {
          x.fillStyle = ['#ff6f9a', '#ffd166', '#ffffff'][i % 3];
          x.beginPath();
          x.arc(wx + 10 + i * 23, 188, 9, 0, Math.PI * 2);
          x.fill();
        }
      }
      x.fillStyle = '#b87a52';
      roundRect(x, 206, 96, 100, 160, 40);
      x.fill();
      x.fillStyle = '#ffd166';
      x.beginPath();
      x.arc(286, 180, 7, 0, Math.PI * 2);
      x.fill();
      // the sign band
      x.fillStyle = 'rgba(255,255,255,0.75)';
      roundRect(x, 120, 14, 272, 56, 24);
      x.fill();
    });
    const signs = canvasTexture(512, 512, (x) => {
      x.clearRect(0, 0, 512, 512);
      SIGNS.forEach((s, i) => {
        const y = i * 64;
        x.fillStyle = '#ffffff';
        roundRect(x, 8, y + 6, 496, 52, 24);
        x.fill();
        x.fillStyle = ['#ef5b6f', '#3f7bf0', '#3fbf9f', '#9b7be0', '#f6907a', '#c73b45', '#e0a020', '#6f5fd0'][i];
        x.font = `600 38px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(s, 256, y + 34);
      });
    });
    const nShops = N * 2;
    const shopGeo = new THREE.BoxGeometry(SEG - 0.04, 3.6, 3.2);
    shopGeo.translate(0, 1.8, -1.6);
    const shopMat = new THREE.MeshStandardMaterial({ map: front, roughness: 0.85 });
    if (night || time === 'sunset') {
      // lit windows after dark
      shopMat.emissiveMap = canvasTexture(512, 256, (x) => {
        x.fillStyle = '#000000';
        x.fillRect(0, 0, 512, 256);
        x.fillStyle = '#ffc86b';
        for (const wx of [40, 340]) {
          roundRect(x, wx, 92, 132, 96, 14);
          x.fill();
        }
        x.fillStyle = '#7a4a20';
        roundRect(x, 206, 96, 100, 160, 40);
        x.fill();
      });
      shopMat.emissive = new THREE.Color('#ffffff');
      shopMat.emissiveIntensity = night ? 0.85 : 0.25;
    }
    this.shops = new THREE.InstancedMesh(shopGeo, shopMat, nShops);
    // a triangular prism along local X with its ridge up, sitting on the shop
    const roofGeo = new THREE.CylinderGeometry(1.95, 1.95, SEG - 0.04, 3, 1);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.rotateX(-Math.PI / 2);
    roofGeo.scale(1, 0.55, 1);
    roofGeo.translate(0, 3.6 + 0.54, -1.6);
    this.roofs = new THREE.InstancedMesh(roofGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }), nShops);
    const stripes = canvasTexture(256, 64, (x) => {
      for (let i = 0; i < 8; i++) {
        x.fillStyle = i % 2 ? '#ffffff' : '#ffd0d8';
        x.fillRect(i * 32, 0, 33, 64);
      }
    });
    const awnGeo = new THREE.PlaneGeometry(SEG * 0.52, 1.0);
    awnGeo.rotateX(-0.75);
    awnGeo.translate(0, 2.55, 0.38);
    this.awnings = new THREE.InstancedMesh(awnGeo, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8, side: THREE.DoubleSide }), nShops);
    const signGeo = new THREE.PlaneGeometry(2.6, 0.32);
    this.signs = new THREE.InstancedMesh(signGeo, new THREE.MeshBasicMaterial({ map: signs, transparent: true }), nShops);
    // one instanced mesh for every sign: each instance picks its row of the word texture
    const rowAttr = new THREE.InstancedBufferAttribute(new Float32Array(nShops), 1);
    signGeo.setAttribute('row', rowAttr);
    this.signs.material.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float row;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vec2(uv.x, (uv.y + 7.0 - row) / 8.0);');
    };
    this.signRow = rowAttr;
    for (let i = 0; i < nShops; i++) {
      this.shops.setColorAt(i, c.set(SHOP_COLORS[(i * 5) % SHOP_COLORS.length]));
      this.roofs.setColorAt(i, c.set(ROOF_COLORS[(i * 7 + 1) % ROOF_COLORS.length]));
      this.awnings.setColorAt(i, c.set(['#ffffff', '#ffe7a8', '#d8f3ff', '#ffe0ee'][i % 4]));
      rowAttr.setX(i, (i * 3) % SIGNS.length);
    }
    G.add(this.shops, this.roofs, this.awnings, this.signs);

    // ------------------------------------------------ trees, lamp posts, bunting, lanterns, fences
    const nTrees = N * 2;
    this.trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.15, 1.6, 8).translate(0, 0.8, 0), new THREE.MeshStandardMaterial({ color: '#a8754e', roughness: 0.9 }), nTrees);
    const crownGeo = new THREE.IcosahedronGeometry(0.95, 1).translate(0, 2.25, 0);
    this.crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true }), nTrees);
    for (let i = 0; i < nTrees; i++) this.crowns.setColorAt(i, c.set(['#7ccf5a', '#ffb3cc', '#8ad46a', '#ffc6d9'][i % 4]));
    G.add(this.trunks, this.crowns);
    const nPosts = N * 2;
    const postGeo = new THREE.CylinderGeometry(0.07, 0.1, 6.0, 8).translate(0, 3.0, 0);
    this.posts = new THREE.InstancedMesh(postGeo, new THREE.MeshStandardMaterial({ color: '#4a5a8a', roughness: 0.5, metalness: 0.2 }), nPosts);
    this.globes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 12, 8).translate(0, 6.15, 0), new THREE.MeshBasicMaterial({ color: night ? '#ffe7a8' : '#fff6dc' }), nPosts);
    G.add(this.posts, this.globes);
    // a soft glow round each lamp after dark
    this.lampGlow = null;
    if (night || time === 'sunset') {
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nPosts * 3), 3));
      this.lampGlow = new THREE.Points(lg, new THREE.PointsMaterial({ color: night ? '#ffd890' : '#ffe6c0', size: night ? 2.4 : 1.4, map: glowTexture(), transparent: true, opacity: night ? 0.75 : 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      this.lampGlow.frustumCulled = false;
      G.add(this.lampGlow);
    }
    // bunting: 14 flags on a sagging cord across the street per segment
    const FL = 14;
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.36, 0], 3));
    flagGeo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    this.flags = new THREE.InstancedMesh(flagGeo, new THREE.MeshBasicMaterial({ color: night ? '#8a90c0' : time === 'sunset' ? '#ffe2d2' : '#ffffff', side: THREE.DoubleSide }), N * FL);
    for (let i = 0; i < N * FL; i++) this.flags.setColorAt(i, c.set(FLAG_COLORS[i % FLAG_COLORS.length]));
    this.cords = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), new THREE.MeshBasicMaterial({ color: '#6a5a62' }), N * 8);
    G.add(this.flags, this.cords);
    this.FL = FL;
    this.lanterns = null;
    if (night) {
      this.lanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 8).scale(1, 1.2, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N * 5);
      for (let i = 0; i < N * 5; i++) this.lanterns.setColorAt(i, c.set(['#ffb36b', '#ff8fa8', '#ffe08a', '#c7a6ff', '#8fd3ff'][i % 5]));
      G.add(this.lanterns);
    }
    // little white fences along the kerbs, with gaps
    const fence = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
      p.position.set(0, 0.31, -1.2 + i * 0.6);
      fence.add(p);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), p.material);
      cap.position.set(0, 0.67, -1.2 + i * 0.6);
      fence.add(cap);
    }
    for (const y of [0.22, 0.5]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 2.5), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
      r.position.set(0.03, y, 0);
      fence.add(r);
    }
    this.fences = new THREE.InstancedMesh(toGeo(fence), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), N * 4);
    G.add(this.fences);

    // ------------------------------------------------ the crowd: real town kids and grown-ups, cheering
    this.variants = [];
    for (const look of LOOKS) {
      const pair = [];
      for (const hands of [null, 'wave2']) {
        const kid = ctx.makeKid(look);
        freeze(kid, { hands });
        lowpoly(kid.root);
        const geo = toGeo(kid.root);
        kid.root.traverse((o) => o.geometry?.dispose?.());
        pair.push(geo);
      }
      this.variants.push(pair);
    }
    const PER = 6;
    this.people = [];
    for (let s = 0; s < N; s++) {
      for (let i = 0; i < PER; i++) {
        const side = i < PER / 2 ? -1 : 1;
        const j = i % (PER / 2);
        const v = (s * 3 + i * 5) % 4;
        this.people.push({ seg: s, side, dz: -SEG / 2 + 1.1 + j * 2.4 + ((s * 7 + i) % 3) * 0.3, x: side * (ROAD + 0.95 + ((i + s) % 2) * 0.75), v, ph: (s * 13 + i * 7) % 10 / 10, grown: (s + i * 3) % 5 === 0, balloon: (s * 5 + i) % 4 === 0, slot: 0 });
      }
    }
    const counts = [0, 0, 0, 0];
    for (const p of this.people) counts[p.v]++;
    const crowdMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    this.crowd = this.variants.map((pair, v) => pair.map((geo) => {
      const m = new THREE.InstancedMesh(geo, crowdMat, Math.max(1, counts[v]));
      m.frustumCulled = false;
      G.add(m);
      return m;
    }));
    const nb = this.people.filter((p) => p.balloon).length;
    this.balloons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 8).scale(1, 1.15, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), nb);
    this.bstrings = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 3).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: '#7a6470' }), nb);
    let bi = 0;
    for (const p of this.people) if (p.balloon) {
      p.bslot = bi;
      this.balloons.setColorAt(bi, c.set(['#ff6f9a', '#ffd166', '#5fb4ff', '#c7a6ff', '#7fd8bf'][bi % 5]));
      bi++;
    }
    this.balloons.frustumCulled = false;
    this.bstrings.frustumCulled = false;
    G.add(this.balloons, this.bstrings);

    // ------------------------------------------------ the castle, the big wheel and the hills, far behind the float
    const back = new THREE.Group();
    const M = (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 });
    const put = (geo, col, x, y, z) => {
      const o = new THREE.Mesh(geo, M(col));
      o.position.set(x, y, z);
      back.add(o);
      return o;
    };
    for (const [x, s] of [[-30, 1.2], [-8, 1.6], [16, 1.3], [38, 1.1], [-52, 1.0], [60, 1.2]]) put(new THREE.SphereGeometry(14 * s, 16, 10), night ? '#3f6a5a' : time === 'sunset' ? '#a7c48a' : '#9fd88a', x, -9 * s, -18).scale.set(1.4, 0.75, 0.6);
    // the castle
    put(new THREE.BoxGeometry(12, 7, 4), '#ffe3ec', 0, 3.5, 0);
    for (const x of [-6.5, 6.5, -2.6, 2.6]) {
      const tall = Math.abs(x) < 3 ? 11 : 9;
      put(new THREE.CylinderGeometry(1.4, 1.5, tall, 14), '#ffd1dc', x, tall / 2, 0.4);
      put(new THREE.ConeGeometry(1.75, 3.4, 14), Math.abs(x) < 3 ? '#c7a6ff' : '#ef5b6f', x, tall + 1.7, 0.4);
      put(new THREE.SphereGeometry(0.25, 8, 6), '#f4c24f', x, tall + 3.5, 0.4);
    }
    put(new THREE.CylinderGeometry(1.7, 1.8, 14, 16), '#ffe3ec', 0, 7, -0.6);
    put(new THREE.ConeGeometry(2.1, 4.6, 16), '#ef5b6f', 0, 16.3, -0.6);
    put(new THREE.BoxGeometry(3, 4, 0.3), '#c98a5a', 0, 2, 2.05);
    for (let i = 0; i < 9; i++) put(new THREE.BoxGeometry(0.8, 0.8, 4.2), '#ffd1dc', -5 + i * 1.25, 7.4, 0);
    // the big wheel
    const wheelX = 24;
    put(new THREE.CylinderGeometry(0.35, 0.5, 9, 8), '#ffffff', wheelX - 2.2, 4.5, 0).rotation.z = 0.25;
    put(new THREE.CylinderGeometry(0.35, 0.5, 9, 8), '#ffffff', wheelX + 2.2, 4.5, 0).rotation.z = -0.25;
    colorBake(back);
    const wheel = new THREE.Group();
    wheel.position.set(wheelX, 9, 0.6);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.18, 6, 40), M('#ff9eb5'));
    wheel.add(ring);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7, 4), M('#ffffff'));
      sp.rotation.z = a;
      sp.position.set(Math.sin(-a) * 3.5, Math.cos(a) * 3.5, 0);
      wheel.add(sp);
      const cab = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), M(['#ffd166', '#8fd3ff', '#c7a6ff', '#7fd8bf'][i % 4]));
      cab.position.set(Math.cos(a) * 7, Math.sin(a) * 7, 0.2);
      wheel.add(cab);
    }
    wheel.updateMatrixWorld(true);
    const wheelMesh = new THREE.Mesh(toGeo(wheel), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
    wheelMesh.position.copy(wheel.position);
    back.add(wheelMesh);
    this.wheel = wheelMesh;
    back.position.set(0, 0, -62);
    this.back = back;

    // ------------------------------------------------ the sky: clouds by day, stars and a moon at night
    this.sky = new THREE.Group();
    if (night) {
      const n = 360;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI - Math.PI;
        const e = 0.12 + Math.random() * 0.9;
        pos.set([Math.cos(a) * Math.cos(e) * 140, 8 + Math.sin(e) * 90, Math.sin(a) * Math.cos(e) * 140 - 20], i * 3);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff8e0', size: 1.1, sizeAttenuation: true, fog: false }));
      this.sky.add(stars);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff4cf', fog: false }));
      moon.position.set(-38, 44, -110);
      this.sky.add(moon);
    } else {
      const cg = [];
      const R = (i) => ((Math.sin(i * 91.7) + 1) / 2);
      for (let i = 0; i < 9; i++) {
        const cx = -70 + i * 17 + R(i) * 6;
        const cy = 24 + R(i + 3) * 14;
        const cz = -90 - R(i + 7) * 30;
        for (let j = 0; j < 4; j++) {
          const g = new THREE.SphereGeometry(4 + R(i * 4 + j) * 2.5, 10, 7);
          g.scale(1.3, 0.7, 0.8);
          g.translate(cx + (j - 1.5) * 4.2, cy + (j % 2) * 1.6, cz);
          cg.push(g);
        }
      }
      const clouds = new THREE.Mesh(mergeGeometries(cg), new THREE.MeshBasicMaterial({ color: time === 'sunset' ? '#ffd9c8' : '#ffffff', fog: false }));
      this.sky.add(clouds);
    }
    G.add(this.sky);

    this.segZ = Array.from({ length: N }, (_, i) => 8 - i * SEG);
    this.bHidden = Array.from({ length: N }, () => true);
    this.m4 = m4;
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.sc = new THREE.Vector3();
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let s = 0; s < N; s++) this.placeSegment(s);
    this.excite = 0.3;
    this.cheerT = 0;
  }

  // Lay out one segment's shops, trees, posts, bunting and fences at its z
  placeSegment(s) {
    const z = this.segZ[s];
    const { m4, q, v, sc } = this;
    const Y = new THREE.Vector3(0, 1, 0);
    sc.set(1, 1, 1);
    for (const [k, side] of [[0, -1], [1, 1]]) {
      const i = s * 2 + k;
      // the shop boxes are built with their front on local +Z: turn them to face the street
      q.setFromAxisAngle(Y, side < 0 ? Math.PI / 2 : -Math.PI / 2);
      m4.compose(v.set(side * SHOP_X, 0.16, z), q, sc);
      this.shops.setMatrixAt(i, m4);
      this.roofs.setMatrixAt(i, m4);
      this.awnings.setMatrixAt(i, m4);
      this.signs.setMatrixAt(i, m4.compose(v.set(side * (SHOP_X - 0.03), 3.17, z), q, sc));
      q.identity();
      // a tree on the pavement and a lamp post at the kerb
      this.trunks.setMatrixAt(i, m4.compose(v.set(side * (SHOP_X - 1.3), 0.16, z + SEG / 2), q, sc));
      this.crowns.setMatrixAt(i, m4);
      this.posts.setMatrixAt(i, m4.compose(v.set(side * (ROAD + 0.55), 0.16, z + 2.6), q, sc));
      this.globes.setMatrixAt(i, m4);
      if (this.lampGlow) {
        this.lampGlow.geometry.attributes.position.setXYZ(i, side * (ROAD + 0.55), 6.3, z + 2.6);
        this.lampGlow.geometry.attributes.position.needsUpdate = true;
      }
      for (const f of [0, 1]) this.fences.setMatrixAt(s * 4 + k * 2 + f, m4.compose(v.set(side * (ROAD + 0.42), 0.16, z - 2.6 + f * 2.8), q, sc));
    }
    this.placeBunting(s);
    for (const o of [this.shops, this.roofs, this.awnings, this.signs, this.trunks, this.crowns, this.posts, this.globes, this.fences]) o.instanceMatrix.needsUpdate = true;
  }

  // Bunting across the street between the two posts (hidden while it passes over the camera)
  placeBunting(s) {
    const z = this.segZ[s];
    const { m4, q, v, sc } = this;
    const Y = new THREE.Vector3(0, 1, 0);
    const hide = this.bHidden?.[s];
    const a = new THREE.Vector3(-(ROAD + 0.55), 5.85, z + 2.6);
    const b = new THREE.Vector3(ROAD + 0.55, 5.85, z + 2.6);
    const at = (u) => v.copy(a).lerp(b, u).setY(5.85 - Math.sin(u * Math.PI) * 0.7);
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      p0.copy(at(i / 8));
      p1.copy(at((i + 1) / 8));
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      q.setFromUnitVectors(Y, p1.clone().sub(p0).normalize());
      this.cords.setMatrixAt(s * 8 + i, hide ? this.zero : m4.compose(mid, q, sc.set(1, p0.distanceTo(p1), 1)));
    }
    sc.set(1, 1, 1);
    q.identity();
    for (let i = 0; i < this.FL; i++) {
      at((i + 0.5) / this.FL);
      this.flags.setMatrixAt(s * this.FL + i, hide ? this.zero : m4.compose(v, q, sc));
    }
    if (this.lanterns) for (let i = 0; i < 5; i++) {
      at((i + 1) / 6);
      v.y -= 0.32;
      this.lanterns.setMatrixAt(s * 5 + i, hide ? this.zero : m4.compose(v, q, sc));
    }
    for (const o of [this.cords, this.flags, this.lanterns]) if (o) o.instanceMatrix.needsUpdate = true;
  }

  // rigZ: where the float is; beat: song beats; excite 0..1 from the combo; cheer: a burst of joy
  update(dt, t, rigZ, beat, excite, camZ = rigZ + 10) {
    // wrap segments that fell far behind the float round to just behind the camera
    for (let s = 0; s < N; s++) {
      if (this.segZ[s] < rigZ - (SPAN - 12)) {
        this.segZ[s] += SPAN;
        this.bHidden[s] = true;
        this.placeSegment(s);
      }
      const hide = this.segZ[s] + 2.6 > camZ - 1.5;
      if (hide !== this.bHidden[s]) {
        this.bHidden[s] = hide;
        this.placeBunting(s);
      }
    }
    this.ground.position.z = Math.round(rigZ / 2) * 2;
    this.back.position.z = rigZ - 62;
    this.sky.position.z = rigZ;
    this.wheel.rotation.z = t * 0.06;
    this.excite = excite;
    this.cheerT = Math.max(0, this.cheerT - dt);
    const cheer = this.cheerT > 0 ? 1 : 0;
    const { m4, q, v, sc } = this;
    const Y = new THREE.Vector3(0, 1, 0);
    const ph = beat;
    const used = this.crowd.map(() => [0, 0]);
    for (const p of this.people) {
      const z = this.segZ[p.seg] + p.dz;
      // far down the street the crowd is lost in the haze: do not draw them
      if (z < rigZ - 44 || z > rigZ + 9) {
        if (p.balloon) this.balloons.setMatrixAt(p.bslot, this.zero), this.bstrings.setMatrixAt(p.bslot, this.zero);
        continue;
      }
      // everyone looks at the float as it goes by
      const toward = Math.atan2(-p.x, rigZ - 2.5 - z);
      const yaw = toward * 0.7 + (p.side < 0 ? Math.PI / 2 : -Math.PI / 2) * 0.3;
      const beatK = Math.pow(Math.abs(Math.sin((ph + p.ph) * Math.PI)), 2);
      const jump = (0.03 + 0.1 * excite + 0.18 * cheer) * beatK;
      const up = cheer || (excite > 0.35 && Math.floor(ph + p.ph * 2) % 2 === 0) || (excite > 0.75);
      const s = p.grown ? 1.2 : 1;
      q.setFromAxisAngle(Y, yaw);
      m4.compose(v.set(p.x, 0.16 + jump, z), q, sc.set(s, s, s));
      const w = up ? 1 : 0;
      this.crowd[p.v][w].setMatrixAt(used[p.v][w]++, m4);
      if (p.balloon) {
        // the balloon floats over the head on a string
        const bx = p.x + Math.sin(t * 1.4 + p.ph * 6) * 0.08;
        const by = 0.16 + jump + (up ? 1.75 : 1.25) * s;
        const bz = z + 0.05;
        this.bstrings.setMatrixAt(p.bslot, m4.compose(v.set(bx, by, bz), q.identity(), sc.set(1, 0.95, 1)));
        this.balloons.setMatrixAt(p.bslot, m4.compose(v.set(bx, by + 1.05, bz), q, sc.set(1, 1, 1)));
      }
    }
    this.crowd.forEach((pair, v) => pair.forEach((m, w) => {
      m.count = used[v][w];
      m.instanceMatrix.needsUpdate = true;
    }));
    this.balloons.instanceMatrix.needsUpdate = true;
    this.bstrings.instanceMatrix.needsUpdate = true;
  }

  cheer(sec = 1.6) {
    this.cheerT = sec;
  }
}
