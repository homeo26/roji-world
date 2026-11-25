import { buildOutside } from './clay/outside.js';
import { DOOR_WORLD } from './clay/layout.js';
import interior from '../interiors/clay.js';

// Weekend 5, Clay at the Café: the café and pottery studio outside (src/stops/clay/) and the café,
// shop, studio and kiln room inside (src/interiors/clay.js).
export default {
  build: (st) => buildOutside(st),
  interior,
  door: DOOR_WORLD,
};
