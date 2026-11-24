import { THREE, smooth } from './kit.js';

// A soft quilt draped over a mattress: one continuous, double-sided sheet with rounded edges,
// hanging over both sides (x) and the far end (+z), with its near end folded back into a hem.
// Local frame: the hem edge at z = 0, the foot at z = l, x across, top of the mattress at y = top.
// bumps(x, z) -> extra height of the top (people underneath); setK(k) blends them in (0..1).
//
// Sheet parameter s along the length: s < -roll: the folded-back layer (from the fold's free edge
// toward the hem), -roll..0: the rolled hem, 0..V1: the main layer down to the foot drape.

export function makeQuilt({ w, l, top, r = 0.1, drop = 0.3, dropSide = drop, fold = 0.32, thick = 0.05, cell = 0.36, puff = 0.03, seg = 0.055, flare = 0.05, endDrape = true, material, bumps = null, pipe = null }) {
  const arc = (Math.PI * r) / 2;
  const sideLen = arc + Math.max(0, dropSide - r);
  const endLen = endDrape ? arc + Math.max(0, drop - r) : 0;
  const ax = w / 2 - r;
  const az = endDrape ? l - r : l;
  const U0 = ax + sideLen;
  const V1 = az + endLen;
  const rho = thick / 2;
  const rollLen = fold > 0 ? Math.PI * rho : 0;
  const S0 = -(fold + rollLen);
  // Puffy cells line up with the stitches painted on the texture
  const cellsX = Math.max(1, Math.round((2 * U0) / cell));
  const cellsY = Math.max(1, Math.round(V1 / cell));
  const cellU = (2 * U0) / cellsX;
  const cellV = V1 / cellsY;
  if (typeof material === 'function') material = material({ cellsX, cellsY });

  // Rows: fold layer, roll, main. Columns: across.
  const cols = Math.ceil((2 * U0) / seg);
  const rows = [];
  if (fold > 0) {
    const nf = Math.max(3, Math.ceil(fold / seg));
    for (let i = 0; i < nf; i++) rows.push(S0 + (i / nf) * fold);
    const nr = 6;
    for (let i = 0; i < nr; i++) rows.push(-rollLen + (i / nr) * rollLen);
  }
  const nm = Math.ceil(V1 / seg);
  for (let i = 0; i <= nm; i++) rows.push((i / nm) * V1);

  const nu = cols + 1;
  const nv = rows.length;
  const pos = new Float32Array(nu * nv * 3);
  const uvs = new Float32Array(nu * nv * 2);
  const idx = [];
  for (let j = 0; j < nv - 1; j++) {
    for (let i = 0; i < nu - 1; i++) {
      const a = j * nu + i;
      idx.push(a, a + nu, a + 1, a + 1, a + nu, a + nu + 1);
    }
  }
  for (let j = 0; j < nv; j++) {
    const s = rows[j];
    for (let i = 0; i < nu; i++) {
      const k = (j * nu + i) * 2;
      uvs[k] = i / cols;
      // main layer on v 0.14..1, fold and roll on the strip 0..0.12 (painted as the turned-back cover)
      uvs[k + 1] = s >= 0 ? 1 - (0.14 + 0.86 * (s / V1)) : 1 - 0.12 * ((s - S0) / (fold + rollLen));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(idx);

  const n = new THREE.Vector3();
  const p = new THREE.Vector3();
  // Point on the main layer at sheet coords (U, v), without thickness offset.
  const surf = (U, v, k, out, nOut, puffOn) => {
    const au = Math.abs(U);
    const su = U < 0 ? -1 : 1;
    const ex = Math.max(0, au - ax);
    const ez = endDrape ? Math.max(0, v - az) : 0;
    let e = Math.hypot(ex, ez);
    let dx = 0;
    let dz = 0;
    if (e > 1e-6) {
      dx = (ex / e) * su;
      dz = ez / e;
      const emax = (ex * sideLen + ez * endLen) / (ex + ez);
      e = Math.min(e, emax);
    }
    const th = Math.min(e / r, Math.PI / 2);
    let horiz = r * Math.sin(th);
    let vert = -(r - r * Math.cos(th));
    if (e > arc) {
      const t = e - arc;
      vert = -r - t;
      horiz = r + (flare * t * t) / Math.max(0.1, drop);
    }
    const bx = su * Math.min(au, ax);
    const bz = endDrape ? Math.min(v, az) : v;
    out.set(bx + dx * horiz, top + vert, bz + dz * horiz);
    nOut.set(dx * Math.sin(th), Math.cos(th), dz * Math.sin(th));
    if (bumps && k > 0) {
      const wgt = 1 - smooth(0, arc, e);
      if (wgt > 0) out.y += bumps(out.x, out.z) * k * wgt;
    }
    if (puffOn && puff > 0) {
      const fu = (((U + U0) / cellU) % 1 + 1) % 1;
      const fv = ((v / cellV) % 1 + 1) % 1;
      const b = puff * Math.sin(Math.PI * fu) * Math.sin(Math.PI * fv);
      out.addScaledVector(nOut, b);
    }
  };

  let K = -1;
  const build = (k) => {
    for (let j = 0; j < nv; j++) {
      const s = rows[j];
      for (let i = 0; i < nu; i++) {
        const U = -U0 + (i / cols) * 2 * U0;
        if (s >= 0) surf(U, s, k, p, n, true);
        else if (s >= -rollLen) {
          // rolled hem: half a circle from the main layer up to the fold layer, bulging toward -z
          surf(U, 0, k, p, n, false);
          const phi = (-s / rollLen) * Math.PI;
          p.addScaledVector(n, rho * (1 - Math.cos(phi)));
          p.z -= rho * Math.sin(phi);
        } else {
          const v = -(s + rollLen);
          surf(U, v, k, p, n, false);
          const taper = 1 - 0.75 * smooth(fold - 0.08, fold, v);
          p.addScaledVector(n, thick * taper + 0.004);
        }
        const q = (j * nu + i) * 3;
        pos[q] = p.x;
        pos[q + 1] = p.y;
        pos[q + 2] = p.z;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  };
  build(0);

  const quilt = new THREE.Mesh(geo, material);
  quilt.castShadow = true;
  quilt.receiveShadow = true;
  const group = new THREE.Group();
  group.add(quilt);

  // Piping along the bottom hem gives the edge some thickness
  if (pipe) {
    const pts = [];
    const push = (U, v) => {
      surf(U, v, 0, p, n, false);
      const last = pts[pts.length - 1];
      if (!last || last.distanceTo(p) > 0.02) pts.push(p.clone());
    };
    const steps = 40;
    for (let i = 0; i <= steps; i++) push(-U0, (i / steps) * V1);
    if (endDrape) for (let i = 1; i <= steps; i++) push(-U0 + (i / steps) * 2 * U0, V1);
    for (let i = steps; i >= 0; i--) push(U0, (i / steps) * V1);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, thick * 0.45, 8, false), pipe);
    tube.castShadow = true;
    group.add(tube);
  }

  return {
    group,
    mesh: quilt,
    size: { U0, V1, S0 },
    setK(k, force = false) {
      if (!force && Math.abs(k - K) < 0.004) return;
      K = k;
      build(k);
    },
  };
}

// Canvas for the quilt: stitched puffy squares with little hearts and stars, plus the turned-back strip.
export function quiltTexture(canvasTexture, { base = '#ffc9d6', alt = '#ffb8c9', stitch = '#ffffff', motif = '#ff8fb0', strip = '#fff6ee', stripLine = '#ff9eb5', cellsX = 8, cellsY = 7 } = {}) {
  return canvasTexture(1024, 1024, (ctx, W, H) => {
    const top = H * 0.12;
    const mainY = H * 0.14;
    ctx.fillStyle = strip;
    ctx.fillRect(0, 0, W, mainY);
    ctx.fillStyle = stripLine;
    for (let x = 0; x < W; x += 32) {
      ctx.beginPath();
      ctx.arc(x + 16, top * 0.5, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(0, top - 14, W, 6);
    const cw = W / cellsX;
    const ch = (H - mainY) / cellsY;
    for (let i = 0; i < cellsX; i++) {
      for (let j = 0; j < cellsY; j++) {
        const x = i * cw;
        const y = mainY + j * ch;
        ctx.fillStyle = (i + j) % 2 ? alt : base;
        ctx.fillRect(x, y, cw, ch);
        ctx.fillStyle = motif;
        const cx = x + cw / 2;
        const cy = y + ch / 2;
        if ((i + j) % 2) {
          ctx.beginPath();
          ctx.moveTo(cx, cy + 12);
          ctx.bezierCurveTo(cx - 18, cy - 2, cx - 10, cy - 16, cx, cy - 6);
          ctx.bezierCurveTo(cx + 10, cy - 16, cx + 18, cy - 2, cx, cy + 12);
          ctx.fill();
        } else {
          ctx.fillStyle = '#fff3c4';
          ctx.beginPath();
          for (let k = 0; k < 10; k++) {
            const rr = k % 2 ? 5 : 12;
            const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
            ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
          ctx.fill();
        }
      }
    }
    ctx.strokeStyle = stitch;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    for (let i = 0; i <= cellsX; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cw, mainY);
      ctx.lineTo(i * cw, H);
      ctx.stroke();
    }
    for (let j = 0; j <= cellsY; j++) {
      ctx.beginPath();
      ctx.moveTo(0, mainY + j * ch);
      ctx.lineTo(W, mainY + j * ch);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  });
}
