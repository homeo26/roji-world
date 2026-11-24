import { THREE, mat, mesh, canvasTexture, box, rbox, cyl, sph, at, rot, texMat, bake, bakeMat, roundRect, FONT, heartGeo } from './kit.js';
import { damp, easeInOut } from '../../util.js';

// The house plan, walls with real doors, and the navigation the partner and Mishmish use.
//
//   z = -9.4  +----------+---------+-----------+----------+   back wall (windows)
//             | Bedroom  | Bath    | Study     | Sunroom  |
//   z = -2.0  +---door---+--door---+---door----+--door----+   cutaway wall
//             |                 Hallway                    |
//   z =  0.6  +------------+--door--+-------door----------+   cutaway wall
//             | Living     door Hall door   Kitchen        |
//   z =  5.0  |  room      +-front--+                      |
//             |            | Porch  |                      |
//   z =  9.2  +------------+--------+----------------------+   front lip (dollhouse, no wall)

export const L = {
  W: 24,
  D: 18.8,
  X0: -12,
  X1: 12,
  ZB: -9.2, // inner face of the back wall
  ZF: 9.2, // front edge of the floor
  H: 3.2, // wall height
  T: 0.2, // wall thickness
  Z1: -2.0, // back rooms | hallway
  Z2: 0.6, // hallway | front rooms
  Z3: 5.0, // front hall | porch (the front door)
  XA: -2.4, // living room | hall and porch
  XB: 2.2, // hall and porch | kitchen
  X1: -3.0, // bedroom | bathroom
  X2: 1.6, // bathroom | study
  X3: 7.4, // study | sunroom
  DW: 1.6, // door gap width
  DH: 2.25, // door gap height
  LOW: 6.6, // front-room side walls step down to a low wall from here to the front
};

// Room rectangles, tiled along the wall centre lines: [x0, x1, z0, z1]
export const ROOMS = {
  bedroom: [-12, L.X1, -9.4, L.Z1],
  bathroom: [L.X1, L.X2, -9.4, L.Z1],
  study: [L.X2, L.X3, -9.4, L.Z1],
  sunroom: [L.X3, 12, -9.4, L.Z1],
  hallway: [-12, 12, L.Z1, L.Z2],
  living: [-12, L.XA, L.Z2, 9.4],
  hall: [L.XA, L.XB, L.Z2, L.Z3],
  porch: [L.XA, L.XB, L.Z3, 9.4],
  kitchen: [L.XB, 12, L.Z2, 9.4],
};

// Room colours: door frame, door leaf, plaque
export const ROOM_LOOK = {
  bedroom: { name: 'Bedroom', icon: 'heart', frame: '#c58fdc', leaf: '#efdcf7', ink: '#7b4a8a' },
  bathroom: { name: 'Bathroom', icon: 'drop', frame: '#5cb8d6', leaf: '#dcf2f9', ink: '#2c6b80' },
  study: { name: 'Study', icon: 'laptop', frame: '#e9b949', leaf: '#fff0c8', ink: '#7a5a1a' },
  sunroom: { name: 'Sunroom', icon: 'leaf', frame: '#7cc47a', leaf: '#e2f4dc', ink: '#3b7a3a' },
  hall: { name: 'Hall', icon: 'key', frame: '#e9a06a', leaf: '#fde6d2', ink: '#8a4f24' },
  living: { name: 'Living room', icon: 'sofa', frame: '#ef8a99', leaf: '#ffe3e8', ink: '#9a3c4c' },
  kitchen: { name: 'Kitchen', icon: 'spoon', frame: '#6cc9a9', leaf: '#dcf5ec', ink: '#2f7a62' },
  front: { name: '', icon: 'heart', frame: '#ffffff', leaf: '#ef6f86', ink: '#ef5b6f' },
};

