import * as THREE from 'three';

// Roji's YumYum look, taken from Roji's own logo: cream paper, raspberry ink, a pink pointed arch
// and rose-and-vine corners. The logo and the two corners are images in assets/yumyum/; the frame
// and the arch are drawn here so they fit any size (a tall poster, a wide shop sign, a menu card).

export const PAL = {
  cream: '#fcf7e3', // the paper
  paper: '#fffbee', // a lighter paper for cards
  ink: '#cf4569', // the logo
  inkDeep: '#b8365a', // the arch line
  band: '#e0ada9', // the light pink band inside the arch line
  frame: '#d49091', // the thin outer frame
  rose: '#eaa2a5', // petals
  blush: '#f6dcd6', // a soft pink fill
  olive: '#5b6447', // leaves and vines
  oliveDeep: '#454c35',
  gold: '#d9a441', // lanterns and brass
};

const FILES = { logo: 'logo.png', left: 'corner-left.png', right: 'corner-right.png' };
const urlOf = (f) => new URL(`../../../assets/yumyum/${f}`, import.meta.url).href;
export const artUrl = (key) => urlOf(FILES[key]);

let art = null;
const load = (src) =>
  new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
// Resolves to { logo, left, right } (HTMLImageElement or null) once the images are in.
export const artReady = Promise.all(Object.values(FILES).map((f) => load(urlOf(f)))).then(([logo, left, right]) => (art = { logo, left, right }));
export const getArt = () => art;

// The arch's inner edge, left half, traced from the logo: u across (0 left side, 0.5 centre),
// v up (0 at the springline, 1 at the point). Small steps near v 0.9 and 0.52 are part of the shape.
const ARCH = [
  [0.5, 1], [0.4796, 0.94], [0.449, 0.9067], [0.4218, 0.8733], [0.4031, 0.84], [0.3912, 0.8067], [0.3759, 0.7733], [0.3588, 0.74],
  [0.3401, 0.7067], [0.3231, 0.6733], [0.3078, 0.64], [0.2942, 0.6067], [0.2806, 0.5733], [0.267, 0.54], [0.2347, 0.5067],
  [0.2075, 0.4733], [0.1837, 0.44], [0.1616, 0.4067], [0.1429, 0.3733], [0.1241, 0.34], [0.1071, 0.3067], [0.0935, 0.2733],
  [0.0799, 0.24], [0.0663, 0.2067], [0.0544, 0.1733], [0.0425, 0.14], [0.0323, 0.1067], [0.0238, 0.0733], [0.0153, 0.04], [0, 0],
];

// Layout of a frame of size w x h: the unit is 1/672 of the logo's width, scaled for short panels.
export function frameLayout(w, h, { archRatio = 0.51 } = {}) {
  const u = Math.min(w, h * 0.71) / 672;
  const x0 = 42 * u;
  const x1 = w - 42 * u;
  const y0 = 52 * u;
  const y1 = h - 38 * u;
  const A = Math.min(archRatio * (x1 - x0), (w > 1.4 * h ? 0.42 : 0.62) * (y1 - y0));
  return { u, x0, x1, y0, y1, A, spring: y0 + A };
}

