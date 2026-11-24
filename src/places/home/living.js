import { THREE, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, canvasTexture, texMat, pattern, pillowGeo, labelDraw, bake, FONT } from './kit.js';
import { makeQuilt } from './quilt.js';
import { rng } from '../../util.js';

// Living room: TV with a cartoon, the cosy sofa with blankets, drawings on the wall, Mishmish's bed.

const LX = -6.0;
const SZ = 0.9; // sofa centre z
const ROSE = '#e8a3a8';
const ROSE2 = '#f2bcc0';

function drawTv(ctx, W, H, t, on) {
  if (!on) {
    ctx.fillStyle = '#26222e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.ellipse(W * 0.3, H * 0.3, W * 0.28, H * 0.16, -0.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const night = Math.floor(t / 12) % 2 === 1;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, night ? '#1d2a5c' : '#7fd0ff');
  g.addColorStop(1, night ? '#6a4a9a' : '#d8f4ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (night) {
    ctx.fillStyle = '#fff6cf';
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.fillRect((i * 67 + t * 6) % W, (i * 29) % (H * 0.6), 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.22, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#fff1a8';
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 110 - t * 14) % (W + 80) + W + 80) % (W + 80) - 40;
      ctx.beginPath();
      ctx.ellipse(cx, 26 + i * 12, 22, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 16, 21 + i * 12, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Rolling hills
  const off = t * 30;
  for (const [y, c, k] of [[H * 0.7, night ? '#2c4a5e' : '#8fd36b', 0.5], [H * 0.8, night ? '#203848' : '#6cc24a', 1]]) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin((x + off * k) * 0.03) * 8);
    ctx.lineTo(W, H);
    ctx.fill();
  }
  // A bunny hopping after a butterfly, or a little rocket at night
  const bx = W * 0.42;
  const hop = Math.abs(Math.sin(t * 4)) * 18;
  const by = H * 0.8 - 14 - hop;
  if (night) {
    const rx = ((t * 40) % (W + 60)) - 30;
    const ry = H * 0.45 - Math.sin(t * 2) * 12;
    ctx.fillStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.ellipse(rx, ry, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(rx - 16, ry);
    ctx.lineTo(rx - 28 - Math.random() * 6, ry - 4);
    ctx.lineTo(rx - 28 - Math.random() * 6, ry + 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rx + 4, ry - 1, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(bx, by, 13, 11, 0, 0, Math.PI * 2);
  ctx.ellipse(bx + 12, by - 9, 8, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(bx + 10, by - 22, 3, 9, -0.2, 0, Math.PI * 2);
  ctx.ellipse(bx + 16, by - 21, 3, 9, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9eb5';
  ctx.beginPath();
  ctx.arc(bx + 18, by - 9, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d130f';
  ctx.beginPath();
  ctx.arc(bx + 14, by - 11, 1.8, 0, Math.PI * 2);
  ctx.fill();
  const fx = bx + 40 + Math.sin(t * 2) * 10;
  const fy = by - 26 + Math.cos(t * 3) * 8;
  const flap = Math.abs(Math.sin(t * 14)) * 6 + 2;
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.ellipse(fx - 4, fy, flap, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(fx + 4, fy, flap, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hearts float up now and then
  const hk = (t * 0.5) % 1;
  if (Math.floor(t * 0.5) % 3 === 0) {
    ctx.globalAlpha = 1 - hk;
    ctx.fillStyle = '#ff6b8a';
    const hx = bx + 6;
    const hy = by - 30 - hk * 40;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 6);
    ctx.bezierCurveTo(hx - 9, hy - 1, hx - 6, hy - 8, hx, hy - 3);
    ctx.bezierCurveTo(hx + 6, hy - 8, hx + 9, hy - 1, hx, hy + 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// A crayon drawing shown in the frames until the drawpad gallery has some
function placeholderDrawing(seed) {
  return canvasTexture(256, 200, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf1';
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (seed === 0) {
      const cols = ['#ef5b6f', '#ffb347', '#ffd166', '#7fd36b', '#6fb8ff', '#a98bff'];
      cols.forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.95, 110 - i * 10, Math.PI, 0);
        ctx.stroke();
      });
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(40, 40, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ff8fb1';
      ctx.beginPath();
      ctx.moveTo(w / 2, 150);
      ctx.bezierCurveTo(40, 90, 70, 20, w / 2, 62);
      ctx.bezierCurveTo(186, 20, 216, 90, w / 2, 150);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 30px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('R + H', w / 2, 104);
    }
    ctx.strokeStyle = '#4a3423';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  });
}

export function buildLiving(R) {
  const { add, L, api } = R;
  const ZB = L.ZB;
  const P = Math.PI;
  const r = rng(5);
  const st = { tvT: 0, ball: 0, hearts: 0 };
  const wood = mat('#c98f5f', { rough: 0.75 });
  const rose = mat(ROSE, { rough: 0.85 });
  const rose2 = mat(ROSE2, { rough: 0.9 });

  // ---------------------------------------------------------------- TV wall
  add(at(rbox(2.4, 0.55, 0.5, wood, 0.04), LX, 0.275, ZB + 0.27));
  for (const s of [-1, 1]) {
    add(at(rbox(1.05, 0.38, 0.03, '#dcab7c', 0.02), LX + s * 0.58, 0.28, ZB + 0.53));
    add(at(sph(0.03, '#f4c24f', { metal: 0.5, rough: 0.3 }, 8), LX + s * 0.58, 0.28, ZB + 0.56));
  }
  R.col({ type: 'box', x: LX, z: ZB + 0.27, hw: 1.2, hd: 0.27, h: 0.55 });
  add(at(rbox(2.1, 1.22, 0.08, '#2a2533', 0.04), LX, 1.45, ZB + 0.06));
  const tvCanvas = document.createElement('canvas');
  tvCanvas.width = 256;
  tvCanvas.height = 144;
  const tvTex = new THREE.CanvasTexture(tvCanvas);
  tvTex.colorSpace = THREE.SRGBColorSpace;
  const tvCtx = tvCanvas.getContext('2d');
  drawTv(tvCtx, 256, 144, 0, false);
  const screen = R.dyn(add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.08), new THREE.MeshBasicMaterial({ map: tvTex })), LX, 1.45, ZB + 0.105)));
  // Speaker, plant and a photo on the cabinet
  add(at(cyl(0.11, 0.09, 0.16, '#e07a55', 12), LX - 0.95, 0.63, ZB + 0.25));
  for (let k = 0; k < 5; k++) add(at(sph(0.08, '#5aa84f', { rough: 0.8 }, 8), LX - 0.95 + Math.cos(k * 1.3) * 0.06, 0.78 + (k % 2) * 0.06, ZB + 0.25 + Math.sin(k * 1.3) * 0.05)).scale.set(0.7, 1.3, 0.7);
  add(rot(at(rbox(0.22, 0.28, 0.03, '#ffffff', 0.01), LX + 0.95, 0.69, ZB + 0.25), -0.15, 0, 0));
  add(rot(at(rbox(0.16, 0.2, 0.01, '#ffd0dc', 0.005), LX + 0.95, 0.69, ZB + 0.268), -0.15, 0, 0));

  // Picture frames with the two latest drawings
  const frames = [];
  for (const [i, x] of [[0, LX - 2.2], [1, LX + 2.2]]) {
    add(at(rbox(0.92, 0.74, 0.05, mat('#f4c24f', { metal: 0.3, rough: 0.4 }), 0.02), x, 1.75, ZB + 0.03));
    const m = umat('#ffffff', { rough: 0.8, map: placeholderDrawing(i) });
    add(at(mesh(new THREE.PlaneGeometry(0.78, 0.6), m, { cast: false }), x, 1.75, ZB + 0.06));
    frames.push(m);
  }
  const loadDrawings = () => {
    try {
      const list = JSON.parse(localStorage.getItem('roji-game-drawpad-gallery') || '[]');
      const urls = list.map((d) => (typeof d === 'string' ? d : d?.src || d?.url || d?.dataUrl)).filter(Boolean);
      urls
        .slice(-2)
        .reverse()
        .forEach((url, i) => {
          const img = new Image();
          img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            frames[i].map = tex;
            frames[i].needsUpdate = true;
          };
          img.src = url;
        });
    } catch {
      /* no drawings yet */
    }
  };
  loadDrawings();
  R.onEnter(loadDrawings);

  // Fairy lights along the top of the wall
  const bulbs = [umat('#fff1a8', { emissive: '#ffd27a', ei: 1.4 }), umat('#ffc2d6', { emissive: '#ff8fb1', ei: 1.2 })];
  const bulbGeo = new THREE.SphereGeometry(0.045, 8, 6);
  for (let i = 0; i <= 24; i++) {
    const k = i / 24;
    const x = -9.3 + k * 6.6;
    const y = 2.9 - Math.sin(((k * 3) % 1) * P) * 0.25;
    add(at(mesh(bulbGeo, bulbs[i % 2], { cast: false }), x, y, ZB + 0.1));
  }

  // ---------------------------------------------------------------- sofa (faces the TV)
  for (const [dx, dz] of [[-1.2, -0.4], [1.2, -0.4], [-1.2, 0.4], [1.2, 0.4]]) add(at(cyl(0.04, 0.03, 0.08, '#8d5a3a', 8), LX + dx, 0.04, SZ + dz));
  add(at(rbox(2.6, 0.26, 1.0, rose, 0.08), LX, 0.2, SZ));
  for (const s of [-1, 1]) {
    add(at(rbox(1.1, 0.2, 0.78, rose2, 0.08), LX + s * 0.57, 0.42, SZ - 0.1));
    add(rot(at(rbox(1.08, 0.42, 0.14, rose2, 0.06), LX + s * 0.57, 0.74, SZ + 0.21), 0.12, 0, 0));
    add(at(rbox(0.3, 0.6, 1.0, rose, 0.12), LX + s * 1.3, 0.4, SZ));
  }
  add(at(rbox(2.6, 0.62, 0.26, rose, 0.1), LX, 0.64, SZ + 0.37));
  for (let k = 0; k < 5; k++) add(at(sph(0.025, '#d98a90', undefined, 8), LX - 1.0 + k * 0.5, 0.75, SZ + 0.505));
  // Throw pillows
  const pg = pillowGeo(0.38, 0.13, 0.36, 16);
  for (const [s, c] of [[-1, '#ffd166'], [1, '#9fd6e3']]) add(rot(at(mesh(pg, mat(c, { rough: 0.9 })), LX + s * 1.0, 0.72, SZ + 0.1), -P / 2 + 0.35, 0, s * 0.12));
  // Knitted throw folded over the left arm
  const knit = pattern(64, 64, '#f6c86b', (ctx) => {
    ctx.strokeStyle = '#e9b04f';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8, 0);
      ctx.bezierCurveTo(i * 8 + 6, 16, i * 8 - 2, 48, i * 8 + 4, 64);
      ctx.stroke();
    }
  });
  knit.repeat.set(3, 3);
  const knitMat = texMat(knit, { rough: 1 });
  add(at(rbox(0.34, 0.05, 0.7, knitMat, 0.025), LX - 1.3, 0.72, SZ + 0.05));
  add(rot(at(rbox(0.05, 0.36, 0.66, knitMat, 0.025), LX - 1.47, 0.55, SZ + 0.05), 0, 0, -0.06));
  R.col({ type: 'box', x: LX, z: SZ, hw: 1.45, hd: 0.5, h: 0.52 });
  // Lap blanket for movie night: draped over both laps and the front of the seat
  const lapTex = pattern(64, 64, '#c7a6ff', (ctx) => {
    ctx.fillStyle = '#b593f5';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) ctx.fillRect(i * 8, j * 8, 8, 8);
  });
  lapTex.repeat.set(5, 3);
  const lap = makeQuilt({
    w: 2.1,
    l: 0.56,
    top: 0.53,
    r: 0.07,
    drop: 0.3,
    dropSide: 0.05,
    fold: 0.12,
    thick: 0.035,
    cell: 0.26,
    puff: 0.012,
    seg: 0.05,
    material: umat('#ffffff', { rough: 1, map: lapTex, side: THREE.DoubleSide }),
    bumps: (x, z) => {
      let b = 0;
      for (const kx of [-0.55, 0.55]) {
        const lat = 1 - smooth(0.12, 0.26, Math.abs(x - kx));
        b = Math.max(b, lat * (0.08 + 0.08 * (1 - smooth(0.05, 0.25, z))));
      }
      return b;
    },
  });
  lap.setK(1);
  lap.group.position.set(LX, 0, SZ + 0.12);
  lap.group.rotation.y = P;
  lap.group.visible = false;
  add(lap.group);
  R.dyn(lap.group);

  // Coffee table with popcorn and cocoa
  const CTZ = -1.55;
  add(at(cyl(0.55, 0.55, 0.06, wood, 28), LX, 0.42, CTZ));
  add(at(cyl(0.07, 0.1, 0.4, '#a8764a', 10), LX, 0.2, CTZ));
  add(at(cyl(0.3, 0.32, 0.03, '#a8764a', 18), LX, 0.015, CTZ));
  add(at(cyl(0.19, 0.13, 0.13, '#e5484d', 16), LX - 0.15, 0.51, CTZ));
  for (let k = 0; k < 5; k++) add(at(box(0.04, 0.13, 0.01, '#ffffff'), LX - 0.15 + Math.cos((k / 5) * P * 2) * 0.165, 0.51, CTZ + Math.sin((k / 5) * P * 2) * 0.165)).rotation.y = -(k / 5) * P * 2 + P / 2;
  for (let i = 0; i < 16; i++) add(at(sph(0.04, i % 4 ? '#fff3cf' : '#ffe08a', { flat: true }, 6), LX - 0.15 + (r() - 0.5) * 0.24, 0.6 + r() * 0.06, CTZ + (r() - 0.5) * 0.24));
  for (const [dx, dz, c] of [[0.22, 0.08, '#ffffff'], [0.3, -0.12, '#ff9eb5']]) {
    add(at(cyl(0.055, 0.05, 0.11, c, 12), LX + dx, 0.505, CTZ + dz));
    add(at(cyl(0.048, 0.048, 0.01, '#8a5a3c', 12), LX + dx, 0.555, CTZ + dz));
    add(rot(at(tor(0.03, 0.01, c, undefined, P * 2, 5, 10), LX + dx + 0.06, 0.51, CTZ + dz), 0, 0, P / 2));
  }
  add(rot(at(rbox(0.18, 0.03, 0.06, '#3b3542', 0.01), LX + 0.05, 0.46, CTZ + 0.3), 0, 0.4, 0));
  R.col({ type: 'circle', x: LX, z: CTZ, r: 0.58, h: 0.45 });

  // Round rug
  const rugTex = (ctx, w) => {
    ctx.fillStyle = '#ffd7b8';
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = '#f2a98a';
    ctx.lineWidth = 9;
    for (const rr of [0.46, 0.34, 0.22, 0.1]) {
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, w * rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(w / 2 + Math.cos(a) * w * 0.4, w / 2 + Math.sin(a) * w * 0.4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  add(rot(at(R.atlas.wrap(new THREE.CircleGeometry(1.6, 40), 256, 256, rugTex), LX, 0.008, -1.1), -P / 2, 0, 0));

  // Floor lamp, a big plant and a bookcase
  const shade = umat('#fff1c9', { emissive: '#ffc977', ei: 0.8, rough: 0.6, side: THREE.DoubleSide });
  add(at(cyl(0.2, 0.22, 0.05, '#3b2b3f', 14), -9.05, 0.025, ZB + 0.55));
  add(at(cyl(0.025, 0.025, 1.7, '#3b2b3f', 8), -9.05, 0.85, ZB + 0.55));
  add(at(mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.4, 18, 1, true), shade), -9.05, 1.85, ZB + 0.55));
  R.col({ type: 'circle', x: -9.05, z: ZB + 0.55, r: 0.24 });
  add(at(cyl(0.3, 0.24, 0.48, '#e07a55', 14), -2.95, 0.24, ZB + 0.55));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * P * 2;
    const leaf = add(at(sph(0.26, i % 2 ? '#4f9a45' : '#5aa84f', { rough: 0.8 }, 10), -2.95 + Math.cos(a) * 0.28, 0.85 + (i % 3) * 0.22, ZB + 0.55 + Math.sin(a) * 0.2));
    leaf.scale.set(0.9, 0.22, 0.55);
    leaf.rotation.set(0.3 * Math.sin(a), -a, 0.5 * Math.cos(a));
  }
  R.col({ type: 'circle', x: -2.95, z: ZB + 0.55, r: 0.34 });
  const bx = -9.33;
  add(at(box(0.34, 1.3, 1.1, wood), bx, 0.65, -2.7));
  for (let s = 0; s < 3; s++) {
    let z = -3.2;
    while (z < -2.25) {
      const bw = 0.06 + r() * 0.05;
      const bh = 0.24 + r() * 0.1;
      add(at(box(0.24, bh, bw, ['#ef5b6f', '#6fb8ff', '#ffd166', '#7fd3a7', '#c7a6ff', '#ffffff'][Math.floor(r() * 6)]), bx + 0.06, 0.12 + s * 0.4 + bh / 2, z + bw / 2));
      z += bw + 0.01;
    }
  }
  R.col({ type: 'box', x: bx, z: -2.7, hw: 0.2, hd: 0.56 });

  // Mishmish's bed with a fish toy, and her yarn ball
  add(at(tor(0.28, 0.1, '#ff9eb5', { rough: 0.95 }, P * 2, 8, 20), -8.55, 0.1, 0.75)).rotation.x = P / 2;
  add(at(cyl(0.3, 0.3, 0.07, '#fff1f4', 20), -8.55, 0.04, 0.75));
  const fish = new THREE.Group();
  fish.add(at(sph(0.06, '#6fb8ff', undefined, 8), 0, 0, 0));
  fish.children[0].scale.set(1.5, 0.8, 0.5);
  fish.add(rot(at(cyl(0, 0.05, 0.06, '#3f7bf0', 4), -0.1, 0, 0), 0, 0, P / 2));
  fish.position.set(-8.05, 0.04, 1.2);
  fish.rotation.y = 0.6;
  add(fish);
  const ball = R.dyn(new THREE.Group());
  ball.add(sph(0.09, '#ff6f9b', { rough: 0.9 }, 12));
  for (let k = 0; k < 3; k++) ball.add(rot(tor(0.09, 0.008, '#ffa6c1', undefined, P * 2, 4, 16), k * 1.1, k * 0.7, 0));
  ball.position.set(-8.0, 0.09, 1.45);
  add(bake(ball));

  // Doormat and a low shoe bench by the front
  const matDraw = labelDraw(['Home sweet home'], { bg: '#e9a86a', border: '#c67a3e', color: '#6b3d1f', radius: 30, under: '#e2b685' });
  add(rot(at(R.atlas.panel(1.2, 0.52, 512, 220, matDraw), LX, 0.01, 4.2), -P / 2, 0, 0));
  add(at(rbox(0.9, 0.3, 0.34, wood, 0.03), -8.3, 0.15, 4.25));
  for (const [dx, c] of [[-0.25, '#ef5b6f'], [-0.12, '#ef5b6f'], [0.12, '#3f7bf0'], [0.25, '#3f7bf0']]) add(at(sph(0.06, c, undefined, 8), -8.3 + dx, 0.34, 4.22)).scale.set(0.8, 0.6, 1.5);
  R.col({ type: 'box', x: -8.3, z: 4.25, hw: 0.46, hd: 0.18, h: 0.3 });

  // ---------------------------------------------------------------- activities
  function movie(a) {
    const spec = R.start('movie', {
      label: 'Get up',
      seats: [
        { who: 'player', x: LX - 0.55, z: SZ - 0.06, y: 0.19, yaw: P, pose: 'sit' },
        { who: 'partner', x: LX + 0.55, z: SZ - 0.06, y: 0.19, yaw: P, pose: 'sit' },
      ],
      focus: { x: LX, z: -1.4, y: 1.3, zoom: 0.62 },
      night: 0.6,
      music: 0.25,
      exit: { x: LX - 0.4, z: SZ + 1.2 },
      update(dt) {
        st.hearts += dt;
        if (st.hearts > 4.5) {
          st.hearts = 0;
          a.fx.heartsAt(a.world(LX, SZ, 1.7), 3);
        }
      },
      onEnd() {
        lap.group.visible = false;
        R.cat.release();
        drawTv(tvCtx, 256, 144, 0, false);
        tvTex.needsUpdate = true;
      },
    });
    if (!spec) return;
    st.hearts = 0;
    lap.group.visible = true;
    R.light.position.set(LX, 1.5, ZB + 1.2);
    R.light.color.set('#b9d2ff');
    R.cat.goTo('sofa');
    a.toast('Movie night! A cosy blanket, popcorn and a cartoon.', 3000);
  }

  function play(a) {
    const spec = R.start('play', {
      label: 'Stop playing',
      seats: [
        { who: 'player', x: LX - 1.55, z: 2.75, y: -0.27, yaw: P / 2, pose: 'sit' },
        { who: 'partner', x: LX + 1.55, z: 2.75, y: -0.27, yaw: -P / 2, pose: 'sit' },
      ],
      focus: { x: LX, z: 2.6, y: 0.6, zoom: 0.5 },
      exit: { x: LX, z: 3.4 },
      update(dt, t) {
        st.ball += dt;
        const k = Math.sin(st.ball * 1.3);
        ball.position.set(LX + k * 1.12, 0.09, 2.75);
        ball.rotation.z = -k * 12;
        const near = Math.abs(k) > 0.92;
        a.player.kid.hands = near && k < 0 ? 'hold' : null;
        a.partner.kid.hands = near && k > 0 ? 'hold' : null;
        if (near && !st.pounced) {
          st.pounced = true;
          if (Math.random() < 0.5) R.cat.meow('Mrrp!');
          a.sound.ui('tick');
        }
        if (!near) st.pounced = false;
      },
      onEnd() {
        R.cat.release();
        ball.position.set(-8.0, 0.09, 1.45);
        a.player.kid.hands = null;
        a.partner.kid.hands = null;
      },
    });
    if (!spec) return;
    st.ball = 0;
    R.cat.hold(
      () => {
        const k = Math.sin(st.ball * 1.3);
        const v = Math.cos(st.ball * 1.3);
        const lead = Math.abs(v) < 0.25 ? 0 : -Math.sign(v) * 0.32;
        return { x: ball.position.x + lead, z: 2.95, y: Math.abs(v) < 0.2 ? 0.1 : 0, crouch: Math.abs(v) < 0.35 ? 1 : 0, speed: 3.2, yaw: Math.abs(v) < 0.2 ? (k > 0 ? P / 2 : -P / 2) : undefined };
      },
      { x: LX, z: 2.95 },
    );
    a.toast('Mishmish chases the yarn ball!', 2400);
  }

  R.hot(
    { x: LX, z: SZ + 1.15, r: 1.3, label: 'Movie night', icon: 'cinema', act: movie },
    { x: LX - 2.6, z: 2.4, r: 1.2, label: 'Play with Mishmish', icon: 'paw', act: play },
  );

  R.upd((dt, t) => {
    const on = R.is('movie');
    if (on) {
      st.tvT += dt;
      if (Math.floor(st.tvT * 12) !== Math.floor((st.tvT - dt) * 12)) {
        drawTv(tvCtx, 256, 144, st.tvT, true);
        tvTex.needsUpdate = true;
      }
      R.light.intensity = 3 + Math.sin(t * 7) * 0.5 + Math.sin(t * 2.3) * 0.4;
    }
    const tw = 0.9 + Math.sin(t * 2.2) * 0.6;
    bulbs[0].emissiveIntensity = 1 + tw * 0.5;
    bulbs[1].emissiveIntensity = 1.6 - tw * 0.5;
    screen.visible = true;
  });
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