// Doors. axis 'x': the wall runs along X (door normal along Z). into: the room the leaf swings into.
// hinge: -1 the low jamb (smaller x or z), +1 the high jamb.
export const DOORS = [
  { id: 'front', a: 'porch', b: 'hall', axis: 'x', x: -0.1, z: L.Z3, into: 'hall', hinge: -1, look: 'front', open: 2.55 },
  { id: 'hall', a: 'hall', b: 'hallway', axis: 'x', x: -0.1, z: L.Z2, into: 'hall', hinge: +1, look: 'hall', open: 2.55 },
  { id: 'hall-living', a: 'hall', b: 'living', axis: 'z', x: L.XA, z: 2.8, into: 'living', hinge: +1, look: 'living' },
  { id: 'hall-kitchen', a: 'hall', b: 'kitchen', axis: 'z', x: L.XB, z: 2.8, into: 'kitchen', hinge: +1, look: 'kitchen' },
  { id: 'kitchen', a: 'kitchen', b: 'hallway', axis: 'x', x: 9.4, z: L.Z2, into: 'kitchen', hinge: +1, look: 'kitchen' },
  { id: 'bedroom', a: 'bedroom', b: 'hallway', axis: 'x', x: -4.0, z: L.Z1, into: 'bedroom', hinge: -1, look: 'bedroom' },
  { id: 'bathroom', a: 'bathroom', b: 'hallway', axis: 'x', x: -0.6, z: L.Z1, into: 'bathroom', hinge: -1, look: 'bathroom' },
  { id: 'study', a: 'study', b: 'hallway', axis: 'x', x: 2.8, z: L.Z1, into: 'study', hinge: +1, look: 'study' },
  { id: 'sunroom', a: 'sunroom', b: 'hallway', axis: 'x', x: 10.4, z: L.Z1, into: 'sunroom', hinge: -1, look: 'sunroom' },
];

