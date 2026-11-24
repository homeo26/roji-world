import { THREE, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, canvasTexture, heartGeo, starGeo, pillowGeo, sprite, smooth, bake, FONT, roundRect, pattern, texMat } from './kit.js';
import { makeQuilt, quiltTexture } from './quilt.js';
import { setupGifts } from './gift.js';
import { makeYap } from './yap.js';
import { damp, easeInOut } from '../../util.js';

// Main bedroom: the big bed with a thick quilt, the wardrobe, the empty crib with a star mobile,
// the gift shelf and a dresser. Sleep (Homama tucks Roji in, and some nights brings her a hot water
// bottle), story time, a foot rub when Roji is tired, a pillow fight, yap time on the bed, and the
// gift under Roji's pillow. Built in its own coordinates (back wall at ZB).

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
  const st = { roji: 0, homama: 0, bottle: 0, cover: 1, sitter: 0, doors: 0, doorsTarget: 0, doorT: 0, mobile: 0, story: 0, line: 0, care: null, mass: null, pf: null };
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
      // The hot water bottle tucked in next to Roji
      if (st.bottle > 0) {
        const bx2 = x + 0.12;
        const bz2 = z - (LIE_Z - QZ - 0.62);
        const rr = Math.hypot(bx2 / 0.16, bz2 / 0.2);
        if (rr < 1) b = Math.max(b, st.bottle * (0.09 + 0.07 * (1 - rr * rr)));
      }
      return b;
    },
  });
  // The quilt hangs from a pivot at the foot of the bed, so it can be pulled up over Roji
  const qPivot = R.dyn(new THREE.Group());
  qPivot.position.set(BX, 0, FOOT);
  quilt.group.position.set(0, 0, QZ - FOOT);
  qPivot.add(quilt.group);
  add(qPivot);

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
      add(at(rbox(0.06, 0.4, 0.34, c, 0.02), x, 1.58, ZB + 0.32));
      add(at(rbox(0.05, 0.1, 0.5, c, 0.02), x, 1.72, ZB + 0.32));
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
    mobile.add(at(mesh(geo, mat(c, { rough: 0.5 })), x, -0.26, z));
  });
  add(bake(mobile));
  R.col({ type: 'box', x: CX, z: -4.0, hw: 0.6, hd: 0.36 });
  R.windowAt(CX, 2.25, 0.9, 0.75, '#ffd6e6');

  // Roji's vanity table by the wall: an oval mirror with a little note tucked in, perfume and lipstick
  const VX = -2.1;
  const VZ = 0.15;
  add(at(rbox(0.5, 0.05, 1.05, '#fbe3d3', 0.02), VX, 0.72, VZ));
  for (const dz of [-0.46, 0.46]) for (const dx of [-0.2, 0.2]) add(at(cyl(0.022, 0.018, 0.7, '#f7d9c4', 6), VX + dx, 0.35, VZ + dz));
  add(at(rbox(0.46, 0.12, 0.98, '#f7d9c4', 0.02), VX, 0.64, VZ));
  add(at(sph(0.022, '#f4c24f', { metal: 0.5 }, 8), VX + 0.24, 0.64, VZ));
  R.col({ type: 'box', x: VX, z: VZ, hw: 0.26, hd: 0.54, h: 0.75 });
  const mirror = new THREE.Group();
  mirror.add(at(tor(0.32, 0.035, '#f4c24f', { metal: 0.4, rough: 0.4 }, P * 2, 8, 28), 0, 0, 0));
  mirror.add(at(mesh(new THREE.CircleGeometry(0.32, 28), mat('#dcf0f7', { rough: 0.15 })), 0, 0, -0.005));
  mirror.children[0].scale.set(0.8, 1, 1);
  mirror.children[1].scale.set(0.8, 1, 1);
  const vnote = (ctx, w, h) => {
    ctx.fillStyle = '#ffd6e0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7a2e3a';
    ctx.font = `600 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('So pretty!', w / 2, 30);
    ctx.fillText('- H', w / 2, 54);
  };
  mirror.add(rot(at(R.atlas.panel(0.1, 0.09, 96, 72, vnote), 0.2, -0.2, 0.01), 0, 0, -0.2));
  mirror.position.set(-2.32, 1.35, VZ);
  mirror.rotation.y = P / 2;
  add(mirror);
  add(at(cyl(0.035, 0.045, 0.12, mat('#ffc2e0', { rough: 0.2 }), 10), VX - 0.05, 0.81, VZ - 0.3));
  add(at(sph(0.03, '#ffffff', { rough: 0.2 }, 8), VX - 0.05, 0.9, VZ - 0.3));
  add(at(cyl(0.015, 0.015, 0.08, '#ef3b5d', 8), VX + 0.08, 0.79, VZ - 0.18));
  add(at(rbox(0.12, 0.07, 0.1, '#c7a6ff', 0.02), VX, 0.785, VZ + 0.3));
  add(at(mesh(heartGeo(0.05, 0.01), mat('#ffffff')), VX + 0.05, 0.79, VZ + 0.3)).rotation.y = -P / 2;
  // A little cushioned stool
  add(at(cyl(0.2, 0.18, 0.42, '#f6cdb8', 14), VX + 0.62, 0.21, VZ));
  add(at(cyl(0.21, 0.21, 0.08, '#ff9eb5', 14), VX + 0.62, 0.45, VZ));
  R.col({ type: 'circle', x: VX + 0.62, z: VZ, r: 0.22, h: 0.49 });

  // Dresser against the side wall, with a photo of the two of them and a tiny lamp
  add(at(rbox(0.46, 0.8, 0.95, '#f7d9c4', 0.03), 6.25, 0.4, -3.3));
  for (let k = 0; k < 3; k++) {
    add(at(rbox(0.02, 0.2, 0.82, '#fbe3d3', 0.02), 6.01, 0.16 + k * 0.24, -3.3));
    add(at(sph(0.025, '#f4c24f', { metal: 0.5 }, 8), 5.99, 0.16 + k * 0.24, -3.3));
  }
  R.col({ type: 'box', x: 6.25, z: -3.3, hw: 0.25, hd: 0.5, h: 0.8 });
  add(at(cyl(0.13, 0.11, 0.08, '#d9b38c', 12), 6.25, 0.84, -3.55));
  const couple = (ctx, w, h) => {
    ctx.fillStyle = '#ffe9f0';
    ctx.fillRect(0, 0, w, h);
    for (const [x, c, hair] of [[w * 0.36, '#ef5b6f', '#4a2a1a'], [w * 0.64, '#3f7bf0', '#1d130f']]) {
      ctx.fillStyle = c;
      ctx.fillRect(x - 12, h * 0.6, 24, h * 0.3);
      ctx.fillStyle = '#ffd9c2';
      ctx.beginPath();
      ctx.arc(x, h * 0.48, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(x, h * 0.45, 14.5, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.32);
    ctx.bezierCurveTo(w / 2 - 12, h * 0.24, w / 2 - 8, h * 0.14, w / 2, h * 0.2);
    ctx.bezierCurveTo(w / 2 + 8, h * 0.14, w / 2 + 12, h * 0.24, w / 2, h * 0.32);
    ctx.fill();
  };
  add(rot(at(rbox(0.04, 0.3, 0.24, '#f4c24f', 0.01), 6.28, 0.97, -3.02), 0, 0, 0.12));
  add(rot(at(R.atlas.panel(0.19, 0.25, 96, 128, couple), 6.255, 0.97, -3.02), 0, -P / 2, 0.12));
  add(at(cyl(0.06, 0.07, 0.04, '#c7a6ff', 10), 6.25, 0.82, -2.95));

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
  const SIDE_R = { x: BX - 1.36, z: -2.78 }; // beside Roji's side of the bed
  const SIDE_H = { x: BX + 1.36, z: -2.78 };
  const FOOTWAY = -1.4; // walking round the foot of the bed
  const DRESSER = { x: 5.62, z: -3.3 };

  // The hot water bottle in its knitted cover, kept in a basket on the dresser
  const knit = pattern(64, 64, '#ef6f86', (ctx) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      for (let y = 0; y <= 64; y += 8) ctx.lineTo(i * 16 + 8 + (y % 16 ? 3 : -3), y);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd6e0';
    ctx.fillRect(0, 0, 64, 6);
  });
  knit.repeat.set(2, 2);
  const bottle = new THREE.Group();
  bottle.add(at(rbox(0.22, 0.3, 0.08, texMat(knit, { rough: 1 }), 0.04), 0, 0.15, 0));
  bottle.add(at(cyl(0.035, 0.04, 0.06, '#ef6f86', 10), 0, 0.33, 0));
  bottle.add(at(cyl(0.03, 0.03, 0.04, '#ffd166', 10), 0, 0.38, 0));
  bottle.add(at(mesh(heartGeo(0.08, 0.015), mat('#ffffff')), 0, 0.15, 0.045));
  bake(bottle);
  const bottleHome = { x: 6.25, y: 0.86, z: -3.55 };
  const restBottle = () => {
    bottle.removeFromParent();
    bottle.position.set(bottleHome.x, bottleHome.y, bottleHome.z);
    bottle.rotation.set(0, -P / 2, -0.25);
    bottle.scale.setScalar(1);
    add(bottle);
  };
  R.dyn(bottle);
  restBottle();

  // A small script runner: walk through points, wait, do things, one step after another
  const runSteps = (who, steps, dt) => {
    const s0 = steps[0];
    if (!s0) return true;
    if (s0.walk) {
      if (R.walkTo(who, s0.walk[0].x, s0.walk[0].z, dt, s0.speed || 1.9)) s0.walk.shift();
      if (!s0.walk.length) steps.shift();
    } else if (s0.wait !== undefined) {
      s0.wait -= dt;
      if (s0.wait <= 0) steps.shift();
    } else {
      steps.shift();
      s0.do?.();
    }
    return !steps.length;
  };

  function sleep(a) {
    const care = { t: 0, steps: [], bottle: Math.random() < 0.45, kiss: Math.random() < 0.4, lying: false, cover: 0 };
    st.care = care;
    st.cover = 0;
    st.roji = 0;
    st.bottle = 0;
    quilt.setK(1, true);
    const spec = R.start('sleep', {
      label: 'Wake up',
      seats: [lie('roji', -1), { who: 'homama', x: SIDE_R.x, z: SIDE_R.z, yaw: P / 2, pose: 'stand' }],
      focus: { x: BX + 1.0, z: -2.9, y: 0.9, zoom: 0.66 },
      night: 0.7,
      music: 0.35,
      exit: { x: BX - 0.4, z: -1.2 },
      update(dt) {
        care.t += dt;
        const h = a.homama;
        // He pulls the quilt up over her first
        if (care.t < 1.7) {
          h.kid.hands = 'carry';
          st.cover = easeInOut(Math.min(1, Math.max(0, (care.t - 0.3) / 1.2)));
          h.kid.body.rotation.x += 0.25 * Math.sin(Math.min(1, care.t / 1.7) * P);
          return;
        }
        if (!care.started) {
          care.started = true;
          st.cover = 1;
          h.kid.hands = null;
          a.toast(care.bottle ? 'Homama pulls the quilt up over Roji... then tiptoes off for something.' : 'Homama pulls the quilt up over Roji, nice and cosy.', 3000);
          const s = care.steps;
          if (care.kiss) {
            s.push({ walk: [{ x: SIDE_R.x, z: -3.4 }], speed: 1.2 });
            s.push({ do: () => (R.place(h, SIDE_R.x, -3.4, { yaw: P / 2 }), a.emote('homama', 'kiss'), R.later(0.8, () => a.fx.heartsAt(R.headPos(a.roji), 3))) });
            s.push({ wait: 1.7 });
          }
          if (care.bottle) {
            s.push({ walk: [{ x: SIDE_R.x, z: FOOTWAY }, { x: DRESSER.x, z: FOOTWAY }, { x: DRESSER.x, z: DRESSER.z }] });
            s.push({ do: () => R.place(h, DRESSER.x, DRESSER.z, { yaw: P / 2 }) });
            s.push({ wait: 0.4 });
            s.push({
              do: () => {
                bottle.removeFromParent();
                bottle.position.set(0, -0.12, 0.05);
                bottle.rotation.set(0, 0, 0);
                a.carry('homama', bottle);
                R.sound((s2, t0) => s2.tone(520, t0, 0.2, { type: 'sine', gain: 0.03, slideTo: 640 }));
              },
            });
            s.push({ wait: 0.5 });
            s.push({ walk: [{ x: DRESSER.x, z: FOOTWAY }, { x: SIDE_R.x, z: FOOTWAY }, { x: SIDE_R.x, z: SIDE_R.z }] });
            s.push({ do: () => R.place(h, SIDE_R.x, SIDE_R.z, { yaw: P / 2 }) });
            s.push({
              do: () => {
                a.carry('homama', null);
                bottle.position.set(BX - 0.12, MT + 0.12, LIE_Z - 0.62);
                bottle.rotation.set(-P / 2 + 0.3, 0, 0);
                add(bottle);
                const b0 = bottle.position.clone();
                R.tween(0.8, (k) => {
                  bottle.position.set(b0.x, b0.y - k * 0.1, b0.z);
                  bottle.scale.setScalar(1 - k * 0.6);
                  st.bottle = k;
                }, () => {
                  bottle.removeFromParent();
                  st.bottle = 1;
                });
                a.fx.heartsAt(a.world(BX - 0.12, LIE_Z - 0.6, 1.0), 3);
                a.toast('Homama tucks a warm hot water bottle in next to Roji. <b>Roji:</b> Mmm, so warm.', 3600);
              },
            });
            s.push({ wait: 1.2 });
          }
          s.push({ walk: [{ x: SIDE_R.x, z: FOOTWAY }, { x: SIDE_H.x, z: FOOTWAY }, { x: SIDE_H.x, z: SIDE_H.z }] });
          s.push({
            do: () => {
              a.seat('homama', lie('homama', 1));
              care.lying = true;
              a.setNight(1);
              R.light.intensity = 1.4;
              a.focus({ x: BX, z: -3.2, y: 0.9, zoom: 0.55 });
              a.toast('Sweet dreams...', 2400);
            },
          });
        }
        if (!care.lying) runSteps(h, care.steps, dt);
      },
      onEnd(silent) {
        R.cat.release();
        st.care = null;
        st.cover = 1;
        a.carry('homama', null);
        restBottle();
        R.later(0.4, () => (st.bottle = 0));
        R.rest?.();
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
  }

  // ---------------------------------------------------------------- foot rub
  const MFZ = -2.62; // Roji's feet when she lies on top of the quilt
  const RUB = [
    'Homama rubs Roji\'s tired feet, slow and gentle.',
    '<b>Roji:</b> Ahh... that is the spot.',
    '<b>Homama:</b> You were on your feet all day. Rest now, my love.',
    'Roji wiggles her toes happily.',
    '<b>Roji:</b> I feel brand new. You have magic hands.',
  ];
  const LULLABY = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 76, 74];
  function massage(a) {
    st.mass = { t: 0, line: -1, ahh: 2.2, note: 0 };
    const spec = R.start('massage', {
      label: 'All better',
      seats: [
        { who: 'roji', x: BX - 0.3, z: -2.4, y: 0.68, yaw: 0, rot: [LIE, 0.1, 0], pose: 'sleep' },
        { who: 'homama', x: BX + 0.24, z: -2.26, y: MT - 0.3, yaw: -P / 2 + 0.1, pose: 'sit', hands: 'carry' },
      ],
      focus: { x: BX - 0.1, z: -3.1, y: 0.75, zoom: 0.52 },
      night: 0.55,
      music: 0.2,
      exit: { x: BX - 0.6, z: -1.2 },
      update(dt, t) {
        const m = st.mass;
        m.t += dt;
        const r = a.roji.kid;
        const h = a.homama.kid;
        // Toes wiggle, hands rub
        r.legs[0].rotation.x += Math.sin(t * 7) * 0.12;
        r.legs[1].rotation.x += Math.sin(t * 7 + 1.8) * 0.12;
        r.legs[0].rotation.z += Math.sin(t * 5) * 0.06;
        h.arms[0].rotation.x = -1.05 + Math.sin(t * 5) * 0.16;
        h.arms[1].rotation.x = -1.05 + Math.sin(t * 5 + P) * 0.16;
        h.body.rotation.x += 0.16;
        h.head.rotation.x += 0.12;
        const n = Math.floor(m.t / 4.2);
        if (n !== m.line && n < RUB.length) {
          m.line = n;
          a.toast(RUB[n], 3600);
        }
        m.ahh -= dt;
        if (m.ahh <= 0) {
          m.ahh = 3.1;
          const k = Math.floor(m.t / 3.1) % 3;
          R.talk.say(a.roji, k === 2 ? 'hearts' : 'text', { text: k ? 'Mmm...' : 'Ahh...', dur: 2.2 });
          a.fx.heartsAt(R.headPos(a.roji), 2);
          R.sound((s, t0) => s.tone(330, t0, 0.6, { type: 'sine', gain: 0.02, slideTo: 262 }));
        }
        m.note -= dt;
        if (m.note <= 0) {
          m.note = 0.85;
          m.i = ((m.i || 0) + 1) % LULLABY.length;
          const f = 440 * Math.pow(2, (LULLABY[m.i] - 69) / 12);
          R.sound((s, t0) => s.tone(f, t0, 0.9, { type: 'sine', gain: 0.018, attack: 0.08 }));
        }
      },
      onEnd(silent) {
        st.mass = null;
        R.cat.release();
        R.talk.clear();
        R.rest?.();
        if (!silent) {
          a.toast('Roji feels so much better.', 2200);
          R.later(0.3, () => a.emote('roji', 'heart'));
        }
      },
    });
    if (!spec) return;
    R.light.position.set(BX - 1.55, 1.2, ZB + 0.6);
    R.light.color.set('#ffc98a');
    R.light.intensity = 1.8;
    R.cat.goTo('rug');
  }

  // ---------------------------------------------------------------- pillow fight
  const pillowFor = (c) => {
    const g = new THREE.Group();
    const m = mesh(pg, mat(c, { rough: 0.9 }));
    m.scale.setScalar(0.6);
    m.rotation.x = -0.2;
    g.add(m);
    g.position.set(0, 0.08, 0.06);
    return g;
  };
  const fightPillows = { roji: pillowFor('#fff0f5'), homama: pillowFor('#eef6ff') };
  function pillowFight(a) {
    st.pf = { t: 0, next: 1.0, hits: 0, turn: Math.random() < 0.5 ? 0 : 1, swing: 0, flop: false };
    const spec = R.start('pillow', {
      label: 'Stop',
      seats: [
        { who: 'roji', x: BX - 0.42, z: -3.05, y: MT, yaw: P / 2, pose: 'stand' },
        { who: 'homama', x: BX + 0.42, z: -3.05, y: MT, yaw: -P / 2, pose: 'stand' },
      ],
      focus: { x: BX, z: -3.0, y: 1.2, zoom: 0.55 },
      music: 0.7,
      exit: { x: BX - 0.4, z: -1.2 },
      update(dt, t) {
        const f = st.pf;
        f.t += dt;
        if (f.flop) return;
        const kids = [a.roji, a.homama];
        kids.forEach((k, i) => {
          const hop = Math.abs(Math.sin(t * 5.2 + i * 1.3)) * 0.22;
          R.place(k, BX + (i ? 0.42 : -0.42), -3.05, { y: MT + hop, yaw: i ? -P / 2 : P / 2 });
          if (hop < 0.02) k.kid.squash = 0.86;
        });
        // Swing!
        f.next -= dt;
        if (f.next <= 0) {
          f.next = 0.8 + Math.random() * 0.5;
          f.turn = 1 - f.turn;
          f.swing = 0.35;
          const hitter = kids[f.turn];
          const target = kids[1 - f.turn];
          target.kid.squash = 0.72;
          f.hits++;
          a.fx.burst(R.headPos(target), ['#ffffff', '#fff0f5', '#ffd6e0', '#eef6ff'], 16);
          R.sound((s, t0) => s.tone(180 + Math.random() * 60, t0, 0.12, { type: 'triangle', gain: 0.06, slideTo: 90 }));
          if (f.hits % 3 === 0) R.talk.say(hitter, 'text', { text: hitter === a.roji ? 'Got you!' : 'Haha!', dur: 1.2 });
          if (f.hits === 4) a.toast('<b>Homama:</b> Not the hair! Not the hair!', 2200);
        }
        if (f.swing > 0) {
          f.swing -= dt;
          const hp = kids[f.turn] === a.roji ? fightPillows.roji : fightPillows.homama;
          hp.rotation.x = -Math.sin((1 - f.swing / 0.35) * P) * 1.4;
        }
        if (f.t > 9) {
          f.flop = true;
          a.carry('roji', null);
          a.carry('homama', null);
          a.seat('roji', { ...lie('roji', -1), y: 0.68, z: MFZ - 0.25 });
          a.seat('homama', { ...lie('homama', 1), y: 0.68, z: MFZ - 0.25 });
          pillows.roji.visible = true;
          pillows.homama.visible = true;
          a.fx.burst(a.world(BX, -3.2, 1.4), ['#ffffff', '#ffd6e0', '#eef6ff'], 40);
          a.fx.heartsAt(a.world(BX, -3.4, 1.3), 5);
          a.toast(`They flop onto the bed, giggling. <b>${a.playerId === 'roji' ? 'Roji' : 'Homama'} wins!</b> ...probably.`, 3200);
          R.sound((s, t0) => [0, 0.14, 0.28, 0.42].forEach((d, i) => s.tone(700 - i * 60, t0 + d, 0.1, { type: 'triangle', gain: 0.04 })));
          R.later(3.2, () => R.is('pillow') && a.endActivity());
        }
      },
      onEnd() {
        st.pf = null;
        R.cat.release();
        a.carry('roji', null);
        a.carry('homama', null);
        pillows.roji.visible = true;
        pillows.homama.visible = true;
      },
    });
    if (!spec) return;
    pillows.roji.visible = false;
    pillows.homama.visible = false;
    for (const h of Object.values(fightPillows)) h.rotation.x = 0;
    a.carry('roji', fightPillows.roji);
    a.carry('homama', fightPillows.homama);
    R.cat.goTo('rug');
    a.toast('Pillow fight! Feathers everywhere!', 2200);
  }

  // ---------------------------------------------------------------- yap time on the bed
  const yap = makeYap(R, {
    sit: {
      roji: { x: BX - 0.42, z: FOOT - 0.18, y: MT - 0.33, yaw: 0.55, leanZ: -0.16 },
      homama: { x: BX + 0.42, z: FOOT - 0.18, y: MT - 0.33, yaw: -0.55, leanZ: 0.12 },
    },
    stand: {
      roji: { x: BX - 0.28, z: -1.25, yaw: P / 2 },
      homama: { x: BX + 0.28, z: -1.25, yaw: -P / 2 },
    },
    focus: { x: BX, z: -1.8, y: 1.0, zoom: 0.52 },
    exit: { x: BX - 0.6, z: -0.9 },
  });

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
    { x: BX, z: -1.2, r: 1.15, label: 'Go to sleep', icon: 'moon', act: sleep },
    { x: BX + 1.55, z: -2.2, r: 1.1, label: 'Story time in bed', icon: 'book', act: story },
    { x: CX, z: -2.95, r: 1.1, label: 'Guess: girl or boy?', icon: 'baby', act: guess },
    {
      x: BX - 1.4,
      z: -0.9,
      r: 1.05,
      label: (a) => (R.tired?.(a) ? (a.playerId === 'roji' ? 'So tired... ask for a foot rub' : 'Roji is tired: rub her feet') : a.playerId === 'roji' ? 'Ask Homama for a foot rub' : "Rub Roji's feet"),
      icon: 'heart',
      act: massage,
    },
    { x: BX + 1.5, z: -0.6, r: 1.05, label: yap.label, icon: 'chat', act: (a) => yap.begin(a) },
    { x: BX, z: 0.3, r: 1.05, label: 'Pillow fight!', icon: 'pillow', act: pillowFight },
  );

  setupGifts(R, { pillow: pillows.roji, under: { x: BX - 0.55, y: MT + 0.02, z: -4.0 }, slots, hot: { x: -0.15, z: -2.75 } });

  // ---------------------------------------------------------------- update
  R.upd((dt, t, a) => {
    const sleeping = R.is('sleep');
    const story = R.is('story');
    const kr = sleeping ? st.cover : story ? 1 : 0;
    const kh = sleeping && st.care?.lying ? 1 : 0;
    const nr = sleeping ? kr : damp(st.roji, kr, 12, dt);
    const nh = damp(st.homama, kh, 12, dt);
    const bk = st.bottle;
    if (Math.abs(nr - st.roji) > 0.002 || Math.abs(nh - st.homama) > 0.002 || Math.abs(bk - (st.bk ?? 0)) > 0.002) {
      st.roji = Math.abs(nr - kr) < 0.003 ? kr : nr;
      st.homama = Math.abs(nh - kh) < 0.003 ? kh : nh;
      st.bk = bk;
      quilt.setK(1, true);
    }
    // Pulled down to the foot until Homama tucks Roji in
    qPivot.scale.z = sleeping ? 0.42 + 0.58 * st.cover : 1;
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
      const show = (sleeping && (z.who === 'roji' || st.care?.lying)) || (story && z.who === 'roji' && st.line >= STORY.length - 1);
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
    st.cover = 1;
    st.bottle = 0;
    pillows.roji.visible = true;
    pillows.homama.visible = true;
    restBottle();
  });
}
