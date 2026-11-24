import { THREE, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, canvasTexture, heartGeo, starGeo, pillowGeo, sprite, smooth, bake, FONT, roundRect } from './kit.js';
import { makeQuilt, quiltTexture } from './quilt.js';
import { setupGifts } from './gift.js';
import { damp } from '../../util.js';

// Main bedroom: the big bed with a thick quilt, the wardrobe, the empty crib with a star mobile,
// and the gift shelf. Sleep, story time, look under Roji's pillow.

const BX = 1.4; // bed centre x
const MT = 0.63; // mattress top
const QZ = -3.47; // quilt hem (folded edge) z
const FOOT = -1.995; // mattress foot z
const WX = -1.6; // wardrobe centre x
const CX = 4.45; // crib centre x
const LAV = '#c7a6e0';

// Kid lying in bed: feet at the root, body tipped back toward the headboard, head on the pillow.
const LIE = -(Math.PI / 2 - 0.53);
const LIE_Y = 0.55;
const LIE_Z = -2.94;

function zTex() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#7b6aa8';
    ctx.lineWidth = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 110px ${FONT}`;
    ctx.strokeText('Z', w / 2, h / 2 + 6);
    ctx.fillText('Z', w / 2, h / 2 + 6);
  });
}
function starTex() {
  return canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#ffe27a';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 ? 9 : 22;
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr);
    }
    ctx.fill();
  });
}

// Picture book: an open book showing a little story picture on both pages
function makeBook() {
  const g = new THREE.Group();
  const pages = canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#bfe6ff';
    ctx.fillRect(10, 10, w / 2 - 20, h - 20);
    ctx.fillStyle = '#2a2f62';
    ctx.fillRect(w / 2 + 10, 10, w / 2 - 20, h - 20);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(w * 0.75, 50, 16, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) ctx.fillRect(w * 0.55 + ((i * 37) % 100), 20 + ((i * 23) % 100), 3, 3);
    ctx.fillStyle = '#ef5b6f';
    ctx.beginPath();
    ctx.arc(60, 100, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7fd36b';
    ctx.fillRect(10, 120, w / 2 - 20, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(48, 70, 24, 10);
    ctx.fillRect(55, 63, 10, 24);
  });
  const pm = umat('#ffffff', { rough: 0.8, map: pages, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.24), pm);
    const uv = page.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, s < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
    page.position.set(s * 0.1, 0, 0);
    const hinge = new THREE.Group();
    hinge.rotation.y = -s * 0.32;
    hinge.add(page);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.25, 0.012), mat('#ef5b6f', { rough: 0.6 }));
    cover.position.set(s * 0.1, 0, -0.008);
    hinge.add(cover);
    g.add(hinge);
  }
  return g;
}

export function buildBedroom(R) {
  const { add, L, api } = R;
  const ZB = L.ZB;
  const P = Math.PI;
  const st = { roji: 0, homama: 0, sitter: 0, doors: 0, doorsTarget: 0, doorT: 0, mobile: 0, story: 0, line: 0 };
  const wood = mat('#d9b38c', { rough: 0.75 });
  const white = mat('#ffffff', { rough: 0.6 });

  // ---------------------------------------------------------------- bed
  for (const [dx, dz] of [[-1.1, -1.2], [1.1, -1.2], [-1.1, 1.15], [1.1, 1.15]]) add(at(cyl(0.05, 0.04, 0.12, '#a8764a', 8), BX + dx, 0.06, -3.2 + dz));
  add(at(rbox(2.42, 0.28, 2.5, wood, 0.06), BX, 0.24, -3.2));
  add(at(rbox(2.2, 0.26, 2.35, white, 0.07), BX, 0.5, -3.17));
  const head = new THREE.Shape();
  const hw = 1.35;
  head.moveTo(-hw, 0);
  head.lineTo(hw, 0);
  head.lineTo(hw, 1.2);
  head.quadraticCurveTo(hw, 1.42, hw * 0.66, 1.42);
  head.quadraticCurveTo(hw * 0.33, 1.42, hw * 0.33, 1.52);
  head.quadraticCurveTo(0, 1.72, -hw * 0.33, 1.52);
  head.quadraticCurveTo(-hw * 0.33, 1.42, -hw * 0.66, 1.42);
  head.quadraticCurveTo(-hw, 1.42, -hw, 1.2);
  head.closePath();
  const hg = new THREE.ExtrudeGeometry(head, { depth: 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 });
  add(at(mesh(hg, mat(LAV, { rough: 0.85 })), BX, 0.28, ZB + 0.05));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) add(at(sph(0.03, '#f3e9ff', { rough: 0.4 }, 8), BX - 0.9 + j * 0.6 + (i % 2) * 0.3, 0.95 + i * 0.25, ZB + 0.23));
  add(at(mesh(heartGeo(0.3, 0.04), mat('#ff8fb1', { rough: 0.5 })), BX, 1.58, ZB + 0.24));
  R.col({ type: 'box', x: BX, z: -3.06, hw: 1.22, hd: 1.12, h: MT }, { type: 'box', x: BX, z: ZB + 0.12, hw: 1.42, hd: 0.14 });

  // Plump pillows; Roji's (left) lifts when she looks under it
  const pg = pillowGeo(0.86, 0.26, 0.46, 20);
  const pillows = {};
  for (const [id, s, c] of [['roji', -1, '#fff0f5'], ['homama', 1, '#eef6ff']]) {
    const p = R.dyn(add(rot(at(mesh(pg, mat(c, { rough: 0.9 })), BX + s * 0.55, MT + 0.11, -4.0), -0.28, 0, 0)));
    pillows[id] = p;
    const deco = mesh(id === 'roji' ? heartGeo(0.12, 0.02) : starGeo(0.07, 0.03, 0.02), mat(id === 'roji' ? '#ff8fb1' : '#6fb8ff'));
    deco.position.set(0.2 * -s, 0.02, 0.24);
    deco.rotation.x = 0.28;
    p.add(deco);
  }

  // The quilt: thick, puffy, draped over the sides and the foot, with a folded hem
  const sleepers = [{ id: 'roji', x: -0.55 }, { id: 'homama', x: 0.55 }];
  const quilt = makeQuilt({
    w: 2.2,
    l: FOOT - QZ,
    top: MT + 0.035,
    r: 0.09,
    drop: 0.27,
    dropSide: 0.27,
    fold: 0.3,
    thick: 0.055,
    cell: 0.3,
    puff: 0.03,
    seg: 0.05,
    material: ({ cellsX, cellsY }) => umat('#ffffff', { rough: 0.95, side: THREE.DoubleSide, map: quiltTexture(canvasTexture, { cellsX, cellsY }) }),
    pipe: mat('#ff9eb5', { rough: 0.8 }),
    bumps: (x, z) => {
      let b = 0;
      for (const s of sleepers) {
        const k = st[s.id];
        if (k <= 0) continue;
        const lat = 1 - smooth(0.24, 0.5, Math.abs(x - s.x));
        if (lat <= 0) continue;
        const d = LIE_Z - QZ - z;
        // Low over the feet, then high enough to clear a dress or a tummy, a little higher at the chest
        const prof = d < 0 ? 0.13 * smooth(-0.24, 0, d) : 0.13 + 0.33 * smooth(0.0, 0.11, d) + 0.04 * smooth(0.3, 0.55, d);
        b = Math.max(b, k * lat * prof);
      }
      return b;
    },
  });
  quilt.group.position.set(BX, 0, QZ);
  add(quilt.group);
  R.dyn(quilt.group);

  // Nightstands: a lamp on Roji's side, a star night light on Homama's
  const lampShade = umat('#fff1c9', { emissive: '#ffc977', ei: 0.6, rough: 0.6, side: THREE.DoubleSide });
  const nightStar = umat('#ffe27a', { emissive: '#ffcf4d', ei: 0.4, rough: 0.5 });
  for (const s of [-1, 1]) {
    const x = BX + s * 1.55;
    add(at(rbox(0.56, 0.56, 0.46, wood, 0.04), x, 0.28, ZB + 0.4));
    add(at(rbox(0.46, 0.18, 0.02, '#e9c9a3', 0.02), x, 0.38, ZB + 0.635));
    add(at(sph(0.025, '#f4c24f', { metal: 0.5 }, 8), x, 0.38, ZB + 0.65));
    R.col({ type: 'box', x, z: ZB + 0.4, hw: 0.29, hd: 0.24, h: 0.56 });
  }
  add(at(cyl(0.08, 0.1, 0.22, '#ffffff', 12), BX - 1.55, 0.67, ZB + 0.38));
  add(at(mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.2, 16, 1, true), lampShade), BX - 1.55, 0.88, ZB + 0.38));
  add(at(cyl(0.07, 0.09, 0.06, '#c7a6ff', 12), BX + 1.55, 0.59, ZB + 0.38));
  add(at(mesh(starGeo(0.14, 0.06, 0.06), nightStar), BX + 1.55, 0.78, ZB + 0.38));
  add(at(rbox(0.16, 0.04, 0.22, '#6fb8ff', 0.01), BX + 1.42, 0.58, ZB + 0.5));

  // Gift shelf above the bed, with a little banner
  const slots = [];
  for (const y of [2.05, 2.5]) {
    add(at(rbox(2.0, 0.045, 0.24, white, 0.015), BX, y, ZB + 0.12));
    for (const s of [-1, 1]) add(at(box(0.04, 0.14, 0.18, '#ff9eb5'), BX + s * 0.85, y - 0.09, ZB + 0.1));
    for (const dx of [-0.72, -0.24, 0.24, 0.72]) slots.push({ x: BX + dx, y: y + 0.025, z: ZB + 0.14 });
  }
  const banner = canvasTexture(512, 96, (ctx, w, h) => {
    const cols = ['#ff9eb5', '#ffd166', '#9fd6e3', '#c7a6ff'];
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = cols[i % 4];
      ctx.beginPath();
      ctx.moveTo((i * w) / 16, 0);
      ctx.lineTo(((i + 1) * w) / 16, 0);
      ctx.lineTo(((i + 0.5) * w) / 16, h * 0.45);
      ctx.fill();
    }
    ctx.fillStyle = '#7b4a8a';
    ctx.textAlign = 'center';
    ctx.font = `600 34px ${FONT}`;
    ctx.fillText('Gifts from Homama', w / 2, h * 0.85);
  });
  add(at(mesh(new THREE.PlaneGeometry(1.8, 0.34), umat('#ffffff', { map: banner, transparent: true, rough: 0.8 }), { cast: false }), BX, 2.92, ZB + 0.03));

  // ---------------------------------------------------------------- wardrobe with opening doors
  const peach = mat('#f7d9c4', { rough: 0.7 });
  add(at(box(1.4, 2.2, 0.04, mat('#efc9b2', { rough: 0.8 })), WX, 1.1, ZB + 0.02));
  for (const s of [-1, 1]) add(at(rbox(0.06, 2.2, 0.65, peach, 0.02), WX + s * 0.67, 1.1, ZB + 0.33));
  add(at(rbox(1.48, 0.1, 0.7, peach, 0.03), WX, 2.24, ZB + 0.33));
  add(at(box(1.34, 0.08, 0.62, peach), WX, 0.06, ZB + 0.33));
  add(at(mesh(heartGeo(0.3, 0.06), mat('#ff8fb1')), WX, 2.48, ZB + 0.35));
  add(at(box(1.3, 0.03, 0.56, peach), WX, 0.62, ZB + 0.33));
  add(rot(at(cyl(0.015, 0.015, 1.28, '#c9a27a', 6), WX, 1.9, ZB + 0.32), 0, 0, P / 2));
  // Clothes on hangers: Roji's dresses on the left, Homama's tees on the right
  const clothes = [['#ef5b6f', 'dress'], ['#ff9eb5', 'dress'], ['#ffffff', 'coat'], ['#c7a6ff', 'dress'], ['#3f7bf0', 'tee'], ['#6fb8ff', 'tee'], ['#2c3e66', 'tee']];
  clothes.forEach(([c, k], i) => {
    const x = WX - 0.55 + i * 0.18;
    add(rot(at(tor(0.07, 0.008, '#c9a27a', undefined, P, 4, 10), x, 1.83, ZB + 0.32), 0, P / 2, 0));
    if (k === 'tee') {
      const tee = add(at(rbox(0.06, 0.4, 0.34, c, 0.02), x, 1.58, ZB + 0.32));
      tee.add(at(rbox(0.05, 0.1, 0.5, c, 0.02), 0, 0.14, 0));
    } else {
      const len = k === 'coat' ? 0.8 : 0.62;
      add(at(mesh(new THREE.CylinderGeometry(0.07, 0.17, len, 14).scale(0.35, 1, 1), mat(c, { rough: 0.8 })), x, 1.8 - len / 2, ZB + 0.32));
    }
  });
  ['#ffd166', '#7fd3a7', '#ff9eb5', '#6fb8ff'].forEach((c, i) => add(at(rbox(0.28, 0.08, 0.3, c, 0.02), WX - 0.45 + (i % 2) * 0.32, 0.68 + Math.floor(i / 2) * 0.09, ZB + 0.33)));
  for (const [dx, c] of [[0.25, '#ef5b6f'], [0.4, '#ef5b6f'], [0.15, '#3f7bf0'], [0.5, '#3f7bf0']]) add(at(sph(0.06, c, undefined, 8), WX + dx - 0.05, 0.14, ZB + 0.3 + (c === '#3f7bf0' ? 0.15 : 0))).scale.set(0.8, 0.6, 1.5);
  const doors = [];
  const doorMat = mat('#fbe3d3', { rough: 0.6 });
  for (const s of [-1, 1]) {
    const d = R.dyn(new THREE.Group());
    d.position.set(WX + s * 0.7, 0, ZB + 0.65);
    const dx = -s * 0.345;
    d.add(at(rbox(0.68, 2.08, 0.05, doorMat, 0.02), dx, 1.12, 0.025));
    d.add(at(rbox(0.5, 0.8, 0.02, '#f6cdb8', 0.02), dx, 1.55, 0.055), at(rbox(0.5, 0.6, 0.02, '#f6cdb8', 0.02), dx, 0.55, 0.055));
    d.add(at(sph(0.035, '#f4c24f', { metal: 0.6, rough: 0.3 }, 8), -s * 0.62, 1.1, 0.07));
    d.add(at(mesh(heartGeo(0.16, 0.02), mat('#ff8fb1')), dx, 1.55, 0.07));
    add(bake(d));
    doors.push({ d, s });
  }
  R.col({ type: 'box', x: WX, z: ZB + 0.33, hw: 0.72, hd: 0.35 });

  // ---------------------------------------------------------------- crib with a star mobile (empty for now)
  const cribMat = mat('#ffffff', { rough: 0.6 });
  for (const [dx, dz] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) {
    add(at(cyl(0.035, 0.035, 0.98, cribMat, 8), CX + dx, 0.49, -4.0 + dz));
    add(at(sph(0.05, '#ffd6e6', undefined, 10), CX + dx, 1.0, -4.0 + dz));
  }
  for (const dz of [-0.3, 0.3]) {
    add(at(box(1.1, 0.05, 0.05, cribMat), CX, 0.92, -4.0 + dz));
    add(at(box(1.1, 0.05, 0.05, cribMat), CX, 0.3, -4.0 + dz));
    for (let k = 1; k < 10; k++) add(at(cyl(0.012, 0.012, 0.6, cribMat, 5), CX - 0.55 + k * 0.11, 0.61, -4.0 + dz));
  }
  for (const s of [-1, 1]) for (let k = 1; k < 5; k++) add(at(cyl(0.012, 0.012, 0.6, cribMat, 5), CX + s * 0.55, 0.61, -4.3 + k * 0.12));
  add(at(rbox(1.06, 0.1, 0.56, '#fff7fb', 0.04), CX, 0.37, -4.0));
  add(at(rbox(0.3, 0.06, 0.2, '#ffffff', 0.03), CX - 0.3, 0.45, -4.0));
  add(at(rbox(0.36, 0.05, 0.44, '#ffe9a8', 0.02), CX + 0.18, 0.445, -4.0));
  add(at(cyl(0.015, 0.015, 0.8, cribMat, 6), CX + 0.55, 1.35, -4.3));
  add(rot(at(cyl(0.012, 0.012, 0.63, cribMat, 6), CX + 0.275, 1.74, -4.15), 0, 0.5, P / 2));
  const mobile = R.dyn(new THREE.Group());
  mobile.position.set(CX, 1.72, -4.0);
  mobile.add(rot(tor(0.22, 0.01, '#ffd166', undefined, P * 2, 4, 20), P / 2, 0, 0));
  const hang = [['star', '#ffd166'], ['heart', '#ff8fb1'], ['star', '#9fd6e3'], ['moon', '#fff1a8'], ['star', '#c7a6ff']];
  hang.forEach(([k, c], i) => {
    const a = (i / hang.length) * P * 2;
    const x = Math.cos(a) * 0.22;
    const z = Math.sin(a) * 0.22;
    mobile.add(at(cyl(0.003, 0.003, 0.22, '#ffffff', 3), x, -0.11, z));
    const geo = k === 'heart' ? heartGeo(0.1, 0.025) : k === 'moon' ? new THREE.TorusGeometry(0.05, 0.02, 6, 12, P * 1.3) : starGeo(0.06, 0.025, 0.025);
    mobile.add(at(mesh(geo, mat(c, { emissive: c, ei: 0.25 })), x, -0.26, z));
  });
  add(bake(mobile));
  R.col({ type: 'box', x: CX, z: -4.0, hw: 0.6, hd: 0.36 });
  R.windowAt(CX, 2.25, 0.9, 0.75, '#ffd6e6');

  // ---------------------------------------------------------------- rug, slippers, wall art, star garland
  const rugTex = (ctx, w, h) => {
    ctx.fillStyle = '#f3e6fb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe9f0';
    roundRect(ctx, 0, 0, w, h, 40);
    ctx.fill();
    ctx.strokeStyle = '#ff9eb5';
    ctx.lineWidth = 10;
    roundRect(ctx, 14, 14, w - 28, h - 28, 30);
    ctx.stroke();
    ctx.fillStyle = '#ffb8cc';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
      const cx = 46 + i * 41;
      const cy = 58 + j * 44;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 8);
      ctx.bezierCurveTo(cx - 12, cy - 1, cx - 7, cy - 11, cx, cy - 4);
      ctx.bezierCurveTo(cx + 7, cy - 11, cx + 12, cy - 1, cx, cy + 8);
      ctx.fill();
    }
  };
  add(rot(at(R.atlas.panel(2.8, 1.5, 256, 160, rugTex), BX, 0.008, -0.7), -P / 2, 0, 0));
  for (const [dx, c] of [[-0.75, '#ff9eb5'], [-0.55, '#ff9eb5'], [0.55, '#7fb0ff'], [0.75, '#7fb0ff']]) add(at(sph(0.1, c, undefined, 10), BX + dx, 0.04, -1.55)).scale.set(0.7, 0.35, 1.3);
  const print = (ctx, w, h) => {
    ctx.fillStyle = '#fff7fb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.moveTo(64, 120);
    ctx.bezierCurveTo(8, 80, 24, 20, 64, 50);
    ctx.bezierCurveTo(104, 20, 120, 80, 64, 120);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('R + H', 64, 86);
  };
  add(at(rbox(0.42, 0.52, 0.04, '#f4c24f', 0.02), 3.55, 1.55, ZB + 0.03));
  add(at(R.atlas.panel(0.34, 0.44, 128, 160, print), 3.55, 1.55, ZB + 0.055));
  const garland = mat('#ffd166', { emissive: '#ffb200', ei: 0.35 });
  const sg = starGeo(0.1, 0.045, 0.02);
  for (let i = 0; i < 9; i++) add(at(mesh(sg, garland, { cast: false }), -2.0 + i * 0.5 + (i > 4 ? 2.6 : 0), 2.95 - Math.sin(((i % 5) / 4) * P) * 0.22, ZB + 0.05));

  // zzz over sleepers and stars floating up from the story book
  const zMat = new THREE.SpriteMaterial({ map: zTex(), transparent: true, depthWrite: false });
  const zs = [];
  for (let i = 0; i < 6; i++) {
    const s = R.dyn(add(new THREE.Sprite(zMat.clone())));
    s.visible = false;
    zs.push({ s, ph: i / 6, who: i % 2 ? 'homama' : 'roji' });
  }
  const sTex = starTex();
  const stars = [];
  for (let i = 0; i < 8; i++) {
    const s = R.dyn(add(sprite(sTex, { scale: 0.18 })));
    s.visible = false;
    stars.push({ s, ph: i / 8 });
  }
  const book = makeBook();

  // ---------------------------------------------------------------- activities
  const lie = (who, s) => ({ who, x: BX + s * 0.55, z: LIE_Z, y: LIE_Y, yaw: 0, rot: [LIE, -s * 0.25, 0], pose: 'sleep' });
  function sleep(a) {
    const spec = R.start('sleep', {
      label: 'Wake up',
      seats: [lie('roji', -1), lie('homama', 1)],
      focus: { x: BX, z: -3.2, y: 0.9, zoom: 0.55 },
      night: 1,
      music: 0.35,
      exit: { x: BX - 0.4, z: -1.2 },
      onEnd(silent) {
        R.cat.release();
        if (silent) return;
        a.toast('Good morning!', 2400);
        R.sound((s, t0) => {
          s.tone(2400, t0, 0.08, { slideTo: 3100, gain: 0.05 });
          s.tone(2700, t0 + 0.16, 0.08, { slideTo: 3400, gain: 0.05 });
          s.tone(2500, t0 + 0.4, 0.1, { slideTo: 3300, gain: 0.04 });
        });
        R.later(0.3, () => a.emote('player', 'cheer'));
      },
    });
    if (!spec) return;
    R.light.position.set(BX - 1.55, 1.2, ZB + 0.6);
    R.light.color.set('#ffc98a');
    R.light.intensity = 2.2;
    R.cat.goTo('bedfoot');
    a.toast('Sweet dreams...', 2600);
  }

  const STORY = [
    'Once upon a time, on a little island, there lived a kind doctor named Roji...',
    'Every day she made the sick animals smile again.',
    'And every night, a boy who loved her very much read her a story.',
    'The stars came out to listen, one by one...',
    '...and Roji fell asleep, smiling. The end.',
  ];
  function story(a) {
    const spec = R.start('story', {
      label: 'Close the book',
      seats: [lie('roji', -1), { who: 'homama', x: BX + 0.55, z: -3.58, y: 0.4, yaw: -0.45, pose: 'sit', hands: 'read' }],
      focus: { x: BX, z: -3.3, y: 1.0, zoom: 0.52 },
      night: 0.8,
      music: 0.3,
      exit: { x: BX + 1.5, z: -1.6 },
      update(dt) {
        st.story += dt;
        const line = Math.floor(st.story / 4.4);
        if (line !== st.line && line < STORY.length) {
          st.line = line;
          a.toast(`<b>Homama reads:</b> ${STORY[line]}`, 4200);
          if (line === STORY.length - 1) a.fx.heartsAt(R.headPos(a.roji), 3);
        }
      },
      onEnd() {
        book.removeFromParent();
      },
    });
    if (!spec) return;
    st.story = 0;
    st.line = 0;
    a.toast(`<b>Homama reads:</b> ${STORY[0]}`, 4200);
    book.position.set(0, 0.08, 0.02);
    book.rotation.set(-0.35, 0, 0);
    a.homama.kid.carryAnchor.add(book);
    R.light.position.set(BX + 1.55, 1.2, ZB + 0.6);
    R.light.color.set('#ffd6a0');
    R.light.intensity = 2.4;
  }

  async function guess(a) {
    const g = await a.choose({
      title: 'Girl or boy?',
      text: 'One day this little crib will not be empty. What do you think?',
      options: [
        { id: 'girl', label: 'Girl', sub: 'A little doctor?' },
        { id: 'boy', label: 'Boy', sub: 'A little coder?' },
        { id: 'twins', label: 'Twins', sub: 'Double the cuddles' },
      ],
    });
    if (!g) return;
    const tally = a.load('guesses', { girl: 0, boy: 0, twins: 0 });
    tally[g] = (tally[g] || 0) + 1;
    a.save('guesses', tally);
    const me = a.playerId === 'roji' ? 'Roji' : 'Homama';
    const replies = {
      roji: {
        girl: 'Homama: A little girl with your smile? My heart!',
        boy: 'Homama: A little boy! I will teach him to code and climb trees.',
        twins: 'Homama: Twins?! Double the cuddles, double the diapers!',
      },
      homama: {
        girl: 'Roji: A little girl who loves stories, just like her baba.',
        boy: 'Roji: A little Homama running around? So sweet!',
        twins: 'Roji: Twins! We will need a bigger crib.',
      },
    }[a.playerId][g];
    a.emote('partner', g === 'girl' ? 'heart' : g === 'boy' ? 'cheer' : 'spin');
    a.fx.heartsAt(a.world(CX, -4.0, 1.4), 4);
    st.mobile = 3;
    R.sound((s, t0) => [72, 76, 79, 84, 79, 76].forEach((n, i) => s.tone(440 * Math.pow(2, (n - 69) / 12), t0 + i * 0.18, 0.4, { type: 'sine', gain: 0.05 })));
    a.toast(`${me} guesses <b>${g === 'twins' ? 'twins' : 'a ' + g}</b>.<br>${replies}<br><small>Guesses so far: girl ${tally.girl}, boy ${tally.boy}, twins ${tally.twins}</small>`, 4600);
  }

  R.hot(
    {
      x: WX,
      z: -2.95,
      r: 1.2,
      label: 'Change clothes',
      icon: 'shirt',
      act: (a) => {
        st.doorsTarget = 1;
        st.doorT = 0;
        a.sound.ui('swoosh');
        R.later(0.45, () => a.openWardrobe());
      },
    },
    { x: BX, z: -1.25, r: 1.3, label: 'Go to sleep', icon: 'moon', act: sleep },
    { x: BX + 1.55, z: -2.2, r: 1.2, label: 'Story time in bed', icon: 'book', act: story },
    { x: CX, z: -2.95, r: 1.2, label: 'Guess: girl or boy?', icon: 'baby', act: guess },
  );

  setupGifts(R, { pillow: pillows.roji, under: { x: BX - 0.55, y: MT + 0.02, z: -4.0 }, slots, hot: { x: -0.15, z: -2.75 } });

  // ---------------------------------------------------------------- update
  R.upd((dt, t, a) => {
    const sleeping = R.is('sleep');
    const story = R.is('story');
    const kr = sleeping || story ? 1 : 0;
    const kh = sleeping ? 1 : 0;
    const nr = damp(st.roji, kr, 12, dt);
    const nh = damp(st.homama, kh, 12, dt);
    if (Math.abs(nr - st.roji) > 0.002 || Math.abs(nh - st.homama) > 0.002) {
      st.roji = Math.abs(nr - kr) < 0.003 ? kr : nr;
      st.homama = Math.abs(nh - kh) < 0.003 ? kh : nh;
      quilt.setK(1, true);
    }
    // Wardrobe doors close again when the player walks away
    st.doorT += dt;
    if (st.doorsTarget && st.doorT > 1.5) {
      const p = a.localPos(a.player);
      if (Math.hypot(p.x - WX, p.z + 3.4) > 2.1 || st.doorT > 40) st.doorsTarget = 0;
    }
    st.doors = damp(st.doors, st.doorsTarget, 6, dt);
    for (const { d, s } of doors) d.rotation.y = s * st.doors * 1.45;
    // Mobile turns gently, faster after a guess
    st.mobile = Math.max(0, st.mobile - dt);
    mobile.rotation.y += dt * (0.4 + st.mobile * 1.2);
    // Night lights
    lampShade.emissiveIntensity = sleeping ? 1.1 : 0.6;
    nightStar.emissiveIntensity = story ? 1.6 + Math.sin(t * 2) * 0.3 : sleeping ? 0.9 : 0.4;
    for (const z of zs) {
      const show = sleeping || (story && z.who === 'roji' && st.line >= STORY.length - 1);
      z.s.visible = show;
      if (!show) continue;
      const k = (t * 0.35 + z.ph) % 1;
      const x = BX + (z.who === 'roji' ? -0.55 : 0.55);
      z.s.position.set(x + 0.25 + Math.sin(k * 6 + z.ph * 9) * 0.2, 1.45 + k * 1.3, -3.9);
      z.s.scale.setScalar(0.18 + k * 0.3);
      z.s.material.opacity = Math.sin(k * Math.PI);
    }
    const bp = story ? a.local(book.getWorldPosition(new THREE.Vector3())) : null;
    for (const s of stars) {
      s.s.visible = story;
      if (!story) continue;
      const k = (t * 0.28 + s.ph) % 1;
      s.s.position.set(bp.x + Math.sin(k * 5 + s.ph * 20) * (0.2 + k * 0.6), bp.y + 0.15 + k * 1.6, bp.z + Math.cos(s.ph * 20) * 0.3 * k);
      s.s.scale.setScalar(0.08 + Math.sin(k * Math.PI) * 0.16);
      s.s.material.opacity = Math.sin(k * Math.PI);
    }
  });
  R.onExit(() => {
    st.doorsTarget = 0;
    st.doors = 0;
    book.removeFromParent();
  });
}
