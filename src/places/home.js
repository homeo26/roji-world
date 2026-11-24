// Roji and Homama's home: a two-storey cottage in a flower garden, and inside a real house plan seen
// like a dollhouse: the porch and front hall, a long hallway, the living room and kitchen at the front,
// and the bedroom, bathroom, study and sunroom behind it. Mishmish the cat lives here too.
import { buildExterior } from './home/exterior.js';
import { buildInterior } from './home/interior.js';

// After a shift at the hospital Roji comes home tired (and a foot rub in the bedroom helps).
// The town's life events tell us when the hospital game closes; they appear once the game has started.
function watchShifts(api) {
  let tries = 0;
  const hook = () => {
    const life = api.game?.life || (typeof window !== 'undefined' ? window.__roji?.game?.life : null);
    if (life?.on) {
      life.on('arena-end', (id) => {
        if (id === 'patients') api.save('shiftAt', Date.now());
      });
      return;
    }
    if (++tries < 40) setTimeout(hook, 1500);
  };
  setTimeout(hook, 500);
}

export default {
  id: 'home',
  stop: {
    title: "Roji's Home",
    tag: 'Home sweet home',
    icon: 'home',
    color: '#ef5b6f',
    text: 'A cosy cottage full of flowers. Inside: a kitchen for baking, movie nights, slow dances, bubble baths, a sunroom with plants, Mishmish the cat, and a surprise under Roji\'s pillow.',
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
    chat: 'M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M7.5 9.5h9 M7.5 12.5h6',
    cookie: 'M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z M8.5 10.5h.01 M12 15h.01 M15.5 13.5h.01 M9 15.5h.01',
    drop: 'M12 3c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0C6 10.2 9 7 12 3z M9.5 14a2.5 2.5 0 0 0 2.5 2.5',
    dish: 'M3 13h18 M5 13a7 7 0 0 0 14 0 M12 6v2 M8.5 7l1 1.5 M15.5 7l-1 1.5',
    pillow: 'M5 7c2.5-1.5 11.5-1.5 14 0 1.5 2.5 1.5 7.5 0 10-2.5 1.5-11.5 1.5-14 0-1.5-2.5-1.5-7.5 0-10z M9 11h.01 M12 12.5h.01 M15 11h.01',
    photo: 'M4 6h16v13H4z M4 15l4.5-4.5 3.5 3.5 2.5-2.5L20 16 M15.5 9.5h.01',
  },

  build(ctx) {
    const ext = buildExterior(ctx);
    watchShifts(ctx.api);
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
