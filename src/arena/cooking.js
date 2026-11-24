import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as K from '../interiors/yumyum/kit.js';

// Roji's YumYum Kitchen: a Cooking Fever style shift behind the YumYum pass.
// Patties -> grill -> bun on a plate -> toppings -> guest. Fryer -> fries box. Soda fountain -> cup.
// Shake mixer -> milkshake. Tap food to pick it, then tap a guest (or drag it onto them);
// tap the same food again to hand it to whoever ordered it. Keys 1 to 9 work the stations, Space serves.

const { COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, canvasTexture, roundRect, FONT } = K;

const ITEMS = {
  plain: { kind: 'burger', tops: [], price: 5, name: 'burger' },
  cheese: { kind: 'burger', tops: ['cheese'], price: 6, name: 'cheeseburger' },
  garden: { kind: 'burger', tops: ['lettuce', 'tomato'], price: 7, name: 'garden burger' },
  deluxe: { kind: 'burger', tops: ['cheese', 'lettuce', 'tomato'], price: 9, name: 'deluxe burger' },
  fries: { kind: 'fries', tops: [], price: 4, name: 'fries' },
  soda: { kind: 'soda', tops: [], price: 3, name: 'soda' },
  shake: { kind: 'shake', tops: [], price: 5, name: 'milkshake' },
};
const BURGERS = ['plain', 'cheese', 'garden', 'deluxe'];
const TOPS = ['cheese', 'lettuce', 'tomato'];
const LEVELS = [
  { name: 'Lunch time', goal: 60, time: 95, items: { plain: 3, cheese: 3, soda: 3 }, sizes: [0.55, 0.45, 0], tops: ['cheese'], fryer: false, shake: false, cook: 5, burn: 7, fry: 4, fryBurn: 10, fill: 2.2, blend: 3.2, patience: 32, extra: 6, spawn: [4, 7] },
  { name: 'Afternoon rush', goal: 105, time: 105, items: { plain: 2, cheese: 3, fries: 3, soda: 2, shake: 2 }, sizes: [0.35, 0.45, 0.2], tops: ['cheese'], fryer: true, shake: true, cook: 4.6, burn: 6.5, fry: 4, fryBurn: 9, fill: 2, blend: 3, patience: 32, extra: 6, spawn: [3.5, 6] },
  { name: 'Dinner party', goal: 150, time: 115, items: { plain: 1, cheese: 2, garden: 2, deluxe: 2, fries: 3, soda: 2, shake: 2 }, sizes: [0.2, 0.45, 0.35], tops: TOPS, fryer: true, shake: true, cook: 4.3, burn: 6, fry: 3.8, fryBurn: 8, fill: 1.9, blend: 2.8, patience: 30, extra: 6, spawn: [3, 5] },
];
const NAME = { roji: 'Roji', homama: 'Homama' };
const STAR = 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z';
const starsHtml = (n) =>
  `<span style="display:inline-flex;gap:6px;margin:2px 0 8px">${[0, 1, 2]
    .map((i) => `<svg width="36" height="36" viewBox="0 0 24 24"><path d="${STAR}" fill="${i < n ? '#ffd166' : '#eadfd6'}" stroke="${i < n ? '#e0a800' : '#cdbfb4'}" stroke-width="1.3" stroke-linejoin="round"/></svg>`)
    .join('')}</span>`;

// Layout (metres). The chef works behind the worktop; guests wait across the pass.
const WT = 0.92; // worktop surface
const BZ = -0.18; // back row (machines)
const FZ = 0.3; // front row (plates, boxes, cups)
const CHEF_Z = -1.02;
const PASS_Z = -1.72;
const PASS_Y = 0.95;
const SPOT_Z = -2.28;
const FLOOR_D = 0.42; // dining room floor
const BUB_Y = FLOOR_D + 2.3;
const LANE_Z = -3.15;
const SPOTS = [-2.3, 0, 2.3];
const B1 = -3.25;
const GX = [-2.55, -2.01, -1.47];
const TX = { cheese: -0.89, lettuce: -0.43, tomato: 0.03 };
const FRY = 0.84;
const FRX = [0.51, 0.84, 1.17];
const SODA = 1.945;
const CUPX = [1.62, 1.945, 2.27];
const SHK = 3.075;
const GLX = [2.75, 3.075, 3.4];
const TABLE = { x: 4.9, z: -4.15 };

const CSS = `
.yk-menu { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center; background: rgba(40,24,40,.26); font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; }
.yk-card { background: #fffaf4; border-radius: 26px; padding: 18px 22px; width: min(640px, 92vw); max-height: 92vh; overflow: auto; text-align: center; box-shadow: 0 20px 60px rgba(40,20,30,.35); animation: yk-in .25s cubic-bezier(.2,1.3,.4,1); }
.yk-card h3 { margin: 0 0 2px; font-size: 1.35rem; }
.yk-card > p { margin: 0 0 12px; color: #6a5662; font-size: .92rem; }
.yk-levels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.yk-lv { border: 0; border-radius: 18px; padding: 10px 8px; background: #f6ece4; color: #3b2b3f; font: 600 1rem var(--font, system-ui); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.yk-lv i { font-style: normal; font-size: .75rem; color: #9a7f8c; display: flex; gap: 4px; align-items: center; }
.yk-lv .yk-ic { display: flex; gap: 2px; min-height: 30px; align-items: center; flex-wrap: wrap; justify-content: center; }
.yk-lv .yk-ic img { width: 28px; height: 28px; }
.yk-lv small { font-weight: 400; font-size: .76rem; color: #7a6470; }
.yk-lv:hover:not(:disabled), .yk-lv:focus-visible { background: #ffe1e6; outline: none; }
.yk-lv.next { box-shadow: inset 0 0 0 3px #ff7a59; }
.yk-lv:disabled { opacity: .55; cursor: default; }
.yk-help { margin: 12px 0 0; font-size: .8rem; color: #7a6470; line-height: 1.35; }
.yk-help kbd { font: 600 .72rem var(--font, system-ui); background: #f3e6dc; border-radius: 6px; padding: 1px 5px; }
body.touch .yk-keys { display: none; }
@keyframes yk-in { from { transform: scale(.9); opacity: 0; } }
@media (max-height: 520px) { .yk-card { padding: 10px 14px; } .yk-card h3 { font-size: 1.05rem; } .yk-card > p { font-size: .8rem; margin-bottom: 8px; } .yk-lv { padding: 6px; } .yk-help { margin-top: 8px; font-size: .74rem; } }
`;

