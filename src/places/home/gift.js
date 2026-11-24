import { THREE, fit } from './kit.js';
import { easeOutBack, easeOutCubic } from '../../util.js';

// Roji's pillow always hides a present from Homama. She carries it, opens it, and it goes on the gift shelf.
// As Homama you can hide a surprise for her instead.

const GIFTS = ['chocolates', 'candy-jar', 'gold-bracelet', 'gold-necklace', 'barbie', 'flowers', 'teddy', 'perfume', 'earrings', 'ring-box', 'love-letter', 'lipstick', 'handbag', 'tiara', 'music-box', 'photo-frame', 'snow-globe', 'bunny', 'scarf', 'makeup-palette', 'heart-balloon', 'cupcake-box'];
const NAMES = {
  chocolates: 'A box of chocolates',
  'candy-jar': 'A jar of candy',
  'gold-bracelet': 'A gold bracelet',
  'gold-necklace': 'A gold necklace',
  barbie: 'A Barbie doll',
  flowers: 'A bunch of flowers',
  teddy: 'A teddy bear',
  perfume: 'A bottle of perfume',
  earrings: 'A pair of earrings',
  'ring-box': 'A little ring box',
  'love-letter': 'A love letter',
  lipstick: 'A pink lipstick',
  handbag: 'A cute handbag',
  tiara: 'A sparkly tiara',
  'music-box': 'A music box',
  'photo-frame': 'A photo of the two of them',
  'snow-globe': 'A snow globe',
  bunny: 'A fluffy bunny',
  scarf: 'A soft scarf',
  'makeup-palette': 'A makeup palette',
  'heart-balloon': 'A heart balloon',
  'cupcake-box': 'A box of cupcakes',
};
const NOTES = [
  'For the best doctor on the island.',
  'You make every day brighter, Roji.',
  'I am so proud of you, Dr. Roji.',
  'Just because I love you.',
  'For my favourite person in the whole world.',
  'You work so hard. This one is for you.',
  'Every heartbeat says Roji.',
  'Thank you for being you.',
  'You are my sunshine.',
  'I would choose you every single day.',
];
const BOXES = [
  ['#ef5b6f', '#ffd166'],
  ['#6fb8ff', '#ffffff'],
  ['#ffd166', '#ef5b6f'],
  ['#c7a6ff', '#ffffff'],
  ['#7fd3a7', '#ff8fb1'],
  ['#ff9eb5', '#ffffff'],
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// opts: { pillow (Object3D that lifts), under: {x, y, z} where the box hides, slots: [{x, y, z}], hot: {x, z} }
export function setupGifts(R, { pillow, under, slots, hot }) {
  const { api, add } = R;
  const st = { busy: false, carry: null, opening: false, lift: 0, liftTarget: 0, shelf: [] };
  const props = R.ctx.props;
  let catalogue = null;
  const giftList = async () => {
    if (!catalogue) {
      const list = (await props.list('gift').catch(() => [])) || [];
      catalogue = list.length ? list : GIFTS.map((id) => ({ id, name: NAMES[id] }));
    }
    return catalogue;
  };
  const nameOf = (g) => g.name || NAMES[g.id] || 'A little present';

  // Kept gifts on the shelf
  let gen = 0;
  const showShelf = async () => {
    const my = ++gen;
    const ids = api.load('gifts', []);
    const objs = await Promise.all(ids.map((id) => props.gift(id).catch(() => null)));
    if (my !== gen) return;
    for (const o of st.shelf) o.removeFromParent();
    st.shelf = [];
    objs.forEach((o, i) => {
      if (!o || !slots[i]) return;
      const f = fit(o, 0.34);
      f.position.set(slots[i].x, slots[i].y, slots[i].z);
      add(f);
      st.shelf.push(f);
    });
  };
  showShelf();
  R.onEnter(() => showShelf());

  const keep = (id) => {
    const ids = api.load('gifts', []);
    ids.push(id);
    while (ids.length > slots.length) ids.shift();
    api.save('gifts', ids);
    showShelf();
  };

  async function look(a) {
    if (st.busy || R.state.carrying || R.state.eating || a.activityRunning) return;
    st.busy = true;
    st.liftTarget = 1;
    a.sound.ui('swoosh');
    const [color, ribbon] = pick(BOXES);
    const box = await props.giftBox(color, ribbon);
    const wrap = fit(box.root, 0.34);
    if (a.playerId !== 'roji') {
      // Homama hides a surprise
      wrap.position.set(under.x, under.y, under.z);
      wrap.scale.setScalar(0.6);
      add(wrap);
      R.later(1.1, () => {
        st.liftTarget = 0;
        R.later(0.5, () => wrap.removeFromParent());
        a.save('hidden', true);
        a.emote('player', 'heart');
        a.toast('Homama tucks a little surprise under Roji\'s pillow. Shh, it is a secret!', 3200);
        st.busy = false;
      });
      return;
    }
    wrap.position.set(under.x, under.y, under.z);
    add(wrap);
    a.fx.burst(a.world(under.x, under.z, under.y + 0.3), ['#ffd166', '#ffffff', '#ff8fb1'], 18);
    a.sound.ui('pop');
    R.later(0.7, () => {
      wrap.removeFromParent();
      wrap.position.set(0, -0.14, 0.04);
      a.carry('player', wrap);
      R.state.carrying = { box, wrap };
      st.liftTarget = 0;
      const hidden = a.load('hidden', false);
      a.toast(hidden ? 'Homama hid this just for you! Press again to open it.' : 'A present from Homama! Press again to open it.', 3000);
      if (a.homama.kid.pose === 'stand') a.emote('homama', 'heart');
      st.busy = false;
    });
  }

  async function open(a) {
    const c = R.state.carrying;
    if (!c || st.opening) return;
    st.opening = true;
    a.sound.ui('swoosh');
    R.tween(0.9, (k) => c.box.open(easeOutCubic(k)));
    const list = await giftList();
    const g = pick(list);
    const obj = fit(await props.gift(g.id), 0.26);
    obj.position.set(0, 0.36, 0);
    obj.scale.setScalar(0.01);
    R.later(0.6, () => {
      c.wrap.add(obj);
      R.tween(0.7, (k) => {
        obj.scale.setScalar(Math.max(0.01, easeOutBack(k)));
        obj.position.y = 0.3 + k * 0.12;
        obj.rotation.y = k * Math.PI * 2;
      });
      const head = R.headPos(a.player);
      a.fx.burst(head, ['#ef5b6f', '#ffd166', '#ffffff', '#ff8fb1', '#c7a6ff'], 60);
      a.fx.heartsAt(head, 6);
      a.sound.ui('win');
      if (a.homama.kid.pose === 'stand') a.emote('homama', 'heart');
      const note = a.load('hidden', false) ? 'I hid this here this morning. I love you.' : pick(NOTES);
      a.save('hidden', false);
      a.toast(`<b>${nameOf(g)}!</b><br>"${note}" Love, Homama`, 4200);
      R.later(3.4, () => {
        a.carry('player', null);
        a.fx.poof(a.player.pos);
        a.sound.ui('pop');
        R.state.carrying = null;
        st.opening = false;
        keep(g.id);
        a.toast('Roji puts it on her gift shelf.', 2000);
      });
    });
  }

  R.hot(
    {
      x: hot.x,
      z: hot.z,
      r: 1.15,
      label: (a) => (a.playerId === 'roji' ? 'Look under the pillow' : 'Hide a surprise for Roji'),
      icon: 'gift',
      when: () => !R.state.carrying && !st.busy,
      act: look,
    },
    {
      track: (a) => {
        const p = a.localPos(a.player);
        return { x: p.x, z: p.z };
      },
      r: 1.5,
      label: 'Open the gift',
      icon: 'gift',
      when: () => !!R.state.carrying && !st.opening,
      act: open,
    },
  );

  const rest = { y: pillow.position.y, rx: pillow.rotation.x };
  R.upd((dt) => {
    st.lift += (st.liftTarget - st.lift) * Math.min(1, dt * 8);
    pillow.position.y = rest.y + st.lift * 0.22;
    pillow.rotation.x = rest.rx - st.lift * 0.5;
  });
  R.onExit((a) => {
    if (R.state.carrying) {
      a.carry('player', null);
      R.state.carrying = null;
    }
    st.opening = false;
    st.busy = false;
    st.liftTarget = 0;
  });

  return { st, showShelf, THREE };
}
