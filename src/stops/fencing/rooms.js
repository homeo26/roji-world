import { THREE, mat, mesh, heartPath, fitText, boardDraw, roundRect, FONT, COL, person, whites, makeMask } from './kit.js';
import { L } from './layout.js';

// The foyer (reception, noticeboard, a waiting bench) and the changing room behind it (lockers, the bench, hooks).
// Roji's and Homama's lockers open: R.lockers.open(k) with k 0..1. Homama keeps a photo of Roji in her mask inside his door.

const P = Math.PI;

// Roji in her fencing mask, the photo inside Homama's locker door
function drawRojiPhoto(c, w, h) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#bfe3ff');
  g.addColorStop(1, '#ffe1ea');
  c.fillStyle = g;
  c.fillRect(8, 8, w - 16, h - 34);
  const cx = w / 2;
  // jacket
  c.fillStyle = '#ffffff';
  roundRect(c, cx - 26, 78, 52, 54, 16);
  c.fill();
  c.fillStyle = '#ef5b6f';
  heartPath(c, cx + 12, 96, 12);
  c.fill();
  // pigtails peeking out of the mask
  c.fillStyle = '#2a1a13';
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(cx + s * 30, 66, 10, 0, P * 2);
    c.fill();
  }
  // the mask
  c.fillStyle = '#55556a';
  c.beginPath();
  c.ellipse(cx, 56, 26, 28, 0, 0, P * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(cx + i * 7, 30);
    c.lineTo(cx + i * 7, 82);
    c.moveTo(cx - 26, 56 + i * 7);
    c.lineTo(cx + 26, 56 + i * 7);
    c.stroke();
  }
  c.fillStyle = '#fffaf4';
  roundRect(c, cx - 20, 80, 40, 10, 5);
  c.fill();
  // the foil, raised in triumph
  c.strokeStyle = '#9aa3b5';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx + 30, 100);
  c.lineTo(cx + 52, 22);
  c.stroke();
  c.fillStyle = '#d8dee8';
  c.beginPath();
  c.arc(cx + 30, 100, 6, 0, P * 2);
  c.fill();
  c.fillStyle = '#5a4050';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  fitText(c, 'my champion', cx, h - 13, w - 20, 15, 600);
  // a heart sticker and a strip of tape
  c.fillStyle = '#ff7f9f';
  heartPath(c, w - 18, 18, 16);
  c.fill();
  c.fillStyle = 'rgba(255,240,200,0.8)';
  c.fillRect(cx - 18, 0, 36, 9);
}