// The inside of the arch as a path: pointed top, straight sides, flat bottom.
export function archPath(w, h, opts) {
  const { x0, x1, y1, A, spring } = frameLayout(w, h, opts);
  const W = x1 - x0;
  const p = new Path2D();
  const pts = ARCH.map(([a, v]) => [x0 + a * W, spring - v * A]);
  p.moveTo(x0, y1);
  for (let i = pts.length - 1; i >= 0; i--) p.lineTo(pts[i][0], pts[i][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(x0 + (1 - ARCH[i][0]) * W, pts[i][1]);
  p.lineTo(x1, y1);
  p.closePath();
  return p;
}

// Cream paper, the thin outer frame, the rose corners and the pink arch, like the logo card.
export function drawFrame(ctx, w, h, { corners = true, outer = true, fill = PAL.cream, inside = PAL.cream, ...opts } = {}) {
  const L = frameLayout(w, h, opts);
  const { u, spring } = L;
  const arch = archPath(w, h, opts);
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  if (outer) {
    ctx.strokeStyle = PAL.frame;
    ctx.lineWidth = 7 * u;
    ctx.strokeRect(3.5 * u, 3.5 * u, w - 7 * u, h - 7 * u);
  }
  const a = getArt();
  if (corners && a?.left && a?.right) {
    ctx.save();
    const clip = new Path2D();
    clip.rect(0, 0, w, h);
    clip.addPath(arch);
    ctx.clip(clip, 'evenodd');
    const top = 9 * u;
    const hh = Math.max(10, spring - top + 6 * u);
    const s = hh / a.left.height;
    const cw = Math.min(a.left.width * s, w / 2 - 9 * u);
    ctx.drawImage(a.left, 0, 0, cw / s, a.left.height, 9 * u, top, cw, hh);
    ctx.drawImage(a.right, a.right.width - cw / s, 0, cw / s, a.right.height, w - 9 * u - cw, top, cw, hh);
    ctx.restore();
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.inkDeep;
  ctx.lineWidth = 2 * 21 * u;
  ctx.stroke(arch);
  ctx.strokeStyle = PAL.band;
  ctx.lineWidth = 2 * 14 * u;
  ctx.stroke(arch);
  ctx.fillStyle = inside;
  ctx.fill(arch);
  ctx.restore();
  return L;
}

// The logo, centred on (cx, cy), `width` pixels wide. Returns false until the image has loaded.
export function drawLogo(ctx, cx, cy, width) {
  const img = getArt()?.logo;
  if (!img) return false;
  const h = (width * img.height) / img.width;
  ctx.drawImage(img, cx - width / 2, cy - h / 2, width, h);
  return true;
}

// The whole logo card: frame, arch and logo, as in Roji's drawing. The logo shrinks and moves down
// so it never crosses the arch on short or wide panels.
export function drawPoster(ctx, w, h, { logoWidth = 0.74, logoY = 0.51, ...opts } = {}) {
  const L = drawFrame(ctx, w, h, opts);
  const top = L.spring - 0.4 * L.A + 24 * L.u;
  const bottom = L.y1 - 18 * L.u;
  const lw = Math.min((L.x1 - L.x0) * logoWidth, (bottom - top) / 0.676);
  const lh = lw * 0.676;
  drawLogo(ctx, w / 2, Math.min(Math.max(h * logoY, top + lh / 2), bottom - lh / 2), lw);
  return L;
}

// A canvas texture drawn now and drawn again once the logo images have loaded.
export function themedTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (!getArt()) {
    artReady.then(() => {
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
      tex.needsUpdate = true;
    });
  }
  return tex;
}

// ------------------------------------------------------------------ 3D arches (metres)
// The arch outline: width w, straight sides up to `spring`, then the pointed top rising `rise`, bottom centre at
// (0, 0). inset shrinks it evenly (the band inside a line); bottom is the y of the two bottom corners.
export function archPoints(w, spring, rise, { inset = 0, bottom = inset } = {}) {
  const W = w - 2 * inset;
  const A = Math.max(0.02, rise - inset * 1.3);
  const pts = [[-W / 2, bottom]];
  for (let i = ARCH.length - 1; i >= 0; i--) pts.push([(ARCH[i][0] - 0.5) * W, spring + ARCH[i][1] * A]);
  for (let i = 1; i < ARCH.length; i++) pts.push([(0.5 - ARCH[i][0]) * W, spring + ARCH[i][1] * A]);
  pts.push([W / 2, bottom]);
  return pts;
}
const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
export const archShape = (w, spring, rise, opts) => new THREE.Shape(v2(archPoints(w, spring, rise, opts)));

// A line along the arch, t thick: closed like a window frame, or open at the bottom like a doorway.
export function archRing(w, spring, rise, t, { open = false } = {}) {
  if (!open) {
    const s = archShape(w, spring, rise);
    s.holes.push(new THREE.Path(v2(archPoints(w, spring, rise, { inset: t }))));
    return s;
  }
  const outer = archPoints(w, spring, rise, { bottom: 0 });
  const inner = archPoints(w, spring, rise, { inset: t, bottom: 0 }).reverse();
  return new THREE.Shape(v2([...outer, ...inner]));
}

// ShapeGeometry (or ExtrudeGeometry with depth) whose front UVs run 0 to 1 over its own bounds.
export function shapeGeo(shape, depth = 0, curve = 12) {
  const geo = depth > 0 ? new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: curve }) : new THREE.ShapeGeometry(shape, curve);
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x || 1), (p.getY(i) - b.min.y) / (b.max.y - b.min.y || 1));
  return geo;
}

