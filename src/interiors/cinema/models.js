import { THREE, C, mat, umat, mesh, canvasTexture, roundRect, FONT, mergeGeometries, heartPath, fitText, colorBake } from '../../places/school/kit.js';

// Cinema models shared by the cinema interior and Popcorn Catch:
// the popcorn machine, striped buckets, popcorn kernels, movie posters and the velvet seat.

export const RED = '#e5484d';
export const DEEP = '#b8323a';
export const GOLD = '#f4c24f';
export const WINE = '#6b1f33';

// A fluffy popped kernel: six puffs merged, about 2r across.
const PUFFS = [[-0.42, 0.16, 0.08, 0.6], [0.42, 0.16, -0.05, 0.6], [0, -0.36, 0.05, 0.62], [0, 0.4, -0.06, 0.52], [-0.2, -0.06, -0.3, 0.5], [0.22, -0.04, 0.3, 0.48]];
export function kernelGeo(r = 0.06, seg = 6) {
  return mergeGeometries(
    PUFFS.map(([x, y, z, s]) => {
      const g = new THREE.SphereGeometry(r * s, seg, Math.max(4, Math.round(seg * 0.7)));
      g.translate(x * r, y * r, z * r);
      return g;
    }),
  );
}

export const KERNEL_COLORS = { plain: '#fff3cf', butter: '#ffe08a', gold: '#ffc93c', burnt: '#5a4038' };

// A striped paper texture for buckets (vertical stripes).
let stripeTex = null;
export function stripes() {
  return (stripeTex ??= canvasTexture(256, 64, (ctx, w, h) => {
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : RED;
      ctx.fillRect((i * w) / 10, 0, w / 10 + 1, h);
    }
  }));
}

// A striped popcorn bucket, base at y = 0, open top at y = h. heap: puffs piled above the rim.
export function bucket(k, { r = 0.2, h = 0.3, heap = 18, badge = true } = {}) {
  const g = new THREE.Group();
  const side = mesh(new THREE.CylinderGeometry(r, r * 0.74, h, 24, 1, true), umat('#ffffff', { rough: 0.6, map: stripes(), side: THREE.DoubleSide }));
  side.position.y = h / 2;
  g.add(side);
  g.add(k.at(k.cyl(r * 0.74, r * 0.74, 0.01, RED, 20), 0, 0.005, 0));
  const rim = k.tor(r, r * 0.06, C.white, Math.PI * 2, undefined, 28, 6);
  rim.rotation.x = Math.PI / 2;
  g.add(k.at(rim, 0, h, 0));
  if (badge) {
    const b = k.cyl(r * 0.32, r * 0.32, 0.01, C.sun, 16);
    b.rotation.x = Math.PI / 2;
    g.add(k.at(b, 0, h * 0.5, r * 0.88 + 0.004));
    const s = k.star(r * 0.2, r * 0.09, 0.008, RED);
    g.add(k.at(s, 0, h * 0.5, r * 0.88 + 0.012));
  }
  if (heap) {
    const kg = k.geo(`kern${r}`, () => kernelGeo(r * 0.24, 5));
    for (let i = 0; i < heap; i++) {
      const a = i * 2.39;
      const d = Math.sqrt(i / heap) * r * 0.8;
      const y = h - r * 0.05 + (1 - d / r) * r * 0.55;
      const m = mesh(kg, mat(i % 5 ? KERNEL_COLORS.plain : KERNEL_COLORS.butter, { rough: 0.85 }), { cast: false });
      m.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
      m.rotation.set(i, i * 2, 0);
      g.add(m);
    }
  }
  return g;
}

