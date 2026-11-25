// Where everything sits inside The Dice House (local metres; origin at the room centre, the open front at +Z).
//
//   z -8   +-------------------+---------------------+-------------------+
//          | GAME LIBRARY      | COUNTER: the game   | COSY CORNER       |
//          | shelves of boxes, | master, snacks, the | bean bags and the |
//          | the ladder        | Hall of Fame        | jigsaw table      |
//   z -1.2 +--cutaway wall-----+                     +--cutaway wall-----+
//          | GAME TABLES       | ENTRANCE: the chess | CARD ROOM         |
//          | X O, Four in a    | table, the coin     | card towers, Rock |
//          | Row               | toss                | Paper Scissors,   |
//          |                   |                     | Snakes and Ladders|
//   z 8    +-------------------+---------------------+-------------------+
//        x -13               x -4.5               x 4.5               x 13

export const X0 = -13;
export const X1 = 13;
export const ZB = -8; // inner face of the back wall
export const ZF = 8; // front edge of the floor
export const H = 3.3; // wall height
export const CW = -1.2; // the cutaway walls in front of the library and the cosy corner
export const SX = 4.5; // centre | wings
export const CUT_DOOR = 1.7; // doorway width in the cutaway walls
export const LIB_DOOR = -8.75;
export const COSY_DOOR = 8.75;
export const SIDE_DOOR = [-4.4, -2.8]; // doorway (z) in the walls between the counter and the back rooms
export const LOW = 1.15; // the low front side walls and partitions
export const PART = [3.4, ZF]; // low partitions between the front rooms (z)

export const ROOMS = {
  lib: { x0: X0, x1: -SX, z0: ZB, z1: CW },
  bar: { x0: -SX, x1: SX, z0: ZB, z1: CW },
  cosy: { x0: SX, x1: X1, z0: ZB, z1: CW },
  tables: { x0: X0, x1: -SX, z0: CW, z1: ZF },
  hall: { x0: -SX, x1: SX, z0: CW, z1: ZF },
  cards: { x0: SX, x1: X1, z0: CW, z1: ZF },
};

// Library
export const SHELVES = [-11.4, -8.75, -6.1]; // units along the back wall (x)
export const SHELF = { w: 2.3, d: 0.42, h: 2.9, planks: [0.1, 0.64, 1.18, 1.72, 2.26, 2.8] };
export const SIDE_SHELF = { x: X0 + 0.22, z: -4.6 };
export const PICK = { x: -8.75, z: -6.35 };

// Counter
export const COUNTER = { x0: -3.3, x1: 2.7, z: -5.2, d: 0.75, h: 1.02 };
export const BACKBAR = { x0: -3.9, x1: 2.5, z: ZB + 0.33, d: 0.6, h: 0.95 };
export const FRIDGE = { x: 3.4, z: ZB + 0.42 };
export const STOOLS = [-2.4, -1.2, 0.0, 1.2];
export const STOOL_Z = -4.45;
export const FAME = { x: -1.9, y: 2.2, w: 2.8, h: 1.45 };
export const MENU = { x: 1.25, y: 2.72, w: 2.2, h: 0.85 };
export const CORK = { x: 5.4, z: CW, y: 1.55 }; // on the cosy corner's cutaway wall, facing the card room
export const GM = { x0: -2.6, x1: 1.9, z: -6.35 };

// Cosy corner
export const PUZZLE = { x: 8.8, z: -4.55, w: 2.0, d: 1.2, h: 0.4, cols: 4, rows: 3, piece: 0.22 };
export const BEANS = [
  { x: 7.4, z: -4.55, c: '#ff9eb5', kid: true },
  { x: 10.2, z: -4.55, c: '#8fd3ff', kid: true },
  { x: 5.9, z: -7.0, c: '#ffd166' },
  { x: 11.9, z: -6.9, c: '#7fd8bf' },
  { x: 12.0, z: -2.6, c: '#c7a6ff' },
];
export const FRAMES = [5.9, 11.7, 8.8]; // finished puzzles hang here (x on the back wall; the last over the window)

// Game tables
export const XO = { x: -10.4, z: 1.3 };
export const C4 = { x: -6.9, z: 1.3 };
export const NPC_TABLE = { x: -8.65, z: 5.3 };

// Entrance
export const CHESS = { x: -2.1, z: 2.4 };
export const COIN = { x: 2.1, z: 2.4 };
export const EXIT = { x: 0, z: 7.4 };

// Card room
export const TOWER = { x: 6.8, z: 1.3 };
export const RPS = { x: 10.6, z: 1.3 };
export const SNAKES = { x: 7.0, z: 5.2 };
export const CARD_NPCS = { x: 10.8, z: 5.3 };
export const CAT = { x: 8.7, z: -0.55 };

export const TABLE_H = 0.75;
export const CHAIR_Y = 0.3; // a kid sitting on a chair (seat top 0.46)
export const STOOL_Y = 0.47; // on a counter stool (seat top 0.63)
export const BEAN_Y = 0.2; // on a bean bag
