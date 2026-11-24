// Where everything sits in the big YumYum (local metres; origin at the room centre, the open front at +Z).
//
//   z -10 +--------------------+---------------------------+--------------------+
//         | LOUNGE: oud stage, | OPEN KITCHEN: grill,      | DESSERT AND COFFEE |
//         | majlis, the table  | fryer, island, the cook   | BAR: cake case,    |
//         | reserved for Roji  | ======= COUNTER ========= | Spanish latte,     |
//         | and Homama         |   stools  | shakes  |gap  | restrooms          |
//   z -1  +--cutaway wall------+                           +--cutaway wall------+
//         | GARDEN TERRACE     | DINING: round tables, the | MAIN DINING ROOM:  |
//         | with the fountain  | party table               | booths and tables  |
//         | and fairy lights   | ENTRANCE: host stand      |                    |
//   z 10  +--------------------+---------------------------+--------------------+
//        x -15               x -6                        x 6                  x 15

export const X0 = -15;
export const X1 = 15;
export const Z0 = -10;
export const Z1 = 10;
export const WALL_H = 3.4;
export const CW = -1; // the two cutaway walls between the front rooms and the back rooms
export const CUT_H = 3.2;
export const KW = -3.3; // the kitchen's side walls run from the back wall to here
export const SX = 6; // centre | wings
export const DOOR = { w: 1.8, spring: 1.75, rise: 0.55 }; // arched doorways in the cutaway walls
export const LOUNGE_DOOR = -9.0;
export const DESSERT_DOOR = 7.4;
export const ARCADE = [CW, 2.6, 6.2, 9.65]; // arcade columns along x = +-6 (the first is the cutaway wall's end)

export const SEAT_Y = 0.22; // a kid sitting on a booth bench
export const CHAIR_Y = 0.18; // on a chair
export const STOOL_Y = 0.4; // on a bar stool

export const GRILL = { x: -3.4, z: -9.55 };
export const ISLAND = { x: -2.4, z: -6.9 };
export const COUNTER = { x0: -6, x1: 3.6, z: -3.75 };
export const STOOLS = [-5.2, -4.0, -2.8, -1.6, -0.4, 0.8];
export const STOOL_Z = -2.95;
export const MIX = { x: 2.4, z: -3.85 };
export const MENU = { x: 3.65, y: 1.45, w: 2.9, s: 0.9, r: 0.44 };
export const T1 = { x: -3.4, z: -0.4 };
export const T2 = { x: 3.4, z: -0.4 };
export const T3 = { x: 3.4, z: 3.4 };
export const PARTY = { x: -3.4, z: 3.4, r: 0.55 };
export const HOST = { x: 2.4, z: 7.6 };

export const FOUNTAIN = { x: -10.5, z: 4.4, r: 1.3 };
export const GARDEN_TABLES = [{ x: -13.3, z: 1.2 }, { x: -7.8, z: 1.0 }, { x: -13.3, z: 7.8 }, { x: -7.8, z: 7.9 }];
export const STAGE = { x: -12.9, z: -8.6, w: 4.0, d: 2.6, h: 0.32 };
export const RUG = { x: -12.6, z: -5.4, r: 1.25 };
export const RESERVED = { x: -7.55, z: -8.3 };
export const MAJLIS = { x: -14.45, z: -4.3, len: 3.2 };

export const BOOTHS = [{ x: 10.3, z: 0.1 }, { x: 13.1, z: 0.1 }];
export const WALL_BOOTHS = [{ x: 13.9, z: 3.6 }, { x: 13.9, z: 6.8 }];
export const E1 = { x: 8.6, z: 3.6 };
export const E2 = { x: 9.6, z: 7.2 };
export const BAR = { x0: 7.6, x1: 13.8, z: -6.9 };
export const LATTE_STOOLS = [10.9, 11.9, 12.9];
export const LATTE_Z = -6.1;
export const BARISTA = { x: 12.4, z: -7.75 };
export const CAFE = [{ x: 8.6, z: -3.4 }, { x: 11.8, z: -3.2 }];
export const RESTROOM = { x: 14.9, z: -3.6 };

// The waiters' loops: every leg runs along a clear aisle. hub: the stop errands start from and come back to.
export const ROUTE_A = [
  { x: 4.4, z: -3.3, wait: 2.2, face: Math.PI },
  { x: 1.3, z: -1.7 },
  { x: 1.9, z: -0.4, wait: 2.4, face: Math.PI / 2 },
  { x: 1.3, z: 2.0 },
  { x: -1.85, z: 3.4, wait: 2.2, face: -Math.PI / 2 },
  { x: -1.3, z: 0.6 },
  { x: -1.9, z: -0.4, wait: 2.2, face: -Math.PI / 2 },
  { x: -1.2, z: -1.8 },
];
export const HUB_A = 1;
export const ROUTE_B = [
  { x: 5.0, z: -3.0, wait: 2.0, face: Math.PI },
  { x: 5.0, z: 4.4 },
  { x: 7.2, z: 4.4 },
  { x: 7.4, z: 1.8 },
  { x: 10.3, z: 1.5, wait: 2.4, face: Math.PI },
  { x: 12.0, z: 2.0 },
  { x: 13.1, z: 1.5, wait: 2.2, face: Math.PI },
  { x: 12.6, z: 3.6, wait: 2.2, face: Math.PI / 2 },
  { x: 11.0, z: 5.4 },
  { x: 7.2, z: 5.0 },
  { x: 5.0, z: 4.4 },
];
export const HUB_B = 0;
