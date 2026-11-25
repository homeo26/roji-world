import { buildOutside, DOOR } from './fencing/outside.js';
import interior from './fencing/interior.js';

// Weekend 3, Fencing: the Roji & Homama Fencing Club. Outside, a small salle d'armes with a practice piste in the yard;
// inside (src/stops/fencing/interior.js), the main hall with three pistes, the changing room, the trophy wall and the stand.

const ORIGIN = [15, 12.1]; // st.origin in the world (6.2 m behind the pad at (15, 18.3))

export default {
  build(st) {
    const out = buildOutside(st);
    return { badgeY: 6.1, dynamic: out.dynamic, update: out.update };
  },
  interior,
  door: [ORIGIN[0] + DOOR.x, ORIGIN[1] + DOOR.z],
};
