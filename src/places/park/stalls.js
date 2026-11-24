import { THREE, P, inst, bulbs, stripes, toGeo, vcMat, colorBake, fitText, roundRect, heartPath, drawStar, drawLogo, FONT, smooth } from './parts.js';
import { mat, umat, mesh, canvasTexture } from '../../util.js';
import { skinify } from '../zoo/rig.js';
import { freeze } from '../school/kit.js';
import { sfx } from './music.js';

// The little things round the park: the games alley with four booths, the cotton candy and churros
// cart, the balloon seller, the photo spot with the castle behind, the people who work here, and a
// few sweet moments (Homama steals a bite, a heart balloon for Roji, a bench with a plaque).

const LOOK = (name, gender, o) => ({ id: name.toLowerCase(), name, gender, skin: '#f2cdb4', hair: '#2a1a13', hairstyle: gender === 'girl' ? 'ponytail' : 'short', outfit: gender === 'girl' ? 'skirt' : 'tee-pants', top: P.lilac, bottom: '#3f4a7a', shoes: '#3b2b3f', accent: P.pink, ...o });
export const PEOPLE = {
  tickets: LOOK('Lina', 'girl', { top: '#ef5b6f', bottom: '#3f4a7a', hairstyle: 'bob', hair: '#4a2c1a', skin: '#e3b08e' }),
  cart: LOOK('Sami', 'boy', { top: '#ff9eb5', bottom: '#fff4e3', hair: '#141010', mustache: true, skin: '#c98f68' }),
  balloons: LOOK('Rana', 'girl', { top: '#ffd166', bottom: '#8b5cf6', hairstyle: 'buns', hair: '#7a4a26', skin: '#f8dccb' }),
  operator: LOOK('Karim', 'boy', { top: '#3f5fb0', bottom: '#2c3e66', hair: '#2a1a13', hairstyle: 'sidepart', skin: '#e3b08e' }),
  games: LOOK('Huda', 'girl', { top: '#7fd8bf', bottom: '#3f4a7a', hairstyle: 'long', hair: '#141010', skin: '#c98f68' }),
};

const BOOTHS = [
  { name: 'Ring Toss', color: '#ef5b6f', stripe: '#fff4e3' },
  { name: 'Hook a Duck', color: '#6fb8ff', stripe: '#fff4e3' },
  { name: 'Balloon Darts', color: '#ffc23d', stripe: '#fff4e3' },
  { name: 'Whack-a-Mole', color: '#3fbf9f', stripe: '#fff4e3' },
];

function sign(atlas, w, h, text, { bg = '#ef5b6f', ink = '#ffffff', edge = '#ffffff', px = 64 } = {}) {
  return atlas.panel(w, h, Math.round(w * 200), Math.round(h * 200), (c, cw, ch) => {
    c.fillStyle = bg;
    roundRect(c, 4, 4, cw - 8, ch - 8, Math.min(cw, ch) * 0.35);
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = edge;
    c.stroke();
    c.fillStyle = ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, text, cw / 2, ch / 2 + 3, cw * 0.84, Math.min(px, ch * 0.55));
  });
}

// A small plush (teddy or bunny) as a few spheres
function plush(k, color, bunny = false, s = 1) {
  const g = new THREE.Group();
  g.add(k.at(k.sph(0.16 * s, color, undefined, 10), 0, 0.16 * s, 0));
  g.add(k.at(k.sph(0.13 * s, color, undefined, 10), 0, 0.4 * s, 0));
  g.add(k.at(k.sph(0.06 * s, '#fff4e3', undefined, 8), 0, 0.37 * s, 0.11 * s));
  for (const x of [-1, 1]) {
    if (bunny) g.add(k.at(k.cyl(0.03 * s, 0.035 * s, 0.22 * s, color, 6), x * 0.06 * s, 0.6 * s, 0));
    else g.add(k.at(k.sph(0.05 * s, color, undefined, 8), x * 0.1 * s, 0.52 * s, 0));
    g.add(k.at(k.sph(0.015 * s, '#3b2b3f', undefined, 5), x * 0.045 * s, 0.43 * s, 0.115 * s));
  }
  return g;
}