// The classic red popcorn machine with a glass case, a swinging kettle and a POPCORN sign.
// cart: on a cart with big yellow wheels (the lobby one and the game one). Base at y = 0, faces +Z.
// Returns { root, glass, kettle, pops, pop(), update(dt, t) }; root includes everything.
export function popcornMachine(k, { cart = false, sign = 'POPCORN' } = {}) {
  const { box, rbox, cyl, sph, at, rot } = k;
  const P = Math.PI;
  const root = new THREE.Group();
  const add = (o) => (root.add(o), o);
  const y0 = cart ? 0.72 : 0;
  if (cart) {
    add(at(rbox(1.0, 0.5, 0.66, RED, 0.06), 0, 0.47, 0));
    add(at(box(1.02, 0.05, 0.68, GOLD), 0, 0.72, 0));
    add(at(rbox(0.6, 0.32, 0.03, DEEP, 0.03), 0, 0.46, 0.335));
    add(at(sph(0.035, GOLD, undefined, 8), 0.2, 0.46, 0.36));
    for (const s of [-1, 1]) {
      const wheel = new THREE.Group();
      wheel.add(rot(k.tor(0.3, 0.035, GOLD, P * 2, undefined, 24, 6), 0, P / 2, 0));
      for (let i = 0; i < 6; i++) wheel.add(rot(cyl(0.015, 0.015, 0.58, GOLD, 5), (i / 6) * P, 0, 0));
      wheel.add(rot(cyl(0.06, 0.06, 0.08, RED, 10), 0, 0, P / 2));
      add(at(wheel, s * 0.56, 0.32, 0));
    }
    add(at(rot(cyl(0.025, 0.025, 1.28, GOLD, 8), 0, 0, P / 2), 0, 0.32, 0));
    // A push handle and a little foot at the front
    add(at(rot(cyl(0.02, 0.02, 0.5, GOLD, 6), 0.4, 0, 0), -0.38, 0.95, -0.42));
    add(at(rot(cyl(0.02, 0.02, 0.5, GOLD, 6), 0.4, 0, 0), 0.38, 0.95, -0.42));
    add(at(rot(cyl(0.025, 0.025, 0.8, '#ffffff', 8), 0, 0, P / 2), 0, 1.15, -0.5));
    add(at(cyl(0.03, 0.04, 0.22, GOLD, 8), 0, 0.11, 0.25));
  } else {
    add(at(rbox(0.9, 0.3, 0.6, RED, 0.05), 0, 0.15, 0));
    add(at(box(0.92, 0.04, 0.62, GOLD), 0, 0.3, 0));
    add(at(rbox(0.5, 0.18, 0.03, DEEP, 0.03), 0, 0.15, 0.305));
  }
  const b = cart ? y0 : 0.3;
  const gw = 0.86;
  const gh = 0.62;
  const gd = 0.56;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(at(box(0.05, gh, 0.05, RED), (x * gw) / 2, b + gh / 2, (z * gd) / 2));
  add(at(box(gw, 0.04, gd, DEEP), 0, b + 0.02, 0));
  // Popcorn heaped on the floor of the case
  const kg = k.geo('kernM', () => kernelGeo(0.045, 5));
  const heap = new THREE.InstancedMesh(kg, new THREE.MeshStandardMaterial({ roughness: 0.85 }), 40);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const col = new THREE.Color();
  for (let i = 0; i < 40; i++) {
    const u = ((i * 0.618) % 1) - 0.5;
    const w = ((i * 0.381 + 0.2) % 1) - 0.5;
    const hgt = 0.06 + (1 - Math.min(1, Math.hypot(u, w) * 1.6)) * 0.12 + (i % 3) * 0.02;
    m4.compose(v.set(u * (gw - 0.12), b + hgt, w * (gd - 0.12)), q.setFromEuler(e.set(i, i * 1.7, i * 0.3)), one);
    heap.setMatrixAt(i, m4);
    heap.setColorAt(i, col.set(i % 6 ? KERNEL_COLORS.plain : KERNEL_COLORS.butter));
  }
  add(heap);
  // Kettle hanging from the roof
  const kettle = new THREE.Group();
  kettle.position.set(0, b + gh - 0.06, 0);
  kettle.add(at(cyl(0.012, 0.012, 0.12, C.steel, 6), 0, -0.04, 0));
  kettle.add(at(cyl(0.15, 0.12, 0.13, C.steel, 18, { metal: 0.5, rough: 0.3 }), 0, -0.16, 0));
  kettle.add(at(cyl(0.155, 0.155, 0.025, '#b9c2cf', 18, { metal: 0.5, rough: 0.3 }), 0, -0.09, 0));
  kettle.add(at(rot(cyl(0.012, 0.012, 0.3, C.steel, 6), 0, 0, P / 2), 0, -0.1, 0));
  add(kettle);
  // Popping kernels inside the case (animated)
  const pops = new THREE.InstancedMesh(kg, new THREE.MeshStandardMaterial({ color: KERNEL_COLORS.plain, roughness: 0.85 }), 10);
  const popState = Array.from({ length: 10 }, (_, i) => ({ t: 1 + i * 0.13, x: 0, z: 0, vx: 0, vz: 0, vy: 0 }));
  add(pops);
  // Glass
  const glass = mesh(new THREE.BoxGeometry(gw - 0.03, gh - 0.02, gd - 0.03), new THREE.MeshStandardMaterial({ color: '#fff6e6', roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false }), { cast: false, receive: false });
  glass.position.set(0, b + gh / 2, 0);
  glass.renderOrder = 2;
  add(glass);
  add(at(box(0.03, gh - 0.04, 0.012, '#ffffff'), 0.28, b + gh / 2, gd / 2 + 0.005)).material = mat('#ffffff', { rough: 0.2, emissive: '#ffffff', ei: 0.4 });
  // Roof, scalloped awning, sign and a star
  add(at(rbox(gw + 0.12, 0.09, gd + 0.12, RED, 0.03), 0, b + gh + 0.04, 0));
  const n = 7;
  for (let i = 0; i < n; i++) {
    const sc = rot(cyl(gw / n / 2, gw / n / 2, 0.03, i % 2 ? '#ffffff' : RED, 12), P / 2, 0, 0);
    add(at(sc, -gw / 2 + (gw / n) * (i + 0.5), b + gh, gd / 2 + 0.045));
  }
  const signTex = canvasTexture(512, 140, (ctx, w, h) => {
    ctx.fillStyle = RED;
    roundRect(ctx, 0, 0, w, h, 30);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 10;
    roundRect(ctx, 8, 8, w - 16, h - 16, 24);
    ctx.stroke();
    ctx.fillStyle = '#fff6d8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, sign, w / 2, h / 2 + 4, w * 0.82, h * 0.6, 700);
  });
  const sg = mesh(new THREE.PlaneGeometry(gw + 0.04, 0.24), umat('#ffffff', { rough: 0.5, map: signTex, emissive: '#ffffff' }), { cast: false });
  sg.material.emissiveMap = signTex;
  sg.material.emissiveIntensity = 0.3;
  add(at(sg, 0, b + gh + 0.22, gd / 2 + 0.06));
  add(at(rbox(gw + 0.1, 0.3, 0.06, GOLD, 0.03), 0, b + gh + 0.22, gd / 2 + 0.02));
  add(at(cyl(0.05, 0.08, 0.1, GOLD, 10), 0, b + gh + 0.43, 0));
  add(at(k.star(0.09, 0.04, 0.03, mat(C.sun, { emissive: '#ffb200', ei: 0.4 })), 0, b + gh + 0.56, 0));

  let pulse = 0;
  return {
    root,
    glass,
    kettle,
    heap,
    pops,
    top: b + gh + 0.1,
    // Make the kettle tip and kernels jump inside the case
    pop(n = 6) {
      pulse = 1;
      let fired = 0;
      for (const s of popState) {
        if (s.t < 1 || fired >= n) continue;
        s.t = 0;
        s.x = (Math.random() - 0.5) * 0.2;
        s.z = (Math.random() - 0.5) * 0.2;
        s.vx = (Math.random() - 0.5) * 0.9;
        s.vz = (Math.random() - 0.5) * 0.6;
        s.vy = 1.3 + Math.random() * 0.8;
        fired++;
      }
    },
    update(dt, t) {
      pulse = Math.max(0, pulse - dt * 2.5);
      kettle.rotation.z = Math.sin(t * 2.4) * 0.05 + pulse * 0.45;
      popState.forEach((s, i) => {
        if (s.t >= 1) {
          m4.makeScale(0, 0, 0);
          pops.setMatrixAt(i, m4);
          return;
        }
        s.t += dt * 0.9;
        const tt = s.t;
        const y = b + gh - 0.22 + s.vy * tt - 2.2 * tt * tt;
        const x = Math.max(-gw / 2 + 0.06, Math.min(gw / 2 - 0.06, s.x + s.vx * tt));
        const z = Math.max(-gd / 2 + 0.06, Math.min(gd / 2 - 0.06, s.z + s.vz * tt));
        if (y < b + 0.12) s.t = 1;
        m4.compose(v.set(x, Math.max(b + 0.12, y), z), q.setFromEuler(e.set(t * 3 + i, t * 2, 0)), one);
        pops.setMatrixAt(i, m4);
      });
      pops.instanceMatrix.needsUpdate = true;
    },
    // Merge the fixed parts (call once the machine is placed). Keeps the moving parts separate.
    bake() {
      colorBake(root, [kettle, heap, pops, glass]);
      colorBake(kettle);
    },
  };
}

