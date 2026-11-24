// The plan of the family home inside (local metres, origin at the middle, the open front at +Z).
// Front row: the majlis (guest sitting room), the entrance and the dining room. Behind them a long
// hallway with the family photos. At the back: the play room, a little inner courtyard with a
// fountain, and the kitchen. Wide openings join the rooms; route() finds the way through them.

export const W = 28;
export const D = 20;
export const X0 = -14;
export const X1 = 14;
export const ZB = -10; // back wall
export const ZH = -3.2; // hallway back wall (front of the back rooms)
export const ZF = 0; // hallway front wall (back of the front rooms)
export const ZE = 10; // open front edge
export const XA = -4.5; // majlis | entrance, play room | courtyard
export const XB = 1.5; // entrance | dining
export const XC = 3.5; // courtyard | kitchen
export const WALL_H = 2.7;
export const T = 0.16; // wall thickness

export const ROOMS = {
  majlis: [X0, XA, ZF, ZE],
  entrance: [XA, XB, ZF, ZE],
  dining: [XB, X1, ZF, ZE],
  hallway: [X0, X1, ZH, ZF],
  play: [X0, XA, ZB, ZH],
  court: [XA, XC, ZB, ZH],
  kitchen: [XC, X1, ZB, ZH],
};

// Openings: axis 'x' = in a wall that runs along x (at z), 'z' = in a wall along z (at x)
export const DOORS = [
  { id: 'majlis', a: 'majlis', b: 'hallway', axis: 'x', x: -7.2, z: ZF, w: 2.0 },
  { id: 'entrance', a: 'entrance', b: 'hallway', axis: 'x', x: -1.5, z: ZF, w: 2.0 },
  { id: 'dining', a: 'dining', b: 'hallway', axis: 'x', x: 5.2, z: ZF, w: 2.0 },
  { id: 'play', a: 'play', b: 'hallway', axis: 'x', x: -7.2, z: ZH, w: 2.0 },
  { id: 'court', a: 'court', b: 'hallway', axis: 'x', x: -0.5, z: ZH, w: 2.2 },
  { id: 'kitchen', a: 'kitchen', b: 'hallway', axis: 'x', x: 6.6, z: ZH, w: 2.0 },
  { id: 'majlis-entrance', a: 'majlis', b: 'entrance', axis: 'z', x: XA, z: 5.6, w: 2.6 },
  { id: 'entrance-dining', a: 'entrance', b: 'dining', axis: 'z', x: XB, z: 5.6, w: 2.6 },
  { id: 'play-court', a: 'play', b: 'court', axis: 'z', x: XA, z: -6.2, w: 2.0 },
  { id: 'court-kitchen', a: 'court', b: 'kitchen', axis: 'z', x: XC, z: -6.2, w: 2.0 },
];

export function roomOf(x, z) {
  for (const [id, [x0, x1, z0, z1]] of Object.entries(ROOMS)) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return id;
  return z > ZF ? 'entrance' : z > ZH ? 'hallway' : 'court';
}

// Waypoints from one room to another: a point on each side of every opening on the way
export function route(fromRoom, toRoom) {
  if (fromRoom === toRoom) return [];
  const prev = { [fromRoom]: null };
  const q = [fromRoom];
  while (q.length) {
    const r = q.shift();
    if (r === toRoom) break;
    for (const d of DOORS) {
      const n = d.a === r ? d.b : d.b === r ? d.a : null;
      if (n && !(n in prev)) {
        prev[n] = { r, d };
        q.push(n);
      }
    }
  }
  if (!(toRoom in prev)) return null;
  const steps = [];
  for (let r = toRoom; prev[r]; r = prev[r].r) steps.unshift(prev[r]);
  const pts = [];
  for (const { r, d } of steps) {
    // r: the room we leave through d
    const [x0, x1, z0, z1] = ROOMS[r];
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    if (d.axis === 'x') {
      const s = Math.sign(cz - d.z) || 1;
      pts.push({ x: d.x, z: d.z + s * 0.75 }, { x: d.x, z: d.z - s * 0.75 });
    } else {
      const s = Math.sign(cx - d.x) || 1;
      pts.push({ x: d.x + s * 0.75, z: d.z }, { x: d.x - s * 0.75, z: d.z });
    }
  }
  return pts;
}

// Clamp a point into a room, a margin from its walls
export function into(room, x, z, m = 0.6) {
  const [x0, x1, z0, z1] = ROOMS[room];
  return { x: Math.max(x0 + m, Math.min(x1 - m, x)), z: Math.max(z0 + m, Math.min(z1 - m, z)) };
}