// ------------------------------------------------------------------ navigation
export function roomOf(x, z) {
  for (const [id, [x0, x1, z0, z1]] of Object.entries(ROOMS)) if (x >= x0 && x < x1 && z >= z0 && z < z1) return id;
  // Outside every rectangle (in a wall): the nearest room centre
  let best = null;
  let bd = Infinity;
  for (const [id, [x0, x1, z0, z1]] of Object.entries(ROOMS)) {
    const dx = Math.max(x0 - x, 0, x - x1);
    const dz = Math.max(z0 - z, 0, z - z1);
    const d = dx * dx + dz * dz;
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  return best;
}

// The two points just either side of a door, keyed by room
function doorSides(d, off = 0.8) {
  const p = d.axis === 'x' ? [[d.x, d.z - off], [d.x, d.z + off]] : [[d.x - off, d.z], [d.x + off, d.z]];
  const out = {};
  for (const [x, z] of p) out[roomOf(x, z)] = { x, z };
  return out;
}

// Rooms to cross from `from` to `to` (BFS over the doors): a list of waypoints through each door.
export function doorPath(from, to, { avoid = [] } = {}) {
  if (from === to) return [];
  const prev = { [from]: null };
  const q = [from];
  while (q.length) {
    const r = q.shift();
    if (r === to) break;
    for (const d of DOORS) {
      const next = d.a === r ? d.b : d.b === r ? d.a : null;
      if (!next || next in prev || avoid.includes(next)) continue;
      prev[next] = { r, d };
      q.push(next);
    }
  }
  if (!(to in prev)) return null;
  const steps = [];
  for (let r = to; prev[r]; r = prev[r].r) steps.unshift(prev[r]);
  const pts = [];
  for (const { r, d } of steps) {
    const s = doorSides(d);
    const next = d.a === r ? d.b : d.a;
    pts.push({ ...s[r], door: d.id }, { ...s[next], door: d.id });
  }
  return pts;
}

// Clamp a point into a room, keeping `m` metres from its walls
export function clampInto(room, x, z, m = 0.45) {
  const [x0, x1, z0, z1] = ROOMS[room];
  const zMax = room === 'porch' || room === 'living' || room === 'kitchen' ? L.ZF - 0.3 : z1 - m;
  return { x: Math.min(x1 - m, Math.max(x0 + m, x)), z: Math.min(zMax, Math.max(z0 + m, z)) };
}

// ------------------------------------------------------------------ textures
// Wallpaper: one canvas covering 1 m of width and the full wall height, wainscot or tiles at the bottom.
export function wallpaper(base, dot, wains, { tiles = null, band = '#ffffff', motif = 'dots' } = {}) {
  const t = canvasTexture(128, 410, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = dot;
    const heart = (cx, cy, s) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + s);
      ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.2, cx - s, cy - s * 1.4, cx, cy - s * 0.6);
      ctx.bezierCurveTo(cx + s, cy - s * 1.4, cx + s * 1.6, cy - s * 0.2, cx, cy + s);
      ctx.fill();
    };
    if (motif === 'stripes') for (let i = 0; i < 4; i++) ctx.fillRect(i * 32 + 8, 0, 12, h);
    else if (motif === 'stars') {
      for (let j = 0; j < 10; j++) {
        for (let i = 0; i < 2; i++) {
          const cx = (i + 0.5 + (j % 2) * 0.5) * 64;
          const cy = j * 30 + 14;
          if ((i + j) % 2) {
            ctx.beginPath();
            for (let k = 0; k < 10; k++) {
              const rr = k % 2 ? 3 : 7;
              const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
              ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            }
            ctx.fill();
          } else heart(cx, cy, 5);
        }
      }
    } else if (motif === 'hearts') {
      for (let j = 0; j < 10; j++) for (let i = 0; i < 2; i++) heart((i + 0.5 + (j % 2) * 0.5) * 64, j * 30 + 16, 4.5);
    } else if (motif === 'leaves') {
      for (let j = 0; j < 9; j++) {
        for (let i = 0; i < 2; i++) {
          const cx = (i + 0.5 + (j % 2) * 0.5) * 64;
          const cy = j * 33 + 16;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(((i + j) % 2 ? 1 : -1) * 0.6);
          ctx.beginPath();
          ctx.ellipse(0, 0, 4, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    } else if (motif === 'boards') {
      ctx.fillStyle = dot;
      for (let y = 0; y < h; y += 26) ctx.fillRect(0, y, w, 3);
    } else {
      for (let j = 0; j < 12; j++) {
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc((i + 0.5 + (j % 2) * 0.5) * 64, j * 26 + 12, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const wy = h * (1 - wains);
    if (tiles) {
      ctx.fillStyle = tiles[0];
      ctx.fillRect(0, wy, w, h - wy);
      ctx.fillStyle = tiles[1];
      const s = 21;
      for (let y = wy + 2; y < h; y += s) for (let x = ((y - wy) / s) % 2 ? s / 2 : 0; x < w; x += s) ctx.fillRect(x + 1.5, y + 1.5, s - 3, s - 3);
    } else if (wains > 0) {
      ctx.fillStyle = band;
      ctx.fillRect(0, wy, w, h - wy);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let x = 0; x < w; x += 32) ctx.fillRect(x, wy, 3, h - wy);
    }
    if (wains > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, wy - 5, w, 7);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function floorTex(kind) {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    if (kind === 'tiles') {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#bfe6d4' : '#fff8ec';
        ctx.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
      ctx.strokeStyle = 'rgba(120,150,140,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo((i * w) / 4, 0);
        ctx.lineTo((i * w) / 4, h);
        ctx.moveTo(0, (i * h) / 4);
        ctx.lineTo(w, (i * h) / 4);
        ctx.stroke();
      }
    } else if (kind === 'wood' || kind === 'lightwood') {
      const [a, b] = kind === 'wood' ? ['#e2b685', '#d8a873'] : ['#f0d2ac', '#e7c497'];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? a : b;
        ctx.fillRect(0, (i * h) / 8, w, h / 8);
        ctx.fillStyle = 'rgba(140,90,50,0.22)';
        ctx.fillRect(0, (i * h) / 8, w, 2);
        ctx.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
        ctx.fillRect((i * 97 + 128) % w, (i * h) / 8, 3, h / 8);
      }
    } else if (kind === 'carpet') {
      ctx.fillStyle = '#f3e6fb';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e6d2f5';
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        ctx.beginPath();
        ctx.arc((i + 0.5 + (j % 2) * 0.5) * (w / 8), (j + 0.5) * (h / 8), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'hex') {
      ctx.fillStyle = '#d5eef3';
      ctx.fillRect(0, 0, w, h);
      const r = 16;
      for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
        const cx = i * r * 1.732 + (j % 2) * r * 0.866;
        const cy = j * r * 1.5;
        ctx.fillStyle = (i * 7 + j * 3) % 5 === 0 ? '#9fd6e3' : '#ffffff';
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
        }
        ctx.fill();
      }
    } else if (kind === 'terra') {
      // Warm terracotta and cream tiles with little diamonds at the corners
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#f2b994' : '#fbe7d3';
        ctx.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
      ctx.fillStyle = '#e48a6a';
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
        ctx.save();
        ctx.translate((i * w) / 4, (j * h) / 4);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      }
    } else if (kind === 'deck') {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#cf9b69' : '#dcab7c';
        ctx.fillRect((i * w) / 6, 0, w / 6 - 3, h);
        ctx.fillStyle = 'rgba(120,70,40,0.25)';
        ctx.fillRect((i * w) / 6, (i * 53) % h, w / 6, 3);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Small line icons painted on plaques and doormats
export function drawIcon(ctx, kind, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const heart = (sz) => {
    ctx.beginPath();
    ctx.moveTo(0, sz * 0.75);
    ctx.bezierCurveTo(-sz * 1.3, -sz * 0.1, -sz * 0.75, -sz * 1.05, 0, -sz * 0.4);
    ctx.bezierCurveTo(sz * 0.75, -sz * 1.05, sz * 1.3, -sz * 0.1, 0, sz * 0.75);
    ctx.fill();
  };
  if (kind === 'heart') heart(s);
  else if (kind === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.1, s * 0.8, s * 0.85, 0, s * 0.85);
    ctx.bezierCurveTo(-s * 0.8, s * 0.85, -s * 0.9, -s * 0.1, 0, -s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.25, s * 0.25, s * 0.12, s * 0.22, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'laptop') {
    roundRect(ctx, -s * 0.8, -s * 0.75, s * 1.6, s * 1.05, s * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 1.05, s * 0.55);
    ctx.lineTo(s * 1.05, s * 0.55);
    ctx.stroke();
    ctx.save();
    ctx.scale(0.35, 0.35);
    ctx.translate(0, -s * 0.6);
    heart(s);
    ctx.restore();
  } else if (kind === 'spoon') {
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.45, s * 0.38, s * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s);
    ctx.stroke();
  } else if (kind === 'sofa') {
    roundRect(ctx, -s * 0.9, -s * 0.35, s * 1.8, s * 0.75, s * 0.2);
    ctx.fill();
    roundRect(ctx, -s * 0.7, -s * 0.8, s * 1.4, s * 0.55, s * 0.18);
    ctx.fill();
    ctx.fillRect(-s * 0.8, s * 0.35, s * 0.14, s * 0.3);
    ctx.fillRect(s * 0.66, s * 0.35, s * 0.14, s * 0.3);
  } else if (kind === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, s * 0.8);
    ctx.bezierCurveTo(-s * 0.9, -s * 0.4, 0, -s, s * 0.85, -s * 0.85);
    ctx.bezierCurveTo(s * 0.9, 0, s * 0.3, s * 0.85, -s * 0.7, s * 0.8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, s * 0.7);
    ctx.quadraticCurveTo(0, 0, s * 0.6, -s * 0.6);
    ctx.stroke();
  } else if (kind === 'key') {
    ctx.beginPath();
    ctx.arc(-s * 0.4, 0, s * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s, 0);
    ctx.moveTo(s * 0.7, 0);
    ctx.lineTo(s * 0.7, s * 0.35);
    ctx.moveTo(s * 0.95, 0);
    ctx.lineTo(s * 0.95, s * 0.28);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ geometry
// A flat quad from 4 corners (counter-clockwise seen from the front) with given uvs
function quadGeo(p, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv.flat(), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

// A wallpaper face covering rectangles [a0, a1] x [y0, y1] along a wall's run, on one side.
// axis 'x': wall along X at z = c; side +1 faces +Z. axis 'z': wall along Z at x = c; side +1 faces +X.
function faceGeo(axis, c, side, rects, H) {
  const gs = [];
  for (const [a0, a1, y0, y1] of rects) {
    if (a1 - a0 < 1e-3 || y1 - y0 < 1e-3) continue;
    let p;
    let uv;
    if (axis === 'x') {
      const z = c;
      // seen from +Z: left = a0 when side +1
      p = side > 0 ? [[a0, y0, z], [a1, y0, z], [a1, y1, z], [a0, y1, z]] : [[a1, y0, z], [a0, y0, z], [a0, y1, z], [a1, y1, z]];
      uv = p.map(([x, y]) => [side > 0 ? x : -x, y / H]);
    } else {
      const x = c;
      p = side > 0 ? [[x, y0, a1], [x, y0, a0], [x, y1, a0], [x, y1, a1]] : [[x, y0, a0], [x, y0, a1], [x, y1, a1], [x, y1, a0]];
      uv = p.map(([, y, z]) => [side > 0 ? -z : z, y / H]);
    }
    gs.push(quadGeo(p, uv));
  }
  return gs;
}

const SIDE = '#f6ead7';

// Build a straight wall with door gaps into `parent`.
// spec: { axis, c, a0, a1, h, holes: [{ at, w, top }], faces: { [+1|-1]: material }, colliders, trimColor }
export function buildWall(parent, spec, mergeGeometries) {
  const { axis, c, a0, a1, h = L.H, holes = [], faces = {}, colliders = null, base = true } = spec;
  const T = spec.T ?? L.T;
  const sideMat = mat(spec.core || SIDE, { rough: 0.9 });
  const white = mat('#ffffff', { rough: 0.6 });
  const hs = [...holes].sort((p, q) => p.at - q.at);
  const spans = [];
  let s = a0;
  for (const o of hs) {
    spans.push([s, o.at - o.w / 2]);
    s = o.at + o.w / 2;
  }
  spans.push([s, a1]);
  const put = (w, hh, along, y, off = 0, m = sideMat, thick = T) => {
    const len = Math.max(0.001, w);
    const b = axis === 'x' ? box(len, hh, thick, m) : box(thick, hh, len, m);
    if (axis === 'x') b.position.set(along, y, c + off);
    else b.position.set(c + off, y, along);
    parent.add(b);
    return b;
  };
  const rects = [];
  for (const [s0, s1] of spans) {
    if (s1 - s0 < 0.01) continue;
    put(s1 - s0, h, (s0 + s1) / 2, h / 2);
    rects.push([s0, s1, 0, h]);
    if (colliders) {
      const mid = (s0 + s1) / 2;
      colliders.push(axis === 'x' ? { type: 'box', x: mid, z: c, hw: (s1 - s0) / 2, hd: T / 2 + 0.01 } : { type: 'box', x: c, z: mid, hw: T / 2 + 0.01, hd: (s1 - s0) / 2 });
    }
  }
  for (const o of hs) {
    const top = o.top ?? L.DH;
    if (top < h - 0.01) {
      put(o.w, h - top, o.at, (top + h) / 2);
      rects.push([o.at - o.w / 2, o.at + o.w / 2, top, h]);
    }
  }
  // Wallpaper faces, base boards and a crown
  for (const sd of [1, -1]) {
    const m = faces[sd];
    if (!m) continue;
    const off = sd * (T / 2 + 0.004);
    const gs = faceGeo(axis, c + off, sd, rects, L.H);
    if (gs.length) {
      const fm = mesh(mergeGeometries(gs, false), m, { cast: false });
      parent.add(fm);
    }
    if (base) {
      for (const [s0, s1] of spans) {
        if (s1 - s0 < 0.05) continue;
        put(s1 - s0, 0.13, (s0 + s1) / 2, 0.065, sd * (T / 2 + 0.015), white, 0.03);
        if (h > 2) put(s1 - s0, 0.08, (s0 + s1) / 2, h - 0.06, sd * (T / 2 + 0.02), white, 0.04);
      }
    }
  }
  // Cap on top so the cut-away stub reads as a wall
  for (const [s0, s1] of spans) if (s1 - s0 > 0.01) put(s1 - s0 + 0.04, 0.06, (s0 + s1) / 2, h + 0.03, 0, mat(spec.cap || '#fffaf2', { rough: 0.6 }), T + 0.05);
  for (const o of hs) if ((o.top ?? L.DH) < h - 0.01) put(o.w, 0.06, o.at, h + 0.03, 0, mat(spec.cap || '#fffaf2', { rough: 0.6 }), T + 0.05);
  return spans;
}

// A painted door frame (casing) on one face, and the leaf that swings open.
// d: a DOORS entry. parent: the wall's group. faces: which faces get a casing (+1/-1 along the normal).
export function buildDoor(parent, d, { faces = [1], atlas, plaqueFaces = [], leaf = true, plaqueParent = null } = {}) {
  const look = ROOM_LOOK[d.look];
  const w = d.w ?? L.DW;
  const top = d.top ?? L.DH;
  const T = L.T;
  const frame = mat(look.frame, { rough: 0.6 });
  const along = d.axis === 'x' ? d.x : d.z;
  const c = d.axis === 'x' ? d.z : d.x;
  const place = (o, a, y, off) => {
    if (d.axis === 'x') o.position.set(a, y, c + off);
    else {
      o.position.set(c + off, y, a);
      o.rotation.y = Math.PI / 2;
    }
    parent.add(o);
    return o;
  };
  for (const sd of faces) {
    const off = sd * (T / 2 + 0.02);
    for (const s of [-1, 1]) place(rbox(0.13, top + 0.06, 0.05, frame, 0.02), along + s * (w / 2 + 0.06), (top + 0.06) / 2, off);
    place(rbox(w + 0.38, 0.14, 0.06, frame, 0.02), along, top + 0.07, off);
    place(rbox(w + 0.5, 0.05, 0.1, '#ffffff', 0.015), along, top + 0.16, off);
  }
  // Inside of the gap (the jambs and the head) in the frame colour
  for (const s of [-1, 1]) place(box(0.03, top, T + 0.02, frame), along + s * (w / 2 - 0.015), top / 2, 0);
  place(box(w, 0.03, T + 0.02, frame), along, top - 0.015, 0);
  for (const sd of plaqueFaces) {
    const off = sd * (T / 2 + 0.05);
    const draw = (ctx, cw, ch) => {
      ctx.fillStyle = look.frame;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#fffaf2';
      roundRect(ctx, 8, 8, cw - 16, ch - 16, 26);
      ctx.fill();
      drawIcon(ctx, look.icon, 52, ch / 2 + 2, 26, look.frame);
      ctx.fillStyle = look.ink;
      ctx.font = `600 44px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      let size = 44;
      while (size > 20) {
        ctx.font = `600 ${size}px ${FONT}`;
        if (ctx.measureText(look.name).width < cw - 120) break;
        size -= 2;
      }
      ctx.fillText(look.name, cw / 2 + 32, ch / 2 + 3);
    };
    const pl = atlas.panel(0.86, 0.26, 320, 96, draw);
    if (sd < 0) pl.rotation.y = Math.PI;
    const holder = new THREE.Group();
    holder.add(pl);
    place(holder, along, top + 0.44, off);
    if (plaqueParent) plaqueParent.add(holder);
    if (d.axis === 'z') holder.rotation.y = sd > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (d.axis === 'z' && sd < 0) pl.rotation.y = 0;
    if (d.axis === 'x' && sd < 0) holder.rotation.y = 0;
  }
  if (!leaf || d.leaf === false) return null;

  // The leaf: hinged on one jamb, it swings into its room and folds back flat against the wall
  const n = d.axis === 'x' ? [0, d.intoSign] : [d.intoSign, 0];
  const d0 = d.axis === 'x' ? [-d.hinge, 0] : [0, -d.hinge];
  const baseYaw = Math.atan2(-d0[1], d0[0]);
  const sgn = n[0] * d0[1] + n[1] * -d0[0] > 0 ? 1 : -1;
  const pivot = new THREE.Group();
  const hingeA = along + d.hinge * (w / 2 - 0.02);
  if (d.axis === 'x') pivot.position.set(hingeA, 0, c + d.intoSign * (T / 2));
  else pivot.position.set(c + d.intoSign * (T / 2), 0, hingeA);
  pivot.rotation.y = baseYaw;
  const lw = w - 0.06;
  const leafMat = mat(look.leaf, { rough: 0.6 });
  // Local frame: +X along the leaf from the hinge, Z its thickness. Pushed back into the gap when closed.
  const zIn = -0.045 * (n[0] * Math.sin(baseYaw) + n[1] * Math.cos(baseYaw));
  const lg = new THREE.Group();
  lg.position.z = zIn;
  lg.add(at(rbox(lw, top - 0.04, 0.06, leafMat, 0.025), lw / 2, (top - 0.04) / 2 + 0.01, 0));
  const panel = mat(look.frame, { rough: 0.6 });
  for (const sd of [-1, 1]) {
    lg.add(at(rbox(lw * 0.36, 0.78, 0.02, panel, 0.02), lw * 0.3, 1.5, sd * 0.035));
    lg.add(at(rbox(lw * 0.36, 0.78, 0.02, panel, 0.02), lw * 0.7, 1.5, sd * 0.035));
    lg.add(at(rbox(lw * 0.76, 0.6, 0.02, panel, 0.02), lw * 0.5, 0.55, sd * 0.035));
    lg.add(at(sph(0.045, mat('#f4c24f', { metal: 0.6, rough: 0.3 }), undefined, 10), lw - 0.14, 1.05, sd * 0.06));
    if (d.id === 'front') lg.add(rot(at(mesh(heartGeo(0.34, 0.03), mat('#fff1c9', { emissive: '#ffc977', ei: 0.7 })), lw * 0.5, 1.62, sd * 0.045), 0, sd < 0 ? Math.PI : 0, 0));
  }
  pivot.add(lg);
  bake(lg);
  parent.add(pivot);
  return { d, pivot, baseYaw, sgn, k: 0, target: 0, wx: d.x, wz: d.z };
}

// Open doors that someone (kid or cat) is close to; close them again behind.
export function updateDoors(doors, openers, dt, onOpen) {
  for (const o of doors) {
    if (!o) continue;
    let near = false;
    for (const p of openers) {
      if (!p) continue;
      const dx = p.x - o.wx;
      const dz = p.z - o.wz;
      if (dx * dx + dz * dz < (p.r ?? 2.1) ** 2) {
        near = true;
        break;
      }
    }
    if (near && o.target === 0) onOpen?.(o);
    o.target = near ? 1 : 0;
    o.k = damp(o.k, o.target, o.target ? 6 : 3.5, dt);
    if (Math.abs(o.k - o.target) < 0.002) o.k = o.target;
    o.pivot.rotation.y = o.baseYaw + o.sgn * easeInOut(Math.min(1, o.k)) * (o.d.open ?? 2.8);
  }
}

export { bakeMat, cyl };
