import { THREE, COL, rigidKid, addGlasses, makeCat, bakeOne, roundRect, fitText, BOXES } from '../kit.js';
import { CHESS, NPC_TABLE, CARD_NPCS, BEANS, GM, COUNTER, CAT, CHAIR_Y } from './layout.js';

// The people of The Dice House: the game master behind the counter (he walks, waves and talks), players
// at the tables, a girl choosing a game, a dad reading the rules to his little one, and Domino the cat.

const P = Math.PI;

const LOOKS = {
  gm: { id: 'dice-gm', name: 'Game master', gender: 'boy', skin: '#e3b08e', hair: '#2a1a13', hairstyle: 'sidepart', mustache: '#2a1a13', outfit: 'tee-pants', top: '#6d3fd6', bottom: '#3b2b3f', shoes: '#3b2b3f', accent: '#ffd166' },
  mona: { id: 'dice-mona', name: 'Mona', gender: 'girl', skin: '#f2cdb4', hair: '#d9d4cf', hairstyle: 'buns', outfit: 'skirt', top: '#c7a6ff', bottom: '#6b4a7a', shoes: '#7a2e3a', accent: '#ff9eb5' },
  zaid: { id: 'dice-zaid', name: 'Zaid', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', outfit: 'tee-shorts', top: '#ffd166', bottom: '#3f7bf0', shoes: '#ffffff', accent: '#ffd166' },
  yara: { id: 'dice-yara', name: 'Yara', gender: 'girl', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'bob', outfit: 'overalls', top: '#ffffff', bottom: '#7fd8bf', shoes: '#ef5b6f', accent: '#ffd166' },
  omar: { id: 'dice-omar', name: 'Omar', gender: 'boy', skin: '#f8dccb', hair: '#7a4a26', hairstyle: 'spiky', outfit: 'hoodie', top: '#ef5b6f', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' },
  lulu: { id: 'dice-lulu', name: 'Lulu', gender: 'girl', skin: '#9c6a4a', hair: '#141010', hairstyle: 'long', outfit: 'dress', top: '#3fbf7f', bottom: '#3fbf7f', shoes: '#ffd166', accent: '#ffffff' },
  dana: { id: 'dice-dana', name: 'Dana', gender: 'girl', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'buns', outfit: 'skirt', top: '#ff9eb5', bottom: '#8b5cf6', shoes: '#ffffff', accent: '#ffd166' },
  salma: { id: 'dice-salma', name: 'Salma', gender: 'girl', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'ponytail', outfit: 'skirt', top: '#6fb8ff', bottom: '#ffd166', shoes: '#3b2b3f', accent: '#ef5b6f' },
  karim: { id: 'dice-karim', name: 'Karim', gender: 'boy', skin: '#e3b08e', hair: '#141010', hairstyle: 'short', beard: '#141010', outfit: 'tee-pants', top: '#2fb39a', bottom: '#6b5a4a', shoes: '#7a4a26', accent: '#ffd166' },
  adam: { id: 'dice-adam', name: 'Adam', gender: 'boy', skin: '#e3b08e', hair: '#2a1a13', hairstyle: 'curly', outfit: 'overalls', top: '#ffd166', bottom: '#6fb8ff', shoes: '#ef5b6f', accent: '#ffd166' },
};

const GREET = {
  all: ['Welcome to The Dice House!', 'Snacks for the winners. And the losers.', 'The jigsaw in the corner is half done...', 'Psst. Read the score sheet by the door.', 'Card towers never stand here. Never.', 'Pick any box from the library!'],
  roji: ['Dr. Roji! Your usual table?', 'Roji, you are top of the Hall of Fame again.'],
  homama: ['Homama! Here to lose to Roji again?', 'Homama, the score sheet is not on your side.'],
};

// A speech bubble sprite: say(text, seconds), update(dt, worldPos)
export function bubble(parent) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.renderOrder = 8;
  sp.visible = false;
  parent.add(sp);
  let left = 0;
  let k = 0;
  return {
    sprite: sp,
    say(text, secs = 2.8) {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 512, 160);
      c.fillStyle = '#ffffff';
      c.strokeStyle = 'rgba(109,63,214,0.45)';
      c.lineWidth = 6;
      roundRect(c, 8, 8, 496, 108, 46);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(232, 114);
      c.lineTo(256, 150);
      c.lineTo(280, 114);
      c.fill();
      c.fillStyle = COL.ink;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, text, 256, 64, 450, 44, 600);
      tex.needsUpdate = true;
      left = secs;
      sp.visible = true;
    },
    update(dt, pos) {
      left -= dt;
      k += ((left > 0 ? 1 : 0) - k) * Math.min(1, dt * 10);
      sp.visible = k > 0.02;
      sp.position.copy(pos);
      sp.scale.set(1.6 * k, 0.5 * k, 1);
    },
  };
}

