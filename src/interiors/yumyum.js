import { buildYumYumInterior } from './yumyum/interior.js';

// Inside Roji's YumYum: a big restaurant with an entrance and host stand, a dining room, the open kitchen behind
// the counter, a garden terrace with a fountain, an oud lounge, a main dining room with booths and a dessert bar.
export default {
  title: "Roji's YumYum",
  build: (ctx) => buildYumYumInterior(ctx),
};