export default {
  id: 'cooking',
  title: "Roji's YumYum Kitchen",
  tagline: 'Grill, fry and serve with a smile',

  async start(ctx) {
    const { THREE, scene, camera, util, hud, input, sound, fx } = ctx;
    const { damp, clamp, easeOutBack, easeOutCubic } = util;
    const me = ctx.me;
    const pid = ctx.partner;
    const touch = () => document.body.classList.contains('touch');
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const tone = (f, d, o, delay = 0) => {
      if (sound?.ctx && !sound.muted) sound.tone(f, sound.ctx.currentTime + delay, d, o);
    };
    const sfx = (n) => sound?.ui(n);

    const env = ctx.env.indoor({ color: '#fbe1cf' });
    env.hemi.intensity = 1.65;
    env.sun.intensity = 1.9;
    env.sun.position.set(-3, 10, 7);
    const sc = env.sun.shadow.camera;
    sc.left = sc.bottom = -7.5;
    sc.right = sc.top = 7.5;
    sc.near = 1;
    sc.far = 30;
    sc.updateProjectionMatrix();
    env.sun.shadow.mapSize.set(2048, 2048);
    env.sun.shadow.bias = -0.0005;
    env.sun.shadow.normalBias = 0.02;
    fx.confetti?.geometry?.scale(0.5, 0.5, 0.5);

    // ---------------------------------------------------------------- room (static, baked at the end)
    const world = new THREE.Group();
    scene.add(world);
    const add = (...o) => (world.add(...o), o[0]);
    const atlas = new K.Atlas(2048, 1024);
    const keep = [];

    const checker = K.pattern(128, 128, '#fff8ec', (c, w) => {
      c.fillStyle = '#f6b8ab';
      c.fillRect(0, 0, w / 2, w / 2);
      c.fillRect(w / 2, w / 2, w / 2, w / 2);
    }, 7, 2.2);
    add(at(mesh(new THREE.BoxGeometry(14, FLOOR_D + 0.1, 4.4), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.8 }), { cast: false }), 0, FLOOR_D / 2 - 0.05, -3.6));
    const tiles = K.pattern(128, 128, '#ffffff', (c, w) => {
      c.fillStyle = '#cdeee4';
      for (let i = 0; i <= 4; i++) {
        c.fillRect((i * w) / 4 - 2, 0, 4, w);
        c.fillRect(0, (i * w) / 4 - 2, w, 4);
      }
    }, 9, 4);
    add(at(mesh(new THREE.BoxGeometry(9, 0.1, 4), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.75 }), { cast: false }), 0, -0.05, 0.5));

    // The dining room sits a step up, so guests stand tall behind the pass
    const diner = new THREE.Group();
    diner.position.y = FLOOR_D;
    world.add(diner);
    const dadd = (...o) => (diner.add(...o), o[0]);
    // Back wall of the dining room: red wainscot, cream wall, checker band, windows and a neon sign
    const wallZ = -5.4;
    dadd(at(box(14, 3.8, 0.2, COL.cream), 0, 1.9, wallZ));
    dadd(at(box(14, 1.0, 0.24, COL.red), 0, 0.5, wallZ + 0.02));
    dadd(at(box(14, 0.08, 0.28, COL.white), 0, 1.02, wallZ + 0.04));
    const band = K.pattern(256, 32, '#ffffff', (c, w, h) => {
      for (let i = 0; i < 16; i++) {
        c.fillStyle = i % 2 ? '#ffffff' : COL.red;
        c.fillRect((i * w) / 16, 0, w / 16, h / 2);
        c.fillStyle = i % 2 ? COL.red : '#ffffff';
        c.fillRect((i * w) / 16, h / 2, w / 16, h / 2);
      }
    }, 9, 1);
    dadd(at(mesh(new THREE.PlaneGeometry(14, 0.26), new THREE.MeshStandardMaterial({ map: band, roughness: 0.7 }), { cast: false }), 0, 3.3, wallZ + 0.11));
    for (const x of [-3.6, 3.6]) dadd(at(K.windowMesh(1.7, 1.15), x, 1.85, wallZ + 0.1));
    const neon = atlas.plane(2.3, 0.66, 540, 156, (c, w, h) => {
      c.fillStyle = '#fff2e6';
      roundRect(c, 6, 6, w - 12, h - 12, 40);
      c.fill();
      c.lineWidth = 8;
      c.strokeStyle = COL.hotpink;
      c.stroke();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = COL.red;
      c.font = `700 ${h * 0.24}px ${FONT}`;
      c.fillText("ROJI'S", w / 2, h * 0.3);
      c.fillStyle = COL.brown;
      c.font = `700 ${h * 0.4}px ${FONT}`;
      c.fillText('YumYum', w / 2, h * 0.66);
      c.fillStyle = COL.hotpink;
      K.heartPath(c, w * 0.12, h * 0.52, h * 0.34);
      c.fill();
      K.heartPath(c, w * 0.88, h * 0.52, h * 0.34);
      c.fill();
    });
    dadd(at(neon, 0, 2.78, wallZ + 0.12));
    // Side walls with doorways for guests, and little plants by the doors
    for (const s of [-1, 1]) {
      dadd(at(box(0.2, 3.8, 1.3, COL.cream), s * 6.7, 1.9, -4.8));
      dadd(at(box(0.2, 3.8, 1.3, COL.cream), s * 6.7, 1.9, -2.05));
      dadd(at(box(0.2, 1.1, 1.3, COL.red), s * 6.68, 0.55, -4.8));
      dadd(at(box(0.2, 1.1, 1.3, COL.red), s * 6.68, 0.55, -2.05));
      dadd(at(box(0.24, 0.3, 1.5, COL.orange), s * 6.7, 2.55, -3.45));
      dadd(at(box(0.24, 1.3, 1.5, COL.cream), s * 6.7, 3.15, -3.45));
      dadd(at(K.makePlant(0.7, s < 0 ? COL.teal : COL.orange), s * 6.1, 0, -4.85));
    }
    // A small table for the partner, by the right window
    dadd(at(K.makeRoundTable(0.42, '#ffffff'), TABLE.x, 0, TABLE.z));
    const chairA = K.makeChair(COL.mint);
    dadd(at(chairA, TABLE.x, 0, TABLE.z - 0.6));
    const chairB = K.makeChair(COL.pink);
    dadd(at(rot(chairB, 0, -Math.PI / 2, 0), TABLE.x + 0.62, 0, TABLE.z));
    dadd(at(K.makeRoundTable(0.42, '#ffffff'), -TABLE.x, 0, TABLE.z));
    dadd(at(K.makeChair(COL.sun), -TABLE.x, 0, TABLE.z - 0.6));
    const vase = new THREE.Group();
    vase.add(at(cyl(0.05, 0.06, 0.14, COL.mint, 12), 0, 0.07, 0));
    for (const [x, z, c] of [[0, 0, COL.hotpink], [0.04, 0.02, COL.sun], [-0.04, 0.01, '#ffffff']]) vase.add(at(sph(0.035, c, undefined, 10), x, 0.2, z));
    dadd(at(vase, -TABLE.x, 0.775, TABLE.z));

    // The pass: long counter between the kitchen and the guests
    add(at(rbox(13.3, PASS_Y - 0.06, 0.42, COL.orange, 0.04), 0, (PASS_Y - 0.06) / 2, PASS_Z));
    add(at(rbox(13.4, 0.06, 0.54, '#ffffff', 0.025, { rough: 0.35 }), 0, PASS_Y - 0.03, PASS_Z));
    add(at(box(13.3, 0.08, 0.02, COL.cream), 0, PASS_Y - 0.3, PASS_Z + 0.215));
    add(at(box(13.3, 0.08, 0.02, COL.cream), 0, PASS_Y - 0.3, PASS_Z - 0.215));
    add(at(box(13.3, 0.06, 0.44, COL.steelDark, { metal: 0.5, rough: 0.3 }), 0, 0.03, PASS_Z));
    for (const x of [-3, -1.1, 1.1, 3]) {
      const h = atlas.plane(0.2, 0.18, 64, 58, (c, w, h) => {
        c.fillStyle = COL.orange;
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffe1e6';
        K.heartPath(c, w / 2, h / 2, h * 0.86);
        c.fill();
      });
      add(at(h, x, 0.45, PASS_Z + 0.213));
    }
    // Ticket rail with paper orders over the pass, napkins and sauce
    add(at(box(6.2, 0.03, 0.05, COL.steel, { metal: 0.5, rough: 0.3 }), 0, PASS_Y + 0.04, PASS_Z + 0.22));
    for (const [x, c] of [[-3.7, COL.cherry], [-3.55, COL.sun]]) {
      add(at(cyl(0.045, 0.05, 0.2, c, 12), x, PASS_Y + 0.1, PASS_Z));
      add(at(cyl(0.015, 0.03, 0.06, c, 8), x, PASS_Y + 0.23, PASS_Z));
    }
    add(at(rbox(0.2, 0.14, 0.14, '#c3cbd3', 0.02, { metal: 0.4, rough: 0.35 }), -3.3, PASS_Y + 0.07, PASS_Z));
    add(at(box(0.16, 0.03, 0.1, '#ffffff'), -3.3, PASS_Y + 0.15, PASS_Z));
    const register = K.makeRegister();
    register.group.position.set(3.55, PASS_Y + 0.02, PASS_Z + 0.02);
    register.group.scale.setScalar(1.15);
    K.colorBake(register.group, [register.screen]);
    scene.add(register.group);

    // Kitchen side walls with shelves
    for (const s of [-1, 1]) {
      const sideTiles = K.pattern(128, 128, '#ffffff', (c, w) => {
        c.fillStyle = '#cdeee4';
        for (let i = 0; i <= 4; i++) {
          c.fillRect((i * w) / 4 - 2, 0, 4, w);
          c.fillRect(0, (i * w) / 4 - 2, w, 4);
        }
      }, 3, 3);
      add(at(mesh(new THREE.BoxGeometry(0.2, 3.0, 3.2), new THREE.MeshStandardMaterial({ map: sideTiles, roughness: 0.75 })), s * 4.25, 1.5, 0));
      add(at(rbox(0.36, 0.05, 2.2, COL.woodDark, 0.02), s * 4.05, 1.9, -0.1));
      for (let i = 0; i < 4; i++) {
        const z = -0.9 + i * 0.52;
        const c = [COL.sun, COL.mint, COL.pink, COL.orange][(i + (s > 0 ? 2 : 0)) % 4];
        add(at(cyl(0.09, 0.09, 0.2, c, 14), s * 4.05, 2.03, z));
        add(at(cyl(0.1, 0.1, 0.03, '#ffffff', 14), s * 4.05, 2.145, z));
      }
      add(at(rbox(0.36, 0.05, 2.2, COL.woodDark, 0.02), s * 4.05, 2.6, -0.1));
      for (let i = 0; i < 3; i++) add(at(cyl(0.14, 0.12, 0.18, COL.steel, 16, { metal: 0.5, rough: 0.3 }), s * 4.03, 2.72, -0.7 + i * 0.6));
    }

    // Worktop: cream cabinets with an orange band and a steel top
    add(at(rbox(7.6, WT - 0.05, 1.12, COL.cream, 0.04), 0, (WT - 0.05) / 2, 0.02));
    add(at(rbox(7.7, 0.05, 1.22, COL.steel, 0.02, { metal: 0.45, rough: 0.3 }), 0, WT - 0.025, 0.02));
    add(at(box(7.6, 0.12, 0.02, COL.orange), 0, WT - 0.13, 0.59));
    for (let i = 0; i < 8; i++) {
      const x = -3.35 + i * 0.957;
      add(at(rbox(0.84, 0.5, 0.03, COL.white, 0.03), x, 0.4, 0.585));
      add(at(sph(0.025, COL.steelDark, { metal: 0.5, rough: 0.3 }, 8), x + 0.3, 0.55, 0.61));
    }

    // ---------------------------------------------------------------- stations
    const grill = K.makeGrill(1.62, 3, 0.62);
    add(at(grill.group, GX[1], WT, BZ));
    const tray = K.makePattyTray(atlas);
    add(at(tray.group, B1, WT, BZ));
    const trash = K.makeTrash(atlas);
    trash.group.position.set(B1, WT, FZ);
    world.add(trash.group);
    keep.push(trash.lid);
    for (const t of TOPS) add(at(K.makeToppingBin(t, atlas).group, TX[t], WT, BZ));
    const fryer = K.makeFryer();
    fryer.group.position.set(FRY, WT, BZ);
    world.add(fryer.group);
    keep.push(fryer.basket, fryer.oil);
    const soda = K.makeSodaMachine(atlas);
    soda.group.position.set(SODA, WT, BZ - 0.06);
    world.add(soda.group);
    keep.push(soda.stream);
    const mixer = K.makeShakeMachine(atlas);
    mixer.group.position.set(SHK, WT, BZ - 0.06);
    world.add(mixer.group);
    keep.push(mixer.spin, mixer.cup);
    // Ketchup, mustard and a napkin box on the front row under the toppings
    for (const [x, c] of [[-0.85, COL.cherry], [-0.68, COL.sun]]) {
      add(at(cyl(0.05, 0.055, 0.2, c, 12), x, WT + 0.1, FZ + 0.05));
      add(at(cyl(0.016, 0.032, 0.06, c, 8), x, WT + 0.23, FZ + 0.05));
    }
    add(at(rbox(0.26, 0.14, 0.16, COL.mint, 0.03), -0.3, WT + 0.07, FZ + 0.05));
    add(at(box(0.18, 0.04, 0.08, '#ffffff'), -0.3, WT + 0.16, FZ + 0.05));
    add(at(K.makePlant(0.45, COL.orange), 0.06, WT, FZ + 0.06));

    // Lock signs for stations that open in later levels
    const lockSprite = (text) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: canvasTexture(256, 80, (c, w, h) => {
            K.drawLabel(c, w, h, text, { bg: '#fffaf4', edge: '#cdbfb4', ink: '#7a6470', size: 0.42, weight: 600 });
          }),
          transparent: true,
          depthTest: false,
        }),
      );
      s.scale.set(0.62, 0.19, 1);
      s.renderOrder = 5;
      s.visible = false;
      scene.add(s);
      return s;
    };
    const locks = {
      fryer: at(lockSprite('Opens at level 2'), FRY, WT + 0.75, BZ + 0.1),
      shake: at(lockSprite('Opens at level 2'), SHK, WT + 1.15, BZ + 0.1),
      veg: at(lockSprite('Opens at level 3'), (TX.lettuce + TX.tomato) / 2, WT + 0.42, BZ + 0.1),
    };

    K.colorBake(fryer.basket, [fryer.fries]);
    for (const o of [mixer.spin, mixer.cup, trash.lid]) K.colorBake(o);
    K.trimShadows(world, keep, { size: 0.16, wallZ: -5.0 });
    K.colorBake(world, keep);
    util.bakeStatic(world, keep, mergeGeometries);

    // ---------------------------------------------------------------- food on the stations (dynamic)
    const grillPatties = GX.map((x) => {
      const m = mesh(K.pattyGeometry(), umat(COL.raw, { rough: 0.8 }), { cast: false });
      m.position.set(x, WT + grill.top, BZ + 0.02);
      m.visible = false;
      scene.add(m);
      return { m, pop: 1 };
    });
    const plates = GX.map((x) => {
      const b = new K.Burger({ plate: true });
      b.group.position.set(x, WT, FZ);
      scene.add(b.group);
      return { b, pop: 1, x, home: new THREE.Vector3(x, WT, FZ) };
    });
    const friesSlots = FRX.map((x) => {
      const g = K.makeFriesBox();
      g.children.forEach((m) => m.scale.setScalar(1.25));
      g.position.set(x, WT, FZ);
      g.visible = false;
      scene.add(g);
      return { g, pop: 1, x, home: g.position.clone() };
    });
    const cupSlots = CUPX.map((x) => {
      const c = K.makeCup();
      c.group.position.set(x, WT, FZ);
      c.group.visible = false;
      scene.add(c.group);
      return { g: c.group, cup: c, pop: 1, x, home: c.group.position.clone() };
    });
    const glassSlots = GLX.map((x) => {
      const s = K.makeShake();
      s.group.position.set(x, WT, FZ);
      s.group.visible = false;
      scene.add(s.group);
      return { g: s.group, shake: s, pop: 1, x, home: s.group.position.clone() };
    });
    const machineCup = K.makeCup();
    machineCup.group.position.copy(soda.cupAt).add(soda.group.position);
    machineCup.group.visible = false;
    scene.add(machineCup.group);
    // Oil bubbles in the fryer
    const bubbleMat = umat('#fff3c4', { rough: 0.2, emissive: '#ffd27a', ei: 0.3 });
    const oilBubbles = [];
    for (let i = 0; i < 7; i++) {
      const b = mesh(K.cg('oilBub', () => new THREE.SphereGeometry(0.022, 8, 6)), bubbleMat, { cast: false });
      b.position.set(FRY + (Math.random() - 0.5) * 0.6, WT + 0.31, BZ + 0.02 + (Math.random() - 0.5) * 0.32);
      b.visible = false;
      scene.add(b);
      oilBubbles.push({ b, ph: Math.random() });
    }

    // Selection ring, progress rings, steam and smoke, number badges, the hint arrow
    const selRing = mesh(new THREE.RingGeometry(0.21, 0.27, 32), new THREE.MeshBasicMaterial({ color: COL.sun, transparent: true, opacity: 0.9, depthWrite: false }), { cast: false });
    selRing.rotation.x = -Math.PI / 2;
    selRing.renderOrder = 2;
    selRing.visible = false;
    scene.add(selRing);

    const ringBgGeo = new THREE.RingGeometry(0.075, 0.11, 32);
    const ringFgGeo = new THREE.RingGeometry(0.075, 0.11, 32, 1, Math.PI / 2, Math.PI * 2);
    const makeRing = (pos) => {
      const g = new THREE.Group();
      const bg = new THREE.Mesh(ringBgGeo, new THREE.MeshBasicMaterial({ color: '#3b2b3f', transparent: true, opacity: 0.35, depthTest: false, depthWrite: false }));
      const fgGeo = ringFgGeo.clone();
      const fg = new THREE.Mesh(fgGeo, new THREE.MeshBasicMaterial({ color: COL.mint, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
      fg.scale.x = -1;
      const dot = new THREE.Mesh(K.cg('ringDot', () => new THREE.CircleGeometry(0.068, 24)), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.92, depthTest: false, depthWrite: false }));
      g.add(dot, bg, fg);
      for (const m of g.children) m.renderOrder = 7;
      g.position.copy(pos);
      g.visible = false;
      scene.add(g);
      return {
        g,
        set(k, color) {
          g.visible = true;
          fgGeo.setDrawRange(0, Math.round(clamp(k, 0, 1) * 32) * 6);
          fg.material.color.set(color);
        },
        hide() {
          g.visible = false;
        },
      };
    };
    const rings = {
      grill: GX.map((x) => makeRing(new THREE.Vector3(x, WT + 0.42, BZ + 0.1))),
      fryer: makeRing(new THREE.Vector3(FRY + 0.36, WT + 0.75, BZ + 0.1)),
      soda: makeRing(new THREE.Vector3(SODA + 0.22, WT + 0.62, BZ + 0.35)),
      shake: makeRing(new THREE.Vector3(SHK + 0.24, WT + 0.6, BZ + 0.35)),
    };

    const puffs = [];
    for (let i = 0; i < 18; i++) {
      const s = K.glowSprite('#ffffff', 0);
      s.visible = false;
      scene.add(s);
      puffs.push({ s, life: 0, v: new THREE.Vector3(), dark: false });
    }
    const puffAt = (x, y, z, dark = false, n = 1) => {
      for (let i = 0; i < n; i++) {
        const q = puffs.find((p) => p.life <= 0);
        if (!q) return;
        q.life = 1;
        q.dark = dark;
        q.s.visible = true;
        q.s.material.color.set(dark ? '#6b5b60' : '#ffffff');
        q.s.position.set(x + (Math.random() - 0.5) * 0.14, y, z + (Math.random() - 0.5) * 0.1);
        q.v.set((Math.random() - 0.5) * 0.12, 0.45 + Math.random() * 0.25, 0);
      }
    };

    const badgeTex = (txt) =>
      canvasTexture(96, 96, (c, w) => {
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(w / 2, w / 2, w / 2 - 5, 0, Math.PI * 2);
        c.fill();
        c.lineWidth = 7;
        c.strokeStyle = COL.orange;
        c.stroke();
        c.fillStyle = COL.ink;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `700 56px ${FONT}`;
        c.fillText(txt, w / 2, w / 2 + 4);
      });
    const badges = [];
    const badge = (txt, x, y, z) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(txt), transparent: true, depthTest: false }));
      s.scale.setScalar(0.17);
      s.renderOrder = 6;
      s.position.set(x, y, z);
      scene.add(s);
      badges.push(s);
    };
    badge('1', B1 - 0.32, WT + 0.3, BZ + 0.22);
    badge('2', GX[0] - 0.32, WT + 0.32, BZ + 0.28);
    badge('3', TX.cheese - 0.17, WT + 0.3, BZ + 0.05);
    badge('4', TX.lettuce - 0.17, WT + 0.3, BZ + 0.05);
    badge('5', TX.tomato - 0.17, WT + 0.3, BZ + 0.05);
    badge('6', FRY - 0.45, WT + 0.48, BZ + 0.3);
    badge('7', SODA - 0.33, WT + 0.86, BZ + 0.2);
    badge('8', SHK - 0.33, WT + 0.86, BZ + 0.2);
    badge('9', B1 - 0.2, WT + 0.48, FZ + 0.15);

    const arrow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: canvasTexture(96, 128, (c, w, h) => {
          c.beginPath();
          c.moveTo(w * 0.3, 8);
          c.lineTo(w * 0.7, 8);
          c.lineTo(w * 0.7, h * 0.48);
          c.lineTo(w - 8, h * 0.48);
          c.lineTo(w / 2, h - 8);
          c.lineTo(8, h * 0.48);
          c.lineTo(w * 0.3, h * 0.48);
          c.closePath();
          c.lineJoin = 'round';
          c.lineWidth = 10;
          c.strokeStyle = '#ffffff';
          c.stroke();
          c.fillStyle = COL.hotpink;
          c.fill();
        }),
        transparent: true,
        depthTest: false,
      }),
    );
    arrow.scale.set(0.22, 0.29, 1);
    arrow.renderOrder = 8;
    arrow.visible = false;
    scene.add(arrow);

    // Floating words ("+9", "tip 3", "Too slow")
    const words = [];
    for (let i = 0; i < 8; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 96;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      s.renderOrder = 9;
      s.visible = false;
      scene.add(s);
      words.push({ s, canvas, tex, life: 0 });
    }
    const say = (text, pos, color = COL.ink, size = 1) => {
      const w = words.find((q) => q.life <= 0) || words[0];
      const c = w.canvas.getContext('2d');
      c.clearRect(0, 0, 320, 96);
      c.font = `700 58px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 12;
      c.lineJoin = 'round';
      c.strokeStyle = '#ffffff';
      c.strokeText(text, 160, 50, 300);
      c.fillStyle = color;
      c.fillText(text, 160, 50, 300);
      w.tex.needsUpdate = true;
      w.life = 1.15;
      w.s.visible = true;
      w.s.position.copy(pos);
      w.size = size;
    };

    // Coins that fly to the register
    const coinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.016, 14).rotateX(Math.PI / 2);
    const coinMat = umat('#f4c24f', { metal: 0.6, rough: 0.3, emissive: '#b07a10', ei: 0.25 });
    const coins = [];
    for (let i = 0; i < 16; i++) {
      const m = mesh(coinGeo, coinMat, { cast: false });
      m.visible = false;
      scene.add(m);
      coins.push({ m, t: -1, from: new THREE.Vector3(), delay: 0 });
    }
    const REG = new THREE.Vector3(3.55, PASS_Y + 0.4, PASS_Z);
    const throwCoins = (from, n) => {
      for (let i = 0; i < n; i++) {
        const q = coins.find((c) => c.t < 0 && !c.m.visible);
        if (!q) return;
        q.t = 0;
        q.delay = i * 0.08;
        q.from.copy(from).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, 0));
      }
    };

    // Flights: a model flying in an arc, then a callback
    const flights = [];
    const fly = (obj, from, to, dur = 0.4, arc = 0.4, done) => {
      if (obj.parent !== scene) scene.add(obj);
      obj.position.copy(from);
      flights.push({ obj, from: from.clone(), to: to.clone(), t: 0, dur, arc, done });
    };

    // ---------------------------------------------------------------- people
    const animate = (kid, dt, t, speed = 0) => {
      const n = Math.max(1, Math.ceil(dt / 0.05));
      for (let i = 0; i < n; i++) kid.update(dt / n, t, speed, 0, 0);
    };
    const headPos = (kid) => kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0));
    const chef = { kid: K.slimKid(K.dressChef(ctx.makeKid(me))), x: -0.6, target: -0.6, yaw: 0, work: 0, hands: null, cheer: 0 };
    chef.kid.root.position.set(chef.x, 0, CHEF_Z);
    chef.kid.onEmoteFx = (_, k) => fx.heartsAt(headPos(k), 4);
    scene.add(chef.kid.root);
    const chefGo = (x, hands = 'hold', work = 0.55) => {
      chef.target = clamp(x, -3.35, 3.35);
      chef.hands = hands;
      chef.work = work + Math.abs(chef.target - chef.x) / 3.4;
    };

    // ---------------------------------------------------------------- order bubbles
    const bubbles = SPOTS.map((x) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 330;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      s.renderOrder = 6;
      s.position.set(x, BUB_Y, SPOT_Z);
      s.visible = false;
      scene.add(s);
      return { s, canvas, tex, key: '', k: 0 };
    });
    const ICON = {};
    const iconCanvas = (id) => {
      if (ICON[id]) return ICON[id];
      const c = document.createElement('canvas');
      c.width = c.height = 120;
      const g = c.getContext('2d');
      const it = ITEMS[id];
      if (it.kind === 'burger') K.ICON_DRAW.burger(g, 60, 60, 104, it.tops);
      else K.ICON_DRAW[it.kind](g, 60, 60, 104);
      return (ICON[id] = c);
    };
    const drawBubble = (b, c) => {
      const g = b.canvas.getContext('2d');
      const W = 512;
      const H = 330;
      g.clearRect(0, 0, W, H);
      const frac = clamp(c.pat / c.max, 0, 1);
      const edge = c.who === 'partner' ? COL.hotpink : frac < 0.3 ? COL.cherry : COL.orange;
      const top = 40;
      g.fillStyle = '#ffffff';
      g.strokeStyle = edge;
      g.lineWidth = 10;
      roundRect(g, 10, top, W - 20, H - top - 62, 48);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(W / 2 - 28, H - 66);
      g.lineTo(W / 2, H - 10);
      g.lineTo(W / 2 + 28, H - 66);
      g.fill();
      g.stroke();
      g.fillRect(W / 2 - 25, H - 76, 50, 14);
      const n = c.order.length;
      const slot = 140;
      const x0 = W / 2 - (n * slot) / 2;
      c.order.forEach((o, k) => {
        const cx = x0 + (k + 0.5) * slot;
        g.globalAlpha = o.done ? 0.35 : 1;
        g.drawImage(iconCanvas(o.id), cx - 60, top + 10, 120, 120);
        g.globalAlpha = 1;
        if (o.done) {
          g.fillStyle = '#3fbf7f';
          g.beginPath();
          g.arc(cx + 34, top + 100, 24, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#ffffff';
          g.lineWidth = 8;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(cx + 23, top + 100);
          g.lineTo(cx + 31, top + 109);
          g.lineTo(cx + 46, top + 91);
          g.stroke();
        }
      });
      // Patience hearts
      for (let i = 0; i < 3; i++) {
        const hx = W / 2 + (i - 1) * 48;
        const hy = top + 168;
        g.fillStyle = '#f3d0d8';
        K.heartPath(g, hx, hy, 46);
        g.fill();
        const f = clamp(frac * 3 - i, 0, 1);
        if (f > 0) {
          g.save();
          g.beginPath();
          g.rect(hx - 24, hy - 30, 48 * f, 60);
          g.clip();
          g.fillStyle = frac < 0.3 ? COL.cherry : '#ef5b6f';
          K.heartPath(g, hx, hy, 46);
          g.fill();
          g.restore();
        }
      }
      if (c.who === 'partner') {
        g.font = `700 34px ${FONT}`;
        const nm = NAME[pid];
        const tw = g.measureText(nm).width + 50;
        g.fillStyle = COL.hotpink;
        roundRect(g, W / 2 - tw / 2, 4, tw, 50, 25);
        g.fill();
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(nm, W / 2, 31);
      }
      b.tex.needsUpdate = true;
    };

    // ---------------------------------------------------------------- hit targets
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const targets = {};
    const hits = [];
    const target = (key, x, y, z, w, h, d, anchor, enabled = () => true) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
      m.position.set(x, y, z);
      m.userData.key = key;
      scene.add(m);
      hits.push(m);
      targets[key] = { key, m, anchor: anchor || new THREE.Vector3(x, y, z), enabled };
    };
    target('trash', B1, WT + 0.25, FZ + 0.02, 0.62, 0.5, 0.42, new THREE.Vector3(B1, WT + 0.25, FZ));
    target('patty', B1, WT + 0.25, BZ, 0.62, 0.5, 0.5, new THREE.Vector3(B1, WT + 0.18, BZ));
    GX.forEach((x, i) => target('grill' + i, x, WT + 0.22, BZ + 0.02, 0.54, 0.36, 0.56, new THREE.Vector3(x, WT + 0.14, BZ + 0.02)));
    GX.forEach((x, i) => target('plate' + i, x, WT + 0.13, FZ + 0.04, 0.54, 0.26, 0.44, new THREE.Vector3(x, WT + 0.12, FZ)));
    for (const t of TOPS) target(t, TX[t], WT + 0.2, BZ, 0.46, 0.38, 0.44, new THREE.Vector3(TX[t], WT + 0.14, BZ));
    target('fryer', FRY, WT + 0.4, BZ, 1.0, 0.8, 0.6, new THREE.Vector3(FRY, WT + 0.4, BZ));
    FRX.forEach((x, i) => target('fries' + i, x, WT + 0.17, FZ + 0.04, 0.33, 0.34, 0.42, new THREE.Vector3(x, WT + 0.16, FZ)));
    target('soda', SODA, WT + 0.55, BZ - 0.04, 1.02, 1.1, 0.5, new THREE.Vector3(SODA, WT + 0.55, BZ));
    CUPX.forEach((x, i) => target('cup' + i, x, WT + 0.16, FZ + 0.04, 0.325, 0.32, 0.42, new THREE.Vector3(x, WT + 0.12, FZ)));
    target('shake', SHK, WT + 0.55, BZ - 0.04, 1.02, 1.1, 0.5, new THREE.Vector3(SHK, WT + 0.55, BZ));
    GLX.forEach((x, i) => target('glass' + i, x, WT + 0.19, FZ + 0.04, 0.325, 0.38, 0.42, new THREE.Vector3(x, WT + 0.17, FZ)));
    SPOTS.forEach((x, i) => target('guest' + i, x, FLOOR_D + 1.5, SPOT_Z, 1.6, 2.4, 0.8, new THREE.Vector3(x, FLOOR_D + 1.2, SPOT_Z), () => G && G.seats[i] && G.seats[i].st === 'wait'));

    const ndcPx = new THREE.Vector3();
    const toPx = (v) => {
      ndcPx.copy(v).project(camera);
      return { x: ((ndcPx.x + 1) / 2) * innerWidth, y: ((1 - ndcPx.y) / 2) * innerHeight };
    };
    // The station under a tap: among the boxes the ray hits, the one whose centre is nearest; else the nearest centre close by.
    const pickKey = (ndc) => {
      const live = hits.filter((m) => targets[m.userData.key].enabled());
      const px = { x: ((ndc.x + 1) / 2) * innerWidth, y: ((1 - ndc.y) / 2) * innerHeight };
      const hit = new Set(input.pick(live, ndc).map((h) => h.object));
      let best = null;
      let bd = Infinity;
      const near = Math.max(26, Math.min(innerWidth, innerHeight) * 0.06);
      for (const m of live) {
        const p = toPx(targets[m.userData.key].anchor);
        const d = Math.hypot(p.x - px.x, p.y - px.y);
        if ((hit.has(m) || d < near) && d < bd) {
          bd = d;
          best = m.userData.key;
        }
      }
      return best;
    };

    // ---------------------------------------------------------------- shift state
    let G = null;
    let shown = 0;
    let scoreText = '';
    function newShift(lv) {
      return {
        lv, cfg: LEVELS[lv], phase: 'ready', phaseT: 0, time: LEVELS[lv].time, coins: 0, served: 0, lost: 0,
        grill: [null, null, null],
        plates: [0, 1, 2].map(() => ({ patty: false, tops: [] })),
        fryer: { on: false, t: 0 }, fries: [false, false, false],
        soda: { filling: false, t: 0 }, cups: [false, false, false],
        blender: { on: false, t: 0 }, shakes: [false, false, false],
        seats: [null, null, null], sel: null, spawnT: 0.4, partnerDue: true, partnerServed: false, goalHit: false, lastTick: 99,
      };
    }
    const pattyState = (p) => (p.t < G.cfg.cook ? 'raw' : p.t < G.cfg.cook + G.cfg.burn ? 'done' : 'burnt');
    const fryState = () => (!G.fryer.on ? 'empty' : G.fryer.t < G.cfg.fry ? 'cooking' : G.fryer.t < G.cfg.fry + G.cfg.fryBurn ? 'done' : 'burnt');
    function plateId(pl) {
      if (!pl.patty) return null;
      const k = [...pl.tops].sort().join(',');
      return BURGERS.find((b) => [...ITEMS[b].tops].sort().join(',') === k) || 'odd';
    }
    const SLOTS = { plate: 'plates', fries: 'fries', cup: 'cups', glass: 'shakes' };
    function selItem(sel) {
      if (!sel) return null;
      if (sel.kind === 'plate') return plateId(G.plates[sel.i]);
      if (sel.kind === 'fries') return G.fries[sel.i] ? 'fries' : null;
      if (sel.kind === 'cup') return G.cups[sel.i] ? 'soda' : null;
      return G.shakes[sel.i] ? 'shake' : null;
    }
    const slotVisual = (sel) => (sel.kind === 'plate' ? plates[sel.i] : sel.kind === 'fries' ? friesSlots[sel.i] : sel.kind === 'cup' ? cupSlots[sel.i] : glassSlots[sel.i]);
    const modelOf = (sel) => {
      if (sel.kind !== 'plate') return K.makeItem(selItem(sel));
      const b = new K.Burger({ plate: true });
      b.set(true, G.plates[sel.i].tops);
      return b.group;
    };
    const slotPos = (sel) => (sel.kind === 'plate' ? plates[sel.i].home : slotVisual(sel).home).clone();
    function takeSel(sel) {
      if (sel.kind === 'plate') G.plates[sel.i] = { patty: false, tops: [] };
      else G[SLOTS[sel.kind]][sel.i] = false;
      if (G.sel && G.sel.kind === sel.kind && G.sel.i === sel.i) G.sel = null;
    }
    function needs() {
      const n = {};
      for (const c of G.seats) if (c && c.st === 'wait') for (const o of c.order) if (!o.done) n[o.id] = (n[o.id] || 0) + 1;
      return n;
    }
    function pickWeighted(obj) {
      const e = Object.entries(obj).filter(([, w]) => w > 0);
      let r = Math.random() * e.reduce((a, [, w]) => a + w, 0);
      for (const [k, w] of e) {
        r -= w;
        if (r <= 0) return k;
      }
      return e[e.length - 1][0];
    }
    function makeOrder(cfg, size) {
      const n = size || Number(pickWeighted({ 1: cfg.sizes[0], 2: cfg.sizes[1], 3: cfg.sizes[2] }));
      const order = [];
      let burgers = 0;
      let guard = 0;
      while (order.length < n && guard++ < 50) {
        const id = pickWeighted(cfg.items);
        if (ITEMS[id].kind === 'burger') {
          if (burgers >= 2) continue;
          burgers++;
        } else if (order.some((o) => o.id === id)) continue;
        order.push({ id, done: false, model: null });
      }
      if (size && !order.some((o) => ITEMS[o.id].kind === 'burger')) order[0] = { id: 'cheese', done: false, model: null };
      const rank = { burger: 0, fries: 1, soda: 2, shake: 3 };
      return order.sort((a, b) => rank[ITEMS[a.id].kind] - rank[ITEMS[b.id].kind]);
    }

    // ---------------------------------------------------------------- guests
    const disposeKid = (kid) => {
      kid.carry(null);
      kid.root.removeFromParent();
      kid.root.traverse((o) => {
        o.geometry?.dispose();
        if (o.material?.isMeshBasicMaterial) o.material.dispose();
      });
    };
    let partnerKid = null;
    function spawn(i, asPartner = false) {
      const cfg = G.cfg;
      const order = makeOrder(cfg, asPartner ? 2 : 0);
      const max = cfg.patience + cfg.extra * (order.length - 1) + (asPartner ? 8 : 0);
      let kid;
      if (asPartner) {
        kid = partnerKid = K.slimKid(ctx.makeKid(pid));
        kid.onEmoteFx = (_, k) => fx.heartsAt(headPos(k), 5);
      } else kid = K.slimKid(K.lowPolyKid(ctx.makeKid(K.guestLook())), { shadow: false });
      const side = i === 0 ? -1 : i === 2 ? 1 : Math.random() < 0.5 ? -1 : 1;
      const sx = side * 7.6;
      kid.root.position.set(sx, FLOOR_D, LANE_Z);
      scene.add(kid.root);
      const c = { who: asPartner ? 'partner' : 'guest', kid, order, max, pat: max, st: 'in', side, path: [new THREE.Vector3(SPOTS[i], 0, LANE_Z), new THREE.Vector3(SPOTS[i], 0, SPOT_Z)], yaw: -side * Math.PI / 2, t: 0, mood: 1, payT: 0 };
      G.seats[i] = c;
      bubbles[i].key = '';
    }
    // Walk along c.path; returns true when the path is done.
    function walk(c, dt, speed = 3) {
      const p = c.kid.root.position;
      const w = c.path[0];
      if (!w) return true;
      const dx = w.x - p.x;
      const dz = w.z - p.z;
      const d = Math.hypot(dx, dz);
      const step = speed * dt;
      if (d <= step) {
        p.x = w.x;
        p.z = w.z;
        c.path.shift();
      } else {
        p.x += (dx / d) * step;
        p.z += (dz / d) * step;
        c.yaw = util.dampAngle(c.yaw, Math.atan2(dx, dz), 12, dt);
      }
      c.speed = speed;
      return c.path.length === 0;
    }
    const passPos = (i, k, n) => new THREE.Vector3(SPOTS[i] + (k - (n - 1) / 2) * 0.38, PASS_Y, PASS_Z - 0.04);

    function leave(c, i, angry = false) {
      c.st = 'out';
      const p = c.kid.root.position;
      if (c.who === 'partner' && !angry && c.tray) {
        c.path = [new THREE.Vector3(p.x, 0, LANE_Z), new THREE.Vector3(TABLE.x - 0.75, 0, LANE_Z), new THREE.Vector3(TABLE.x - 0.75, 0, TABLE.z - 0.62), new THREE.Vector3(TABLE.x, 0, TABLE.z - 0.62)];
        c.toTable = true;
      } else c.path = [new THREE.Vector3(p.x, 0, LANE_Z), new THREE.Vector3(c.side * 7.8, 0, LANE_Z)];
      if (angry) c.kid.mouth.rotation.z = 0;
      bubbles[i].s.visible = false;
      G.seats[i] = null;
      outgoing.push(c);
    }
    const outgoing = [];

    // ---------------------------------------------------------------- actions
    function placePatty(i) {
      G.grill[i] = { t: 0 };
      grillPatties[i].pop = 0;
      const p = K.rawPatty();
      fly(p, new THREE.Vector3(B1 - 0.06, WT + 0.25, BZ), new THREE.Vector3(GX[i], WT + grill.top, BZ + 0.02), 0.22, 0.25, () => p.removeFromParent());
      chefGo(GX[i], 'hold');
      sfx('tap');
      tone(180, 0.25, { type: 'triangle', gain: 0.03, slideTo: 120 }, 0.2);
    }
    function nope(key) {
      shake[key] = 0.35;
      sfx('tick');
    }
    const shake = {};
    function tapBox() {
      const i = G.grill.indexOf(null);
      if (i < 0) return nope('patty');
      placePatty(i);
    }
    function trashFrom(from, obj) {
      fly(obj, from, new THREE.Vector3(B1, WT + 0.45, FZ), 0.32, 0.35, () => obj.removeFromParent());
      lidT = 0.6;
      chefGo(B1, 'hold');
      sfx('swoosh');
    }
    let lidT = 0;
    function tapGrill(i) {
      const p = G.grill[i];
      if (!p) return placePatty(i);
      const st = pattyState(p);
      if (st === 'raw') return nope('grill' + i);
      const from = grillPatties[i].m.position.clone();
      if (st === 'burnt') {
        G.grill[i] = null;
        const m = mesh(K.pattyGeometry(), mat(COL.burnt), { cast: false });
        return trashFrom(from, m);
      }
      const sel = G.sel;
      const j = sel && sel.kind === 'plate' && !G.plates[sel.i].patty ? sel.i : G.plates.findIndex((pl) => !pl.patty);
      if (j < 0) {
        nope('plate0');
        say('Plates are full', new THREE.Vector3(GX[1], WT + 0.6, FZ), '#7a6470', 0.8);
        return;
      }
      G.grill[i] = null;
      G.plates[j] = { patty: true, tops: [] };
      G.sel = { kind: 'plate', i: j };
      const m = mesh(K.pattyGeometry(), mat(COL.patty), { cast: false });
      fly(m, from, plates[j].home.clone().setY(WT + 0.08), 0.22, 0.3, () => {
        m.removeFromParent();
        plates[j].pop = 0.4;
      });
      chefGo(GX[i], 'stir');
      sfx('swoosh');
    }
    // A topping goes on the picked plate, else on a plate it helps toward an order, else the first that can take it
    function tapTop(t) {
      if (!G.cfg.tops.includes(t)) return nope(t);
      const need = needs();
      const ok = (pl) => pl.patty && !pl.tops.includes(t);
      const helps = (pl) => BURGERS.some((b) => need[b] && ITEMS[b].tops.includes(t) && pl.tops.every((x) => ITEMS[b].tops.includes(x)));
      const sel = G.sel;
      let j = sel && sel.kind === 'plate' && ok(G.plates[sel.i]) ? sel.i : -1;
      if (j < 0 || (!helps(G.plates[j]) && G.plates.some((pl) => ok(pl) && helps(pl)))) {
        const k = G.plates.findIndex((pl) => ok(pl) && helps(pl));
        if (k >= 0) j = k;
      }
      if (j < 0) j = G.plates.findIndex(ok);
      if (j < 0) {
        nope(t);
        say('Plate a patty first', new THREE.Vector3(TX[t], WT + 0.55, BZ + 0.3), '#7a6470', 0.8);
        return;
      }
      G.plates[j].tops.push(t);
      G.sel = { kind: 'plate', i: j };
      const m = t === 'cheese' ? mesh(K.cg('cheeseTop', () => new THREE.BoxGeometry(0.29, 0.013, 0.29).rotateY(Math.PI / 4)), mat(COL.cheese)) : t === 'lettuce' ? mesh(K.lettuceGeometry(), mat(COL.lettuce)) : cyl(0.07, 0.07, 0.024, COL.tomato, 14);
      fly(m, new THREE.Vector3(TX[t], WT + 0.15, BZ), plates[j].home.clone().setY(WT + 0.16), 0.2, 0.3, () => {
        m.removeFromParent();
        plates[j].pop = 0.5;
      });
      chefGo(TX[t], 'hold');
      sfx('tap');
    }
    function tapPlate(i) {
      const pl = G.plates[i];
      const sel = G.sel;
      if (pl.patty && sel && sel.kind === 'plate' && sel.i === i) return autoServe(sel);
      G.sel = { kind: 'plate', i };
      plates[i].pop = 0.6;
      sfx('tap');
    }
    function tapFryer() {
      if (!G.cfg.fryer) return nope('fryer');
      const st = fryState();
      chefGo(FRY, 'stir');
      if (st === 'empty') {
        G.fryer = { on: true, t: 0 };
        sfx('tap');
        tone(140, 0.4, { type: 'triangle', gain: 0.04, slideTo: 90 });
      } else if (st === 'cooking') nope('fryer');
      else if (st === 'burnt') {
        G.fryer = { on: false, t: 0 };
        const g = new THREE.Group();
        g.add(mesh(K.friesGeometry(), mat(COL.burnt), { cast: false }));
        trashFrom(fryer.basket.getWorldPosition(new THREE.Vector3()), g);
      } else {
        const j = G.fries.indexOf(false);
        if (j < 0) return nope('fries0');
        G.fryer = { on: false, t: 0 };
        G.fries[j] = true;
        friesSlots[j].pop = 0;
        const g = new THREE.Group();
        g.add(mesh(K.friesGeometry(), mat(COL.fries), { cast: false }));
        fly(g, fryer.basket.getWorldPosition(new THREE.Vector3()), friesSlots[j].home.clone().setY(WT + 0.1), 0.25, 0.3, () => g.removeFromParent());
        sfx('swoosh');
      }
    }
    function tapHeld(kind, i, has) {
      if (!has) return nope(kind + i);
      const sel = G.sel;
      if (sel && sel.kind === kind && sel.i === i) return autoServe(sel);
      G.sel = { kind, i };
      slotVisual(G.sel).pop = 0.6;
      chefGo(slotVisual(G.sel).x, 'hold', 0.3);
      sfx('tap');
    }
    function tapSoda() {
      chefGo(SODA, 'hold');
      if (G.soda.filling) return nope('soda');
      if (G.cups.every(Boolean)) return nope('cup0');
      G.soda = { filling: true, t: 0 };
      sfx('tap');
    }
    function tapShake() {
      if (!G.cfg.shake) return nope('shake');
      chefGo(SHK, 'stir');
      if (G.blender.on) return nope('shake');
      if (G.shakes.every(Boolean)) return nope('glass0');
      G.blender = { on: true, t: 0 };
      sfx('tap');
    }
    function tapTrash() {
      const sel = G.sel;
      const id = selItem(sel);
      if (id) {
        const obj = modelOf(sel);
        const from = slotPos(sel);
        takeSel(sel);
        G.sel = null;
        return trashFrom(from, obj);
      }
      const b = G.grill.findIndex((p) => p && pattyState(p) === 'burnt');
      if (b >= 0) return tapGrill(b);
      if (G.cfg.fryer && fryState() === 'burnt') return tapFryer();
      G.sel = null;
      nope('trash');
    }
    function serveTo(sel, i, from) {
      const c = G.seats[i];
      if (!c || c.st !== 'wait') return false;
      const id = selItem(sel);
      if (!id || id === 'odd') return false;
      const k = c.order.findIndex((o) => !o.done && o.id === id);
      if (k < 0) return false;
      const start = from || slotPos(sel);
      takeSel(sel);
      G.sel = null;
      const o = c.order[k];
      o.done = true;
      const model = K.makeItem(id);
      model.scale.setScalar(0.9);
      o.model = model;
      fly(model, start, passPos(i, k, c.order.length), 0.42, 0.6, () => tone(900, 0.05, { type: 'triangle', gain: 0.04 }));
      c.pat = Math.min(c.max, c.pat + c.max * 0.12);
      c.kid.squash = 1.15;
      bubbles[i].key = '';
      chefGo(start.x, 'hold', 0.35);
      sfx('good');
      if (c.order.every((q) => q.done)) pay(c, i);
      return true;
    }
    function autoServe(sel) {
      const id = selItem(sel);
      if (!id) return;
      const at_ = slotPos(sel).add(new THREE.Vector3(0, 0.45, 0));
      if (id === 'odd') {
        shake[sel.kind + sel.i] = 0.4;
        sfx('bad');
        say('No one ordered that', at_, '#7a6470', 0.85);
        return;
      }
      let best = -1;
      G.seats.forEach((c, i) => {
        if (c && c.st === 'wait' && c.order.some((o) => !o.done && o.id === id) && (best < 0 || c.pat < G.seats[best].pat)) best = i;
      });
      if (best < 0) {
        shake[sel.kind + sel.i] = 0.4;
        sfx('tick');
        say('No one wants that yet', at_, '#7a6470', 0.85);
        return;
      }
      serveTo(sel, best);
    }
    function tapSeat(i) {
      const c = G.seats[i];
      if (!c || c.st !== 'wait') return;
      if (!G.sel || !selItem(G.sel)) {
        c.kid.squash = 0.9;
        sfx('tick');
        return;
      }
      if (!serveTo(G.sel, i)) {
        c.kid.squash = 0.85;
        sfx('bad');
        say('Not on my order', new THREE.Vector3(SPOTS[i], FLOOR_D + 1.75, SPOT_Z + 0.3), COL.cherry, 0.85);
      }
    }
    function pay(c, i) {
      const base = c.order.reduce((a, o) => a + ITEMS[o.id].price, 0);
      const frac = clamp(c.pat / c.max, 0, 1);
      let tip = Math.round(frac * (1 + c.order.length * 1.5));
      if (c.who === 'partner') {
        tip += 3;
        G.partnerServed = true;
      }
      G.coins += base + tip;
      G.served++;
      c.st = 'pay';
      c.payT = 0.9;
      const head = headPos(c.kid);
      throwCoins(head.clone().setY(1.6), Math.min(6, 2 + c.order.length));
      say(`+${base + tip}`, head.clone().add(new THREE.Vector3(0, 0.25, 0.3)), '#c77800', 1.1);
      if (tip > 0) setTimeout(() => G && say(`tip ${tip}`, head.clone().add(new THREE.Vector3(0.55, -0.15, 0.3)), '#3fa06a', 0.8), 180);
      fx.heartsAt(head, c.who === 'partner' ? 6 : 3);
      sfx('coin');
      c.kid.emote(c.who === 'partner' ? 'heart' : 'cheer');
      bubbles[i].s.visible = false;
      if (!G.goalHit && G.coins >= G.cfg.goal) {
        G.goalHit = true;
        setTimeout(() => {
          if (!G) return;
          hud.message('Goal reached!', 1400);
          sfx('win');
          fx.burst(REG.clone(), [COL.sun, COL.hotpink, COL.mint, '#ffffff'], 40);
          partnerCheer = 2.2;
          chef.cheer = 1.6;
        }, 400);
      }
    }
    let partnerCheer = 0;

    // Run a station by its key
    function doKey(key) {
      if (!G || G.phase !== 'play' || !key) return;
      if (key === 'trash') return tapTrash();
      if (key === 'patty') return tapBox();
      if (TOPS.includes(key)) return tapTop(key);
      if (key === 'fryer') return tapFryer();
      if (key === 'soda') return tapSoda();
      if (key === 'shake') return tapShake();
      const i = Number(key.slice(-1));
      const kind = key.slice(0, -1);
      if (kind === 'grill') return tapGrill(i);
      if (kind === 'plate') return tapPlate(i);
      if (kind === 'fries') return tapHeld('fries', i, G.fries[i]);
      if (kind === 'cup') return tapHeld('cup', i, G.cups[i]);
      if (kind === 'glass') return tapHeld('glass', i, G.shakes[i]);
      if (kind === 'guest') return tapSeat(i);
    }
    // Space: serve the picked food, else any ready food someone is waiting for
    function serveAny() {
      if (G.sel && selItem(G.sel) && selItem(G.sel) !== 'odd') return autoServe(G.sel);
      const need = needs();
      const cands = [
        ...G.plates.map((pl, i) => ({ kind: 'plate', i, id: plateId(pl) })),
        ...G.fries.map((f, i) => ({ kind: 'fries', i, id: f ? 'fries' : null })),
        ...G.cups.map((f, i) => ({ kind: 'cup', i, id: f ? 'soda' : null })),
        ...G.shakes.map((f, i) => ({ kind: 'glass', i, id: f ? 'shake' : null })),
      ];
      const c = cands.find((q) => q.id && need[q.id]);
      if (c) return autoServe({ kind: c.kind, i: c.i });
      sfx('tick');
    }
    function cyclePlate() {
      const list = [0, 1, 2].filter((i) => G.plates[i].patty);
      if (!list.length) return sfx('tick');
      const cur = G.sel && G.sel.kind === 'plate' ? list.indexOf(G.sel.i) : -1;
      G.sel = { kind: 'plate', i: list[(cur + 1) % list.length] };
      plates[G.sel.i].pop = 0.6;
      sfx('tap');
    }

    // ---------------------------------------------------------------- hints
    function makeHint() {
      const need = needs();
      const any = Object.keys(need).length > 0;
      const wantedBy = (id) => {
        let best = -1;
        G.seats.forEach((c, i) => {
          if (c && c.st === 'wait' && c.order.some((o) => !o.done && o.id === id) && (best < 0 || c.pat < G.seats[best].pat)) best = i;
        });
        return best;
      };
      const sid = G.sel && selItem(G.sel);
      if (sid && sid !== 'odd' && need[sid]) return { text: `Tap the guest who wants the ${ITEMS[sid].name}, or tap it again`, key: 'guest' + wantedBy(sid) };
      let i = G.grill.findIndex((p) => p && pattyState(p) === 'burnt');
      if (i >= 0) return { text: 'Burnt! Tap it to throw it away', key: 'grill' + i };
      if (G.cfg.fryer && fryState() === 'burnt') return { text: 'Burnt fries! Tap the fryer to toss them', key: 'fryer' };
      i = G.grill.findIndex((p) => p && pattyState(p) === 'done');
      if (i >= 0 && G.plates.some((pl) => !pl.patty)) return { text: 'Tap the cooked patty to put it on a bun', key: 'grill' + i };
      for (let j = 0; j < 3; j++) {
        const pl = G.plates[j];
        const id = plateId(pl);
        if (!id) continue;
        if (need[id]) return { text: `Tap the ${ITEMS[id].name}, then tap the guest`, key: 'plate' + j };
        const want = BURGERS.find((b) => need[b] && pl.tops.every((t) => ITEMS[b].tops.includes(t)) && ITEMS[b].tops.some((t) => !pl.tops.includes(t)));
        if (want) {
          const t = ITEMS[want].tops.find((x) => !pl.tops.includes(x));
          if (!G.sel || G.sel.kind !== 'plate' || G.sel.i !== j) {
            const other = G.sel && G.sel.kind === 'plate' && G.plates[G.sel.i].patty && plateId(G.plates[G.sel.i]) !== id;
            if (other) return { text: 'Tap this burger to pick it', key: 'plate' + j };
          }
          return { text: `Add ${t} for the ${ITEMS[want].name}`, key: t };
        }
        if (any) return { text: 'No one wants that burger. Tap it, then the trash', key: G.sel && G.sel.kind === 'plate' && G.sel.i === j ? 'trash' : 'plate' + j };
      }
      if (G.cfg.fryer && fryState() === 'done' && G.fries.includes(false)) return { text: 'Fries are ready! Tap the fryer to box them', key: 'fryer' };
      i = G.fries.findIndex(Boolean);
      if (i >= 0 && need.fries) return { text: 'Tap the fries, then tap the guest', key: 'fries' + i };
      i = G.cups.findIndex(Boolean);
      if (i >= 0 && need.soda) return { text: 'Tap the soda, then tap the guest', key: 'cup' + i };
      i = G.shakes.findIndex(Boolean);
      if (i >= 0 && need.shake) return { text: 'Tap the milkshake, then tap the guest', key: 'glass' + i };
      const burgersNeeded = BURGERS.reduce((a, b) => a + (need[b] || 0), 0);
      const pattiesOut = G.grill.filter((p) => p && pattyState(p) !== 'burnt').length + G.plates.filter((pl) => pl.patty).length;
      if (burgersNeeded > pattiesOut && G.grill.includes(null)) return { text: 'Tap the patties to grill one', key: 'patty' };
      const sodas = G.cups.filter(Boolean).length + (G.soda.filling ? 1 : 0);
      const shakes = G.shakes.filter(Boolean).length + (G.blender.on ? 1 : 0);
      const fries = G.fries.filter(Boolean).length + (G.fryer.on ? 1 : 0);
      if (G.cfg.shake && (need.shake || 0) > shakes && !G.blender.on) return { text: 'Tap the shake mixer to blend a milkshake', key: 'shake' };
      if (G.cfg.fryer && (need.fries || 0) > fries) return { text: 'Tap the fryer to cook fries', key: 'fryer' };
      if ((need.soda || 0) > sodas && !G.soda.filling) return { text: 'Tap the soda fountain to fill a cup', key: 'soda' };
      if (G.grill.some(Boolean)) return { text: 'Sizzle sizzle... watch the grill', key: null };
      if (!G.seats.some(Boolean)) return { text: 'Guests are on the way', key: null };
      return { text: 'Keep the guests happy!', key: null };
    }
    let hint = { text: '', key: null };
    const IDLE = newShift(0);
    let hintText = '';

    // ---------------------------------------------------------------- level menu
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const iconUrl = {};
    const iconImg = (id) => {
      if (!iconUrl[id]) iconUrl[id] = iconCanvas(id).toDataURL();
      return `<img alt="" src="${iconUrl[id]}">`;
    };
    const loadBest = () => {
      const b = ctx.load('best', [0, 0, 0]);
      return Array.isArray(b) ? [0, 1, 2].map((i) => Number(b[i]) || 0) : [0, 0, 0];
    };
    const loadUnlocked = () => clamp(Number(ctx.load('unlocked', 1)) || 1, 1, LEVELS.length);
    let menu = null;
    const LOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    function showMenu() {
      const unlocked = loadUnlocked();
      const best = loadBest();
      const next = unlocked - 1;
      menu = document.createElement('div');
      menu.className = 'yk-menu';
      const cards = LEVELS.map((lv, i) => {
        const open = i < unlocked;
        return `<button class="yk-lv${i === next ? ' next' : ''}" data-lv="${i}" ${open ? '' : 'disabled'}>
          <i>${open ? '' : LOCK}Level ${i + 1}</i><b>${lv.name}</b><span class="yk-ic">${Object.keys(lv.items).map(iconImg).join('')}</span>
          <small>Goal ${lv.goal} coins${open ? (best[i] ? ` · best ${best[i]}` : '') : ` · win level ${i} first`}</small></button>`;
      }).join('');
      menu.innerHTML = `<div class="yk-card" role="dialog" aria-label="Pick a shift"><h3>Chef ${NAME[me]}, the YumYum doors open soon!</h3>
        <p>Cook, plate and serve. Reach the coin goal before the clock runs out.</p><div class="yk-levels">${cards}</div>
        <p class="yk-help">Tap the patties to grill one. Tap a cooked patty to put it on a bun, add toppings, then tap the food and tap a guest, or drag it to them. Tap food twice to hand it to whoever ordered it.<span class="yk-keys"> Keys: <kbd>1</kbd> to <kbd>9</kbd> stations, <kbd>Tab</kbd> picks a burger, <kbd>Space</kbd> serves.</span></p></div>`;
      menu.addEventListener('click', (e) => {
        const b = e.target.closest('[data-lv]');
        if (b && !b.disabled) startLevel(Number(b.dataset.lv));
      });
      document.body.appendChild(menu);
      menu.querySelector('.next')?.focus({ preventScroll: true });
      hud.score('');
      hud.hint('');
    }
    function startLevel(lv) {
      if (lv >= loadUnlocked() || G) return;
      menu?.remove();
      menu = null;
      G = newShift(lv);
      shown = 0;
      register.show('0');
      locks.fryer.visible = !G.cfg.fryer;
      locks.shake.visible = !G.cfg.shake;
      locks.veg.visible = !G.cfg.tops.includes('lettuce');
      hud.message(`Level ${lv + 1}: ${G.cfg.name}`, 1500);
      sfx('pop');
      setScore();
    }
    function setScore() {
      const sec = Math.ceil(G.time);
      const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      const late = G.phase === 'play' && sec <= 10;
      const str = `<span style="color:#c77800">${Math.round(shown)}</span> / ${G.cfg.goal} coins &nbsp; <span style="color:${late ? '#e5484d' : 'inherit'}">${clock}</span>`;
      if (str !== scoreText) {
        scoreText = str;
        hud.score(str);
      }
    }
    function endShift() {
      const lv = G.lv;
      const goal = G.cfg.goal;
      const win = G.coins >= goal;
      const best = loadBest();
      const prev = best[lv];
      if (G.coins > prev) {
        best[lv] = G.coins;
        ctx.save('best', best);
      }
      let opened = false;
      if (win && lv + 1 < LEVELS.length && loadUnlocked() < lv + 2) {
        ctx.save('unlocked', lv + 2);
        opened = true;
      }
      const stars = !win ? 0 : G.coins >= goal * 1.6 ? 3 : G.coins >= goal * 1.3 ? 2 : 1;
      const parts = [`${NAME[me]} earned ${G.coins} of ${goal} coins and served ${G.served} guest${G.served === 1 ? '' : 's'}.`];
      parts.push(G.coins > prev && G.coins > 0 ? 'New best!' : `Best: ${Math.max(prev, G.coins)}.`);
      if (opened) parts.push(`Level ${lv + 2} is open.`);
      if (!win) parts.push(`Just ${goal - G.coins} more next time.`);
      const line = G.partnerServed ? `<br><b>${NAME[pid]}:</b> "${me === 'roji' ? 'Best burger on the island, Chef Roji!' : 'You cook like a dream, Homama.'}"` : '';
      const result = { win, title: win ? (stars === 3 ? 'Star chef!' : 'Shift complete!') : 'So close!', text: `${starsHtml(stars)}<br>${parts.join(' ')}${line}`, coins: G.coins, level: lv + 1, stars, served: G.served };
      G.phase = 'done';
      ctx.finish(result);
    }

    // ---------------------------------------------------------------- keys and drag
    const tabKey = (e) => {
      if (e.key === 'Tab' && !menu) e.preventDefault();
    };
    window.addEventListener('keydown', tabKey);
    const KEYS = { 1: 'patty', p: 'patty', 2: 'grill', g: 'grill', 3: 'cheese', c: 'cheese', 4: 'lettuce', l: 'lettuce', 5: 'tomato', t: 'tomato', 6: 'fryer', f: 'fryer', 7: 'soda', d: 'soda', 8: 'shake', m: 'shake', 9: 'trash', x: 'trash' };
    function keyInput() {
      for (const [k, name] of Object.entries(KEYS)) {
        if (!input.pressed(k)) continue;
        if (name === 'grill') {
          const order = { burnt: 0, done: 1 };
          const list = [0, 1, 2].filter((i) => G.grill[i] && pattyState(G.grill[i]) !== 'raw').sort((a, b) => order[pattyState(G.grill[a])] - order[pattyState(G.grill[b])]);
          if (list.length) tapGrill(list[0]);
          else nope('grill0');
        } else doKey(name);
      }
      if (input.pressed('tab')) cyclePlate();
      if (input.pressed('jump') || input.pressed('action')) serveAny();
    }
    let press = null;
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.35);
    const ray = new THREE.Raycaster();
    const dragAt = new THREE.Vector3();
    const selOfKey = (key) => {
      if (!key) return null;
      const kind = key.slice(0, -1);
      if (!SLOTS[kind]) return null;
      const sel = { kind, i: Number(key.slice(-1)) };
      return selItem(sel) && selItem(sel) !== 'odd' ? sel : null;
    };
    function pointerInput() {
      const pt = input.pointer;
      if (pt.justDown) {
        const key = pickKey(pt.ndc);
        const sel = selOfKey(key);
        press = sel ? { sel, x: pt.x, y: pt.y, drag: null } : null;
      }
      if (press && pt.down && !press.drag && Math.hypot(pt.x - press.x, pt.y - press.y) > 16) {
        const id = selItem(press.sel);
        if (!id) press = null;
        else {
          press.drag = modelOf(press.sel);
          scene.add(press.drag);
          dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(dragAt).negate(), new THREE.Vector3(0, WT + 0.2, FZ));
          slotVisual(press.sel).dragging = true;
          G.sel = press.sel;
        }
      }
      if (press?.drag) {
        ray.setFromCamera(pt.ndc, camera);
        if (ray.ray.intersectPlane(dragPlane, dragAt)) press.drag.position.lerp(dragAt.sub(v3.set(0, 0.08, 0)), 0.7);
      }
      if (pt.justUp && press) {
        if (press.drag) {
          const key = pickKey(pt.ndc);
          const from = press.drag.position.clone();
          const v = slotVisual(press.sel);
          v.dragging = false;
          const ghost = press.drag;
          ghost.removeFromParent();
          if (key && key.startsWith('guest')) {
            const i = Number(key.slice(-1));
            if (!serveTo(press.sel, i, from)) {
              sfx('bad');
              say('Not on my order', new THREE.Vector3(SPOTS[i], FLOOR_D + 1.75, SPOT_Z + 0.3), COL.cherry, 0.85);
            }
          } else if (key === 'trash') {
            G.sel = press.sel;
            tapTrash();
          } else {
            const back = modelOf(press.sel);
            v.hideFor = 0.25;
            fly(back, from, slotPos(press.sel), 0.25, 0.1, () => back.removeFromParent());
          }
        }
        press = null;
      }
    }

    // ---------------------------------------------------------------- camera
    // The closest camera (fixed angle) that shows the whole worktop and every bubble below the top bar.
    const DIR = new THREE.Vector3(0, 0.8, 1).normalize();
    const FIT = [[-3.95, WT, 0.64], [3.95, WT, 0.64], [-3.4, BUB_Y + 0.55, SPOT_Z], [3.4, BUB_Y + 0.55, SPOT_Z], [0, WT - 0.05, 0.64]].map((p) => new THREE.Vector3(...p));
    const camLook = new THREE.Vector3(0, 1.2, -1.0);
    let fitFor = '';
    const fitCam = { look: new THREE.Vector3(), d: 8 };
    const place = (look, d) => {
      camera.position.copy(look).addScaledVector(DIR, d);
      camera.lookAt(look);
      camera.updateMatrixWorld();
    };
    function fitCamera() {
      const key = `${innerWidth}x${innerHeight}`;
      if (key === fitFor) return;
      fitFor = key;
      const top = 1 - (2 * (touch() ? 62 : 70)) / innerHeight;
      const bot = -0.99;
      const look = new THREE.Vector3(0, 1.2, -1.0);
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const p = new THREE.Vector3();
      const span = (d) => {
        for (let k = 0; k < 4; k++) {
          place(look, d);
          let y0 = Infinity;
          let y1 = -Infinity;
          for (const q of FIT) {
            p.copy(q).project(camera);
            y0 = Math.min(y0, p.y);
            y1 = Math.max(y1, p.y);
          }
          look.y -= (((top + bot) / 2 - (y0 + y1) / 2) * d * tanV) / 1.25;
        }
        place(look, d);
        let ok = true;
        for (const q of FIT) {
          p.copy(q).project(camera);
          if (Math.abs(p.x) > 0.985 || p.y > top || p.y < bot) ok = false;
        }
        return ok;
      };
      let lo = 3;
      let hi = 40;
      for (let i = 0; i < 22; i++) {
        const d = (lo + hi) / 2;
        if (span(d)) hi = d;
        else lo = d;
      }
      span(hi);
      fitCam.look.copy(look);
      fitCam.d = hi;
    }

    hud.buttons({ action: null, jump: null, stick: false });
    showMenu();

    // Headless test hooks
    const debug = {
      speed: 1,
      start: (lv) => startLevel(lv),
      act: (key) => doKey(key),
      serve: () => serveAny(),
      step() {
        if (!G || G.phase !== 'play') return null;
        const h = makeHint();
        if (h.key) doKey(h.key);
        return h;
      },
      peek: () =>
        G && {
          phase: G.phase, lv: G.lv, time: +G.time.toFixed(1), coins: G.coins, goal: G.cfg.goal, served: G.served, lost: G.lost, sel: G.sel && { ...G.sel },
          grill: G.grill.map((p) => p && pattyState(p)), plates: G.plates.map((p) => plateId(p)), fryer: G.cfg.fryer ? fryState() : 'locked',
          fries: [...G.fries], cups: [...G.cups], shakes: [...G.shakes], seats: G.seats.map((c) => c && { st: c.st, who: c.who, pat: +(c.pat / c.max).toFixed(2), order: c.order.map((o) => o.id + (o.done ? '*' : '')) }),
        },
      get hint() {
        return hint;
      },
      get G() {
        return G;
      },
      set time(v) {
        if (G) G.time = v;
      },
      px: (key) => toPx(targets[key].anchor),
    };

    // ---------------------------------------------------------------- frame
    const v3 = new THREE.Vector3();
    const raw = new THREE.Color(COL.raw);
    const cooked = new THREE.Color(COL.patty);
    const burnt = new THREE.Color(COL.burnt);
    let steamT = 0;

    return {
      debug,
      update(rdt, t) {
        const dt = rdt * debug.speed;
        const play = G && G.phase === 'play';
        if (menu) for (const k of ['1', '2', '3']) if (input.pressed(k)) startLevel(Number(k) - 1);
        if (play) {
          keyInput();
          for (const tp of input.taps()) {
            if (press?.drag) continue;
            const key = pickKey(tp.ndc);
            doKey(key);
          }
          pointerInput();
        }
        if (!touch()) {
          const over = !menu && G && pickKey(input.pointer.ndc);
          ctx.renderer.domElement.style.cursor = over ? 'pointer' : '';
        }

        // Shift clock and cooking timers
        if (G) {
          shown = damp(shown, G.coins, 6, rdt);
          if (Math.abs(G.coins - shown) < 0.5) shown = G.coins;
          if (G.phase === 'ready') {
            G.phaseT += dt;
            if (G.phaseT > 1.7) {
              G.phase = 'play';
              hud.message('Doors open!', 1000);
              sfx('good');
            }
          } else if (G.phase === 'over') {
            G.phaseT += dt;
            if (G.phaseT > 1.8 && !G.finished) {
              G.finished = true;
              endShift();
            }
          }
          if (play) {
            const cfg = G.cfg;
            G.time = Math.max(0, G.time - dt);
            const sec = Math.ceil(G.time);
            if (sec <= 10 && sec !== G.lastTick && sec > 0) {
              G.lastTick = sec;
              if (sec === 10) hud.message('Last 10 seconds!', 1100);
              tone(sec <= 3 ? 1046 : 880, 0.06, { type: 'triangle', gain: 0.04 });
            }
            G.grill.forEach((p) => {
              if (!p) return;
              const a = pattyState(p);
              p.t += dt;
              const b = pattyState(p);
              if (a !== b) sfx(b === 'done' ? 'pop' : 'bad');
            });
            if (G.fryer.on) {
              const a = fryState();
              G.fryer.t += dt;
              const b = fryState();
              if (a !== b) sfx(b === 'done' ? 'pop' : 'bad');
            }
            if (G.soda.filling) {
              G.soda.t += dt;
              if (G.soda.t >= cfg.fill) {
                const j = G.cups.indexOf(false);
                if (j >= 0) {
                  G.cups[j] = true;
                  cupSlots[j].pop = 0;
                  const g = K.makeCup().group;
                  fly(g, machineCup.group.position, cupSlots[j].home, 0.3, 0.3, () => g.removeFromParent());
                }
                G.soda = { filling: false, t: 0 };
                sfx('pop');
              }
            }
            if (G.blender.on) {
              G.blender.t += dt;
              if (G.blender.t >= cfg.blend) {
                const j = G.shakes.indexOf(false);
                if (j >= 0) {
                  G.shakes[j] = true;
                  glassSlots[j].pop = 0;
                  const g = K.makeShake().group;
                  fly(g, mixer.cup.getWorldPosition(new THREE.Vector3()), glassSlots[j].home, 0.3, 0.35, () => g.removeFromParent());
                }
                G.blender = { on: false, t: 0 };
                sfx('pop');
              }
            }
            // Guests: the partner first, then whoever is hungry
            G.spawnT -= dt;
            if (G.spawnT <= 0) {
              const free = [0, 1, 2].filter((i) => !G.seats[i]);
              if (G.partnerDue && !G.seats[1]) {
                G.partnerDue = false;
                spawn(1, true);
                G.spawnT = 2.2;
              } else if (free.length && G.time > 10) {
                spawn(pick(free));
                G.spawnT = rnd(cfg.spawn[0], cfg.spawn[1]);
              } else G.spawnT = 0.8;
            }
            if (G.sel && !selItem(G.sel) && G.sel.kind !== 'plate') G.sel = null;
            hint = makeHint();
            if (G.time <= 0) {
              G.phase = 'over';
              G.phaseT = 0;
              G.sel = null;
              hint = { text: '', key: null };
              hud.message("Time's up!", 1400);
              G.seats.forEach((c, i) => {
                if (!c || c.st === 'pay') return;
                for (const o of c.order) o.model?.removeFromParent();
                leave(c, i);
              });
              sfx('tick');
            }
          }
          setScore();
        }

        // Guests walking, waiting and paying
        if (G) {
          G.seats.forEach((c, i) => {
            if (!c) return;
            c.t += dt;
            c.speed = 0;
            if (c.st === 'in') {
              if (walk(c, dt, 3.1)) {
                c.st = 'wait';
                bubbles[i].k = 0;
                bubbles[i].key = '';
                drawBubble(bubbles[i], c);
                bubbles[i].s.visible = true;
                sfx('pop');
                c.kid.squash = 0.85;
              }
            } else if (c.st === 'wait') {
              c.yaw = util.dampAngle(c.yaw, 0, 8, dt);
              if (G.phase === 'play') c.pat -= dt;
              const frac = c.pat / c.max;
              c.kid.mouth.rotation.z = frac < 0.3 ? 0 : Math.PI;
              if (c.pat <= 0) {
                c.pat = 0;
                G.lost++;
                sfx('bad');
                say('Too slow', headPos(c.kid).add(v3.set(0, 0.1, 0.3)), COL.cherry, 1);
                for (const o of c.order) o.model?.removeFromParent();
                leave(c, i, true);
                return;
              }
              const b = bubbles[i];
              const key = `${c.order.map((o) => o.done).join()}|${Math.round(frac * 24)}|${frac < 0.3}`;
              if (key !== b.key) {
                b.key = key;
                drawBubble(b, c);
              }
            } else if (c.st === 'pay') {
              c.payT -= dt;
              c.yaw = util.dampAngle(c.yaw, 0, 8, dt);
              if (c.payT <= 0) {
                const trayG = new THREE.Group();
                trayG.add(rbox(0.62, 0.03, 0.4, COL.orange, 0.015));
                c.order.forEach((o, k) => {
                  if (!o.model) return;
                  o.model.scale.setScalar(0.55);
                  o.model.position.set((k - (c.order.length - 1) / 2) * 0.19, 0.015, 0);
                  trayG.add(o.model);
                });
                trayG.position.set(0, -0.06, 0.04);
                c.kid.carry(trayG);
                c.tray = trayG;
                leave(c, i);
              }
            }
            c.kid.root.rotation.y = c.yaw;
            animate(c.kid, dt, t, c.speed);
            const b = bubbles[i];
            if (b.s.visible) {
              b.k = Math.min(1, b.k + rdt * 4);
              const s = (0.6 + 0.4 * easeOutBack(b.k)) * 1.62;
              const wob = c.pat / c.max < 0.2 ? Math.sin(t * 20) * 0.02 : 0;
              b.s.scale.set(s, s * (330 / 512), 1);
              b.s.position.set(SPOTS[i] + wob, BUB_Y, SPOT_Z);
            }
          });
        }
        for (let k = outgoing.length - 1; k >= 0; k--) {
          const c = outgoing[k];
          c.speed = 0;
          if (c.sitting) {
            c.kid.hands = partnerCheer > 0 ? 'wave2' : Math.sin(t * 1.3) > 0.6 ? 'hold' : null;
          } else if (walk(c, dt, 3.1)) {
            if (c.toTable) {
              c.sitting = true;
              c.kid.pose = 'sit';
              c.kid.root.position.set(TABLE.x, FLOOR_D + 0.19, TABLE.z - 0.62);
              c.yaw = 0;
              const tr = c.kid.carry(null);
              if (tr) {
                tr.position.set(TABLE.x, FLOOR_D + 0.79, TABLE.z - 0.08);
                tr.scale.setScalar(1.25);
                scene.add(tr);
              }
            } else {
              if (c.who === 'partner') partnerKid = null;
              c.tray?.removeFromParent();
              disposeKid(c.kid);
              outgoing.splice(k, 1);
              continue;
            }
          }
          c.kid.root.rotation.y = c.yaw;
          animate(c.kid, dt, t, c.speed);
        }
        partnerCheer = Math.max(0, partnerCheer - rdt);

        // Chef
        {
          const dx = chef.target - chef.x;
          let speed = 0;
          if (Math.abs(dx) > 0.03) {
            speed = 3.4;
            chef.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
            chef.yaw = util.dampAngle(chef.yaw, Math.sign(dx) * Math.PI / 2, 14, dt);
          } else chef.yaw = util.dampAngle(chef.yaw, 0, 10, dt);
          chef.work = Math.max(0, chef.work - dt);
          chef.cheer = Math.max(0, chef.cheer - rdt);
          const k = chef.kid;
          k.hands = chef.cheer > 0 ? 'wave2' : speed > 0 ? null : chef.work > 0 ? chef.hands : !G ? (Math.sin(t * 0.8) > 0.4 ? 'wave2' : null) : null;
          k.root.position.set(chef.x, 0, CHEF_Z);
          k.root.rotation.y = chef.yaw;
          animate(k, rdt, t, speed);
        }

        // Station visuals
        const S = G || IDLE;
        GX.forEach((x, i) => {
          const p = S.grill[i];
          const gp = grillPatties[i];
          gp.m.visible = !!p;
          const ring = rings.grill[i];
          if (!p) return ring.hide();
          gp.pop = Math.min(1, gp.pop + rdt * 4);
          const st = pattyState(p);
          const cfg = S.cfg;
          if (st === 'raw') {
            gp.m.material.color.copy(raw).lerp(cooked, Math.min(1, p.t / cfg.cook));
            ring.set(p.t / cfg.cook, COL.mint);
          } else if (st === 'done') {
            const k = (p.t - cfg.cook) / cfg.burn;
            gp.m.material.color.copy(cooked).lerp(burnt, Math.max(0, k - 0.6) * 1.2);
            const warn = k > 0.6;
            ring.set(1 - k, warn ? (Math.sin(t * 16) > 0 ? COL.cherry : COL.sun) : COL.sun);
          } else {
            gp.m.material.color.copy(burnt);
            ring.set(1, COL.cherry);
          }
          const sh = shake['grill' + i] || 0;
          gp.m.position.x = x + (sh > 0 ? Math.sin(sh * 60) * 0.03 : 0);
          gp.m.scale.setScalar(easeOutBack(gp.pop));
          gp.m.position.y = WT + grill.top + (st === 'done' ? Math.abs(Math.sin(t * 9 + i)) * 0.006 : 0);
        });
        steamT -= rdt;
        if (steamT <= 0) {
          steamT = 0.12;
          S.grill.forEach((p, i) => p && puffAt(GX[i], WT + 0.2, BZ + 0.05, pattyState(p) === 'burnt'));
          if (S.fryer.on && Math.random() < 0.6) puffAt(FRY + (Math.random() - 0.5) * 0.4, WT + 0.4, BZ, fryState() === 'burnt');
        }
        plates.forEach((pl, i) => {
          const st = S.plates[i];
          pl.b.set(st.patty, st.tops);
          pl.pop = Math.min(1, pl.pop + rdt * 3);
          const selected = S.sel && S.sel.kind === 'plate' && S.sel.i === i && st.patty;
          const sh = shake['plate' + i] || 0;
          pl.b.group.visible = !pl.dragging;
          pl.b.group.position.set(pl.home.x + (sh > 0 ? Math.sin(sh * 60) * 0.03 : 0), WT + (selected ? 0.03 + Math.sin(t * 5) * 0.012 : 0), FZ);
          pl.b.group.scale.setScalar(0.85 + 0.15 * easeOutBack(pl.pop));
        });
        const slotSet = (arr, flags, key) =>
          arr.forEach((v, i) => {
            v.pop = Math.min(1, v.pop + rdt * 4);
            v.hideFor = Math.max(0, (v.hideFor || 0) - rdt);
            v.g.visible = flags[i] && !v.dragging && v.hideFor <= 0;
            const selected = S.sel && S.sel.kind === key && S.sel.i === i;
            const sh = shake[key + i] || 0;
            v.g.position.set(v.home.x + (sh > 0 ? Math.sin(sh * 60) * 0.03 : 0), WT + (selected ? 0.03 + Math.sin(t * 5) * 0.012 : 0), FZ);
            v.g.scale.setScalar(Math.max(0.01, easeOutBack(v.pop)));
          });
        slotSet(friesSlots, S.fries, 'fries');
        slotSet(cupSlots, S.cups, 'cup');
        slotSet(glassSlots, S.shakes, 'glass');
        // Fryer basket and oil
        const fst = G && G.cfg.fryer ? fryState() : 'empty';
        const down = fst !== 'empty';
        fryer.basket.position.y = damp(fryer.basket.position.y, down && fst !== 'done' && fst !== 'burnt' ? fryer.downY : down ? fryer.upY - 0.08 : fryer.upY, 8, rdt);
        fryer.fries.visible = down;
        fryer.fries.material.color.set(fst === 'burnt' ? COL.burnt : fst === 'done' ? COL.fries : '#f6e3a1');
        if (fst === 'cooking') {
          rings.fryer.set(G.fryer.t / G.cfg.fry, COL.mint);
          fryer.basket.position.x = Math.sin(t * 30) * 0.004;
        } else if (fst === 'done') {
          const k = (G.fryer.t - G.cfg.fry) / G.cfg.fryBurn;
          rings.fryer.set(1 - k, k > 0.6 ? (Math.sin(t * 16) > 0 ? COL.cherry : COL.sun) : COL.sun);
        } else if (fst === 'burnt') rings.fryer.set(1, COL.cherry);
        else rings.fryer.hide();
        for (const ob of oilBubbles) {
          ob.b.visible = fst === 'cooking';
          if (!ob.b.visible) continue;
          ob.ph = (ob.ph + rdt * 2.2) % 1;
          ob.b.scale.setScalar(0.4 + ob.ph);
          if (ob.ph < rdt * 2.2) ob.b.position.set(FRY + (Math.random() - 0.5) * 0.6, WT + 0.31, BZ + 0.02 + (Math.random() - 0.5) * 0.32);
        }
        // Soda fountain
        const filling = G && G.soda.filling;
        soda.stream.visible = !!filling;
        machineCup.group.visible = !!filling;
        if (filling) {
          const k = G.soda.t / G.cfg.fill;
          machineCup.setFill(k);
          machineCup.setLid(false);
          soda.stream.scale.x = soda.stream.scale.z = 1 + Math.sin(t * 40) * 0.2;
          rings.soda.set(k, COL.mint);
          if (Math.random() < rdt * 8) tone(300 + Math.random() * 200, 0.05, { type: 'sine', gain: 0.015 });
        } else rings.soda.hide();
        // Shake mixer
        const blending = G && G.blender.on;
        if (blending) {
          const k = G.blender.t / G.cfg.blend;
          mixer.spin.rotation.y += rdt * 40;
          mixer.cup.position.x = Math.sin(t * 50) * 0.006;
          rings.shake.set(k, COL.mint);
          if (Math.random() < rdt * 10) tone(120 + Math.random() * 40, 0.08, { type: 'sawtooth', gain: 0.012 });
        } else {
          mixer.cup.position.x = 0;
          rings.shake.hide();
        }
        // Trash lid
        lidT = Math.max(0, lidT - rdt);
        trash.lid.rotation.x = -Math.sin(Math.min(1, lidT / 0.6) * Math.PI) * 1.1;
        for (const k in shake) {
          shake[k] -= rdt;
          if (shake[k] <= 0) delete shake[k];
        }
        // Selection ring
        const sel = G && G.sel && selItem(G.sel) ? G.sel : null;
        selRing.visible = !!sel;
        if (sel) {
          const p = slotPos(sel);
          selRing.position.set(p.x, WT + 0.012, p.z);
          const s = sel.kind === 'plate' ? 1 : 0.72;
          selRing.scale.setScalar(s * (1 + Math.sin(t * 6) * 0.06));
        }
        // Hint arrow and text
        const showArrow = play && hint.key && targets[hint.key] && (G.lv === 0 || touch() || G.time > G.cfg.time - 25);
        arrow.visible = !!showArrow;
        if (showArrow) {
          const a = targets[hint.key].anchor;
          const isGuest = hint.key.startsWith('guest');
          arrow.position.set(a.x, (isGuest ? FLOOR_D + 1.62 : a.y + 0.38) + Math.abs(Math.sin(t * 5)) * 0.08, a.z + (isGuest ? 0.5 : 0.08));
        }
        const ht = play && !touch() ? `${hint.text}  ·  1-9 stations, Space serves` : '';
        if (ht !== hintText) {
          hintText = ht;
          hud.hint(ht);
        }
        for (const b of badges) b.visible = !touch() && !!G;

        // Rings face the camera
        for (const r of [...rings.grill, rings.fryer, rings.soda, rings.shake]) if (r.g.visible) r.g.quaternion.copy(camera.quaternion);

        // Flights, puffs, words, coins
        for (let k = flights.length - 1; k >= 0; k--) {
          const f = flights[k];
          f.t += rdt;
          const q = Math.min(1, f.t / f.dur);
          const e = easeOutCubic(q);
          f.obj.position.lerpVectors(f.from, f.to, e);
          f.obj.position.y += Math.sin(q * Math.PI) * f.arc;
          if (q >= 1) {
            flights.splice(k, 1);
            f.done?.();
          }
        }
        for (const q of puffs) {
          if (q.life <= 0) continue;
          q.life -= rdt * (q.dark ? 0.9 : 1.6);
          q.s.position.addScaledVector(q.v, rdt);
          q.s.scale.setScalar(0.08 + (1 - q.life) * (q.dark ? 0.35 : 0.2));
          q.s.material.opacity = Math.max(0, q.life) * (q.dark ? 0.75 : 0.45);
          if (q.life <= 0) q.s.visible = false;
        }
        for (const w of words) {
          if (w.life <= 0) continue;
          w.life -= rdt;
          w.s.position.y += rdt * 0.45;
          const k = 1.15 - w.life;
          const s = (0.7 + 0.3 * easeOutBack(Math.min(1, k * 4))) * (w.size || 1);
          w.s.scale.set(0.95 * s, 0.285 * s, 1);
          w.s.material.opacity = Math.min(1, w.life * 3);
          if (w.life <= 0) w.s.visible = false;
        }
        for (const c of coins) {
          if (c.t < 0) continue;
          if (c.delay > 0) {
            c.delay -= rdt;
            continue;
          }
          c.t += rdt / 0.6;
          c.m.visible = true;
          const q = Math.min(1, c.t);
          c.m.position.lerpVectors(c.from, REG, easeOutCubic(q));
          c.m.position.y += Math.sin(q * Math.PI) * 0.7;
          c.m.rotation.y += rdt * 12;
          if (q >= 1) {
            c.t = -1;
            c.m.visible = false;
            if (G) register.show(String(G.coins));
            tone(1320, 0.05, { type: 'triangle', gain: 0.03 });
          }
        }

        // Camera: fits the worktop and the guests' bubbles
        fitCamera();
        camLook.copy(fitCam.look);
        camLook.x += Math.sin(t * 0.25) * 0.03;
        place(camLook, fitCam.d);
      },
      dispose() {
        menu?.remove();
        style.remove();
        window.removeEventListener('keydown', tabKey);
        ctx.renderer.domElement.style.cursor = '';
        hud.hint('');
        G = null;
      },
    };
  },
};
