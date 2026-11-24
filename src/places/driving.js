import * as THREE from 'three';
import { Car } from '../car.js';
import { C, kit, colorBake, Atlas, signPost, makeTrafficLight, lightMats, setLight, makeCone, makeDuck, makeNora, freezeKid, learnerize, tree, addFlowers, paintedPlane, drawBoard, drawWheelBadge, drawLPlate, BOARD, licenceProgress, lessonsDone, heartPath, paintText } from './driving/kit.js';
import { buildDrivingInterior } from './driving/interior.js';

// Little Wheels Driving School, where Roji is learning to drive with her instructor Abu Sanad.
// An office (enterable), a practice yard with a roundabout, traffic lights, a stop sign, a zebra crossing
// and parking bays, the learner car with its L plates, a duck pond and "Roji's progress" board with
// Homama's driving certificate. The Driving Lesson game starts from Abu Sanad by the car.

const WHEEL = 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z M3.6 10.5l6-.5 M14.4 10l6 .5 M12 14.5V21';
const BOARD_ICON = 'M4 5h16v11H4z M8 16l-2 4 M16 16l2 4 M7 9h5 M7 12h3 M14.5 8.5h2.5v3h-2.5z';
const DUCK = 'M8 10a4 4 0 1 1 7.5 2H19a2 2 0 0 1 2 2 6 6 0 0 1-6 6H9a5 5 0 0 1-5-5c0-1.7.8-3.2 2.1-4.1 M5.5 9H3 M10.5 8.5h.01';

// Practice yard (local metres)
const YX0 = -2.6;
const YX1 = 14.6;
const YZ0 = -11.6;
const YZ1 = 8.2;
const RB = { x: 6, z: -5.2 }; // roundabout centre
const CAR_AT = { x: 8.8, z: 6.3 };

const ROJI_LINES = [
  '<b>Homama:</b> You can do it, Roji! I believe in you.',
  '<b>Homama:</b> Abu Sanad says you are a natural. I agree!',
  '<b>Homama:</b> I will cheer for you the whole lesson, Roji.',
  '<b>Homama:</b> Seatbelt, mirrors, big smile. You have got this!',
];
const HOMAMA_LINES = [
  'Homama is here to cheer Roji on today.',
  'Homama brought his biggest smile for Roji\'s lesson.',
  'Homama: "Roji is going to be the best driver on the island."',
];