// ------------------------------------------------------------------ more drawings
// The arch for a doorway: like archPath, but the sides run past the bottom edge with no line across.
export function doorArchPath(w, h, opts) {
  const { x0, x1, A, spring } = frameLayout(w, h, opts);
  const W = x1 - x0;
  const p = new Path2D();
  p.moveTo(x0, h + 60);
  for (let i = ARCH.length - 1; i >= 0; i--) p.lineTo(x0 + ARCH[i][0] * W, spring - ARCH[i][1] * A);
  for (let i = 1; i < ARCH.length; i++) p.lineTo(x0 + (1 - ARCH[i][0]) * W, spring - ARCH[i][1] * A);
  p.lineTo(x1, h + 60);
  return p;
}

// The logo card as a building's portal: frame, rose corners and the pink arch open at the bottom for a door,
// with the logo in the arch above the door. doorTop: the door's top in pixels from the top.
export function drawPortal(ctx, w, h, { doorTop = h * 0.5, fill = PAL.cream, ...opts } = {}) {
  const L = frameLayout(w, h, opts);
  const { u, spring, x0, x1, A } = L;
  const arch = doorArchPath(w, h, opts);
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PAL.frame;
  ctx.lineWidth = 7 * u;
  ctx.strokeRect(3.5 * u, 3.5 * u, w - 7 * u, h - 7 * u);
  const a = getArt();
  if (a?.left && a?.right) {
    ctx.save();
    const clip = new Path2D();
    clip.rect(0, 0, w, h);
    clip.addPath(arch);
    ctx.clip(clip, 'evenodd');
    const top = 9 * u;
    const hh = Math.max(10, spring - top + 6 * u);
    const s = hh / a.left.height;
    const cw = Math.min(a.left.width * s, w / 2 - 9 * u);
    ctx.drawImage(a.left, 0, 0, cw / s, a.left.height, 9 * u, top, cw, hh);
    ctx.drawImage(a.right, a.right.width - cw / s, 0, cw / s, a.right.height, w - 9 * u - cw, top, cw, hh);
    ctx.restore();
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.inkDeep;
  ctx.lineWidth = 42 * u;
  ctx.stroke(arch);
  ctx.strokeStyle = PAL.band;
  ctx.lineWidth = 28 * u;
  ctx.stroke(arch);
  ctx.fillStyle = fill;
  ctx.fill(arch);
  // The biggest logo that fits under the point and above the door (its letters start 12% down, the hearts reach
  // 37% of its width right of centre at the very top)
  const W = x1 - x0;
  const half = (y) => archHalf((spring - y) / A, W) - 8 * u;
  let lw = W * 0.82;
  while (lw > 40) {
    const top = doorTop - 10 * u - lw * 0.676;
    if (half(top + lw * 0.676 * 0.12) >= lw / 2 && half(top) >= lw * 0.37) break;
    lw -= 4;
  }
  drawLogo(ctx, w / 2, doorTop - 10 * u - (lw * 0.676) / 2, lw);
  ctx.restore();
  return { ...L, logoWidth: lw };
}

// Half the arch's inner width at height v (0 springline, 1 point), for an arch W wide.
export function archHalf(v, W) {
  if (v <= 0) return W / 2;
  if (v >= 1) return 0;
  for (let i = ARCH.length - 1; i > 0; i--) {
    const [u0, v0] = ARCH[i];
    const [u1, v1] = ARCH[i - 1];
    if (v <= v1) return (0.5 - (u0 + ((u1 - u0) * (v - v0)) / (v1 - v0 || 1))) * W;
  }
  return 0;
}

// A row of small pink arches with rose corners between them: a frieze for wall bands, `tile` px per arch.
export function drawFrieze(ctx, w, h, { tile = Math.round(h * 1.25), ground = PAL.cream } = {}) {
  ctx.save();
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  const a = getArt();
  const n = Math.max(1, Math.round(w / tile));
  const tw = w / n;
  const lw = Math.max(2, h * 0.05);
  const pad = h * 0.12;
  for (let i = 0; i < n; i++) {
    const ox = i * tw;
    const aw = tw * 0.62;
    const spring = h * 0.6;
    const rise = h * 0.42;
    const p = new Path2D();
    const cx = ox + tw / 2;
    p.moveTo(cx - aw / 2, h - pad);
    for (let k = ARCH.length - 1; k >= 0; k--) p.lineTo(cx + (ARCH[k][0] - 0.5) * aw, spring - ARCH[k][1] * rise);
    for (let k = 1; k < ARCH.length; k++) p.lineTo(cx + (0.5 - ARCH[k][0]) * aw, spring - ARCH[k][1] * rise);
    p.lineTo(cx + aw / 2, h - pad);
    p.closePath();
    if (a?.left && a?.right) {
      ctx.save();
      const clip = new Path2D();
      clip.rect(ox, pad, tw, h - 2 * pad);
      clip.addPath(p);
      ctx.clip(clip, 'evenodd');
      const ch = h - 2 * pad;
      const cw = Math.min(tw / 2, (a.left.width * ch) / a.left.height);
      ctx.drawImage(a.left, ox, pad, cw, ch);
      ctx.drawImage(a.right, ox + tw - cw, pad, cw, ch);
      ctx.restore();
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = lw * 2.4;
    ctx.stroke(p);
    ctx.strokeStyle = PAL.band;
    ctx.lineWidth = lw * 1.4;
    ctx.stroke(p);
    ctx.fillStyle = ground;
    ctx.fill(p);
    heart(ctx, cx, spring + h * 0.02, h * 0.17, PAL.ink);
  }
  ctx.fillStyle = PAL.inkDeep;
  ctx.fillRect(0, 0, w, lw * 1.2);
  ctx.fillRect(0, h - lw * 1.2, w, lw * 1.2);
  ctx.fillStyle = PAL.band;
  ctx.fillRect(0, lw * 1.2, w, lw);
  ctx.fillRect(0, h - lw * 2.2, w, lw);
  ctx.restore();
}

function heart(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.62, y - s * 0.05, x - s * 0.36, y - s * 0.62, x, y - s * 0.24);
  ctx.bezierCurveTo(x + s * 0.36, y - s * 0.62, x + s * 0.62, y - s * 0.05, x, y + s * 0.35);
  ctx.fill();
}

// A square floral tile: the rose corners meet at the tile's corners, a raspberry star sits in the middle.
export function drawTile(ctx, x, y, s, { ground = PAL.cream, edge = PAL.band, star = PAL.ink } = {}) {
  ctx.save();
  ctx.fillStyle = ground;
  ctx.fillRect(x, y, s, s);
  const a = getArt();
  if (a?.left && a?.right) {
    const c = s * 0.5;
    ctx.drawImage(a.left, x, y, c, c);
    ctx.drawImage(a.right, x + s - c, y, c, c);
    ctx.save();
    ctx.translate(x, y + s);
    ctx.scale(1, -1);
    ctx.drawImage(a.left, 0, 0, c, c);
    ctx.drawImage(a.right, s - c, 0, c, c);
    ctx.restore();
  }
  const r = s * 0.12;
  ctx.fillStyle = star;
  for (const rot of [0, Math.PI / 4]) {
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.rotate(rot);
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.restore();
  }
  ctx.fillStyle = PAL.blush;
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s / 2, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, s - ctx.lineWidth, s - ctx.lineWidth);
  ctx.restore();
}

// For DOM cards: the logo card as a data URL, once the images are in.
export async function posterDataUrl(w, h, opts) {
  await artReady;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  drawPoster(c.getContext('2d'), w, h, opts);
  return c.toDataURL('image/png');
}