// ------------------------------------------------------------------ posters
export const POSTERS = {
  moonbunny: { title: 'Moon Bunny', tag: 'Now showing', bg: ['#2b2d6e', '#6a4a9a'] },
  cupcake: { title: 'The Brave Little Cupcake', tag: 'Coming soon', bg: ['#ffd1dc', '#ff9eb5'] },
  panda: { title: 'Panda Picnic', tag: 'Family fun', bg: ['#c9f0e2', '#7fd8bf'] },
  kitty: { title: 'Kitty Detective', tag: 'A cosy mystery', bg: ['#ffe9b8', '#ffc56b'] },
  twostars: { title: 'Two Stars', tag: 'A love story', bg: ['#ff8fa8', '#ef5b6f'] },
};

export function drawPoster(ctx, w, h, id) {
  const p = POSTERS[id];
  const P = Math.PI;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, p.bg[0]);
  g.addColorStop(1, p.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h * 0.42;
  const s = w / 256;
  const dark = id === 'moonbunny';
  if (id === 'moonbunny') {
    ctx.fillStyle = '#fff6cf';
    for (let i = 0; i < 26; i++) ctx.fillRect((i * 67) % w, (i * 41) % (h * 0.7), 3 * s, 3 * s);
    ctx.beginPath();
    ctx.arc(cx, cy + 30 * s, 70 * s, 0, P * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,200,150,0.5)';
    for (const [x, y, r] of [[-25, 40, 12], [20, 60, 9], [30, 15, 7]]) {
      ctx.beginPath();
      ctx.arc(cx + x * s, cy + y * s, r * s, 0, P * 2);
      ctx.fill();
    }
    bunny(ctx, cx - 8 * s, cy - 40 * s, s * 1.1);
  } else if (id === 'cupcake') {
    ctx.fillStyle = '#ef5b6f';
    ctx.beginPath();
    ctx.moveTo(cx - 60 * s, cy - 20 * s);
    ctx.quadraticCurveTo(cx - 110 * s, cy + 30 * s, cx - 80 * s, cy + 80 * s);
    ctx.lineTo(cx + 10 * s, cy + 10 * s);
    ctx.fill();
    ctx.fillStyle = '#f2b880';
    ctx.beginPath();
    ctx.moveTo(cx - 48 * s, cy + 10 * s);
    ctx.lineTo(cx + 48 * s, cy + 10 * s);
    ctx.lineTo(cx + 34 * s, cy + 78 * s);
    ctx.lineTo(cx - 34 * s, cy + 78 * s);
    ctx.fill();
    ctx.fillStyle = '#fffaf2';
    for (const [x, y, r] of [[0, -30, 34], [-30, -6, 30], [30, -6, 30], [0, -60, 22]]) {
      ctx.beginPath();
      ctx.arc(cx + x * s, cy + y * s, r * s, 0, P * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(cx, cy - 84 * s, 12 * s, 0, P * 2);
    ctx.fill();
    face(ctx, cx, cy + 40 * s, s);
  } else if (id === 'panda') {
    ctx.fillStyle = '#ff9eb5';
    ctx.fillRect(cx - 90 * s, cy + 50 * s, 180 * s, 40 * s);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) ctx.fillRect(cx - 90 * s + i * 30 * s, cy + 50 * s + (i % 2) * 20 * s, 15 * s, 20 * s);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 52 * s, 0, P * 2);
    ctx.fill();
    ctx.fillStyle = '#3b2b3f';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sx * 40 * s, cy - 40 * s, 18 * s, 0, P * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + sx * 20 * s, cy - 4 * s, 13 * s, 16 * s, sx * 0.4, 0, P * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sx * 19 * s, cy - 7 * s, 4 * s, 0, P * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3b2b3f';
    ctx.beginPath();
    ctx.arc(cx, cy + 14 * s, 6 * s, 0, P * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(cx + 66 * s, cy + 36 * s, 16 * s, 0, P * 2);
    ctx.fill();
  } else if (id === 'kitty') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 50 * s, 0, P * 2);
    ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * 46 * s, cy - 18 * s);
      ctx.lineTo(cx + sx * 38 * s, cy - 70 * s);
      ctx.lineTo(cx + sx * 10 * s, cy - 46 * s);
      ctx.fill();
    }
    ctx.fillStyle = '#9b6a43';
    ctx.fillRect(cx - 56 * s, cy - 58 * s, 112 * s, 14 * s);
    ctx.fillRect(cx - 36 * s, cy - 92 * s, 72 * s, 36 * s);
    face(ctx, cx, cy + 6 * s, s);
    ctx.strokeStyle = '#3b2b3f';
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.arc(cx + 66 * s, cy + 50 * s, 22 * s, 0, P * 2);
    ctx.moveTo(cx + 82 * s, cy + 66 * s);
    ctx.lineTo(cx + 104 * s, cy + 92 * s);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#fff6dc';
    for (const [dx, sc] of [[-40, 1], [44, 0.78]]) {
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const r = (j % 2 ? 26 : 62) * sc * s;
        const a = (j / 10) * P * 2 - P / 2;
        ctx.lineTo(cx + dx * s + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    heartPath(ctx, cx, cy + 80 * s, 30 * s);
    ctx.fill();
  }
  // Title and tag
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = dark ? '#ffd166' : '#ffffff';
  ctx.font = `600 ${Math.round(18 * s)}px ${FONT}`;
  ctx.fillText(p.tag.toUpperCase(), cx, h * 0.07);
  ctx.fillStyle = dark ? '#fff6dc' : '#4a2a3a';
  const words = p.title.split(' ');
  const lines = p.title.length > 14 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [p.title];
  lines.forEach((l, i) => fitText(ctx, l, cx, h * (lines.length > 1 ? 0.8 + i * 0.1 : 0.85), w * 0.86, Math.round(34 * s), 700));
  ctx.strokeStyle = '#f4c24f';
  ctx.lineWidth = 8 * s;
  ctx.strokeRect(4 * s, 4 * s, w - 8 * s, h - 8 * s);
}