export function buildRooms(R) {
  const { k, add, atlas, api } = R;
  const { box, rbox, cyl, sph, tor, cone, at, rot } = k;
  const { X0, LX, ZB, CZ, HL, CH_DOOR, LOCKERS, DESK } = L;
  const make = (look) => R.ictx.makeKid(look);
  const wood = mat(COL.wood, { rough: 0.8 });
  const goldM = mat(COL.gold, { rough: 0.35, metal: 0.5 });

  // ---------------------------------------------------------------- lockers along the back wall
  const lw = LOCKERS.w;
  const lh = 1.9;
  const ld = 0.5;
  const lz = ZB + ld / 2;
  const lx = (i) => LOCKERS.x0 + lw / 2 + i * lw;
  const special = { [LOCKERS.roji]: 'roji', [LOCKERS.homama]: 'homama' };
  const plain = ['#cfe0f7', '#ffffff'];
  const doors = {};
  for (let i = 0; i < LOCKERS.n; i++) {
    const x = lx(i);
    const who = special[i];
    // body: hollow for the two that open, solid for the rest
    if (who) {
      add(at(box(lw, lh, 0.04, '#7c8db0'), x, lh / 2, ZB + 0.02));
      for (const s of [-1, 1]) add(at(box(0.03, lh, ld, '#9fb1d1'), x + s * (lw / 2 - 0.015), lh / 2, lz));
      add(at(box(lw, 0.04, ld, '#9fb1d1'), x, lh - 0.02, lz));
      add(at(box(lw, 0.1, ld, '#9fb1d1'), x, 0.05, lz));
      add(at(box(lw - 0.06, 0.03, ld - 0.06, '#c3d0e6'), x, 1.45, lz));
      // a white jacket on a hanger, a towel on the shelf
      add(at(rbox(0.34, 0.6, 0.12, '#fbfbff', 0.05), x, 1.0, lz));
      add(at(tor(0.06, 0.008, COL.steel, P, undefined, 10, 4), x, 1.38, lz));
      add(at(rbox(0.36, 0.1, 0.28, who === 'roji' ? COL.rose : COL.sky, 0.03), x, 1.53, lz));
      add(at(k.heart(0.08, 0.02, who === 'roji' ? COL.pink : COL.blue), x + 0.1, 0.85, lz + 0.07));
    } else add(at(box(lw - 0.01, lh, ld, '#9fb1d1'), x, lh / 2, lz));
    // the door (a group hinged on its left edge)
    const door = new THREE.Group();
    const hs = who === 'homama' ? -1 : 1; // Homama's door hangs on its right edge, so the two open like double doors
    const col = who === 'roji' ? '#ff9eb5' : who === 'homama' ? '#8fc4ff' : plain[i % 2];
    door.add(at(box(lw - 0.04, lh - 0.08, 0.03, col), hs * (lw / 2 - 0.02), lh / 2, 0.015));
    door.add(at(atlas.panel(lw - 0.16, 0.36, 72, 48, (c, w, h) => {
      c.fillStyle = 'rgba(0,0,0,0)';
      c.clearRect(0, 0, w, h);
      c.fillStyle = col;
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(40,50,80,0.35)';
      for (let j = 0; j < 4; j++) roundRect(c, 8, 6 + j * 10, w - 16, 5, 2), c.fill();
    }), hs * (lw / 2 - 0.02), lh - 0.32, 0.032));
    door.add(at(atlas.panel(lw - 0.2, 0.17, 96, 40, (c, w, h) => {
      c.fillStyle = '#fffaf0';
      roundRect(c, 2, 2, w - 4, h - 4, 10);
      c.fill();
      c.fillStyle = who === 'roji' ? COL.pink : who === 'homama' ? COL.blue : '#5a6a8a';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, who === 'roji' ? 'Roji' : who === 'homama' ? 'Homama' : String(i + 11), w / 2, h / 2 + 1, w * 0.84, 26, 700);
    }), hs * (lw / 2 - 0.02), 1.25, 0.034));
    door.add(at(box(0.03, 0.14, 0.03, COL.steel), hs * (lw - 0.12), 0.98, 0.05));
    if (who === 'homama') {
      // inside the door: the photo of Roji in her mask
      const photo = atlas.panel(0.4, 0.5, 128, 160, drawRojiPhoto);
      photo.rotation.y = P;
      door.add(at(photo, hs * (lw / 2 - 0.02), 1.08, -0.004));
    }
    if (who === 'roji') {
      // inside her door: a little mirror and a note in Homama's writing
      const note = atlas.panel(0.3, 0.3, 96, 96, (c, w, h) => {
        c.fillStyle = '#fff3a8';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#5a4050';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        fitText(c, 'You lunge,', w / 2, 26, w - 12, 15, 600);
        fitText(c, 'I melt.', w / 2, 48, w - 12, 15, 600);
        c.fillStyle = COL.pink;
        heartPath(c, w / 2, 74, 22);
        c.fill();
      });
      note.rotation.y = P;
      door.add(at(note, lw / 2 - 0.02, 1.2, -0.004));
      const mirror = mesh(new THREE.CircleGeometry(0.09, 16), mat('#dff3ff', { rough: 0.1, metal: 0.4 }), { cast: false });
      mirror.rotation.y = P;
      door.add(at(mirror, lw / 2 - 0.02, 1.55, -0.004));
    }
    door.position.set(x - hs * (lw / 2), 0, ZB + ld);
    add(door);
    if (who) doors[who] = R.dyn(door);
  }
  add(at(box(LOCKERS.n * lw + 0.1, 0.08, ld + 0.06, '#7c8db0'), LOCKERS.x0 + (LOCKERS.n * lw) / 2, lh + 0.04, lz));
  add(at(atlas.panel(1.6, 0.3, 256, 48, boardDraw(['Changing room'], { edge: COL.blue })), LOCKERS.x0 + (LOCKERS.n * lw) / 2, lh + 0.36, ZB + 0.02));
  R.box(LOCKERS.x0 + (LOCKERS.n * lw) / 2, lz, (LOCKERS.n * lw) / 2 + 0.05, ld / 2 + 0.04);
  R.lockers = {
    doors,
    open(kv) {
      // wide open, flat against the next locker, so what is inside the doors faces the room
      doors.roji.rotation.y = -2.75 * kv;
      doors.homama.rotation.y = 2.75 * kv;
    },
    spot: (who) => ({ x: lx(LOCKERS[who]), z: ZB + ld + 0.75 }),
  };
  // a soft mat in front of the lockers
  add(at(rbox(4.4, 0.02, 0.8, '#ffd1dc', 0.01), lx(4.5), 0.012, ZB + ld + 0.5)).castShadow = false;

  // the bench in the middle of the changing room, with a club fencer tying a shoe
  const bx = -9.4;
  const bz = -5.35;
  add(at(rbox(2.8, 0.07, 0.42, wood, 0.03), bx, 0.44, bz));
  for (const s of [-1, 1]) add(at(box(0.08, 0.42, 0.34, COL.woodDark), bx + s * 1.2, 0.21, bz));
  R.box(bx, bz, 1.4, 0.22, 0.47);
  {
    const p = person(make, whites({ id: 'clubC', name: 'Club fencer', gender: 'boy', skin: '#f2cdb4', hair: '#b5773d', hairstyle: 'spiky', accent: COL.gold }), { pose: 'sit', mode: 'still', kit: COL.gold, mask: 'none', cast: false });
    p.kid.root.position.set(bx + 1.0, 0.2, bz + 0.02);
    p.kid.root.rotation.y = -0.4;
    add(p.kid.root);
    const m = makeMask(COL.gold, { light: true });
    m.scale.setScalar(0.62);
    add(at(m, bx + 0.45, 0.64, bz));
    R.circle(bx + 1.0, bz + 0.1, 0.3);
  }
  // hooks with jackets on the left wall, a mirror with bulbs, a laundry basket by the door
  for (let i = 0; i < 3; i++) {
    const z = -4.6 + i * 0.75;
    add(at(cyl(0.015, 0.015, 0.12, COL.steel, 5), X0 + 0.06, 1.72, z)).rotation.z = P / 2;
    add(at(rot(rbox(0.12, 0.62, 0.36, i === 1 ? '#fff6ea' : '#fbfbff', 0.05), 0.08, 0, 0), X0 + 0.12, 1.36, z));
  }
  add(at(rbox(0.06, 1.0, 0.8, '#ffffff', 0.03), X0 + 0.05, 1.45, -6.6));
  add(at(mesh(new THREE.PlaneGeometry(0.66, 0.86), mat('#dff3ff', { rough: 0.08, metal: 0.5 }), { cast: false }), X0 + 0.085, 1.45, -6.6)).rotation.y = P / 2;
  for (let i = 0; i < 5; i++) add(at(sph(0.035, '#fff3cf', undefined, 6), X0 + 0.09, 1.95, -6.92 + i * 0.16));
  add(at(rbox(0.5, 0.06, 0.3, COL.white, 0.02), X0 + 0.16, 0.92, -6.6));
  {
    const x = LX - 0.55;
    const z = CZ - 0.6;
    add(at(cyl(0.3, 0.26, 0.55, '#d9b98f', 14), x, 0.275, z));
    add(at(tor(0.3, 0.03, '#b8956a', P * 2, undefined, 16, 4), x, 0.55, z)).rotation.x = P / 2;
    add(at(rot(rbox(0.36, 0.1, 0.3, '#fbfbff', 0.04), 0.2, 0.3, 0.1), x - 0.04, 0.58, z + 0.02));
    add(at(rot(rbox(0.3, 0.1, 0.26, '#ffffff', 0.04), -0.3, 0.8, 0), x + 0.06, 0.64, z - 0.04));
    R.circle(x, z, 0.33);
  }

  // ---------------------------------------------------------------- the foyer
  // reception desk with the receptionist, a bell, the club book and roses
  {
    const { x, z } = DESK;
    add(at(rbox(2.6, 1.0, 0.7, COL.navy, 0.05), x, 0.5, z));
    add(at(rbox(2.74, 0.06, 0.86, '#fff4e3', 0.03), x, 1.03, z));
    add(at(box(2.62, 0.05, 0.02, COL.gold), x, 0.82, z + 0.36));
    add(at(atlas.panel(0.9, 0.34, 180, 68, boardDraw(['Welcome', 'Reception'], { edge: COL.gold, ink: COL.navy, small: COL.pink })), x, 0.5, z + 0.356));
    add(at(cyl(0.07, 0.08, 0.02, goldM, 12), x + 0.85, 1.07, z + 0.15));
    add(at(sph(0.06, goldM, undefined, 12), x + 0.85, 1.08, z + 0.15)).scale.set(1, 0.8, 1);
    add(at(sph(0.015, goldM, undefined, 6), x + 0.85, 1.14, z + 0.15));
    const book = atlas.panel(0.46, 0.32, 138, 96, (c, w, h) => {
      c.fillStyle = '#fffdf6';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e6dcc9';
      c.fillRect(w / 2 - 1, 0, 2, h);
      c.fillStyle = '#5a4050';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.font = `500 11px ${FONT}`;
      ['Members', 'Lina', 'Sami', 'Tala'].forEach((t, i) => c.fillText(t, 8, 14 + i * 18));
      c.fillStyle = COL.pink;
      c.font = `700 12px ${FONT}`;
      c.fillText('Roji', w / 2 + 8, 30);
      c.fillStyle = COL.blue;
      c.fillText('Homama', w / 2 + 8, 52);
      c.fillStyle = COL.pink;
      heartPath(c, w - 16, 42, 14);
      c.fill();
    });
    book.rotation.x = -P / 2 + 0.15;
    add(at(book, x - 0.2, 1.065, z + 0.12));
    add(at(cyl(0.06, 0.05, 0.18, '#ffffff', 10), x - 0.95, 1.15, z));
    for (let i = 0; i < 5; i++) add(at(sph(0.045, i % 2 ? COL.pink : COL.rose, undefined, 7), x - 0.95 + Math.cos(i * 1.3) * 0.06, 1.3 + (i % 2) * 0.04, z + Math.sin(i * 1.3) * 0.06));
    R.box(x, z, 1.38, 0.44);
    const rec = person(make, { id: 'receptionist', name: 'Receptionist', gender: 'girl', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'long', outfit: 'skirt', top: COL.navy, bottom: COL.navy, shoes: '#3b2b3f', accent: COL.gold }, { mode: 'arm', scale: 1.14, cast: true });
    rec.kid.root.position.set(x - 0.15, 0, z - 0.62);
    add(rec.kid.root);
    R.dyn(rec.kid.root);
    R.receptionist = rec.kid;
  }
  // the noticeboard and a big club photo on the changing room's front wall (they sink with it)
  {
    const cw = R.cutWall;
    const nb = atlas.panel(1.5, 1.0, 300, 200, (c, w, h) => {
      c.fillStyle = '#c98f5e';
      roundRect(c, 0, 0, w, h, 14);
      c.fill();
      c.fillStyle = '#e1b07c';
      roundRect(c, 10, 10, w - 20, h - 20, 8);
      c.fill();
      c.fillStyle = COL.navy;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Club news', w / 2, 26, w * 0.6, 22, 700);
      const notes = [
        ['#fff3a8', 'Welcome,', 'Roji and Homama!', 18, 48, -0.05],
        ['#d8f0ff', 'Lessons', 'every day at 5', 160, 52, 0.06],
        ['#ffd9e4', 'Lost: one heart.', 'Found: Homama has it.', 22, 118, 0.04],
        ['#e8ffd8', 'Salute first,', 'always.', 172, 122, -0.06],
      ];
      for (const [bg, a, b, x, y, r] of notes) {
        c.save();
        c.translate(x + 55, y + 30);
        c.rotate(r);
        c.fillStyle = bg;
        c.fillRect(-58, -30, 116, 60);
        c.fillStyle = '#e5484d';
        c.beginPath();
        c.arc(0, -24, 4, 0, P * 2);
        c.fill();
        c.fillStyle = '#4a3a4a';
        fitText(c, a, 0, -6, 104, 14, 600);
        fitText(c, b, 0, 14, 104, 12, 500);
        c.restore();
      }
    });
    nb.position.set(-12.0, 1.7, CZ + 0.085);
    cw.add(nb);
    const crest = atlas.panel(1.1, 0.8, 220, 160, (c, w, h) => {
      c.fillStyle = '#f4c24f';
      roundRect(c, 0, 0, w, h, 10);
      c.fill();
      c.fillStyle = '#fff8ee';
      roundRect(c, 10, 10, w - 20, h - 20, 6);
      c.fill();
      c.strokeStyle = COL.navy;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(60, 120);
      c.lineTo(160, 34);
      c.moveTo(160, 120);
      c.lineTo(60, 34);
      c.stroke();
      c.fillStyle = COL.pink;
      heartPath(c, w / 2, 76, 40);
      c.fill();
      c.fillStyle = COL.navy;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'R & H Fencing Club', w / 2, h - 22, w - 40, 15, 700);
    });
    crest.position.set(-10.2, 2.25, CZ + 0.085);
    cw.add(crest);
    const sign = atlas.panel(1.3, 0.26, 208, 42, boardDraw(['Changing room'], { edge: COL.blue }));
    sign.position.set((CH_DOOR[0] + CH_DOOR[1]) / 2, 2.55, CZ + 0.09);
    cw.add(sign);
  }
  // a waiting bench along the left wall, a coat stand, plants and the welcome rug
  add(at(rbox(0.46, 0.07, 1.8, wood, 0.03), X0 + 0.35, 0.44, 4.2));
  for (const s of [-1, 1]) add(at(box(0.4, 0.42, 0.08, COL.woodDark), X0 + 0.35, 0.21, 4.2 + s * 0.78));
  R.box(X0 + 0.35, 4.2, 0.25, 0.92, 0.47);
  {
    const x = X0 + 0.5;
    const z = 6.3;
    add(at(cyl(0.025, 0.03, 1.8, COL.woodDark, 6), x, 0.9, z));
    add(at(cyl(0.22, 0.25, 0.04, COL.woodDark, 10), x, 0.02, z));
    for (let i = 0; i < 4; i++) add(at(rot(cyl(0.012, 0.012, 0.2, COL.woodDark, 4), 0, i * 1.57, 0.7), x + Math.cos(i * 1.57) * 0.06, 1.7, z + Math.sin(i * 1.57) * 0.06));
    add(at(rot(rbox(0.1, 0.5, 0.2, COL.pink, 0.04), 0, 0.3, 0.05), x + 0.1, 1.42, z));
    add(at(rot(tor(0.12, 0.04, COL.sky, P * 2, undefined, 12, 5), P / 2 - 0.2, 0, 0), x - 0.05, 1.58, z - 0.06));
    R.circle(x, z, 0.26);
  }
  for (const [x, z] of [[LX - 0.45, ARCH0(-0.55)], [LX - 0.45, 3.2]]) {
    add(at(cyl(0.2, 0.16, 0.36, '#ffffff', 12), x, 0.18, z));
    add(at(sph(0.3, COL.leaf, { flat: true }, 9), x, 0.62, z));
    add(at(sph(0.2, COL.leafDark, { flat: true }, 8), x + 0.1, 0.85, z - 0.06));
    R.circle(x, z, 0.24);
  }
  // a little sofa against the low wall, a coffee table with roses and a fencing magazine
  {
    const sx = LX - 0.5;
    const sz = 5.2;
    add(at(rbox(0.7, 0.3, 1.7, COL.navy, 0.08), sx, 0.25, sz));
    add(at(rbox(0.22, 0.6, 1.7, COL.navy, 0.08), sx + 0.26, 0.55, sz));
    for (const s of [-1, 1]) add(at(rbox(0.66, 0.42, 0.18, COL.navy, 0.07), sx, 0.38, sz + s * 0.86));
    for (const s of [-1, 1]) add(at(rbox(0.5, 0.1, 0.72, '#fff4e3', 0.04), sx - 0.04, 0.44, sz + s * 0.38));
    add(at(rot(rbox(0.12, 0.3, 0.3, COL.pink, 0.05), 0, 0, -0.25), sx + 0.1, 0.62, sz - 0.5));
    add(at(rot(rbox(0.12, 0.3, 0.3, COL.sky, 0.05), 0, 0.2, -0.25), sx + 0.1, 0.62, sz + 0.5));
    R.box(sx, sz, 0.38, 0.95, 0.47);
    const tx = sx - 1.15;
    add(at(cyl(0.38, 0.38, 0.05, '#fff4e3', 18), tx, 0.46, sz));
    add(at(cyl(0.04, 0.06, 0.44, COL.gold, 8, { rough: 0.35, metal: 0.5 }), tx, 0.22, sz));
    add(at(cyl(0.2, 0.22, 0.03, COL.gold, 12, { rough: 0.35, metal: 0.5 }), tx, 0.015, sz));
    add(at(cyl(0.05, 0.04, 0.16, '#ffffff', 10), tx + 0.1, 0.56, sz - 0.08));
    for (let i = 0; i < 3; i++) add(at(sph(0.04, i === 1 ? COL.rose : COL.pink, undefined, 7), tx + 0.1 + (i - 1) * 0.04, 0.67 + (i % 2) * 0.03, sz - 0.08));
    const mag = atlas.panel(0.24, 0.32, 72, 96, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = COL.navy;
      c.fillRect(0, 0, w, 22);
      c.fillStyle = '#ffffff';
      c.font = `700 12px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('EN GARDE', w / 2, 15);
      c.fillStyle = COL.pink;
      c.beginPath();
      c.arc(w * 0.38, 56, 12, 0, P * 2);
      c.fill();
      c.fillStyle = COL.blue;
      c.beginPath();
      c.arc(w * 0.64, 56, 12, 0, P * 2);
      c.fill();
      c.fillStyle = '#5a4050';
      c.font = `600 9px ${FONT}`;
      c.fillText('Club couple', w / 2, 84);
    });
    mag.rotation.set(-P / 2, 0, 0.4);
    add(at(mag, tx - 0.12, 0.488, sz + 0.1));
    R.circle(tx, sz, 0.4, 0.49);
  }
  // a poster on the left wall and a sign over the doorway to the hall
  {
    const poster = atlas.panel(1.4, 1.0, 280, 200, (c, w, h) => {
      c.fillStyle = COL.navy;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff4e3';
      roundRect(c, 12, 12, w - 24, h - 24, 10);
      c.fill();
      c.fillStyle = COL.navy;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Members of the month', w / 2, 36, w - 60, 20, 700);
      for (const [x, col, hair] of [[0.36, COL.pink, '#2a1a13'], [0.64, COL.blue, '#141010']]) {
        c.fillStyle = '#ffffff';
        roundRect(c, w * x - 22, 104, 44, 58, 14);
        c.fill();
        c.fillStyle = col;
        heartPath(c, w * x + 8, 124, 12);
        c.fill();
        c.fillStyle = '#f8dccb';
        c.beginPath();
        c.arc(w * x, 88, 20, 0, P * 2);
        c.fill();
        c.fillStyle = hair;
        c.beginPath();
        c.arc(w * x, 82, 21, P, P * 2);
        c.fill();
      }
      c.fillStyle = COL.pink;
      heartPath(c, w / 2, 116, 20);
      c.fill();
      c.fillStyle = '#5a4050';
      fitText(c, 'Roji and Homama', w / 2, h - 26, w - 60, 17, 600);
    });
    poster.rotation.y = P / 2;
    add(at(poster, X0 + 0.005, 1.75, 0.6));
    const hallSign = atlas.panel(1.1, 0.26, 176, 42, boardDraw(['To the hall'], { edge: COL.gold, ink: COL.navy }));
    hallSign.rotation.y = -P / 2;
    add(at(hallSign, LX - 0.105, 2.75, (L.ARCH[0] + L.ARCH[1]) / 2));
  }
  // in the changing room: a shoe rack, a plant and the showers behind a pink curtain
  {
    const x = X0 + 0.3;
    const z = -3.0;
    add(at(box(0.36, 0.05, 1.2, COL.woodDark), x, 0.18, z));
    add(at(box(0.36, 0.05, 1.2, COL.woodDark), x, 0.42, z));
    for (const s of [-1, 1]) add(at(box(0.36, 0.46, 0.04, COL.woodDark), x, 0.23, z + s * 0.58));
    const shoes = ['#ffffff', '#ff9eb5', '#ffffff', '#8fc4ff', '#ffffff'];
    shoes.forEach((c, i) => {
      for (const s of [-1, 1]) add(at(sph(0.06, c, undefined, 8), x + 0.02, (i % 2 ? 0.48 : 0.24), z - 0.45 + i * 0.22 + s * 0.05)).scale.set(1.5, 0.7, 1);
    });
    R.box(x, z, 0.2, 0.62, 0.47);
    add(at(cyl(0.2, 0.16, 0.36, '#ffffff', 12), X0 + 0.35, 0.18, -2.0));
    add(at(sph(0.28, COL.leaf, { flat: true }, 9), X0 + 0.35, 0.6, -2.0));
    R.circle(X0 + 0.35, -2.0, 0.24);
    const cx = LX - 0.12;
    const cz = -4.3;
    add(at(rot(cyl(0.015, 0.015, 1.5, COL.steel, 5), P / 2, 0, 0), cx - 0.06, 2.15, cz));
    for (let i = 0; i < 7; i++) add(at(cyl(0.07, 0.07, 1.95, i % 2 ? COL.rose : '#ffd1dc', 8), cx - 0.08, 1.12, cz - 0.6 + i * 0.2));
    const sh = atlas.panel(0.9, 0.24, 144, 38, boardDraw(['Showers'], { edge: COL.pink }));
    sh.rotation.y = -P / 2;
    add(at(sh, LX - 0.105, 2.4, cz));
    R.box(cx - 0.08, cz, 0.12, 0.72);
  }
  const rug = atlas.panel(2.0, 2.0, 200, 200, (c, w, h) => {
    c.fillStyle = COL.navy;
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 2, 0, P * 2);
    c.fill();
    c.fillStyle = '#fff4e3';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 14, 0, P * 2);
    c.fill();
    c.strokeStyle = COL.gold;
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(50, 150);
    c.lineTo(150, 50);
    c.moveTo(150, 150);
    c.lineTo(50, 50);
    c.stroke();
    c.fillStyle = COL.pink;
    heartPath(c, w / 2, h / 2, 46);
    c.fill();
  });
  rug.material = rug.material.clone();
  rug.material.transparent = true;
  rug.material.alphaTest = 0.5;
  rug.rotation.x = -P / 2;
  add(at(rug, L.EXIT.x, 0.012, 4.6));
  R.dyn(rug);
}

function ARCH0(d) {
  return L.ARCH[0] + d;
}