export default {
  id: 'driving',
  stop: {
    title: 'Little Wheels Driving School',
    tag: 'Roji learns to drive',
    icon: 'wheel',
    color: '#f4a742',
    text: "Roji works through Abu Sanad's eight lessons, from her first drive to the driving test. Homama already has his licence and cheers her on at every turn.",
  },
  icons: { wheel: WHEEL, board: BOARD_ICON, duck: DUCK },

  build(ctx) {
    const { util, FONT, size } = ctx;
    const { umat, rng } = util;
    const k = kit();
    const { box, rbox, cyl, sph, tor, at } = k;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const flowers = [];
    const R = rng(11);
    const add = (...o) => (g.add(...o), o[0]);
    const atlas = new Atlas(8, 4, 256);
    const cells = {};

    // ---------------------------------------------------------------- office building
    const BX = -9.4;
    const BW = 10;
    const BZ = -8.2;
    const BD = 6.8;
    const FZ = BZ + BD / 2; // front face z = -4.8
    const H = 3.4;
    add(at(box(BW + 0.3, 0.22, BD + 0.3, '#e9dccb'), BX, 0.11, BZ));
    add(at(rbox(BW, H, BD, C.wall, 0.1), BX, H / 2, BZ));
    add(at(box(BW + 0.06, 0.5, BD + 0.06, C.teal), BX, 0.25, BZ));
    add(at(box(BW + 0.06, 0.12, BD + 0.06, C.sun), BX, 2.45, BZ));
    add(at(rbox(BW + 0.5, 0.32, BD + 0.5, C.teal, 0.1), BX, H + 0.12, BZ));
    for (let x = BX - BW / 2 + 0.25; x < BX + BW / 2; x += 0.5) add(at(sph(0.13, C.white, undefined, 8), x, H - 0.06, FZ + 0.24));
    colliders.push({ type: 'box', x: BX, z: BZ + 0.12, hw: BW / 2 + 0.1, hd: BD / 2 + 0.22 }); // flower boxes stick out at the front

    // Windows with sun awnings and flower boxes
    const glass = util.mat('#cfeeff', { rough: 0.15, emissive: '#bfe6ff', ei: 0.3 });
    for (const x of [BX - 3.5, BX - 1.9, BX + 1.9, BX + 3.5]) {
      add(at(rbox(1.2, 1.12, 0.12, C.white, 0.05), x, 1.55, FZ + 0.02));
      add(at(box(1.02, 0.94, 0.06, glass), x, 1.55, FZ + 0.06));
      add(at(box(0.05, 0.94, 0.04, C.white), x, 1.55, FZ + 0.1));
      add(at(box(1.02, 0.05, 0.04, C.white), x, 1.55, FZ + 0.1));
      const aw = cyl(0.34, 0.34, 1.32, (x | 0) % 2 ? C.sun : C.coral, 14);
      aw.rotation.z = Math.PI / 2;
      aw.scale.set(1, 1, 0.7);
      add(at(aw, x, 2.2, FZ + 0.14));
      add(at(rbox(1.24, 0.22, 0.28, C.woodDark, 0.04), x, 0.86, FZ + 0.18));
      for (let i = 0; i < 5; i++) flowers.push([x - 0.5 + i * 0.25, 0.94, FZ + 0.2, i % 4, 0.85]);
    }
    // Door, canopy, clock and step
    add(at(rbox(1.7, 2.45, 0.14, C.white, 0.06), BX, 1.22, FZ + 0.03));
    add(at(rbox(1.36, 2.15, 0.1, C.teal, 0.05), BX, 1.1, FZ + 0.09));
    const port = cyl(0.24, 0.24, 0.04, glass, 18);
    port.rotation.x = Math.PI / 2;
    add(at(port, BX, 1.55, FZ + 0.15));
    add(at(tor(0.25, 0.035, C.white, Math.PI * 2, undefined, 20), BX, 1.55, FZ + 0.16));
    add(at(sph(0.06, C.sun, { rough: 0.3, metal: 0.3 }, 10), BX + 0.45, 1.05, FZ + 0.17));
    add(at(k.heart(0.22, 0.03, C.rose), BX, 0.8, FZ + 0.16));
    // A brass plaque by the door
    cells.plaque = atlas.add((c, w, h) => {
      c.fillStyle = '#e8b84a';
      util.roundRect(c, 6, 60, w - 12, h - 120, 18);
      c.fill();
      c.strokeStyle = '#c99a3a';
      c.lineWidth = 6;
      c.stroke();
      paintText(c, 'Instructor', w / 2, h * 0.42, h * 0.11, '#6a4a1a', 600);
      paintText(c, 'Abu Sanad', w / 2, h * 0.58, h * 0.15, '#3b2b3f', 700);
    });
    add(at(atlas.plane(0.42, 0.42, cells.plaque), BX + 1.07, 1.6, FZ + 0.1));
    add(at(rbox(2.6, 0.18, 1.3, C.sun, 0.08), BX, 2.68, FZ + 0.62));
    for (let x = BX - 1.15; x < BX + 1.2; x += 0.33) add(at(sph(0.1, C.white, undefined, 8), x, 2.56, FZ + 1.26));
    for (const s of [-1, 1]) {
      add(at(cyl(0.06, 0.07, 2.6, C.white, 10), BX + s * 1.15, 1.3, FZ + 1.12));
      colliders.push({ type: 'circle', x: BX + s * 1.15, z: FZ + 1.12, r: 0.1 });
    }
    const clockFace = cyl(0.3, 0.3, 0.06, C.white, 20);
    clockFace.rotation.x = Math.PI / 2;
    add(at(clockFace, BX, 3.0, FZ + 0.08));
    add(at(tor(0.3, 0.04, C.sunDeep, Math.PI * 2, undefined, 20), BX, 3.0, FZ + 0.1));
    add(at(box(0.03, 0.17, 0.02, C.ink), BX, 3.06, FZ + 0.13));
    const hand = box(0.12, 0.03, 0.02, C.ink);
    hand.rotation.z = 0.4;
    add(at(hand, BX + 0.05, 3.02, FZ + 0.13));
    add(at(rbox(2.0, 0.12, 0.9, '#f3e6d3', 0.04), BX, 0.06, FZ + 0.45));
    add(at(rbox(1.3, 0.03, 0.6, C.rose, 0.02), BX, 0.135, FZ + 0.4));
    colliders.push({ type: 'box', x: BX, z: FZ + 0.45, hw: 1.0, hd: 0.45, h: 0.12 });

    // Rooftop sign and a giant L plate
    const roofSign = paintedPlane(6.2, 1.45, 1024, (c, w, h) => {
      c.fillStyle = '#ffffff';
      util.roundRect(c, 8, 8, w - 16, h - 16, 90);
      c.fill();
      c.lineWidth = 14;
      c.strokeStyle = C.sunDeep;
      c.stroke();
      drawWheelBadge(c, 125, h / 2, 72);
      paintText(c, 'Little Wheels', w * 0.57, h * 0.38, h * 0.38, C.teal);
      paintText(c, 'DRIVING SCHOOL', w * 0.57, h * 0.74, h * 0.2, C.ink, 600);
    }, { glow: 0.12, rough: 0.6, cut: true });
    add(at(rbox(6.4, 1.62, 0.14, C.sunDeep, 0.08), BX - 1, H + 1.05, FZ - 0.5));
    add(at(roofSign, BX - 1, H + 1.05, FZ - 0.42));
    for (const s of [-1, 1]) add(at(box(0.12, 0.8, 0.12, C.woodDark), BX - 1 + s * 2.6, H + 0.3, FZ - 0.6));
    cells.lplate = atlas.add(drawLPlate);
    const bigL = atlas.plane(1.1, 1.1, cells.lplate, { cast: true });
    const lGroup = new THREE.Group();
    lGroup.add(at(rbox(1.2, 1.2, 0.08, '#e9e3ea', 0.06), 0, 0, -0.05));
    lGroup.add(at(bigL, 0, 0, 0.002));
    lGroup.add(at(cyl(0.05, 0.05, 1.2, C.steel, 8), 0, -1.0, -0.08));
    lGroup.rotation.set(-0.12, -0.3, 0.08);
    add(at(lGroup, BX + 3.6, H + 1.5, FZ - 1.2));

    // A bench by the office
    const bench = (x, z, ry = 0) => {
      const b = new THREE.Group();
      for (const dz of [-0.14, 0, 0.14]) b.add(at(rbox(1.6, 0.06, 0.12, C.wood, 0.02), 0, 0.45, dz));
      for (const y of [0.68, 0.86]) b.add(at(rbox(1.6, 0.11, 0.05, C.wood, 0.02), 0, y, -0.23));
      for (const s of [-1, 1]) {
        b.add(at(rbox(0.08, 0.45, 0.44, C.teal, 0.03), s * 0.66, 0.225, 0));
        b.add(at(rbox(0.08, 0.6, 0.06, C.teal, 0.03), s * 0.66, 0.72, -0.23));
      }
      b.rotation.y = ry;
      add(at(b, x, 0, z));
      colliders.push({ type: 'box', x, z, hw: ry ? 0.27 : 0.82, hd: ry ? 0.82 : 0.27, h: 0.48 });
    };
    bench(BX + 3.0, FZ + 0.9);

    // ---------------------------------------------------------------- practice yard
    const YW = YX1 - YX0;
    const YD = YZ1 - YZ0;
    const YC = { x: (YX0 + YX1) / 2, z: (YZ0 + YZ1) / 2 };
    const X = (x, w) => ((x - YX0) / YW) * w;
    const Z = (z, h) => ((z - YZ0) / YD) * h;
    const yard = paintedPlane(YW, YD, 2048, (c, w, h) => {
      const sx = w / YW;
      const sz = h / YD;
      const rect = (x0, z0, x1, z1, col) => {
        c.fillStyle = col;
        c.fillRect(X(x0, w), Z(z0, h), (x1 - x0) * sx, (z1 - z0) * sz);
      };
      c.fillStyle = '#e4dacd';
      c.fillRect(0, 0, w, h);
      const ROAD = '#bcb3ca';
      rect(YX0, -7.0, YX1, -3.4, ROAD); // west and east arms
      rect(4.2, YZ0, 7.8, 1.6, ROAD); // north and south arms
      rect(YX0, 1.6, YX1, 4.6, ROAD); // front lane
      c.fillStyle = ROAD;
      c.beginPath();
      c.arc(X(RB.x, w), Z(RB.z, h), 4.6 * sx, 0, Math.PI * 2);
      c.fill();
      // Speckles
      let s = 5;
      const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 5000; i++) {
        c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(70,60,95,0.07)';
        c.fillRect(r() * w, r() * h, 3, 3);
      }
      const W = '#fffaf0';
      const lineW = 0.1 * sx;
      const seg = (x0, z0, x1, z1, dash = null, col = W, lw = lineW) => {
        c.strokeStyle = col;
        c.lineWidth = lw;
        c.setLineDash(dash ? dash.map((d) => d * sx) : []);
        c.beginPath();
        c.moveTo(X(x0, w), Z(z0, h));
        c.lineTo(X(x1, w), Z(z1, h));
        c.stroke();
        c.setLineDash([]);
      };
      // Edge lines and centre dashes
      seg(YX0, -7.0, 1.6, -7.0);
      seg(YX0, -3.4, 2.0, -3.4);
      seg(10.4, -7.0, YX1, -7.0);
      seg(10.0, -3.4, YX1, -3.4);
      seg(YX0, -5.2, 1.4, -5.2, [0.8, 0.6]);
      seg(10.6, -5.2, YX1, -5.2, [0.8, 0.6]);
      seg(4.2, YZ0, 4.2, -8.8);
      seg(7.8, YZ0, 7.8, -8.8);
      seg(6, YZ0, 6, -9.8, [0.8, 0.6]);
      seg(YX0, 1.6, 3.9, 1.6);
      seg(8.1, 1.6, YX1, 1.6);
      seg(YX0, 3.1, YX1, 3.1, [0.8, 0.6]);
      // Roundabout: outer ring, lane circle and arrows going round (anticlockwise from above)
      c.strokeStyle = W;
      c.lineWidth = lineW;
      c.setLineDash([0.8 * sx, 0.6 * sx]);
      c.beginPath();
      c.arc(X(RB.x, w), Z(RB.z, h), 3.15 * sx, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = '#ffd166';
      c.lineWidth = 0.18 * sx;
      c.beginPath();
      c.arc(X(RB.x, w), Z(RB.z, h), 1.95 * sx, 0, Math.PI * 2);
      c.stroke();
      const arrow = (x, z, ang, len = 1.1, col = W) => {
        c.save();
        c.translate(X(x, w), Z(z, h));
        c.rotate(ang);
        c.fillStyle = col;
        c.fillRect(-len * 0.5 * sx, -0.09 * sx, len * 0.6 * sx, 0.18 * sx);
        c.beginPath();
        c.moveTo(len * 0.5 * sx, 0);
        c.lineTo(len * 0.05 * sx, -0.32 * sx);
        c.lineTo(len * 0.05 * sx, 0.32 * sx);
        c.fill();
        c.restore();
      };
      for (let i = 0; i < 4; i++) {
        const th = Math.PI / 4 + (i * Math.PI) / 2;
        const ax = RB.x + Math.cos(th) * 3.9;
        const az = RB.z + Math.sin(th) * 3.9;
        arrow(ax, az, Math.atan2(-Math.cos(th), Math.sin(th)));
      }
      arrow(-0.6, -4.3, 0);
      arrow(12.9, -4.3, 0);
      arrow(1.2, 2.35, Math.PI);
      arrow(10.4, 3.85, 0);
      // Stop lines and a painted STOP
      seg(1.0, -7.0, 1.0, -3.4, null, W, 0.3 * sx);
      seg(11.0, -7.0, 11.0, -3.4, null, W, 0.3 * sx);
      c.save();
      c.translate(X(12.9, w), Z(-6.1, h));
      c.font = `700 ${0.8 * sz}px ${FONT}`;
      c.fillStyle = W;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('STOP', 0, 0);
      c.restore();
      // Zebra crossing on the south arm
      for (let i = 0; i < 5; i++) rect(4.45 + i * 0.7, -0.35, 4.85 + i * 0.7, 1.45, W);
      // Parking bays
      for (let i = 0; i <= 5; i++) seg(-0.3 + i * 2.6, 4.6, -0.3 + i * 2.6, 8.0, null, W, 0.12 * sx);
      seg(-0.3, 4.6, 12.7, 4.6, null, W, 0.12 * sx);
      c.save();
      c.translate(X(1.0, w), Z(6.4, h));
      c.font = `700 ${1.6 * sz}px ${FONT}`;
      c.fillStyle = 'rgba(255,250,240,0.85)';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('P', 0, 0);
      c.restore();
      // Roji's bay: a big L and a heart
      c.save();
      c.translate(X(11.4, w), Z(6.3, h));
      c.fillStyle = 'rgba(255,255,255,0.9)';
      util.roundRect(c, -0.8 * sx, -0.8 * sz, 1.6 * sx, 1.6 * sz, 0.2 * sx);
      c.fill();
      c.scale(1.6 * sx / 256, 1.6 * sz / 256);
      c.translate(-128, -128);
      drawLPlate(c, 256, 256);
      c.restore();
      c.fillStyle = 'rgba(239,91,111,0.85)';
      heartPath(c, X(11.4, w), Z(7.55, h), 0.32 * sx);
      c.fill();
      c.font = `700 ${0.32 * sz}px ${FONT}`;
      c.fillStyle = W;
      c.textAlign = 'center';
      c.fillText("ROJI'S BAY", X(11.4, w), Z(4.95, h));
      // A practice box on the open corner
      c.strokeStyle = 'rgba(255,209,102,0.9)';
      c.lineWidth = 0.12 * sx;
      c.setLineDash([0.4 * sx, 0.3 * sx]);
      c.strokeRect(X(11.6, w), Z(-10.8, h), 2.4 * sx, 3.0 * sz);
      c.setLineDash([]);
    }, { rough: 0.9 });
    yard.rotation.x = -Math.PI / 2;
    yard.receiveShadow = true;
    add(at(yard, YC.x, 0.014, YC.z));
    // Yard curb on the back and the sides
    add(at(box(YW + 0.3, 0.1, 0.18, C.cream), YC.x, 0.05, YZ0 - 0.06));
    for (const x of [YX0 - 0.06, YX1 + 0.06]) add(at(box(0.18, 0.1, YD + 0.2, C.cream), x, 0.05, YC.z));

    // Roundabout island: a raised flower bed with a little tree
    add(at(cyl(1.8, 1.85, 0.3, C.cream, 28), RB.x, 0.15, RB.z));
    add(at(cyl(1.58, 1.58, 0.04, C.leaf, 28), RB.x, 0.31, RB.z));
    add(at(tree(k, 0.62, 1), RB.x, 0.3, RB.z));
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      flowers.push([RB.x + Math.cos(a) * 1.3, 0.31, RB.z + Math.sin(a) * 1.3, i % 5, 0.95]);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      flowers.push([RB.x + Math.cos(a) * 0.85, 0.31, RB.z + Math.sin(a) * 0.85, (i + 2) % 5, 0.9]);
    }
    colliders.push({ type: 'circle', x: RB.x, z: RB.z, r: 1.85, h: 0.32 });

    // Traffic light and road signs
    const lamps = lightMats(umat);
    setLight(lamps, 'red');
    add(at(makeTrafficLight(k, lamps, { twoFaced: true }), 0.6, 0, -2.7));
    colliders.push({ type: 'circle', x: 0.6, z: -2.7, r: 0.16 });
    const signs = [
      ['stop', 11.5, -2.7, 0.7, 1.4],
      ['roundabout', -1.9, -2.6, 0.58, 1.35],
      ['zebra', 2.7, 0.9, 0.52, 1.3],
      ['duck', 9.3, 0.9, 0.6, 1.3],
      ['speed20', -1.8, -8.4, 0.55, 1.4],
      ['parking', 13.6, 5.0, 0.5, 1.4],
    ];
    for (const [kind, x, z, s, p] of signs) {
      add(at(signPost(k, atlas, cells, kind, { size: s, post: p }), x, 0, z));
      colliders.push({ type: 'circle', x, z, r: 0.1 });
    }
    // Crossing beacons: striped poles with blinking yellow globes
    const beaconMat = umat('#ffd166', { emissive: '#ffb020', ei: 1, rough: 0.3 });
    for (const x of [3.75, 8.25]) {
      for (let i = 0; i < 6; i++) add(at(cyl(0.05, 0.05, 0.3, i % 2 ? C.ink : C.white, 10), x, 0.15 + i * 0.3, 0.55));
      add(at(sph(0.17, beaconMat, undefined, 14), x, 1.95, 0.55));
      colliders.push({ type: 'circle', x, z: 0.55, r: 0.1 });
    }

    // Cones: a gate at the west entrance, a slalom on the east side, a stack in the corner
    const cone = (x, z, ry = 0) => {
      add(at(makeCone(k), x, 0.014, z, ry));
      colliders.push({ type: 'circle', x, z, r: 0.2, h: 0.6 });
    };
    for (const z of [-7.5, -2.9]) for (const x of [-2.1, -0.9]) cone(x, z);
    for (const [x, z] of [[12.0, -2.0], [13.6, -1.1], [12.0, -0.2], [13.6, 0.7]]) cone(x, z);
    for (const [x, z] of [[13.0, -10.0], [13.5, -9.6], [12.6, -9.5]]) cone(x, z);
    const stack = new THREE.Group();
    for (let i = 0; i < 3; i++) stack.add(at(makeCone(k), 0, i * 0.1, 0));
    add(at(stack, 13.8, 0.014, -10.9));
    colliders.push({ type: 'circle', x: 13.8, z: -10.9, r: 0.22, h: 0.8 });
    // Stacked practice tyres in pastel colours
    const tyreGeo = new THREE.TorusGeometry(0.3, 0.13, 8, 18);
    tyreGeo.rotateX(Math.PI / 2);
    [[10.9, -10.6, 3, C.pink], [11.6, -11.0, 2, C.mint], [10.9, -9.8, 1, C.sun]].forEach(([x, z, n, col]) => {
      for (let i = 0; i < n; i++) add(at(util.mesh(tyreGeo, util.mat(col, { rough: 0.7 })), x, 0.13 + i * 0.25, z));
      colliders.push({ type: 'circle', x, z, r: 0.42, h: n * 0.25 + 0.05 });
    });

    // ---------------------------------------------------------------- the learner car and Abu Sanad
    const car = new Car(C.sun);
    learnerize(car, atlas, cells);
    car.root.position.set(CAR_AT.x, 0, CAR_AT.z);
    car.update(0, 0);
    add(car.root);
    colliders.push({ type: 'box', x: CAR_AT.x, z: CAR_AT.z, hw: 0.86, hd: 1.42 });
    const nora = makeNora(ctx.makeKid);
    freezeKid(nora, { pose: 'stand' });
    nora.root.position.set(10.7, 0, 6.9);
    nora.root.rotation.y = -0.3;
    add(nora.root);
    colliders.push({ type: 'circle', x: 10.7, z: 6.9, r: 0.32 });
    // His A-board: the course in one line
    cells.aboard = atlas.add((c, w, h) => {
      c.fillStyle = '#3d4a46';
      util.roundRect(c, 8, 6, w - 16, h - 12, 18);
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = C.wood;
      c.stroke();
      paintText(c, 'Lessons with', w / 2, h * 0.2, h * 0.1, '#ffffff', 600);
      paintText(c, 'Abu Sanad', w / 2, h * 0.36, h * 0.15, '#ffd166', 700);
      paintText(c, '8 lessons', w / 2, h * 0.56, h * 0.1, '#ffffff', 600);
      paintText(c, '1 licence', w / 2, h * 0.7, h * 0.1, '#ffffff', 600);
      c.fillStyle = C.pink;
      heartPath(c, w / 2, h * 0.86, h * 0.07);
      c.fill();
    });
    const aboard = new THREE.Group();
    for (const s of [-1, 1]) {
      const panel = new THREE.Group();
      const face = atlas.plane(0.62, 0.82, cells.aboard);
      face.position.z = 0.025;
      panel.add(face);
      panel.add(rbox(0.68, 0.9, 0.04, C.woodDark, 0.02));
      panel.rotation.set(s * -0.2, s < 0 ? Math.PI : 0, 0);
      panel.position.set(0, 0.45, s * 0.1);
      aboard.add(panel);
    }
    aboard.rotation.y = -0.2;
    add(at(aboard, 12.1, 0, 7.3));
    colliders.push({ type: 'box', x: 12.1, z: 7.3, hw: 0.36, hd: 0.22, h: 0.9 });

    // ---------------------------------------------------------------- front lawn
    // "Roji's progress" board with Homama's framed certificate
    const BOARD_W = 3.1;
    const BOARD_H = 1.95;
    const boardX = -5.9;
    const boardZ = 4.6;
    let shown = { progress: -1, lessons: -1 };
    const board = paintedPlane(BOARD_W, BOARD_H, 1024, (c, w, h) => drawBoard(c, w, h, { progress: licenceProgress(), lessons: lessonsDone() }), { rough: 0.85 });
    const refreshBoard = () => {
      const now = { progress: licenceProgress(), lessons: lessonsDone() };
      if (now.progress === shown.progress && now.lessons === shown.lessons) return;
      shown = now;
      const tex = board.userData.tex;
      const cv = tex.image;
      drawBoard(cv.getContext('2d'), cv.width, cv.height, now);
      tex.needsUpdate = true;
    };
    const bg = new THREE.Group();
    bg.add(at(rbox(BOARD_W + 0.3, BOARD_H + 0.3, 0.14, C.woodDark, 0.06), 0, 0, -0.06));
    bg.add(at(board, 0, 0, 0.015));
    // Gold frame around the certificate
    const [fx, fy, fw, fh] = BOARD.cert;
    const cx = (fx + fw / 2 - 0.5) * BOARD_W;
    const cy = (0.5 - fy - fh / 2) * BOARD_H;
    const gold = util.mat('#e8b84a', { rough: 0.35, metal: 0.3 });
    for (const [w, hh, x, y] of [[fw * BOARD_W + 0.1, 0.06, cx, cy + (fh * BOARD_H) / 2 + 0.02], [fw * BOARD_W + 0.1, 0.06, cx, cy - (fh * BOARD_H) / 2 - 0.02], [0.06, fh * BOARD_H + 0.1, cx - (fw * BOARD_W) / 2 - 0.02, cy], [0.06, fh * BOARD_H + 0.1, cx + (fw * BOARD_W) / 2 + 0.02, cy]]) {
      bg.add(at(util.mesh(new THREE.BoxGeometry(w, hh, 0.05), gold), x, y, 0.04));
    }
    // A little roof over the board
    const roof = new THREE.Group();
    for (const s of [-1, 1]) {
      const slab = rbox(BOARD_W / 2 + 0.45, 0.1, 0.62, C.coral, 0.04);
      slab.rotation.z = s * -0.32;
      roof.add(at(slab, s * (BOARD_W / 4 + 0.15), 0, 0));
    }
    roof.add(at(sph(0.12, C.sun, undefined, 10), 0, 0.28, 0));
    bg.add(at(roof, 0, BOARD_H / 2 + 0.42, 0.08));
    for (const s of [-1, 1]) bg.add(at(box(0.14, BOARD_H + 1.4, 0.14, C.woodDark), s * (BOARD_W / 2 + 0.05), -0.3, -0.12));
    bg.position.set(boardX, 0.78 + BOARD_H / 2, boardZ);
    bg.rotation.y = 0.18;
    add(bg);
    colliders.push({ type: 'box', x: boardX, z: boardZ - 0.1, hw: BOARD_W / 2 + 0.15, hd: 0.2 });
    // Balloons tied to the board posts
    const balloons = [];
    [[C.rose, -0.2, 0.9], [C.sun, 0.12, 1.15], [C.sky, 0.0, 1.35]].forEach(([col, tilt, hgt], i) => {
      const b = new THREE.Group();
      b.add(at(cyl(0.006, 0.006, hgt, '#ffffff', 4), 0, hgt / 2, 0));
      const ball = sph(0.22, util.mat(col, { rough: 0.3 }), undefined, 14);
      ball.scale.set(1, 1.18, 1);
      b.add(at(ball, 0, hgt + 0.2, 0));
      b.rotation.z = tilt;
      add(at(b, boardX + BOARD_W / 2 + 0.15, 2.0, boardZ + 0.15));
      balloons.push({ b, tilt, ph: i * 1.7 });
      dynamic.push(b);
    });
    bench(-11.9, 6.2);

    // Duck pond: the duck family practises crossing too
    const PX = -12.2;
    const PZ = 0.6;
    add(at(cyl(1.75, 1.8, 0.2, C.cream, 28), PX, 0.1, PZ));
    add(at(cyl(1.55, 1.55, 0.04, '#7fcfe0', 28, { rough: 0.2 }), PX, 0.19, PZ));
    for (const [a, s] of [[0.4, 0.3], [2.2, 0.26], [4.1, 0.34]]) add(at(sph(s, '#cfc6c0', undefined, 10), PX + Math.cos(a) * 1.75, 0.15, PZ + Math.sin(a) * 1.75));
    for (const [a, rr] of [[1.2, 0.95], [3.3, 0.7], [5.2, 1.0]]) {
      const pad = cyl(0.22, 0.22, 0.02, C.leaf, 12);
      add(at(pad, PX + Math.cos(a) * rr, 0.215, PZ + Math.sin(a) * rr));
    }
    colliders.push({ type: 'circle', x: PX, z: PZ, r: 1.8 });
    const ducks = [];
    for (let i = 0; i < 4; i++) {
      const d = makeDuck(k, i === 0 ? { color: C.white, size: 1.25 } : { color: C.sun, size: 0.7 });
      colorBake(d);
      add(d);
      dynamic.push(d);
      ducks.push(d);
    }
    let quackT = 0;

    // Trees, bushes, lamps and bunting
    for (const [x, z, s, tone] of [[-14.1, 9.4, 0.95, 0], [-14.2, -3.4, 0.85, 1], [-3.5, -10.6, 0.8, 2], [14.2, 10.6, 0.8, 1]]) {
      add(at(tree(k, s, tone), x, 0, z));
      colliders.push({ type: 'circle', x, z, r: 0.25 * s });
      // Crown balls low enough to reach a kid's head or body block the way too (widest part below 1.3 m)
      for (const [dx, dy, dz, rr] of [[0, 2.0, 0, 0.9], [0.5, 1.7, 0.25, 0.62], [-0.45, 2.4, 0.1, 0.55]]) {
        const q = 1 - ((Math.min(1.3, Math.max(0.6, dy * s)) - dy * s) / (rr * s)) ** 2;
        if (q > 0 && rr * s * Math.sqrt(q) > 0.3) colliders.push({ type: 'circle', x: x + dx * s, z: z + dz * s, r: rr * s * Math.sqrt(q) - 0.18 });
      }
    }
    for (const [x, z, s] of [[-14.2, 6.8, 0.9], [-14.4, 3.4, 0.7], [-3.6, -6.0, 0.75], [-3.8, -1.2, 0.7], [-3.6, 2.6, 0.8], [3.4, 10.0, 0.8], [5.8, 10.3, 0.65], [12.4, 10.1, 0.85], [-1.7, 8.9, 0.6]]) {
      const b = sph(0.45, s > 0.75 ? C.leaf : C.leafDark, { rough: 0.9 }, 12);
      b.scale.set(1.3 * s, 0.85 * s, 1.0 * s);
      add(at(b, x, 0.3 * s, z));
      colliders.push({ type: 'circle', x, z, r: 0.45 * s });
      for (let i = 0; i < 5; i++) flowers.push([x + (R() - 0.5) * 1.4 * s, 0, z + 0.45 * s + R() * 0.3, Math.floor(R() * 6), 0.9]);
    }
    // Flower strips along the yard front
    for (let x = 1.6; x < 14.4; x += 0.32) if (Math.abs(x - CAR_AT.x) > 1.5 && Math.abs(x - 10.9) > 1.2) flowers.push([x, 0, 8.65 + (R() - 0.5) * 0.15, Math.floor(R() * 7), 1]);
    for (let z = -3.2; z < 8; z += 0.34) flowers.push([-3.05 + (R() - 0.5) * 0.1, 0, z, Math.floor(R() * 7), 0.95]);
    const lampMat = util.mat('#fff6d8', { emissive: '#ffe2a0', ei: 0.7 });
    const lamps2 = [[-10.9, 8.1], [-7.9, -2.4], [2.2, 10.4]];
    for (const [x, z] of lamps2) {
      add(at(cyl(0.06, 0.08, 2.4, C.teal, 10), x, 1.2, z));
      add(at(sph(0.22, lampMat, undefined, 14), x, 2.55, z));
      add(at(cyl(0.16, 0.2, 0.08, C.teal, 12), x, 2.38, z));
      colliders.push({ type: 'circle', x, z, r: 0.12 });
    }
    // Bunting along the left side of the yard
    const flagGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.16, 0, 0), new THREE.Vector3(0.16, 0, 0), new THREE.Vector3(0, -0.3, 0)]);
    flagGeo.setIndex([0, 2, 1]);
    flagGeo.computeVertexNormals();
    flagGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
    const flagCols = [C.rose, C.sun, C.mint, C.sky, C.pink, C.white];
    const buntPoles = [[-3.2, -8.8], [-3.2, -3.6], [-3.2, 1.6], [-3.2, 6.8]];
    for (const [x, z] of buntPoles) {
      add(at(cyl(0.05, 0.06, 2.7, C.white, 8), x, 1.35, z));
      add(at(sph(0.08, C.sun, undefined, 8), x, 2.74, z));
      colliders.push({ type: 'circle', x, z, r: 0.1 });
    }
    for (let p = 0; p < buntPoles.length - 1; p++) {
      const [x, z0] = buntPoles[p];
      const z1 = buntPoles[p + 1][1];
      for (let i = 1; i < 12; i++) {
        const f = i / 12;
        const sag = Math.sin(f * Math.PI) * 0.35;
        const pivot = new THREE.Group();
        pivot.rotation.y = Math.PI / 2;
        const fl = util.mesh(flagGeo, util.mat(flagCols[(i + p) % flagCols.length], { rough: 0.7, side: THREE.DoubleSide }), { cast: false });
        fl.rotation.x = 0.9;
        pivot.add(fl);
        add(at(pivot, x, 2.62 - sag, z0 + (z1 - z0) * f));
      }
    }
    // The street sign
    const woodSign = ctx.sign(['Drive with Abu Sanad', 'Little Wheels'], { width: 3.0, height: 1.15, accent: C.teal, postHeight: 0.85 });
    add(at(woodSign, -4.0, 0, 11.0));
    colliders.push({ type: 'box', x: -4.0, z: 10.95, hw: 1.2, hd: 0.15 });

    // Footpaths: pad to the yard, along the front and up to the office door
    const pathMat = util.mat('#f2e2c6', { rough: 0.9 });
    for (const [x, z, w, d] of [[0, 10.6, 2.6, 3.2], [-5.2, 9.6, 11, 1.9], [BX, 2.4, 2.0, 14.4], [BX, -4.0, 4.8, 1.8]]) {
      const slab = rbox(w, 0.03, d, pathMat, 0.012);
      slab.castShadow = false;
      add(at(slab, x, 0.006, z));
    }

    addFlowers(g, flowers, R);

    // ---------------------------------------------------------------- hotspots
    let padNear = false;
    let lineI = 0;
    const greet = (api) => {
      const lines = api.playerId === 'roji' ? ROJI_LINES : HOMAMA_LINES;
      api.toast(lines[lineI++ % lines.length], 3400);
    };
    const tone = (api, f, d, o) => {
      const s = api.sound;
      if (s?.ctx && !s.muted) s.tone(f, s.ctx.currentTime, d, o);
    };
    const quack = (api, n = 3) => {
      for (let i = 0; i < n; i++) setTimeout(() => tone(api, 560 + Math.random() * 120, 0.12, { type: 'square', gain: 0.045, slideTo: 380 }), i * 180);
    };
    const hotspots = [
      {
        x: 10.8,
        z: 8.3,
        r: 1.4,
        icon: 'wheel',
        label: 'Driving lesson',
        act: async (api) => {
          if (!api.hasArena('drivinglesson')) return api.toast('Abu Sanad is still setting out the cones. Back soon!', 2600);
          const res = await api.playArena('drivinglesson');
          refreshBoard();
          if (!res || res.quit) return;
          const roji = api.playerId === 'roji';
          if (res.licence) api.toast('<b>Homama:</b> Roji got her licence! I am so proud of you!', 4000);
          else if (!roji) api.toast(res.stars === 3 ? '<b>Roji:</b> Three stars on your refresher? Show-off!' : '<b>Roji:</b> Good practice, Homama!', 3200);
          else if (res.stars === 3) api.toast('<b>Homama:</b> Three stars! So smooth, Roji.', 3200);
          else api.toast('<b>Homama:</b> Every lesson makes you better, Roji.', 3200);
        },
      },
      {
        x: CAR_AT.x,
        z: CAR_AT.z + 2.3,
        r: 1.2,
        icon: 'car',
        label: 'Sit in the learner car',
        act: (api) => {
          api.sound.honk?.();
          api.activity({
            label: 'Get out',
            seats: [
              { who: 'roji', x: CAR_AT.x + 0.33, z: CAR_AT.z - 0.25, y: 0.66, yaw: 0, pose: 'drive' },
              { who: 'homama', x: CAR_AT.x - 0.33, z: CAR_AT.z - 0.25, y: 0.66, yaw: 0, pose: 'sit' },
            ],
            focus: { x: CAR_AT.x, z: CAR_AT.z, y: 1, zoom: 0.5 },
            exit: { x: CAR_AT.x - 0.4, z: CAR_AT.z + 2.2 },
            onEnd: (silent) => !silent && api.toast(api.playerId === 'roji' ? 'Mirrors checked. Roji is ready for the real thing.' : 'Homama: "Mirror, signal, smile. Perfect, Roji!"', 2800),
          });
          api.toast(api.playerId === 'roji' ? 'Roji checks her mirrors. Homama gives a thumbs up.' : 'Homama hops in beside Roji. "Mirror, signal, smile!"', 2800);
        },
      },
      {
        x: boardX,
        z: boardZ + 1.2,
        r: 1.5,
        icon: 'board',
        label: 'Read the board',
        act: (api) => {
          refreshBoard();
          const p = licenceProgress();
          api.fx.heartsAt(api.world(boardX, boardZ, 2.2), 3);
          api.emote('player', api.playerId === 'roji' ? 'heart' : 'cheer');
          api.toast('<b>Certified driver: Homama.</b> "I will do my very best to help Roji get hers!"', 3600);
          setTimeout(() => api.toast(p >= 100 ? "Roji's licence: <b>done!</b> Homama added a gold heart." : `Roji's licence: <b>${Math.round(p)}%</b>. You can do it, Roji!`, 3000), 3700);
        },
      },
      {
        track: () => ({ x: PX + 0.2, z: PZ + 2.2 }),
        r: 1.3,
        icon: 'duck',
        label: 'Say hi to the ducks',
        act: (api) => {
          quackT = 1.6;
          quack(api);
          api.emote('player', 'wave');
          api.toast('Quack! The duck family practises their zebra crossing too.', 2800);
        },
      },
    ];

    let lightT = 0;
    const CYCLE = [['green', 4], ['amber', 1.2], ['red', 4], ['redamber', 1]];
    let lightI = 2;
    setLight(lamps, CYCLE[lightI][0]);

    return {
      group: g,
      dynamic: [...dynamic, ...colorBake(g, dynamic)],
      colliders,
      hotspots,
      pad: { x: 0, z: size.d / 2 + 1.2 },
      door: { x: BX, z: FZ + 0.6 },
      interior: {
        title: 'Little Wheels office',
        build: (ictx) => buildDrivingInterior(ictx),
      },
      update(dt, t, api) {
        // Homama's cheer when the player reaches the pad
        const p = api.localPos(api.player);
        const d = Math.hypot(p.x, p.z - (size.d / 2 + 1.2));
        if (!padNear && d < 2.2) {
          padNear = true;
          greet(api);
        } else if (padNear && d > 6) padNear = false;
        // Traffic light cycle and crossing beacons
        lightT += dt;
        if (lightT > CYCLE[lightI][1]) {
          lightT = 0;
          lightI = (lightI + 1) % CYCLE.length;
          setLight(lamps, CYCLE[lightI][0]);
        }
        beaconMat.emissiveIntensity = Math.sin(t * 4) > 0 ? 1.6 : 0.15;
        for (const b of balloons) b.b.rotation.set(Math.sin(t * 0.8 + b.ph) * 0.05, 0, b.tilt + Math.sin(t * 1.1 + b.ph) * 0.06);
        // Ducks paddle round the pond in a line
        quackT = Math.max(0, quackT - dt);
        ducks.forEach((dk, i) => {
          const a = t * 0.35 - i * 0.5;
          const rr = 1.0 - (i ? 0.05 : 0);
          dk.position.set(PX + Math.cos(a) * rr, 0.16 + Math.sin(t * 3 + i) * 0.012 + (quackT > 0 ? Math.abs(Math.sin(t * 14 + i)) * 0.08 : 0), PZ + Math.sin(a) * rr);
          dk.rotation.y = -a;
        });
        if (Math.floor(t) % 4 === 0) refreshBoard();
      },
    };
  },
};
