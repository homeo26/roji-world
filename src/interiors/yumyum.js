import { buildYumYumInterior } from './yumyum/interior.js';

// Inside Roji's YumYum: open kitchen, counter with stools, booths and a jukebox.
export default {
  title: "Roji's YumYum",
  build: (ctx) => buildYumYumInterior(ctx),
};
