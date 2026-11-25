// Where everything sits inside the Clay Café (local metres; origin at the room centre, the open front at +Z).
//
//   z -7.6+----------------------------------+------------------------------+
//         | POTTERY STUDIO: aprons, the shelf| KILN ROOM: the kiln, glazes, |
//         | of our pots, three wheels, the   | the glazing table, fresh     |
//         | wheel for two by the window,     | pots, the guests' tile wall  |
//         | wedging table, drying rack       |                              |
//   z 0   +--cutaway wall (door at x -2.4)--+--cutaway wall (door at x 6.5)-+
//         | CAFÉ: counter, barista, cakes,   | SHOP: shelves of pots, the   |
//         | tables, the window seat          | shop counter, the guest book |
//   z 7.6 +-----------------entrance at x 0.2-------------------------------+
//        x -12                             x 2                           x 12

export const X0 = -12;
export const X1 = 12;
export const ZB = -7.6; // inner face of the back wall
export const ZF = 7.6; // front edge of the floor
export const H = 3.3; // wall height
export const CW = 0; // the cutaway walls between the front rooms and the back rooms
export const MID = 2; // café | shop and studio | kiln room
export const STUDIO_DOOR = -2.4; // doorways in the cutaway walls (x), 1.6 m wide
export const KILN_DOOR = 6.5;
export const DOOR_W = 1.6;
export const SIDE_DOOR = [-3.0, -1.4]; // doorway in the studio | kiln room wall (z)

export const ENTRANCE = { x: 0.2, z: 6.95 };
export const COUNTER = { x0: -11.2, x1: -5.8, z: 1.25 }; // the café counter, its front face at z + 0.36
export const CAFE_TABLES = [
  { x: -9.6, z: 4.3, seats: [[-0.62, 0, Math.PI / 2], [0.62, 0, -Math.PI / 2]] },
  { x: -6.5, z: 5.5, seats: [[-0.62, 0, Math.PI / 2], [0.62, 0, -Math.PI / 2]] },
  { x: -3.6, z: 3.8, seats: [[-0.62, 0, Math.PI / 2], [0.62, 0, -Math.PI / 2]] },
];
export const OUR_TABLE = 0; // the table Roji and Homama sit at with their coffee
export const WINDOW_SEAT = { x: -11.45, z0: 2.1, z1: 5.3 }; // along the left wall
export const SHOP_COUNTER = { x: 9.4, z: 1.2 };
export const SHOP_SHELVES = { x: 11.55, z0: 1.9, z1: 5.2 }; // along the right wall
export const SHOP_TABLE = { x: 6.3, z: 3.9 };
export const GUEST_BOOK = { x: 2.9, z: 5.8 };

export const WHEELS = [-7.7, -5.1, -2.5]; // x of the studio wheels, the middle one plays the pottery game
export const WHEEL_Z = -3.1;
export const GHOST = { x: -10.4, z: -5.9 }; // the wheel for two by the studio window
export const SHELF = { x: -5.6, z: ZB + 0.24, planks: [0.82, 1.36, 1.9], slots: [-1.02, -0.34, 0.34, 1.02] };
export const APRONS = { x: -2.6, z: ZB };
export const WEDGE = { x: 0.2, z: -3.4 };
export const RACK = { x: -0.5, z: -5.5 };

export const KILN = { x: 7.6, z: ZB + 1.25 };
export const GLAZE_TABLE = { x: 4.4, z: -3.5 };
export const FRESH = { x: 9.9, z: -3.4 };
export const TILE_WALL = { z0: -6.3, z1: -3.5 }; // on the right wall
