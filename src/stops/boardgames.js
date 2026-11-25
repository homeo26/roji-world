import { PADS, DIORAMA_OFFSET } from '../world.js';
import { buildOutside, DOOR_LOCAL } from './boardgames/outside.js';
import interior from './boardgames/interior.js';

// Weekend 4: The Dice House, a board game café. Outside: a stack of game boxes with a die on the roof,
// a giant chessboard terrace and tables with games going on. Inside: shelves of games, the four café
// games at their own tables, a jigsaw to finish together, card towers, a coin toss and snacks.

const [px, pz] = PADS.boardgames;

export default {
  build: (st) => buildOutside(st),
  interior,
  door: [px + DOOR_LOCAL.x, pz + DIORAMA_OFFSET + DOOR_LOCAL.z],
};
