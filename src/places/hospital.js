import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kit, C, emblem, colorBake } from './hospital/models.js';
import { buildInterior } from './hospital/interior.js';

// Sunny Hill Hospital, where Dr. Roji works: a pastel two-storey hospital with an entrance canopy,
// an ambulance, a heart-shaped flower bed and benches. Inside: Roji's office, reception and the patient rooms.

const MEDIC = 'M12 20s-7-4.4-7-9.8A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.6c0 5.4-7 9.8-7 9.8z M12 10.6v5 M9.5 13.1h5';

function insideShape(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export default {
  id: 'hospital',
  stop: {
    title: 'Sunny Hill Hospital',
    tag: 'Where Dr. Roji works',
    icon: 'medic',
    color: '#3fbf9f',
    text: 'Roji is a doctor here. Visit her patients, peek into her office and work a shift with Dr. Roji: exams, surgeries and lots of smiles.',
  },
  icons: { medic: MEDIC },

  build(ctx) {
    const { util, FONT, size } = ctx;
    const { canvasTexture, roundRect, heartShape, rng } = util;
    const k = kit();
    const { box, rbox, cyl, sph, at } = k;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const add = (...o) => (g.add(...o), o[0]);
    const flowers = []; // [x, y, z, colorIndex, scale]
    const PETALS = [C.rose, C.pink, '#ffffff', C.sun, C.lilac, '#ff7fa3', '#ffb36b'];
    const R = rng(7);

    // ---------------------------------------------------------------- building
    const WALL = '#fff4e8';
    const wing = (cx, w, h) => {
      add(at(box(w, h, 6.8, WALL), cx, h / 2, -4.0));
      add(at(box(w + 0.06, 0.55, 6.86, C.mint), cx, 0.275, -4.0));
      add(at(box(w + 0.06, 0.14, 6.86, C.pink), cx, 2.25, -4.0));
      add(at(rbox(w + 0.4, 0.32, 7.2, C.coral, 0.1), cx, h + 0.12, -4.0));
      for (let x = cx - w / 2 + 0.25; x < cx + w / 2; x += 0.5) add(at(sph(0.13, C.white, undefined, 8), x, h - 0.06, -0.38));
    };
    wing(-4.8, 4.8, 4.2);
    wing(4.8, 4.8, 4.2);
    // Centre block, a little taller and a step forward
    add(at(box(4.8, 5.4, 7.8, '#fffaf2'), 0, 2.7, -3.5));
    add(at(box(4.86, 0.55, 7.86, C.mintDeep), 0, 0.275, -3.5));
    add(at(rbox(5.2, 0.32, 8.2, C.coral, 0.1), 0, 5.52, -3.5));
    for (let x = -2.35; x < 2.4; x += 0.5) add(at(sph(0.13, C.white, undefined, 8), x, 5.34, 0.62));
    // Rounded top with the emblem
    const arch = cyl(1.55, 1.55, 0.5, '#fffaf2', 28);
    arch.rotation.x = Math.PI / 2;
    add(at(arch, 0, 5.55, -0.1));
    add(at(k.tor(1.55, 0.09, C.coral, Math.PI, undefined, 24), 0, 5.55, 0.16));
    add(at(emblem(k, 1.25), 0, 6.15, 0.2));
    colliders.push({ type: 'box', x: 0, z: -4.0, hw: 7.2, hd: 3.4 });
    colliders.push({ type: 'box', x: 0, z: -0.04, hw: 2.4, hd: 0.58 });

    // Windows
    const glass = util.mat('#cfeeff', { rough: 0.15, emissive: '#bfe6ff', ei: 0.25 });
    const windowAt = (x, y, z, w = 0.95, h = 0.95, awning = null, planter = false) => {
      add(at(rbox(w + 0.16, h + 0.16, 0.12, C.white, 0.05), x, y, z));
      add(at(box(w - 0.06, h - 0.06, 0.06, glass), x, y, z + 0.04));
      add(at(box(0.05, h - 0.06, 0.04, C.white), x, y, z + 0.08));
      add(at(box(w - 0.06, 0.05, 0.04, C.white), x, y, z + 0.08));
      if (awning) {
        const a = cyl(0.32, 0.32, w + 0.26, awning, 14);
        a.rotation.z = Math.PI / 2;
        a.scale.set(1, 1, 0.75);
        add(at(a, x, y + h / 2 + 0.1, z + 0.12));
      }
      if (planter) {
        add(at(rbox(w + 0.2, 0.22, 0.28, C.woodDark, 0.04), x, y - h / 2 - 0.16, z + 0.16));
        for (let i = 0; i < 5; i++) flowers.push([x - w / 2 + 0.06 + i * (w - 0.12) / 4, y - h / 2 - 0.02, z + 0.18, i % 3, 0.85]);
      }
    };
    for (const cx of [-4.8, 4.8]) {
      for (const dx of [-1.5, 0, 1.5]) {
        windowAt(cx + dx, 1.35, -0.6, 0.95, 0.95, null, true);
        windowAt(cx + dx, 3.25, -0.6, 0.95, 0.85, dx === 0 ? C.mint : C.pink);
      }
    }
    for (const x of [-1.4, 0, 1.4]) {
      const r = cyl(0.36, 0.36, 0.1, C.white, 20);
      r.rotation.x = Math.PI / 2;
      add(at(r, x, 4.62, 0.42));
      const pane = cyl(0.28, 0.28, 0.1, glass, 20);
      pane.rotation.x = Math.PI / 2;
      add(at(pane, x, 4.62, 0.45));
    }

    // Big sign on the front
    const signTex = canvasTexture(1024, 260, (c, w, h) => {
      c.fillStyle = '#ffffff';
      roundRect(c, 8, 8, w - 16, h - 16, 110);
      c.fill();
      c.lineWidth = 14;
      c.strokeStyle = C.mintDeep;
      c.stroke();
      // A little sun on the left
      c.fillStyle = C.sun;
      c.beginPath();
      c.arc(130, h / 2, 50, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = C.sun;
      c.lineWidth = 12;
      c.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        c.beginPath();
        c.moveTo(130 + Math.cos(a) * 66, h / 2 + Math.sin(a) * 66);
        c.lineTo(130 + Math.cos(a) * 86, h / 2 + Math.sin(a) * 86);
        c.stroke();
      }
      c.fillStyle = '#e09a2a';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(130 + s * 16, h / 2 - 8, 6, 0, Math.PI * 2);
        c.fill();
      }
      c.lineWidth = 6;
      c.strokeStyle = '#e09a2a';
      c.beginPath();
      c.arc(130, h / 2 + 6, 16, 0.25, Math.PI - 0.25);
      c.stroke();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = C.mintDeep;
      c.font = `700 ${h * 0.4}px ${FONT}`;
      c.fillText('Sunny Hill', w * 0.56, h * 0.38);
      c.fillStyle = C.ink;
      c.font = `600 ${h * 0.26}px ${FONT}`;
      c.fillText('HOSPITAL', w * 0.56, h * 0.74);
    });
    add(at(rbox(4.5, 1.2, 0.12, C.mintDeep, 0.1), 0, 3.5, 0.44));
    const sign = util.mesh(new THREE.PlaneGeometry(4.35, 1.1), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 0.15 }), { cast: false });
    add(at(sign, 0, 3.5, 0.51));

    // Entrance: sliding glass doors under a canopy
    add(at(rbox(2.5, 2.5, 0.14, C.white, 0.06), 0, 1.25, 0.42));
    const doorGlass = util.mat('#bfe6ff', { rough: 0.1, emissive: '#d8f1ff', ei: 0.35 });
    for (const s of [-1, 1]) {
      add(at(box(1.0, 2.15, 0.05, doorGlass), s * 0.53, 1.12, 0.5));
      add(at(box(0.05, 0.6, 0.06, C.steel), s * 0.12, 1.1, 0.55));
      const h = k.heart(0.22, 0.03, C.rose);
      add(at(h, s * 0.53, 1.45, 0.54));
    }
    add(at(rbox(4.4, 0.24, 2.7, C.mint, 0.1), 0, 2.78, 1.6));
    add(at(rbox(4.5, 0.12, 2.8, C.white, 0.05), 0, 2.62, 1.6));
    for (let x = -2.05; x < 2.1; x += 0.41) add(at(sph(0.12, C.pink, undefined, 8), x, 2.6, 2.95));
    for (const s of [-1, 1]) {
      add(at(cyl(0.1, 0.12, 2.6, C.white, 12), s * 1.9, 1.3, 2.75));
      add(at(cyl(0.17, 0.17, 0.12, C.mint, 12), s * 1.9, 0.06, 2.75));
      colliders.push({ type: 'circle', x: s * 1.9, z: 2.75, r: 0.15 });
    }
    add(at(emblem(k, 0.5), 0, 3.1, 2.92));
    add(at(rbox(4.6, 0.12, 2.5, '#f3e6d3', 0.04), 0, 0.06, 1.65));
    colliders.push({ type: 'box', x: 0, z: 1.65, hw: 2.3, hd: 1.25, h: 0.12 });
    const mat_ = rbox(1.8, 0.03, 0.9, C.mintDeep, 0.02);
    add(at(mat_, 0, 0.135, 1.1));
    for (const s of [-1, 1]) {
      const pot = new THREE.Group();
      pot.add(at(cyl(0.3, 0.24, 0.5, C.terracotta, 16), 0, 0.25, 0));
      pot.add(at(sph(0.38, C.leaf, undefined, 14), 0, 0.75, 0));
      pot.add(at(sph(0.26, C.leafDark, undefined, 12), 0.15, 1.02, 0.05));
      add(at(pot, s * 2.95, 0, 1.0));
      colliders.push({ type: 'circle', x: s * 2.95, z: 1.0, r: 0.32, h: 0.5 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        flowers.push([s * 2.95 + Math.cos(a) * 0.3, 0.88 + (i % 2) * 0.1, 1.0 + Math.sin(a) * 0.3, (i + (s > 0 ? 3 : 0)) % PETALS.length, 0.8]);
      }
    }

    // Hedges along the front
    for (const cx of [-4.8, 4.8]) {
      for (const dx of [-2.2, -0.75, 0.75, 2.2]) {
        const b = sph(0.42, dx % 1.5 ? C.leaf : C.leafDark, { rough: 0.9 }, 12);
        b.scale.set(1.25, 0.8, 0.9);
        add(at(b, cx + dx, 0.3, -0.25));
      }
      colliders.push({ type: 'box', x: cx, z: -0.3, hw: 2.72, hd: 0.4 });
    }

    // Rooftop: a helipad and a little garden
    const pad = k.panel(2.6, 2.6, 256, (c, w, h) => {
      c.fillStyle = C.mintDeep;
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 10;
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 22, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.font = `700 ${h * 0.5}px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('H', w / 2, h / 2 + 8);
    }, { transparent: true });
    pad.rotation.x = -Math.PI / 2;
    add(at(pad, 4.9, 4.5, -3.9));
    for (const [x, z] of [[-6.0, -2.6], [-3.6, -5.5], [-5.6, -6.2]]) {
      add(at(rbox(0.9, 0.3, 0.9, C.woodDark, 0.05), x, 4.42, z));
      add(at(sph(0.38, C.leaf, undefined, 12), x, 4.75, z));
    }
    add(at(rbox(1.0, 0.6, 0.8, '#e3e8ef', 0.08), -3.8, 4.6, -2.9));

    // ---------------------------------------------------------------- ambulance
    const amb = new THREE.Group();
    const white = '#ffffff';
    amb.add(at(rbox(2.45, 1.85, 1.9, white, 0.18), 0.55, 1.24, 0));
    amb.add(at(rbox(1.4, 1.3, 1.86, white, 0.2), -1.25, 0.98, 0));
    amb.add(at(rbox(0.6, 0.72, 1.82, white, 0.16), -2.05, 0.7, 0));
    amb.add(at(box(4.0, 0.28, 1.6, '#8a8fa3'), -0.3, 0.42, 0));
    amb.add(at(box(4.14, 0.26, 1.95, C.mint), -0.25, 0.82, 0));
    amb.add(at(box(2.47, 0.08, 1.93, C.pink), 0.55, 1.03, 0));
    const winGlass = util.mat('#9fd8ff', { rough: 0.1, emissive: '#bfe6ff', ei: 0.2 });
    const shield = box(0.06, 0.5, 1.5, winGlass);
    shield.rotation.z = -0.32;
    amb.add(at(shield, -1.9, 1.3, 0));
    amb.add(at(box(0.75, 0.44, 0.04, winGlass), -1.25, 1.32, 0.94));
    amb.add(at(box(0.04, 0.95, 0.03, '#d6dbe6'), -0.62, 1.0, 0.95));
    amb.add(at(box(0.18, 0.05, 0.04, '#8a8fa3'), -0.85, 1.05, 0.96));
    amb.add(at(emblem(k, 0.6), 0.55, 1.62, 0.96));
    const rearEm = emblem(k, 0.35, { badge: false });
    rearEm.rotation.y = Math.PI / 2;
    amb.add(at(rearEm, 1.78, 1.55, 0));
    amb.add(at(box(0.02, 1.4, 0.03, '#d6dbe6'), 1.79, 1.15, 0));
    for (const [x, z] of [[-1.35, 0.84], [1.05, 0.84], [-1.35, -0.84], [1.05, -0.84]]) {
      const w = cyl(0.36, 0.36, 0.26, '#4a4458', 18);
      w.rotation.x = Math.PI / 2;
      amb.add(at(w, x, 0.36, z));
      const hub = cyl(0.17, 0.17, 0.28, C.steel, 12, { metal: 0.5, rough: 0.3 });
      hub.rotation.x = Math.PI / 2;
      amb.add(at(hub, x, 0.36, z));
    }
    for (const s of [-1, 1]) {
      const hl = sph(0.11, '#fff6c8', { emissive: '#ffe680', ei: 0.6 }, 12);
      hl.scale.set(0.5, 1, 1);
      amb.add(at(hl, -2.34, 0.82, s * 0.62));
      amb.add(at(sph(0.08, C.rose, { emissive: '#ff6b8a', ei: 0.4 }, 10), 1.8, 0.75, s * 0.7));
    }
    amb.add(at(rbox(0.16, 0.2, 1.9, '#d6dbe6', 0.06), -2.38, 0.45, 0));
    amb.add(at(rbox(0.16, 0.2, 1.9, '#d6dbe6', 0.06), 1.82, 0.45, 0));
    amb.add(at(box(0.12, 0.16, 0.06, white), -1.85, 1.25, 0.99));
    amb.add(at(rbox(0.46, 0.08, 1.15, '#d6dbe6', 0.03), -1.25, 1.66, 0));
    const lightMats = [util.umat('#ff9eb5', { rough: 0.3, emissive: '#ff5f8a', ei: 0.1 }), util.umat('#9fd0ff', { rough: 0.3, emissive: '#3f9bff', ei: 0.1 })];
    lightMats.forEach((m, i) => {
      const d = util.mesh(new THREE.SphereGeometry(0.15, 14, 10), m);
      d.scale.y = 0.75;
      at(d, -1.25, 1.75, i ? -0.3 : 0.3);
      amb.add(d);
      dynamic.push(d);
    });
    const halo = canvasTexture(64, 64, (c) => {
      const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.6)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 64, 64);
    });
    const halos = ['#ff6b9a', '#4fa8ff'].map((col, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: col, transparent: true, depthWrite: false, opacity: 0.9 }));
      s.scale.setScalar(1.5);
      s.position.set(-1.25, 1.95, i ? -0.3 : 0.3);
      s.visible = false;
      amb.add(s);
      dynamic.push(s);
      return s;
    });
    add(at(amb, 7.3, 0, 2.6));
    colliders.push({ type: 'box', x: 7.02, z: 2.6, hw: 2.15, hd: 1.0 });
    // Parking bay lines and its sign
    for (const x of [4.8, 9.85]) add(at(box(0.1, 0.012, 2.4, '#ffffff'), x, 0.006, 2.6));
    const bayText = k.panel(2.4, 0.5, 512, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.62}px ${FONT}`;
      c.fillText('AMBULANCE', w / 2, h / 2 + 4);
    }, { transparent: true });
    bayText.rotation.x = -Math.PI / 2;
    add(at(bayText, 7.3, 0.012, 4.25));

    // ---------------------------------------------------------------- garden
    const bench = (x, z) => {
      const b = new THREE.Group();
      for (const dz of [-0.14, 0, 0.14]) b.add(at(rbox(1.6, 0.06, 0.12, C.wood, 0.02), 0, 0.45, dz));
      for (const y of [0.68, 0.86]) b.add(at(rbox(1.6, 0.11, 0.05, C.wood, 0.02), 0, y, -0.23));
      for (const s of [-1, 1]) {
        b.add(at(rbox(0.08, 0.45, 0.44, C.mintDeep, 0.03), s * 0.66, 0.225, 0));
        b.add(at(rbox(0.08, 0.6, 0.06, C.mintDeep, 0.03), s * 0.66, 0.72, -0.23));
      }
      add(at(b, x, 0, z));
      colliders.push({ type: 'box', x, z, hw: 0.82, hd: 0.27, h: 0.48 });
    };
    bench(-7.6, 1.15);
    bench(4.4, 6.3);
    // Heart-shaped flower bed
    const HX = -5.2;
    const HZ = 4.7;
    const outer = heartShape(2.7);
    outer.holes.push(heartShape(2.4));
    const rimGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 6 });
    rimGeo.translate(0, -0.13, 0);
    const rim = util.mesh(rimGeo, util.mat('#fff1dc'));
    rim.rotation.x = -Math.PI / 2;
    add(at(rim, HX, 0, HZ));
    const soilGeo = new THREE.ExtrudeGeometry(heartShape(2.45), { depth: 0.22, bevelEnabled: false, curveSegments: 6 });
    soilGeo.translate(0, -0.13, 0);
    const soil = util.mesh(soilGeo, util.mat('#9a6a45', { rough: 0.95 }));
    soil.rotation.x = -Math.PI / 2;
    add(at(soil, HX, 0, HZ));
    const pts = heartShape(2.3).getPoints(40).map((p) => new THREE.Vector2(p.x, p.y - 0.13));
    for (let i = 0; i < 90 && flowers.length < 260; i++) {
      const x = (R() - 0.5) * 2.4;
      const y = (R() - 0.5) * 2.6;
      if (!insideShape(pts, x, y)) continue;
      flowers.push([HX + x, 0.22, HZ - y, R() < 0.55 ? 0 : R() < 0.6 ? 1 : 2, 0.95 + R() * 0.3]);
    }
    colliders.push({ type: 'circle', x: HX, z: HZ - 0.05, r: 1.15, h: 0.32 });
    // Path borders and a flower row
    for (let z = 3.4; z < 8.0; z += 0.34) {
      for (const s of [-1, 1]) flowers.push([s * 1.55 + (R() - 0.5) * 0.08, 0, z, Math.floor(R() * PETALS.length), 0.9]);
    }
    for (let x = 5.6; x < 9.8; x += 0.3) flowers.push([x, 0, 7.55 + (R() - 0.5) * 0.2, Math.floor(R() * PETALS.length), 1]);
    for (const [x, z, s] of [[6.2, 7.95, 1], [7.5, 8.0, 0.8], [8.8, 7.9, 1.1], [-8.4, 5.2, 1], [-9.3, 4.6, 0.75]]) {
      const b = sph(0.45, s > 0.9 ? C.leaf : C.leafDark, { rough: 0.9 }, 12);
      b.scale.set(1.3 * s, 0.85 * s, 1.0 * s);
      add(at(b, x, 0.3 * s, z));
      colliders.push({ type: 'circle', x, z, r: 0.45 * s });
    }
    // A bird bath on the right lawn
    const bath = new THREE.Group();
    bath.add(at(cyl(0.12, 0.18, 0.7, C.cream, 12), 0, 0.35, 0));
    bath.add(at(cyl(0.45, 0.3, 0.14, C.cream, 18), 0, 0.75, 0));
    bath.add(at(cyl(0.38, 0.38, 0.02, '#8fdcf0', 18, { rough: 0.15 }), 0, 0.82, 0));
    const bird = new THREE.Group();
    bird.add(at(sph(0.09, C.sky, undefined, 10), 0, 0, 0));
    bird.add(at(sph(0.06, C.sky, undefined, 10), 0.08, 0.07, 0));
    const beak = k.cyl(0.0, 0.02, 0.05, C.sun, 6);
    beak.rotation.z = -Math.PI / 2;
    bird.add(at(beak, 0.15, 0.07, 0));
    bird.add(at(sph(0.012, C.ink, undefined, 6), 0.11, 0.09, 0.04));
    bird.position.set(0.3, 0.92, 0.05);
    bath.add(bird);
    dynamic.push(bird);
    add(at(bath, 9.5, 0, 5.0));
    colliders.push({ type: 'circle', x: 9.5, z: 5.0, r: 0.45, h: 0.84 });
    // Trees
    const tree = (x, z, s = 1) => {
      const t = new THREE.Group();
      t.add(at(cyl(0.16, 0.22, 1.5, C.woodDark, 10), 0, 0.75, 0));
      t.add(at(sph(0.95, C.leaf, { rough: 0.85 }, 16), 0, 2.15, 0));
      t.add(at(sph(0.7, C.leafDark, { rough: 0.85 }, 14), 0.55, 1.8, 0.25));
      t.add(at(sph(0.62, '#7fd36b', { rough: 0.85 }, 14), -0.5, 2.55, 0.1));
      t.scale.setScalar(s);
      add(at(t, x, 0, z));
      colliders.push({ type: 'circle', x: x + 0.2 * s, z: z + 0.1 * s, r: 0.9 * s }); // the low crown, not only the trunk
    };
    tree(-9.9, 0.4, 1.1);
    tree(10.1, 0.1, 1.05);
    tree(-10.0, 7.1, 0.8);
    tree(10.2, 7.0, 0.85);
    // Lamp posts by the path
    for (const s of [-1, 1]) {
      add(at(cyl(0.06, 0.08, 2.4, C.mintDeep, 10), s * 2.0, 1.2, 7.2));
      add(at(sph(0.22, '#fff6d8', { emissive: '#ffe2a0', ei: 0.7 }, 14), s * 2.0, 2.55, 7.2));
      add(at(cyl(0.16, 0.2, 0.08, C.mintDeep, 12), s * 2.0, 2.38, 7.2));
      colliders.push({ type: 'circle', x: s * 2.0, z: 7.2, r: 0.12 });
    }
    // Wooden sign by the street
    const woodSign = ctx.sign(['Dr. Roji works here', 'Sunny Hill Hospital'], { width: 3.0, height: 1.15, accent: C.mintDeep, postHeight: 0.85 });
    add(at(woodSign, -3.4, 0, 7.4));
    colliders.push({ type: 'box', x: -3.4, z: 7.35, hw: 1.2, hd: 0.15 });
    // A pink postbox for get-well cards
    const post = new THREE.Group();
    post.add(at(cyl(0.06, 0.06, 0.8, C.ink, 8), 0, 0.4, 0));
    post.add(at(rbox(0.5, 0.55, 0.42, C.rose, 0.14), 0, 1.05, 0));
    post.add(at(box(0.3, 0.04, 0.02, C.ink), 0, 1.15, 0.21));
    post.add(at(k.heart(0.18, 0.02, '#ffffff'), 0, 0.95, 0.22));
    add(at(post, 2.9, 0, 7.6));
    colliders.push({ type: 'circle', x: 2.9, z: 7.6, r: 0.25 });
    // "Get well soon" balloons tied to the bench
    const balloons = [];
    [[C.rose, -0.15, 1.5], [C.mint, 0.1, 1.7], [C.sun, 0.0, 1.9]].forEach(([c, tilt, h], i) => {
      const b = new THREE.Group();
      b.add(at(cyl(0.006, 0.006, h, '#ffffff', 4), 0, h / 2, 0));
      const ball = sph(0.24, util.mat(c, { rough: 0.3 }), undefined, 14);
      ball.scale.set(1, 1.18, 1);
      b.add(at(ball, 0, h + 0.22, 0));
      b.rotation.z = tilt;
      add(at(b, -6.85, 0.48, 1.15));
      balloons.push({ b, tilt, ph: i * 1.9 });
      dynamic.push(b);
    });

    // ---------------------------------------------------------------- flowers (instanced)
    const petalGeo = mergeGeometries(
      Array.from({ length: 5 }, (_, i) => {
        const s = new THREE.SphereGeometry(0.045, 5, 3);
        s.scale(1, 0.55, 1);
        const a = (i / 5) * Math.PI * 2;
        s.translate(Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045);
        return s;
      }),
    );
    const n = flowers.length;
    const blooms = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ roughness: 0.65 }), n);
    const middles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 5, 3), util.mat(C.sun), n);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.012, 1, 4, 1, true), util.mat(C.leafDark), n);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    flowers.forEach(([x, y, z, ci, s], i) => {
      const h = 0.18 * s;
      m4.compose(new THREE.Vector3(x, y + h, z), q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4)), new THREE.Vector3(s, s, s));
      blooms.setMatrixAt(i, m4);
      blooms.setColorAt(i, col.set(PETALS[ci % PETALS.length]));
      m4.compose(new THREE.Vector3(x, y + h + 0.01, z), q.identity(), new THREE.Vector3(s, s, s));
      middles.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(x, y + h / 2, z), q, new THREE.Vector3(1, h, 1));
      stems.setMatrixAt(i, m4);
    });
    for (const im of [blooms, middles, stems]) {
      im.castShadow = false;
      im.receiveShadow = true;
      add(im);
    }

    // ---------------------------------------------------------------- hotspots
    let sirenT = 0;
    const flower = () => {
      const f = new THREE.Group();
      f.add(at(cyl(0.012, 0.012, 0.32, C.leafDark, 5), 0, 0.16, 0));
      const b = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.add(at(sph(0.05, C.pink, undefined, 8), Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05));
      }
      b.add(at(sph(0.035, C.sun, undefined, 8), 0, 0.02, 0));
      b.rotation.x = 0.9;
      f.add(at(b, 0, 0.34, 0.02));
      f.rotation.x = -0.5;
      f.position.set(0.05, 0.05, 0.02);
      return f;
    };
    const hotspots = [
      {
        x: -7.6,
        z: 1.85,
        r: 1.3,
        icon: 'smile',
        label: 'Sit on the bench',
        act: (api) =>
          api.activity({
            label: 'Get up',
            seats: [
              { who: 'player', x: -7.98, z: 1.17, y: 0.33, yaw: 0, pose: 'sit' },
              { who: 'partner', x: -7.22, z: 1.17, y: 0.33, yaw: 0, pose: 'sit' },
            ],
            focus: { x: -7.6, z: 1.3, y: 0.9, zoom: 0.55 },
            exit: { x: -7.6, z: 2.0 },
            onEnd: (silent) => !silent && api.toast('A little sunshine between patients.', 2400),
          }),
      },
      {
        x: 4.4,
        z: 7.0,
        r: 1.3,
        icon: 'smile',
        label: 'Sit on the bench',
        act: (api) =>
          api.activity({
            label: 'Get up',
            seats: [
              { who: 'player', x: 4.02, z: 6.32, y: 0.33, yaw: 0, pose: 'sit' },
              { who: 'partner', x: 4.78, z: 6.32, y: 0.33, yaw: 0, pose: 'sit', hands: 'read' },
            ],
            focus: { x: 4.4, z: 6.4, y: 0.9, zoom: 0.55 },
            exit: { x: 4.4, z: 7.1 },
          }),
      },
      {
        x: 7.2,
        z: 4.4,
        r: 1.5,
        icon: 'car',
        label: (api) => (sirenT > 0 ? 'Wee-woo!' : 'Flash the lights'),
        act: (api) => {
          if (sirenT > 0) return;
          sirenT = 4.2;
          const ac = api.sound.ctx;
          if (ac) for (let i = 0; i < 8; i++) api.sound.tone(i % 2 ? 660 : 880, ac.currentTime + i * 0.42, 0.4, { type: 'triangle', gain: 0.04, attack: 0.03 });
          api.emote('player', 'cheer');
          api.toast(api.playerId === 'roji' ? 'Dr. Roji checks the ambulance. All ready for the next call!' : 'Homama flashes the lights. Dr. Roji laughs.', 2800);
        },
      },
      {
        x: -6.5,
        z: 6.3,
        r: 1.4,
        icon: 'heart',
        label: (api) => (api.playerId === 'homama' ? 'Pick a flower for Roji' : 'Smell the flowers'),
        act: (api) => {
          if (api.playerId === 'homama') {
            if (api.homama.kid.carried) return api.toast('Homama already has a flower for Roji.', 2200);
            api.carry('homama', flower());
            api.sound.ui('pop');
            api.fx.heartsAt(api.world(-5.2, 5.6, 1.2), 3);
            api.toast('Homama picks a pink flower for Dr. Roji.', 2600);
          } else {
            api.emote('roji', 'heart');
            api.fx.heartsAt(api.world(-5.2, 4.8, 0.8), 4);
            api.toast('Mmm. The heart garden smells like spring.', 2400);
          }
        },
      },
    ];

    return {
      group: g,
      dynamic: [...dynamic, ...colorBake(g, dynamic)],
      colliders,
      hotspots,
      pad: { x: 0, z: size.d / 2 + 1.2 },
      ground: [
        { x: 0, z: 5.6, hw: 1.15, hd: 3.4, color: '#f2e2c6', feather: 0.3 },
        { x: 0, z: 1.2, hw: 9.5, hd: 1.05, color: '#efe4d2', feather: 0.5 },
        { x: 7.3, z: 2.6, hw: 2.65, hd: 1.35, color: '#d5dbe3', feather: 0.25 },
      ],
      door: { x: 0, z: 0.95 },
      interior: {
        title: 'Sunny Hill Hospital',
        build: (ictx) => buildInterior(ictx),
      },
      update(dt, t) {
        sirenT = Math.max(0, sirenT - dt);
        const on = sirenT > 0;
        const ph = Math.floor(t * 5) % 2;
        lightMats[0].emissiveIntensity = on ? (ph ? 2.4 : 0.15) : 0.1;
        lightMats[1].emissiveIntensity = on ? (ph ? 0.15 : 2.4) : 0.1;
        halos[0].visible = on && !!ph;
        halos[1].visible = on && !ph;
        for (const b of balloons) b.b.rotation.set(Math.sin(t * 0.8 + b.ph) * 0.05, 0, b.tilt + Math.sin(t * 1.1 + b.ph) * 0.06);
        const hop = (t * 0.7) % 3;
        bird.position.y = 0.92 + (hop < 0.6 ? Math.abs(Math.sin(hop * Math.PI * 3.3)) * 0.05 : 0);
        bird.rotation.y = Math.floor(t * 0.7 / 3) % 2 ? Math.PI : 0;
      },
    };
  },
};
