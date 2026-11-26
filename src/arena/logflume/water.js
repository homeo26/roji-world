import * as THREE from 'three';
import { canvasTexture } from '../../util.js';

// Water effects for the log flume: flying droplets (one instanced mesh), ripple rings on the water,
// soft mist puffs, the two big curtains of the splash at the bottom of the drop, and drips from wet kids.

const dotTex = () =>
  canvasTexture(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.5, 'rgba(235,250,255,.55)');
    g.addColorStop(1, 'rgba(235,250,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

export function makeWater(scene) {
  const MAX = 420;
  const drop = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), new THREE.MeshStandardMaterial({ color: '#f2fdff', roughness: 0.15, metalness: 0, emissive: '#dff6ff', emissiveIntensity: 0.55, transparent: true, opacity: 0.8, depthWrite: false }), MAX);
  drop.frustumCulled = false;
  drop.castShadow = false;
  scene.add(drop);
  const parts = Array.from({ length: MAX }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1, floor: -99 }));
  let next = 0;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAX; i++) drop.setMatrixAt(i, zero);
  drop.count = 0;

  // ripple rings
  const ringGeo = new THREE.RingGeometry(0.8, 1, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const rings = [];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false;
    m.renderOrder = 2;
    scene.add(m);
    rings.push({ m, life: 0, max: 1, grow: 2 });
  }
  let ringNext = 0;

  // mist puffs
  const tex = dotTex();
  const mists = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    s.visible = false;
    scene.add(s);
    mists.push({ s, life: 0, max: 1, v: new THREE.Vector3(), size: 1 });
  }
  let mistNext = 0;

  // the splash curtains: two curved sheets that rise up beside the log and fall back
  const sheetTex = canvasTexture(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const g = c.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgba(200,245,255,.9)');
    g.addColorStop(0.7, 'rgba(230,250,255,.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) c.lineTo(x, h * 0.15 + Math.sin(x * 0.3) * 10 + ((x * 7) % 13));
    c.lineTo(w, h);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 26; i++) {
      c.beginPath();
      c.arc((i * 37) % w, 20 + ((i * 53) % (h - 30)), 2 + (i % 3), 0, Math.PI * 2);
      c.fill();
    }
  });
  const sheetGeo = new THREE.CylinderGeometry(2.2, 1.0, 3, 16, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
  sheetGeo.translate(0, 1.5, 0);
  const sheets = [];
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(sheetGeo, new THREE.MeshStandardMaterial({ map: sheetTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.2, emissive: '#dff6ff', emissiveIntensity: 0.35, emissiveMap: sheetTex }));
    m.visible = false;
    scene.add(m);
    sheets.push({ m, side });
  }
  let sheetT = -1;
  const sheetAt = { p: new THREE.Vector3(), f: new THREE.Vector3(), l: new THREE.Vector3(), size: 1 };

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();

  const api = {
    // n droplets from pos, spread round dir (Vector3, length = speed)
    spray(pos, dir, n = 20, { spread = 1.5, size = 1, floor = -99, up = 0 } = {}) {
      for (let i = 0; i < n; i++) {
        const p = parts[next];
        next = (next + 1) % MAX;
        p.life = 0.7 + Math.random() * 0.7;
        p.p.copy(pos);
        p.v.copy(dir).add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread * 0.6 + up, (Math.random() - 0.5) * spread));
        p.s = size * (0.6 + Math.random() * 0.9);
        p.floor = floor;
      }
    },
    // a burst straight up and out in a ring (a splash on the water)
    splash(pos, n = 30, { speed = 3, up = 4, size = 1 } = {}) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = speed * (0.4 + Math.random() * 0.6);
        api.spray(pos, new THREE.Vector3(Math.cos(a) * r, up * (0.6 + Math.random() * 0.6), Math.sin(a) * r), 1, { spread: 0.6, size, floor: pos.y - 0.05 });
      }
      api.ring(pos, 1.8, 0.9);
    },
    ring(pos, grow = 2, life = 0.9) {
      const r = rings[ringNext];
      ringNext = (ringNext + 1) % rings.length;
      r.m.position.copy(pos).setY(pos.y + 0.03);
      r.life = 0;
      r.max = life;
      r.grow = grow;
      r.m.visible = true;
    },
    mist(pos, size = 2, life = 1.4, up = 0.6) {
      const m = mists[mistNext];
      mistNext = (mistNext + 1) % mists.length;
      m.s.position.copy(pos);
      m.life = 0;
      m.max = life;
      m.size = size;
      m.v.set((Math.random() - 0.5) * 0.6, up, (Math.random() - 0.5) * 0.6);
      m.s.visible = true;
    },
    // the big splash curtains at p (water level), facing f, l the left
    curtains(p, f, l, size = 1) {
      sheetAt.p.copy(p);
      sheetAt.f.copy(f).setY(0).normalize();
      sheetAt.l.copy(l).setY(0).normalize();
      sheetAt.size = size;
      sheetT = 0;
    },
    update(dt) {
      // live droplets are packed at the front so only they are drawn
      let n = 0;
      for (let i = 0; i < MAX; i++) {
        const p = parts[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        p.v.y -= 9.8 * dt;
        p.p.addScaledVector(p.v, dt);
        if (p.p.y < p.floor) p.life = 0;
        if (p.life <= 0) continue;
        const s = p.s * Math.min(1, p.life * 3);
        drop.setMatrixAt(n++, m4.compose(p.p, q, sc.set(s, s * 1.3, s)));
      }
      drop.count = n;
      drop.visible = n > 0;
      drop.instanceMatrix.needsUpdate = true;
      for (const r of rings) {
        if (!r.m.visible) continue;
        r.life += dt;
        const k = r.life / r.max;
        if (k >= 1) {
          r.m.visible = false;
          continue;
        }
        r.m.scale.setScalar(0.3 + k * r.grow);
        r.m.material.opacity = 0.7 * (1 - k);
      }
      for (const m of mists) {
        if (!m.s.visible) continue;
        m.life += dt;
        const k = m.life / m.max;
        if (k >= 1) {
          m.s.visible = false;
          continue;
        }
        m.s.position.addScaledVector(m.v, dt);
        m.s.scale.setScalar(m.size * (0.6 + k * 0.8));
        m.s.material.opacity = 0.55 * Math.sin(k * Math.PI);
      }
      if (sheetT >= 0) {
        sheetT += dt;
        const D = 1.5;
        const k = sheetT / D;
        if (k >= 1) {
          sheetT = -1;
          for (const s of sheets) s.m.visible = false;
        } else {
          const rise = Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.45) / 0.55);
          for (const s of sheets) {
            s.m.visible = true;
            s.m.position.copy(sheetAt.p).addScaledVector(sheetAt.l, s.side * (1.7 + k * 1.2)).addScaledVector(sheetAt.f, 0.4);
            s.m.rotation.set(0, Math.atan2(sheetAt.l.x * s.side, sheetAt.l.z * s.side), s.side * -0.0);
            s.m.scale.set(sheetAt.size * (0.8 + k * 0.6), Math.max(0.01, rise * sheetAt.size * 1.3), sheetAt.size * (0.8 + k * 0.6));
            s.m.material.opacity = Math.min(1, (1 - k) * 2);
          }
        }
      }
    },
  };
  return api;
}