export function buildStalls(ctx, k, atlas, S) {
  const { api, makeKid } = ctx;
  const root = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const hotspots = [];
  const people = [];
  const person = (look, x, y, z, yaw, opts = {}) => {
    const kid = makeKid(look);
    kid.root.scale.setScalar(opts.scale ?? 1.16);
    kid.root.position.set(x, y, z);
    kid.root.rotation.y = yaw;
    kid.hands = opts.hands ?? null;
    // fewer segments on the curved parts (they are small on screen), then one skinned mesh
    freeze(kid, { pose: 'stand', hands: kid.hands });
    kid.root.updateMatrixWorld(true);
    for (const sk of skinify(kid.root, { rough: 0.62 })) {
      sk.computeBoundingSphere();
      sk.boundingSphere.radius += 0.6;
      sk.frustumCulled = true;
    }
    root.add(kid.root);
    dynamic.push(kid.root);
    const p = { kid, yaw, x, z, wave: 3 + Math.random() * 4, hands: kid.hands };
    people.push(p);
    if (!opts.noCollide) colliders.push({ type: 'circle', x, z, r: 0.36 });
    return p;
  };

  // ------------------------------------------------ the games alley
  const A = S.alley;
  const alley = new THREE.Group();
  alley.position.set(A.x, 0, A.z);
  root.add(alley);
  const BW = 2.55;
  const ducks = [];
  const moles = [];
  alley.add(k.at(k.box(BW * 4 + 0.5, 0.16, 2.6, P.stoneDark), 0, 0.08, 0));
  alley.add(k.at(k.box(BW * 4 + 0.4, 3.0, 0.2, P.cream), 0, 1.66, -1.15));
  const boothStripes = (scallop, h) => {
    const t = canvasTexture(1280, h, (c, w) => {
      BOOTHS.forEach((b, i) => {
        for (let j = 0; j < 10; j++) {
          c.fillStyle = j % 2 ? b.stripe : b.color;
          c.fillRect(i * 320 + j * 32, 0, 33, h);
        }
      });
      if (scallop) {
        c.globalCompositeOperation = 'destination-out';
        for (let j = 0; j < 40; j++) {
          c.beginPath();
          c.arc(j * 32 + 16, h + 16 * 0.35, 16, 0, Math.PI * 2);
          c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      }
    });
    return t;
  };
  const awMat = umat('#ffffff', { map: boothStripes(false, 64), rough: 0.7, side: THREE.DoubleSide });
  const vm = umat('#ffffff', { map: boothStripes(true, 48), rough: 0.7, side: THREE.DoubleSide });
  vm.alphaTest = 0.5;
  BOOTHS.forEach((b, i) => {
    const x = (i - 1.5) * BW;
    // side walls between booths
    for (const s of [-1, 1]) alley.add(k.at(k.box(0.14, 2.6, 2.3, b.color), x + s * (BW / 2 - 0.07), 1.46, -0.05));
    // counter
    alley.add(k.at(k.rbox(BW - 0.3, 0.95, 0.5, '#fff4e3', 0.04), x, 0.635, 1.0));
    alley.add(k.at(k.box(BW - 0.2, 0.08, 0.6, b.color), x, 1.13, 1.0));
    // the awning (one striped texture for all four booths, each takes its quarter)
    const band = (g) => {
      const uv = g.attributes.uv;
      for (let j = 0; j < uv.count; j++) uv.setX(j, (i + uv.getX(j)) / 4);
      return g;
    };
    const aw = mesh(band(new THREE.PlaneGeometry(BW, 1.0)), awMat);
    aw.position.set(x, 2.95, 0.95);
    aw.rotation.x = -1.0;
    alley.add(aw);
    const val = mesh(band(new THREE.PlaneGeometry(BW, 0.28)), vm, { cast: false });
    val.position.set(x, 2.55, 1.38);
    alley.add(val);
    // the name sign on top
    const sg = sign(atlas, 2.1, 0.5, b.name, { bg: b.color });
    sg.position.set(x, 3.65, -0.9);
    alley.add(sg);
    alley.add(k.at(k.rbox(2.2, 0.58, 0.08, P.cream, 0.04), x, 3.65, -0.96));
    // what each booth shows
    if (i === 0) {
      for (let r = 0; r < 3; r++) {
        alley.add(k.at(k.box(BW - 0.6, 0.06, 0.4, P.woodDark), x, 1.2 + r * 0.42, -0.75 + r * 0.0));
        for (let j = 0; j < 5 - r; j++) {
          const bx = x + (j - (4 - r) / 2) * 0.32;
          const col = ['#5fb85a', '#6fb8ff', '#3fbf9f'][(j + r) % 3];
          alley.add(k.at(k.cyl(0.07, 0.08, 0.28, col, 8, { rough: 0.25 }), bx, 1.37 + r * 0.42, -0.75));
          alley.add(k.at(k.cyl(0.03, 0.04, 0.1, col, 6, { rough: 0.25 }), bx, 1.55 + r * 0.42, -0.75));
        }
      }
      for (let j = 0; j < 4; j++) alley.add(k.at(k.rot(k.tor(0.12, 0.025, ['#ffd166', '#ff9eb5', '#8fd3ff', '#c7a6ff'][j], Math.PI * 2, undefined, 14, 5), Math.PI / 2, 0, 0), x - 0.6 + j * 0.4, 1.22, 1.05));
    } else if (i === 1) {
      alley.add(k.at(k.rbox(BW - 0.5, 0.5, 1.0, '#6fb8ff', 0.06), x, 0.95, -0.15));
      alley.add(k.at(k.box(BW - 0.7, 0.04, 0.8, '#bfe3ff'), x, 1.21, -0.15));
      for (let j = 0; j < 6; j++) ducks.push({ x, ph: (j / 6) * Math.PI * 2 });
    } else if (i === 2) {
      alley.add(k.at(k.box(BW - 0.5, 1.6, 0.1, '#d4a373'), x, 1.85, -0.95));
      for (let r = 0; r < 4; r++) {
        for (let j = 0; j < 5; j++) {
          const col = ['#ef5b6f', '#ffd166', '#8fd3ff', '#c7a6ff', '#7fd8bf'][(j + r * 2) % 5];
          alley.add(k.at(k.sph(0.13, col, { rough: 0.3 }, 10), x + (j - 2) * 0.38, 1.28 + r * 0.38, -0.82));
        }
      }
    } else {
      alley.add(k.at(k.rbox(BW - 0.6, 0.6, 1.0, '#3fbf9f', 0.06), x, 1.05, -0.2));
      for (let r = 0; r < 2; r++) {
        for (let j = 0; j < 3; j++) {
          const mx = x + (j - 1) * 0.5;
          const mz = -0.45 + r * 0.5;
          alley.add(k.at(k.cyl(0.15, 0.15, 0.02, '#2b5b4a', 12), mx, 1.36, mz));
          moles.push({ x: mx, z: mz, ph: Math.random() * 10 });
        }
      }
    }
    // prizes hanging along the top: teddies and bunnies
    for (let j = 0; j < 3; j++) {
      const pl = plush(k, ['#c98f68', '#ff9eb5', '#8fd3ff', '#ffd166', '#c7a6ff'][(i + j) % 5], (i + j) % 2 === 1, 0.9);
      pl.position.set(x + (j - 1) * 0.65, 2.0, -0.95);
      alley.add(pl);
    }
  });
  // The big sign and a giant teddy on the roof
  alley.add(k.at(k.box(BW * 4 + 0.6, 0.2, 2.7, P.cream), 0, 3.15, -0.2));
  const big = atlas.panel(3.6, 0.9, 720, 180, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    roundRect(c, 6, 6, w - 12, h - 12, 60);
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = '#ef5b6f';
    c.stroke();
    c.fillStyle = '#ef5b6f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Games Alley', w / 2, h / 2 + 5, w * 0.7, 100);
    c.fillStyle = '#ffd166';
    for (const x of [64, w - 64]) {
      drawStar(c, x, h / 2, 30);
      c.fill();
    }
  });
  big.position.set(-2.3, 4.55, -0.85);
  alley.add(big);
  alley.add(k.at(k.rbox(3.8, 1.05, 0.12, '#ef5b6f', 0.05), -2.3, 4.55, -0.93));
  for (const s of [-1, 1]) alley.add(k.at(k.box(0.1, 1.1, 0.1, P.woodDark), -2.3 + s * 1.5, 3.8, -1.0));
  // the giant teddy everybody wants, on a crate by the end of the alley
  alley.add(k.at(k.rbox(1.0, 0.6, 1.0, P.wood, 0.05), BW * 2 + 0.8, 0.3, 0.2));
  alley.add(k.at(k.box(1.02, 0.08, 1.02, P.woodDark), BW * 2 + 0.8, 0.45, 0.2));
  colliders.push({ type: 'box', x: A.x + BW * 2 + 0.8, z: A.z + 0.2, hw: 0.52, hd: 0.52, h: 0.6 });
  const teddy = plush(k, '#c98f68', false, 2.6);
  teddy.position.set(BW * 2 + 0.8, 0.6, 0.25);
  teddy.add(k.at(k.heart(0.3, 0.06, P.rose), 0, 0.5, 0.45));
  alley.add(teddy);
  const duckGeo = toGeo((() => {
    const d = new THREE.Group();
    const b = k.sph(0.1, P.sun, undefined, 10);
    b.scale.set(1, 0.8, 1.25);
    d.add(b);
    d.add(k.at(k.sph(0.065, P.sun, undefined, 8), 0, 0.09, 0.08));
    d.add(k.at(k.rot(k.cone(0.03, 0.07, '#ff9a3c', 6), Math.PI / 2, 0, 0), 0, 0.085, 0.16));
    return d;
  })());
  const duckMesh = inst(duckGeo, vcMat(0.5), ducks.length, { cast: false });
  alley.add(duckMesh);
  dynamic.push(duckMesh);
  const moleGeo = toGeo((() => {
    const d = new THREE.Group();
    d.add(k.at(k.cyl(0.11, 0.12, 0.22, '#a0602e', 10), 0, 0.11, 0));
    d.add(k.at(k.sph(0.11, '#a0602e', undefined, 10), 0, 0.22, 0));
    d.add(k.at(k.sph(0.04, '#ff9eb5', undefined, 6), 0, 0.22, 0.1));
    for (const s of [-1, 1]) d.add(k.at(k.sph(0.02, '#3b2b3f', undefined, 5), s * 0.045, 0.27, 0.09));
    return d;
  })());
  const moleMesh = inst(moleGeo, vcMat(0.6), moles.length, { cast: false });
  alley.add(moleMesh);
  dynamic.push(moleMesh);
  colliders.push({ type: 'box', x: A.x, z: A.z + 0.1, hw: (BW * 4 + 0.5) / 2, hd: 1.25 });
  const huda = person(PEOPLE.games, A.x - BW * 0.5, 0.16, A.z + 0.2, 0, { noCollide: true });
  hotspots.push({
    x: A.x,
    z: A.z + 2.3,
    r: 1.7,
    label: 'Play the booth games',
    icon: 'game',
    act: (a) => (a.hasArena('parkgames') ? a.playArena('parkgames', { me: a.playerId }) : a.toast('Huda is still setting up the booths.')),
  });

  // ------------------------------------------------ cotton candy and churros cart
  const C = S.cart;
  const cart = new THREE.Group();
  cart.position.set(C.x, 0, C.z);
  root.add(cart);
  cart.add(k.at(k.rbox(1.7, 0.75, 0.95, P.pink, 0.08), 0, 0.68, 0));
  cart.add(k.at(k.box(1.8, 0.08, 1.05, P.cream), 0, 1.08, 0));
  for (const s of [-1, 1]) {
    const wheel = k.tor(0.26, 0.05, P.gold, Math.PI * 2, undefined, 16, 6);
    wheel.position.set(s * 0.6, 0.3, 0.5);
    cart.add(wheel);
    cart.add(k.at(k.cyl(0.05, 0.05, 0.08, P.gold, 8), s * 0.6, 0.3, 0.5));
  }
  cart.add(k.at(k.cyl(0.03, 0.03, 1.6, P.cream, 6), 0.7, 1.9, -0.3));
  const umb = mesh(new THREE.ConeGeometry(1.25, 0.55, 16, 1, true), umat('#ffffff', { map: stripes('#ff9eb5', '#fff4e3', 16, { w: 256, h: 64 }), rough: 0.7, side: THREE.DoubleSide }));
  umb.position.set(0.7, 2.75, -0.3);
  cart.add(umb);
  cart.add(k.at(k.sph(0.07, P.gold), 0.7, 3.05, -0.3));
  // the candy floss machine: a bowl with a pink cloud spinning in it
  cart.add(k.at(k.cyl(0.32, 0.22, 0.25, '#ffffff', 16, { rough: 0.3, metal: 0.3 }), -0.4, 1.25, 0));
  const fluff = new THREE.Group();
  fluff.position.set(-0.4, 1.33, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    fluff.add(k.at(k.sph(0.11, '#ffc4e1', undefined, 8), Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.12));
  }
  cart.add(fluff);
  dynamic.push(fluff);
  // candy floss on sticks, and churros in a cup
  for (let i = 0; i < 4; i++) {
    const x = 0.15 + i * 0.16;
    cart.add(k.at(k.cyl(0.012, 0.012, 0.35, '#fff4e3', 4), x, 1.28, 0.32));
    cart.add(k.at(k.sph(0.1, i % 2 ? '#c7e9ff' : '#ffc4e1', undefined, 8), x, 1.5, 0.32));
  }
  cart.add(k.at(k.cyl(0.11, 0.09, 0.2, '#ef5b6f', 10), 0.55, 1.22, -0.05));
  for (let i = 0; i < 5; i++) {
    const ch = k.cyl(0.025, 0.025, 0.4, '#d9963f', 6);
    ch.position.set(0.55 + Math.cos(i * 1.3) * 0.05, 1.38, -0.05 + Math.sin(i * 1.3) * 0.05);
    ch.rotation.set(Math.sin(i) * 0.2, 0, Math.cos(i) * 0.2);
    cart.add(ch);
  }
  const cs = atlas.panel(1.5, 0.42, 320, 90, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    roundRect(c, 3, 3, w - 6, h - 6, 30);
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = '#ef5b6f';
    c.stroke();
    c.fillStyle = '#ef5b6f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Cotton Candy & Churros', w / 2, h / 2 + 2, w * 0.88, 40);
  });
  cs.position.set(0, 0.7, 0.485);
  cart.add(cs);
  colliders.push({ type: 'box', x: C.x, z: C.z, hw: 0.92, hd: 0.58 });
  const sami = person(PEOPLE.cart, C.x - 0.1, 0, C.z - 0.95, 0);

  // ------------------------------------------------ balloon seller
  const B = S.balloons;
  const rana = person(PEOPLE.balloons, B.x, 0, B.z, 0.3, { hands: 'hold' });
  const bunch = [];
  const bColors = ['#ef5b6f', '#ffd166', '#8fd3ff', '#c7a6ff', '#7fd8bf', '#ff9eb5', '#ffb38a', '#ffffff', '#ef5b6f'];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const r = i === 0 ? 0 : 0.28 + (i % 3) * 0.12;
    bunch.push({ x: Math.cos(a) * r, y: 2.85 + (i % 3) * 0.28 + (i === 0 ? 0.5 : 0), z: Math.sin(a) * r * 0.7, c: bColors[i], heart: i % 4 === 0 });
  }
  const balloonGeo = new THREE.SphereGeometry(0.22, 12, 10);
  balloonGeo.scale(1, 1.18, 1);
  const balloonMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, metalness: 0.05 });
  const balloons = inst(balloonGeo, balloonMat, bunch.length, { cast: false, colors: bColors });
  root.add(balloons);
  dynamic.push(balloons);
  const strings = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#7a6470' }));
  strings.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bunch.length * 6 + 6), 3));
  strings.frustumCulled = false;
  root.add(strings);
  dynamic.push(strings);

  // The heart balloon Homama buys Roji: it follows her hand on a string, then floats off
  const heartBalloon = k.heart(0.48, 0.16, '#ff3d6e', { rough: 0.25 });
  heartBalloon.visible = false;
  root.add(heartBalloon);
  dynamic.push(heartBalloon);
  const hbString = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#7a6470' }));
  hbString.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  hbString.frustumCulled = false;
  hbString.visible = false;
  root.add(hbString);
  dynamic.push(hbString);
  const hb = { on: false, t: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), free: false };
  hotspots.push({
    x: B.x,
    z: B.z + 0.95,
    r: 1.3,
    label: () => (hb.on ? 'Say thank you to Rana' : 'Get a balloon'),
    icon: 'park-balloon',
    act: (a) => {
      if (hb.on) {
        a.emote('player', 'wave');
        rana.kid.emote('wave');
        a.toast('Rana: Enjoy the park, you two!', 2000);
        return;
      }
      hb.on = true;
      hb.free = false;
      hb.t = 0;
      a.roji.kid.handWorld(1, hb.pos);
      hb.pos.copy(root.worldToLocal(hb.pos)).add(new THREE.Vector3(0, 1.3, 0));
      hb.vel.set(0, 0, 0);
      heartBalloon.visible = true;
      hbString.visible = true;
      sfx.chime(a.sound);
      a.emote('homama', 'heart');
      a.toast(a.playerId === 'homama' ? 'You buy Roji a big heart balloon. She ties it round her wrist.' : 'Homama buys you a big heart balloon. Of course it is a heart.', 2800);
    },
  });

  // ------------------------------------------------ treats from the cart
  const treat = { obj: null, t: 0, bitten: false, kind: null };
  const makeTreat = (kind) => {
    const g = new THREE.Group();
    if (kind === 'candy') {
      g.add(k.at(k.cyl(0.012, 0.012, 0.3, '#fff4e3', 5), 0, 0.0, 0));
      const parts = [];
      for (const [x, y, z, r] of [[0, 0.24, 0, 0.13], [0.08, 0.2, 0.04, 0.09], [-0.08, 0.21, 0.03, 0.09], [0.02, 0.32, -0.03, 0.09], [0, 0.18, -0.07, 0.08]]) {
        const s = k.sph(r, '#ffb7d5', undefined, 10);
        s.material = s.material.clone();
        s.position.set(x, y, z);
        g.add(s);
        parts.push(s);
      }
      g.userData.parts = parts;
    } else {
      g.add(k.at(k.cyl(0.07, 0.055, 0.1, '#ef5b6f', 10), 0, 0, 0));
      const parts = [];
      for (let i = 0; i < 3; i++) {
        const ch = k.cyl(0.02, 0.02, 0.28, '#d9963f', 6);
        ch.position.set((i - 1) * 0.035, 0.13, 0);
        ch.rotation.z = (i - 1) * 0.15;
        g.add(ch);
        parts.push(ch);
      }
      g.add(k.at(k.cyl(0.045, 0.04, 0.05, '#5a3a2a', 8), 0.1, -0.02, 0));
      g.userData.parts = parts;
    }
    g.rotation.x = -0.25;
    return g;
  };
  const dropTreat = () => {
    if (!treat.obj) return;
    if (api.roji.kid.carried === treat.obj) api.carry('roji', null);
    treat.obj = null;
  };
  hotspots.push({
    x: C.x,
    z: C.z + 1.15,
    r: 1.3,
    label: 'Buy a treat',
    icon: 'park-candy',
    act: async (a) => {
      const pick = await a.choose({
        title: "Sami's cart",
        text: 'Fresh from the machine, still warm.',
        options: [
          { id: 'candy', label: 'Cotton candy', sub: 'A pink cloud on a stick' },
          { id: 'churros', label: 'Churros', sub: 'With a chocolate dip' },
        ],
      });
      if (!pick) return;
      dropTreat();
      treat.obj = makeTreat(pick);
      treat.kind = pick;
      treat.t = 0;
      treat.bitten = false;
      a.carry('roji', treat.obj);
      sami.kid.emote('wave');
      a.sound.ui('coin');
      a.toast(pick === 'candy' ? 'Sami spins a pink cloud for Roji.' : 'Three warm churros for Roji. Homama looks at them a little too long.', 2400);
    },
  });

  // ------------------------------------------------ the photo spot
  const PH = S.photo;
  const frame = new THREE.Group();
  frame.position.set(PH.x, 0, PH.z);
  root.add(frame);
  const marker = atlas.panel(1.7, 1.1, 340, 220, (c, w, h) => {
    c.fillStyle = '#ffd1dc';
    roundRect(c, 4, 4, w - 8, h - 8, 50);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    c.setLineDash([18, 12]);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#ef5b6f';
    for (const x of [w * 0.32, w * 0.68]) {
      c.beginPath();
      c.ellipse(x - 12, h * 0.55, 14, 24, -0.1, 0, Math.PI * 2);
      c.ellipse(x + 12, h * 0.5, 14, 24, 0.1, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Stand here', w / 2, h * 0.17, w * 0.6, 30);
  });
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.05;
  frame.add(marker);
  const ps = sign(atlas, 1.2, 0.42, 'Photo spot', { bg: '#ef5b6f' });
  frame.add(k.at(k.box(0.09, 1.4, 0.09, P.woodDark), 1.45, 0.7, 0.1));
  ps.position.set(1.45, 1.45, 0.16);
  frame.add(ps);
  frame.add(k.at(k.rbox(1.3, 0.5, 0.06, P.cream, 0.03), 1.45, 1.45, 0.11));
  colliders.push({ type: 'circle', x: PH.x + 1.45, z: PH.z + 0.1, r: 0.12 });
  const flash = () => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.85;z-index:60;pointer-events:none;transition:opacity .5s';
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '0')));
    setTimeout(() => el.remove(), 700);
    sfx.shutter(api.sound);
  };
  hotspots.push({
    x: PH.x,
    z: PH.z + 0.9,
    r: 1.4,
    label: 'Take a photo',
    icon: 'park-camera',
    act: (a) => {
      const st = { t: 0, snapped: false };
      a.activity({
        label: 'Walk on',
        endOnMove: true,
        seats: [
          { who: 'roji', x: PH.x - 0.32, z: PH.z, y: 0, yaw: 0.15, pose: 'stand' },
          { who: 'homama', x: PH.x + 0.32, z: PH.z, y: 0, yaw: -0.15, pose: 'stand' },
        ],
        focus: { x: PH.x, z: PH.z - 2.5, y: 2.2, zoom: 0.62 },
        update: (dt) => {
          st.t += dt;
          if (st.t > 0.3 && !st.posed) {
            st.posed = true;
            a.emote('roji', 'heart');
            a.emote('homama', 'cheer');
            a.toast('Say cheese!', 1200);
          }
          if (st.t > 1.5 && !st.snapped) {
            st.snapped = true;
            flash();
            const img = drawPostcard(a.looks || ctx.looks);
            setTimeout(() => {
              a.choose({ title: 'A photo at Roji Land', text: `<img src="${img}" alt="Roji and Homama in front of the castle" style="width:100%;border-radius:14px;display:block;margin:4px 0 8px">Roji and Homama, in front of the castle.`, options: [{ id: 'keep', label: 'Keep it' }] });
            }, 500);
          }
          if (st.t > 2.6) a.endActivity();
        },
      });
    },
  });

  // ------------------------------------------------ the people at work
  const lina = person(PEOPLE.tickets, S.tickets.x, 0.25, S.tickets.z - 0.1, 0.1, { noCollide: true });
  const karim = person(PEOPLE.operator, 11.4, 0.56, -0.4, -0.5, { noCollide: true });
  colliders.push({ type: 'circle', x: 11.4, z: -0.4, r: 0.3 });

  // ------------------------------------------------ the coaster's garden: flowers and a gold star
  const gd = new THREE.Group();
  gd.position.set(8.6, 0, -9.0);
  root.add(gd);
  gd.add(k.at(k.cyl(1.5, 1.6, 0.25, P.stone, 24), 0, 0.125, 0));
  gd.add(k.at(k.cyl(1.35, 1.35, 0.05, '#7a5236', 24), 0, 0.27, 0));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    gd.add(k.at(k.sph(0.13, ['#ff9eb5', '#ffd166', '#c7a6ff', '#ffffff'][i % 4], undefined, 8), Math.cos(a) * 1.05, 0.38, Math.sin(a) * 1.05));
  }
  gd.add(k.at(k.cyl(0.1, 0.14, 1.2, P.cream, 10), 0, 0.85, 0));
  const star = k.star(0.55, 0.25, 0.16, P.gold, { rough: 0.3, metal: 0.5 });
  star.position.y = 1.85;
  gd.add(star);
  dynamic.push(star);
  colliders.push({ type: 'circle', x: 8.6, z: -9.0, r: 1.6, h: 0.28 });
  colliders.push({ type: 'circle', x: 8.6, z: -9.0, r: 0.2 });

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const hand = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  return {
    root,
    dynamic,
    colliders,
    hotspots,
    people,
    dropTreat,
    update(dt, t, near) {
      // the people: idle, and a wave now and then when Roji or Homama is close
      for (const p of people) {
        p.kid.update(dt, t, 0, 0, 0);
        p.wave -= dt;
        const d = Math.hypot(near[0].x - p.x, near[0].z - p.z);
        if (p.wave <= 0 && d < 5) {
          p.wave = 14 + Math.random() * 10;
          p.kid.emote('wave');
        }
      }
      // ducks paddle round the trough, moles pop up and down
      ducks.forEach((d, i) => {
        const a = d.ph + t * 0.5;
        m4.compose(v.set(d.x + Math.cos(a) * 0.75, 1.25 + Math.sin(t * 3 + i) * 0.01, -0.15 + Math.sin(a) * 0.28), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -a), one);
        duckMesh.setMatrixAt(i, m4);
      });
      duckMesh.instanceMatrix.needsUpdate = true;
      moles.forEach((m, i) => {
        const up = Math.max(0, Math.sin(t * 1.7 + m.ph * 2.3)) ** 3;
        moleMesh.setMatrixAt(i, m4.makeTranslation(m.x, 1.12 + up * 0.22, m.z));
      });
      moleMesh.instanceMatrix.needsUpdate = true;
      fluff.rotation.y = t * 6;
      star.rotation.y = t * 0.8;
      // the balloon bunch bobs over Rana's head
      const sp = strings.geometry.attributes.position;
      rana.kid.handWorld(1, hand);
      root.worldToLocal(hand);
      bunch.forEach((b, i) => {
        v.set(B.x + b.x + Math.sin(t * 1.1 + i) * 0.05, b.y + Math.sin(t * 1.6 + i * 0.7) * 0.05, B.z + b.z + Math.cos(t * 1.3 + i) * 0.05);
        balloons.setMatrixAt(i, m4.makeTranslation(v.x, v.y, v.z));
        sp.setXYZ(i * 2, hand.x, hand.y, hand.z);
        sp.setXYZ(i * 2 + 1, v.x, v.y - 0.25, v.z);
      });
      sp.needsUpdate = true;
      balloons.instanceMatrix.needsUpdate = true;
      // Roji's heart balloon follows her hand on its string, then floats away after a while
      if (hb.on) {
        hb.t += dt;
        const rk = api.roji.kid;
        rk.handWorld(1, hand);
        root.worldToLocal(hand);
        const farAway = Math.hypot(near[0].x, near[0].z) > 40;
        if (!hb.free && (hb.t > 150 || farAway || api.activityRunning)) {
          hb.free = true;
          if (!farAway && !api.activityRunning) api.toast('The heart balloon slips free and floats up over the park.', 2400);
        }
        if (hb.free) {
          hb.vel.y += dt * 0.6;
          hb.pos.addScaledVector(hb.vel, dt);
          hb.pos.x += Math.sin(t * 0.7) * dt * 0.3;
          if (hb.pos.y > 40) {
            hb.on = false;
            heartBalloon.visible = false;
          }
        } else {
          tmp.copy(hand).add(v.set(0, 1.6, 0));
          hb.vel.addScaledVector(tmp.sub(hb.pos), dt * 14);
          hb.vel.multiplyScalar(Math.exp(-4 * dt));
          hb.pos.addScaledVector(hb.vel, dt);
        }
        heartBalloon.position.copy(hb.pos);
        heartBalloon.rotation.set(Math.sin(t * 1.3) * 0.12, Math.sin(t * 0.6) * 0.4, Math.sin(t * 1.1) * 0.1);
        const hp = hbString.geometry.attributes.position;
        hp.setXYZ(0, hb.free ? hb.pos.x : hand.x, hb.free ? hb.pos.y - 1.0 : hand.y, hb.free ? hb.pos.z : hand.z);
        hp.setXYZ(1, hb.pos.x, hb.pos.y - 0.25, hb.pos.z);
        hp.needsUpdate = true;
        hbString.visible = heartBalloon.visible;
      }
      // the treat: Homama steals a bite when he is close, and after a while it is all gone
      if (treat.obj) {
        treat.t += dt;
        const ro = api.roji;
        const ho = api.homama;
        if (ro.kid.carried !== treat.obj || api.activityRunning) dropTreat();
        else if (!treat.bitten && treat.t > 4 && ro.pos.distanceTo(ho.pos) < 1.7 && !ho.seated) {
          treat.bitten = true;
          const parts = treat.obj.userData.parts;
          const gone = parts[parts.length - 1];
          gone.visible = false;
          ho.kid.emote('nod');
          ro.kid.squash = 1.15;
          api.fx.heartsAt(ro.kid.root.position.clone().setY(ro.y + 1.5), 3);
          api.sound.ui('pop');
          api.toast(treat.kind === 'candy' ? 'Homama steals a big bite of the cotton candy. Roji pretends to be cross, then shares the rest.' : 'Homama steals a churro. Roji steals it back, then gives it to him anyway.', 3200);
        } else if (treat.t > 50) dropTreat();
      }
    },
  };
}