export function buildPeople(R) {
  const { K, ictx, add, col, dyn, upd, api } = R;
  const { box, cyl, cone, sph, at } = K;
  const make = (look) => ictx.makeKid(look);
  // Sitting people, merged into the room (they only get speech bubbles from town life)
  const seat = (look, x, z, yaw, { scale = 1, glasses = false, hands = null, y = CHAIR_Y } = {}) => {
    const kid = make(look);
    if (glasses) addGlasses(K, kid, COL.plum);
    rigidKid(kid, { pose: 'sit', hands, bake: false });
    kid.root.scale.setScalar(scale);
    kid.root.position.set(x, y - (scale - 1) * 0.16, z);
    kid.root.rotation.y = yaw;
    add(kid.root);
    return kid;
  };
  seat(LOOKS.mona, CHESS.x - 0.75, CHESS.z, P / 2, { scale: 1.12, glasses: true, hands: 'hold' });
  seat(LOOKS.zaid, CHESS.x + 0.75, CHESS.z, -P / 2, { hands: 'type' });
  seat(LOOKS.yara, NPC_TABLE.x - 0.8, NPC_TABLE.z, P / 2, { hands: 'type' });
  seat(LOOKS.omar, NPC_TABLE.x + 0.8, NPC_TABLE.z, -P / 2, { hands: 'hold' });
  seat(LOOKS.lulu, CARD_NPCS.x - 0.8, CARD_NPCS.z, P / 2, { hands: 'hold' });
  seat(LOOKS.dana, CARD_NPCS.x + 0.8, CARD_NPCS.z, -P / 2, { hands: 'hold' });
  // Fans of cards in the card players' hands
  for (const [x, s] of [[CARD_NPCS.x - 0.48, 1], [CARD_NPCS.x + 0.48, -1]]) {
    for (let k = 0; k < 4; k++) {
      const c = add(at(box(0.004, 0.13, 0.09, k % 2 ? '#ffffff' : '#fff4e3'), x, 0.95 + k * 0.004, CARD_NPCS.z + (k - 1.5) * 0.035));
      c.rotation.set((k - 1.5) * 0.25, 0, -s * 0.35);
    }
  }
  // A dad reading the rules to his little one on the bean bags
  const bb = BEANS[3];
  seat(LOOKS.karim, bb.x, bb.z, 0.3, { scale: 1.18, hands: 'read', y: 0.16 });
  const book = add(at(box(0.3, 0.02, 0.22, COL.rose), bb.x + 0.12, 0.98, bb.z + 0.45));
  book.rotation.set(-0.9, 0.3, 0);
  seat(LOOKS.adam, bb.x - 0.7, bb.z + 0.35, 0.9, { scale: 0.64, y: 0.02 });

  // Salma, choosing a game in the library, a box in her hands. Baked into one piece: town life can turn her.
  const salma = make(LOOKS.salma);
  const held = new THREE.Group();
  held.add(at(box(0.42, 0.1, 0.3, BOXES[6].c), 0, 0, 0));
  held.add(at(box(0.3, 0.104, 0.12, '#ffffff'), 0, 0, 0.04));
  held.rotation.x = -0.5;
  salma.carry(held);
  rigidKid(salma, { pose: 'stand', hands: 'carry' });
  salma.root.position.set(-10.9, 0, -6.6);
  salma.root.rotation.y = 0.55;
  add(dyn(salma.root));
  col({ type: 'circle', x: -10.9, z: -6.6, r: 0.3 });

  // ---------------------------------------------------------------- the game master
  const gm = make(LOOKS.gm);
  gm.root.scale.setScalar(1.15);
  // A purple top hat with a band of dice, and a gold bow tie
  const hat = new THREE.Group();
  hat.add(at(cyl(0.3, 0.3, 0.03, COL.plum, 20), 0, 0, 0));
  hat.add(at(cyl(0.19, 0.2, 0.3, COL.plum, 18), 0, 0.16, 0));
  hat.add(at(cyl(0.205, 0.205, 0.07, COL.sun, 18), 0, 0.06, 0));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * P * 2;
    hat.add(at(box(0.045, 0.045, 0.02, '#ffffff'), Math.sin(a) * 0.21, 0.06, Math.cos(a) * 0.21)).rotation.y = a;
  }
  hat.position.set(0, 0.6, -0.01);
  hat.rotation.x = -0.08;
  gm.head.add(hat);
  bakeOne(hat);
  for (const s of [-1, 1]) {
    const tie = cone(0.05, 0.09, COL.gold, 8);
    tie.rotation.z = (s * P) / 2;
    gm.body.add(at(tie, s * 0.045, 0.74, 0.14));
  }
  gm.body.add(at(sph(0.025, COL.gold, undefined, 8), 0, 0.74, 0.15));
  gm.batch();
  gm.root.position.set(-0.6, 0, GM.z);
  add(dyn(gm.root));
  const gmCol = R.movingCol({ type: 'circle', x: -0.6, z: GM.z, r: 0.3 });
  const say = bubble(R.g);
  R.dyn(say.sprite);
  const STOPS = [
    { x: -2.4, face: 0, hands: null, wait: 4 },
    { x: 0.5, face: P, hands: 'stir', wait: 5 },
    { x: 1.6, face: 0, hands: null, wait: 4 },
    { x: -0.9, face: 0, hands: 'type', wait: 3.5 },
  ];
  const st = { i: 0, wait: 2, x: -0.6, yaw: 0, serve: null, near: false, lastLine: -1 };
  const v = new THREE.Vector3();
  // A round tray with two glasses, for serving
  const tray = new THREE.Group();
  tray.add(at(cyl(0.2, 0.2, 0.02, COL.gold, 18), 0, 0, 0.05));
  for (const dx of [-0.07, 0.07]) tray.add(at(cyl(0.035, 0.03, 0.1, '#ffffff', 10), dx, 0.06, 0.05));
  bakeOne(tray);
  R.gm = {
    kid: gm,
    say: (t, s) => say.say(t, s),
    // Come over to where the snacks go, and stay there until released
    serve(x) {
      st.serve = x;
      gm.carry(tray);
    },
    release() {
      st.serve = null;
      st.wait = 1.5;
      gm.carry(null);
    },
  };
  const lineFor = () => {
    const list = [...GREET.all, ...(GREET[api.playerId] || [])];
    let i = Math.floor(Math.random() * list.length);
    if (i === st.lastLine) i = (i + 1) % list.length;
    st.lastLine = i;
    return list[i];
  };
  upd((dt, t) => {
    const lp = api.localPos(api.player);
    const near = lp.z > COUNTER.z && lp.z < COUNTER.z + 3.2 && lp.x > COUNTER.x0 - 1.2 && lp.x < COUNTER.x1 + 1.2;
    let target = st.serve ?? STOPS[st.i].x;
    let face = st.serve !== null ? 0 : STOPS[st.i].face;
    if (near && !st.near && st.serve === null) {
      // A new customer: turn round, wave, say something
      target = st.x;
      st.wait = Math.max(st.wait, 3.5);
      gm.hands = null;
      gm.emote('wave');
      say.say(lineFor(), 3);
    }
    st.near = near;
    const dx = target - st.x;
    let speed = 0;
    if (Math.abs(dx) > 0.04 && !(near && st.serve === null && st.wait > 0)) {
      speed = 1.0;
      st.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
      face = dx > 0 ? P / 2 : -P / 2;
      gm.hands = st.serve !== null ? 'carry' : null;
    } else {
      if (near && st.serve === null) face = Math.atan2(lp.x - st.x, lp.z - GM.z);
      if (st.serve === null) {
        gm.hands = near ? null : STOPS[st.i].hands;
        st.wait -= dt;
        if (st.wait <= 0 && !near) {
          st.i = (st.i + 1 + Math.floor(Math.random() * 2)) % STOPS.length;
          st.wait = STOPS[st.i].wait;
        }
      } else gm.hands = 'carry';
    }
    const prev = st.yaw;
    st.yaw += Math.atan2(Math.sin(face - st.yaw), Math.cos(face - st.yaw)) * Math.min(1, dt * 7);
    gm.root.position.set(st.x, 0, GM.z);
    gm.root.rotation.y = st.yaw;
    gm.update(dt, t, speed, 0, (st.yaw - prev) / Math.max(dt, 1e-3));
    gmCol.set(st.x, GM.z);
    say.update(dt, v.set(st.x, 2.55, GM.z));
  });

  // ---------------------------------------------------------------- Domino, the café cat (inside today)
  const cat = makeCat(K, { shadow: false });
  cat.root.position.set(CAT.x, 0.1, CAT.z);
  cat.root.rotation.y = 0.2;
  add(dyn(cat.root));
  R.cat = cat;
  R.catHome = new THREE.Vector3(CAT.x, 0.1, CAT.z);
  upd((dt, t) => {
    if (R.catBusy) return;
    const lp = api.localPos(api.player);
    const close = Math.hypot(lp.x - CAT.x, lp.z - CAT.z) < 3.5;
    cat.update(dt, t, close ? api.world(lp.x, lp.z, 1) : null);
  });
}