function face(ctx, x, y, s) {
  ctx.fillStyle = '#3b2b3f';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sx * 15 * s, y - 4 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#3b2b3f';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(x, y + 4 * s, 7 * s, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,150,0.55)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sx * 26 * s, y + 6 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The Moon Bunny: white, pink bow, used by the posters and the screen cartoon. (x, y) is the body centre.
export function bunny(ctx, x, y, s = 1, { ear = 0 } = {}) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y + 14 * s, 26 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x, y - 14 * s, 22 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 9 * s, y - 46 * s, 6 * s, 18 * s, -0.15 - ear, 0, Math.PI * 2);
  ctx.ellipse(x + 9 * s, y - 46 * s, 6 * s, 18 * s, 0.15 + ear, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc2d4';
  ctx.beginPath();
  ctx.ellipse(x - 9 * s, y - 46 * s, 3 * s, 12 * s, -0.15 - ear, 0, Math.PI * 2);
  ctx.ellipse(x + 9 * s, y - 46 * s, 3 * s, 12 * s, 0.15 + ear, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7fa3';
  ctx.beginPath();
  ctx.ellipse(x - 8 * s, y - 30 * s, 6 * s, 4 * s, 0.4, 0, Math.PI * 2);
  ctx.ellipse(x + 2 * s, y - 31 * s, 6 * s, 4 * s, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d130f';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sx * 8 * s, y - 15 * s, 2.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,130,160,0.6)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sx * 14 * s, y - 8 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff9eb5';
  ctx.beginPath();
  ctx.arc(x, y - 9 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
}

// A little blue bear cub, the bunny's friend.
export function bear(ctx, x, y, s = 1, wave = 0) {
  ctx.fillStyle = '#8fc4ff';
  ctx.beginPath();
  ctx.ellipse(x, y + 16 * s, 26 * s, 24 * s, 0, 0, Math.PI * 2);
  ctx.arc(x, y - 14 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x - 17 * s, y - 31 * s, 8 * s, 0, Math.PI * 2);
  ctx.arc(x + 17 * s, y - 31 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x + 22 * s, y + 4 * s);
  ctx.rotate(-0.6 - wave);
  ctx.beginPath();
  ctx.ellipse(0, -12 * s, 7 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#dff0ff';
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x, y + 18 * s, 14 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d130f';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sx * 8 * s, y - 17 * s, 2.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y - 9 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,130,160,0.6)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sx * 14 * s, y - 9 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A velvet cinema seat facing +Z, as three geometries (red velvet, dark frame, gold trim)
// for instancing. Seat top at y = 0.43.
export function seatGeos(k) {
  const parts = { velvet: [], frame: [], trim: [] };
  const push = (list, geo, x, y, z, rx = 0) => {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).rotateX(rx).translate(x, y, z);
    g.deleteAttribute('uv');
    parts[list].push(g);
  };
  push('velvet', k.rbox(0.56, 0.14, 0.5, RED, 0.045).geometry, 0, 0.36, 0.02);
  push('velvet', k.rbox(0.56, 0.62, 0.14, RED, 0.045).geometry, 0, 0.72, -0.22, -0.12);
  push('frame', new THREE.BoxGeometry(0.62, 0.1, 0.2), 0, 1.03, -0.26, -0.12);
  for (const s of [-1, 1]) {
    push('frame', new THREE.BoxGeometry(0.07, 0.5, 0.52), s * 0.31, 0.3, 0.0);
    push('trim', new THREE.BoxGeometry(0.1, 0.05, 0.5), s * 0.31, 0.57, 0.02);
  }
  return { velvet: mergeGeometries(parts.velvet), frame: mergeGeometries(parts.frame), trim: mergeGeometries(parts.trim) };
}

// Wallpaper covering 1 m of width and the full wall height, with a panelled wainscot at the bottom.
export function wallpaper(base, stripe, wains, band, { stars = null } = {}) {
  const t = canvasTexture(128, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    if (stars) {
      ctx.fillStyle = stars;
      for (let j = 0; j < 9; j++) {
        const cx = (j % 2 ? 0.25 : 0.75) * w;
        const cy = j * 44 + 22;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 4 : 10;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.fill();
      }
    } else {
      ctx.fillStyle = stripe;
      for (let i = 0; i < 4; i++) ctx.fillRect(i * 32 + 9, 0, 14, h);
    }
    const wy = h * (1 - wains);
    ctx.fillStyle = band;
    ctx.fillRect(0, wy, w, h - wy);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(12, wy + 16, w - 24, 3);
    ctx.fillRect(12, h - 20, w - 24, 3);
    ctx.fillRect(12, wy + 16, 3, h - wy - 36);
    ctx.fillRect(w - 15, wy + 16, 3, h - wy - 36);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, wy - 6, w, 8);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
