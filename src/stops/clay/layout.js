// Where the Clay Café stop sits, in metres relative to st.origin (world (4, -4.9)); the front faces +Z.
// Footprint: x -5.5 .. 4, z -4 .. 3. The pad is at z 6.2 and the weekend sign at (-3.3, 4.2).

export const ORIGIN = [4, -4.9];
export const B = { x0: -4.4, x1: 2.1, z0: -3.8, z1: -0.8, h: 3.3 }; // the café walls
export const RIDGE = { z: -2.3, y: 4.75 }; // the roof ridge, along x
export const EAVE = 0.42; // roof overhang at the front and back
export const DOOR = { x: -1.1, w: 1.1, h: 2.1 };
export const SHOP = { x: -3.0, w: 1.8, y0: 0.62, y1: 2.12 }; // the shop window with its shelves of pots
export const WIN = { x: 0.85, w: 1.0, y0: 0.9, y1: 2.05 }; // the café window right of the door
export const KILN = { x: 3.05, z: -2.55, r: 0.95 }; // the bottle kiln
export const TERRACE = { x0: -5.3, x1: 3.95, z0: -0.8, z1: 2.85 };
export const TABLE = { x: -3.25, z: 1.55 };
export const WHEEL = { x: 1.65, z: 1.25 };
export const CRATES = { x: 3.25, z: 1.75 };
export const DORMERS = [-3.3, 1.15]; // little lit windows in the front of the roof
export const POSTS = [[-5.3, 2.95], [3.9, 2.95]]; // string light posts

// The door in world metres (the "Go inside" spot just in front of it)
export const DOOR_WORLD = [ORIGIN[0] + DOOR.x, ORIGIN[1] + B.z1 + 0.75];
