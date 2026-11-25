import { PADS, DIORAMA_OFFSET } from '../world.js';
import { buildOutside, BARN, DOOR } from './horse/outside.js';
import stable from './horse/interior.js';

// Weekend 2, Roji's Riding Stable: the barn, the paddock and the pony outside (horse/outside.js),
// and the stable inside (horse/interior.js) with its stalls, tack room, grooming corner, feed room and office.

const ORIGIN = [PADS.horse[0], PADS.horse[1] + DIORAMA_OFFSET];

export default {
  build(st) {
    return buildOutside(st);
  },
  interior: stable,
  door: [ORIGIN[0] + DOOR.x, ORIGIN[1] + BARN.z1 + 0.5],
  // The stop's footprint relative to st.origin, for keeping trees out of it (see the report)
  footprint: { x: 0, z: -1, hw: 6.5, hd: 4 },
};
