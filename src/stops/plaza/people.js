import { THREE, P, at, cyl, mat, mesh } from './kit.js';
import { Kid } from '../../kid.js';
import { skinify } from '../../places/zoo/rig.js';
import { freeze } from '../../places/school/kit.js';
import { FLOOR, FLOOR_HALF } from './layout.js';

// The people of the Play Park: the DJ, two dancers on the floor, an old couple slow dancing by the
// fountain, and the popcorn seller. Each is one skinned mesh that still moves like a normal character.

const LOOKS = {
  dj: { id: 'dj', name: 'DJ', gender: 'boy', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'curly', beard: '#2a1a13', outfit: 'hoodie', top: '#8b5cf6', bottom: '#3b2b3f', shoes: '#ffffff', accent: '#ffd166' },
  lina: { id: 'dancer-lina', name: 'Dancer', gender: 'girl', skin: '#e3b08e', hair: '#7a4a26', hairstyle: 'ponytail', outfit: 'skirt', top: '#ffd166', bottom: '#21a99a', shoes: '#ef5b6f', accent: '#ff8fb1' },
  sami: { id: 'dancer-sami', name: 'Dancer', gender: 'boy', skin: '#9c6a4a', hair: '#141010', hairstyle: 'spiky', outfit: 'hoodie', top: '#7fd3a7', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
  grandpa: { id: 'grandpa', name: 'Grandpa', gender: 'boy', skin: '#f2cdb4', hair: '#d6d1cb', hairstyle: 'bald', mustache: '#eeeae5', outfit: 'tee-pants', top: '#7fb8d8', bottom: '#6b5a4a', shoes: '#7a4a26', accent: '#ffd166' },
  grandma: { id: 'grandma', name: 'Grandma', gender: 'girl', skin: '#f2cdb4', hair: '#dcd8d4', hairstyle: 'bob', outfit: 'dress', top: '#c7a6ff', bottom: '#c7a6ff', shoes: '#7a2e3a', accent: '#ff8fb1' },
  seller: { id: 'popcorn-seller', name: 'Popcorn seller', gender: 'girl', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'buns', outfit: 'overalls', top: '#ffffff', bottom: '#e5484d', shoes: '#3b2b3f', accent: '#ffd166' },
};

const SOLO_A = ['twirl', 'hop', 'shimmy', 'dance', 'jazz', 'ballet', 'salsa'];
const SOLO_B = ['robot', 'dance', 'moonwalk', 'hop', 'shimmy', 'salsa', 'jazz'];

function person(ctx, look, x, y, z, yaw, scale, dress) {
  const kid = new Kid(look);
  kid.root.scale.setScalar(scale);
  dress?.(kid);
  freeze(kid, { pose: 'stand' });
  for (const sk of skinify(kid.root, { rough: 0.62 })) {
    sk.computeBoundingSphere();
    sk.boundingSphere.radius += 0.8;
    sk.frustumCulled = true;
    sk.castShadow = false; // a soft blob under each one instead (one mesh for all, see plaza.js)
  }
  ctx.blobs.push({ x, y: y + 0.03, z, r: 0.4 * scale });
  kid.root.position.set(x, y, z);
  kid.root.rotation.y = yaw;
  ctx.g.add(kid.root);
  ctx.dyn.push(kid.root);
  return { kid, x, z, yaw, next: 0, i: 0 };
}

export function buildPeople(ctx, { djAt, cart }) {
  const { col, updaters } = ctx;
  const F = FLOOR;
  const facing = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

  // The DJ in big headphones
  const dj = person(ctx, LOOKS.dj, djAt.x, djAt.y, djAt.z, 0, 1.15, (k) => {
    const band = mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 18, Math.PI), mat(P.ink, { rough: 0.5 }));
    band.position.set(0, 0.3, 0);
    k.head.add(band);
    for (const s of [-1, 1]) {
      const cup = cyl(0.1, 0.1, 0.08, mat(P.pink, { rough: 0.45 }), 14);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(s * 0.33, 0.28, 0);
      k.head.add(cup);
    }
  });
  dj.kid.hands = 'stir';
  col({ type: 'circle', x: djAt.x, z: djAt.z, r: 0.3 });

  // Two dancers at the back corners of the floor
  const da = [-1, 1].map((s, i) => {
    const x = F.x + s * (FLOOR_HALF - 0.42);
    const z = F.z - FLOOR_HALF + 0.45;
    const p = person(ctx, i ? LOOKS.sami : LOOKS.lina, x, 0, z, facing(x, z, F.x, F.z + 2), 1.04);
    p.list = i ? SOLO_B : SOLO_A;
    p.base = p.yaw;
    p.next = i * 1.3;
    col({ type: 'circle', x, z, r: 0.3 });
    return p;
  });

  // Grandpa and Grandma, still slow dancing after all these years
  const CZ = -6.15;
  const gp = person(ctx, LOOKS.grandpa, -4.95, 0, CZ, Math.PI / 2, 1.18);
  const gm = person(ctx, LOOKS.grandma, -4.4, 0, CZ, -Math.PI / 2, 1.12);
  col({ type: 'box', x: -4.675, z: CZ, hw: 0.6, hd: 0.3 });

  // The popcorn seller behind the cart, with a paper hat
  const SPX = cart.x + 1.05;
  const SPZ = cart.z - 0.25;
  const seller = person(ctx, LOOKS.seller, SPX, 0, SPZ, -0.35, 1.12, (k) => {
    k.bow?.removeFromParent();
    const hat = cyl(0.22, 0.25, 0.2, mat(P.ivory, { rough: 0.7 }), 16);
    hat.position.set(0, 0.6, -0.02);
    hat.rotation.x = -0.1;
    k.head.add(hat);
    const band = cyl(0.255, 0.255, 0.05, mat(P.red, { rough: 0.6 }), 16);
    band.position.set(0, 0.53, -0.02);
    band.rotation.x = -0.1;
    k.head.add(band);
  });
  col({ type: 'circle', x: SPX, z: SPZ, r: 0.3 });

  const all = [dj, ...da, gp, gm, seller];
  let wasDancing = false;
  let coupleStep = 0;
  let djNext = 6;
  let sellerNext = 4;
  updaters.push((dt, t, S) => {
    const start = S.dancing && !wasDancing;
    wasDancing = S.dancing;
    // DJ: scratches and nods to the beat, cheers when Roji and Homama take the floor
    if (start) dj.kid.emote('cheer');
    djNext -= dt;
    if (djNext <= 0 && !dj.kid.emoteType) {
      djNext = 7 + Math.random() * 5;
      dj.kid.emote(S.dancing ? ['cheer', 'jazz'][Math.floor(Math.random() * 2)] : S.near > 0.5 ? 'wave' : 'nod');
    }
    // Dancers: their own moves, and a cheer for the couple
    for (const d of da) {
      if (start) {
        d.kid.emote('cheer');
        d.next = 1.8;
      }
      d.next -= dt;
      if (!d.kid.emoteType && d.next <= 0) {
        d.i = (d.i + 1) % d.list.length;
        d.kid.emote(d.list[d.i]);
        d.next = S.dancing ? 0 : 0.8 + Math.random() * 1.2;
        d.yaw = d.base + (Math.random() - 0.5) * 0.9;
      }
      d.kid.root.rotation.y += (d.yaw - d.kid.root.rotation.y) * Math.min(1, dt * 2);
    }
    // The old couple: slow dance, again, a twirl for her, then a hug
    if (!gp.kid.emoteType && !gm.kid.emoteType) {
      const step = coupleStep++ % 4;
      if (step < 2) {
        gp.kid.duet = { side: 1, mirror: 1, hold: 'waist', lead: true };
        gm.kid.duet = { side: -1, mirror: -1, hold: 'shoulders' };
        gp.kid.emote('slow');
        gm.kid.emote('slow');
      } else if (step === 2) {
        gp.kid.duet = gm.kid.duet = null;
        gm.kid.emote('twirl');
        gp.kid.emote('cheer');
      } else {
        gp.kid.emote('hug');
        gm.kid.emote('hug');
      }
    }
    // Popcorn seller: a wave now and then
    sellerNext -= dt;
    if (sellerNext <= 0 && !seller.kid.emoteType) {
      sellerNext = 6 + Math.random() * 6;
      seller.kid.emote(S.dancing ? 'cheer' : 'wave');
    }
    for (const p of all) p.kid.update(dt, t, 0, 0, 0);
    // Head bob to the music
    const bob = Math.sin(S.beat * Math.PI * 2);
    dj.kid.head.rotation.x += (0.08 + 0.1 * Math.max(0, bob)) * (dj.kid.emoteType ? 0.3 : 1);
    seller.kid.head.rotation.z += bob * 0.05;
  });
  return { all };
}
