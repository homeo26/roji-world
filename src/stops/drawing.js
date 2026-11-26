import { PADS, DIORAMA_OFFSET } from '../world.js';
import { buildOutside, DOOR, B } from './drawing/outside.js';
import studio from './drawing/interior.js';

// Weekend 6: The Little Art Studio. The building and its painting yard outside (drawing/outside.js), and the
// studio inside (drawing/interior.js, drawing/moments.js): easels, the big table, the gallery of saved drawings,
// a still-life corner, a mural wall, the sink, a reading nook and the art teacher.

const ORIGIN = [PADS.drawing[0], PADS.drawing[1] + DIORAMA_OFFSET]; // st.origin of the drawing stop (6.2 m behind its pad)

export default {
  build(st) {
    return buildOutside(st);
  },
  interior: studio,
  door: [ORIGIN[0] + DOOR.x, ORIGIN[1] + B.z1 + 0.35],
};
