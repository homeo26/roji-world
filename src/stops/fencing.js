import { PADS, DIORAMA_OFFSET } from '../world.js';
import { buildOutside, DOOR } from './fencing/outside.js';
import interior from './fencing/interior.js';

// Weekend 3, Fencing: the Roji & Homama Fencing Club. Outside, a small salle d'armes with a practice piste in the yard;
// inside (src/stops/fencing/interior.js), the main hall with three pistes, the changing room, the trophy wall and the stand.

const ORIGIN = [PADS.fencing[0], PADS.fencing[1] + DIORAMA_OFFSET]; // st.origin in the world (6.2 m behind the pad)

export default {
  build(st) {
    const out = buildOutside(st);
    return { badgeY: 6.1, dynamic: out.dynamic, update: out.update };
  },
  interior,
  door: [ORIGIN[0] + DOOR.x, ORIGIN[1] + DOOR.z],
};