// A little printed photo of the two of them in front of the castle, drawn in their own colours
function drawPostcard(looks) {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 320;
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, '#a6dde2');
  sky.addColorStop(1, '#ffe7ef');
  x.fillStyle = sky;
  x.fillRect(0, 0, 480, 320);
  // the castle
  x.fillStyle = '#fff1e4';
  x.fillRect(150, 110, 180, 120);
  x.fillRect(205, 60, 70, 170);
  for (const [cx, w, h, col] of [[150, 44, 130, '#ef5b6f'], [330, 44, 130, '#ef5b6f'], [240, 54, 175, '#c7a6ff']]) {
    x.fillStyle = '#fff1e4';
    x.fillRect(cx - w / 2, 230 - h, w, h);
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(cx - w / 2 - 6, 230 - h);
    x.lineTo(cx, 230 - h - 52);
    x.lineTo(cx + w / 2 + 6, 230 - h);
    x.fill();
  }
  x.fillStyle = '#a0602e';
  x.beginPath();
  x.arc(240, 205, 22, Math.PI, 0);
  x.fillRect(218, 205, 44, 25);
  x.fill();
  x.fillStyle = '#b6e07a';
  x.fillRect(0, 230, 480, 90);
  // the two of them
  const kid = (cx, look, girl) => {
    const top = look?.top || (girl ? '#ef5b6f' : '#3f7bf0');
    const hair = look?.hair || (girl ? '#2a1a13' : '#141010');
    const skin = look?.skin || '#f8dccb';
    x.fillStyle = top;
    x.beginPath();
    if (girl) {
      x.moveTo(cx - 30, 300);
      x.lineTo(cx - 16, 240);
      x.lineTo(cx + 16, 240);
      x.lineTo(cx + 30, 300);
    } else x.rect(cx - 22, 238, 44, 58);
    x.fill();
    x.fillStyle = skin;
    x.beginPath();
    x.arc(cx, 212, 30, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = hair;
    x.beginPath();
    x.arc(cx, 204, 31, Math.PI, Math.PI * 2);
    x.fill();
    if (girl) {
      x.beginPath();
      x.arc(cx - 32, 214, 11, 0, Math.PI * 2);
      x.arc(cx + 32, 214, 11, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = '#3b2b3f';
    for (const s of [-1, 1]) {
      x.beginPath();
      x.arc(cx + s * 10, 214, 3.5, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = '#3b2b3f';
    x.lineWidth = 3;
    x.beginPath();
    x.arc(cx, 222, 8, 0.2, Math.PI - 0.2);
    x.stroke();
    x.fillStyle = 'rgba(255,120,150,.45)';
    for (const s of [-1, 1]) {
      x.beginPath();
      x.arc(cx + s * 18, 224, 6, 0, Math.PI * 2);
      x.fill();
    }
  };
  kid(205, looks?.roji, true);
  kid(275, looks?.homama, false);
  x.fillStyle = '#ef5b6f';
  heartPath(x, 240, 160, 34);
  x.fill();
  // the frame and the park's name
  x.strokeStyle = '#ffffff';
  x.lineWidth = 18;
  x.strokeRect(9, 9, 462, 302);
  drawLogo(x, 240, 36, 34, { ink: '#ef5b6f', heart: '#ff5d7a', line: 6 });
  return c.toDataURL('image/png');
}
