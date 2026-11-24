// Roji and Homama's home: a two-storey cottage in a flower garden, and a dollhouse interior with
// a kitchen, living room, bedroom, bathroom and study, and Mishmish the cat.
import { buildExterior } from './home/exterior.js';
import { buildInterior } from './home/interior.js';

export default {
  id: 'home',
  stop: {
    title: "Roji's Home",
    tag: 'Home sweet home',
    icon: 'home',
    color: '#ef5b6f',
    text: 'A cosy cottage full of flowers. Inside: a fridge full of treats, movie nights, bubble baths, Mishmish the cat and a surprise under Roji\'s pillow.',
  },
  icons: {
    paw: 'M12 20.5c-2.6 0-4.6-1.6-4.6-3.6S9.4 13 12 13s4.6 1.9 4.6 3.9-2 3.6-4.6 3.6z M4.2 11.5a1.8 2.2 0 1 0 3.6 0 1.8 2.2 0 1 0-3.6 0 M16.2 11.5a1.8 2.2 0 1 0 3.6 0 1.8 2.2 0 1 0-3.6 0 M7.6 7.4a1.8 2.2 0 1 0 3.6 0 1.8 2.2 0 1 0-3.6 0 M12.8 7.4a1.8 2.2 0 1 0 3.6 0 1.8 2.2 0 1 0-3.6 0',
    gift: 'M4 11h16v9H4z M3 7.5h18V11H3z M12 7.5V20 M12 7.5C10.5 4.5 7 4 7 6s3 1.5 5 1.5z M12 7.5c1.5-3 5-3.5 5-1.5s-3 1.5-5 1.5z',
    fridge: 'M6.5 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M5.5 10h13 M8.5 6v2 M8.5 13v3',
    pot: 'M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M2.5 10h19 M9 10V8.5a3 3 0 0 1 6 0V10 M9 3.5c0 1 1 1 1 2 M13 3c0 1 1 1 1 2',
    bath: 'M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z M6 12V6.5a2 2 0 0 1 4 0 M7 19l-1 2 M17 19l1 2',
    tooth: 'M7.5 3.5C5 3.5 4 5.5 4 8c0 3 1.5 4 2 7s1 5.5 2.4 5.5S10 16 12 16s2.2 4.5 3.6 4.5 1.9-2.5 2.4-5.5 2-4 2-7c0-2.5-1-4.5-3.5-4.5S14 5 12 5 10 3.5 7.5 3.5z',
    baby: 'M9 3h6 M10 3v3 M14 3v3 M8 8.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z M8 12.5h8',
    code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
  },

  build(ctx) {
    const ext = buildExterior(ctx);
    return {
      ...ext,
      pad: { x: 0, z: 6.2 },
      door: { x: 0, z: 0.95 },
      interior: {
        title: "Roji and Homama's home",
        build: (ictx) => buildInterior(ictx),
      },
    };
  },
};
