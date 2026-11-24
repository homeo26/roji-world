// The stadium for the 3D football match: a striped pitch inside low advert boards, two goals,
// a stand full of cheering fans, a big scoreboard, floodlights, bunting and the island around it.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, canvasTexture, FONT, rng, bakeStatic } from '../../util.js';
import * as K from '../../arena/riding/kit.js';
import { PAL, box, rbox, cyl, ball, at, pitchTexture, makeGoal, makeCornerFlag, makeScoreboard, makeBunting, makeBall } from './models.js';

// L: goal lines at x = +-L. W: touchlines at z = +-W. Goals: half width GW, height GH, depth GD.
// Boards at x = +-BX and z = +-BZ keep the ball in play.
export const A = { L: 14, W: 8.5, GW: 1.8, GH: 1.45, GD: 1.05, GDT: 0.55, BX: 15.3, BZ: 9.3 };

const ADS = [
  { text: 'Sunny Kicks', sub: 'Football club', bg: PAL.pink, fg: '#ffffff' },
  { text: 'Island Juice', sub: 'Fresh every day', bg: PAL.yellow, fg: '#7a4a26' },
  { text: 'Roji World', sub: 'Have a lovely day', bg: PAL.teal, fg: '#ffffff' },
  { text: 'Doctor Roji says', sub: 'Drink your water', bg: '#ffffff', fg: PAL.pink },
  { text: 'Homama Codes', sub: 'Apps with heart', bg: PAL.blue, fg: '#ffffff' },
  { text: 'Island Zoo', sub: 'Say hi to Jodi and Jouri', bg: '#ffb36b', fg: '#ffffff' },
];

function adAtlas() {
  return canvasTexture(1024, 512, (c, w, h) => {
    const cw = w / 2;
    const ch = h / 3;
    ADS.forEach((a, i) => {
      const x = (i % 2) * cw;
      const y = Math.floor(i / 2) * ch;
      c.fillStyle = a.bg;
      c.fillRect(x, y, cw, ch);
      c.fillStyle = a.fg;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${ch * 0.42}px ${FONT}`;
      c.fillText(a.text, x + cw / 2, y + ch * 0.4);
      c.font = `500 ${ch * 0.2}px ${FONT}`;
      c.globalAlpha = 0.85;
      c.fillText(a.sub, x + cw / 2, y + ch * 0.76);
      c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 6;
      c.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
    });
  });
}

// A plane showing ad number i of the atlas.
function adPlane(material, i, w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  const u0 = (i % 2) / 2;
  const v1 = 1 - Math.floor(i / 2) / 3;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.5, v1 - (1 - uv.getY(k)) / 3);
  return mesh(g, material, { cast: false });
}

export function buildStadium(ctx, { colors = [PAL.pink, PAL.teal] } = {}) {
  const g = new THREE.Group();
  const keep = [];
  const add = (o, x = 0, y = 0, z = 0, ry = 0) => {
    at(o, x, y, z, ry);
    g.add(o);
    return o;
  };
  const r = rng(21);
  const { L, W, GW, GH, GD, GDT, BX, BZ } = A;

  // ------------------------------------------------ lawn and pitch
  const lawn = mesh(new THREE.CircleGeometry(170, 48), mat('#9ad06a', { rough: 0.95 }), { cast: false });
  lawn.rotation.x = -Math.PI / 2;
  g.add(lawn);
  const gw = BX + 0.5;
  const gd = BZ + 0.5;
  const tex = pitchTexture({ gw, gd, hl: L, hw: W, box: { d: 3.4, hw: 4.2 }, small: { d: 1.2, hw: 2.7 }, spot: 2.6, circle: 2.3, band: 2.62, line: 0.1 });
  const pitch = mesh(new THREE.PlaneGeometry(gw * 2, gd * 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), { cast: false });
  pitch.rotation.x = -Math.PI / 2;
  add(pitch, 0, 0.01, 0);
  // a sandy running track round the boards
  const track = mesh(new THREE.PlaneGeometry(gw * 2 + 5, gd * 2 + 5), mat('#f1dcb5', { rough: 0.95 }), { cast: false });
  track.rotation.x = -Math.PI / 2;
  add(track, 0, 0.004, 0);

  // ------------------------------------------------ goals and corner flags
  const goals = [];
  for (const side of [-1, 1]) {
    const goal = makeGoal({ w: GW * 2, h: GH, dTop: GDT, dBot: GD, post: 0.065, cell: 0.32 });
    goal.group.position.set(side * L, 0, 0);
    goal.group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.add(goal.group);
    keep.push(...goal.nets);
    goals.push({ side, ...goal });
  }
  const flags = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const f = makeCornerFlag(sz > 0 ? colors[0] : colors[1], 1.15);
      add(f.group, sx * L, 0, sz * W);
      f.flag.rotation.y = sx > 0 ? Math.PI : 0;
      keep.push(f.flag);
      flags.push({ pivot: f.flag, base: f.flag.rotation.y, ph: r() * 6 });
    }
  }

  // ------------------------------------------------ advert boards
  const adMat = new THREE.MeshStandardMaterial({ map: adAtlas(), roughness: 0.7, emissive: '#ffffff', emissiveIntensity: 0.12 });
  adMat.emissiveMap = adMat.map;
  const boardMat = mat('#fff1dc', { rough: 0.8 });
  const capMat = mat(PAL.plum, { rough: 0.6 });
  const BH = 0.62;
  let ai = 0;
  const boardRun = (x0, z0, x1, z1, face) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0) - Math.PI / 2;
    const n = Math.max(1, Math.round(len / 3.6));
    const seg = len / n;
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * k;
      const z = z0 + (z1 - z0) * k;
      const b = box(seg - 0.06, BH, 0.12, boardMat);
      add(b, x, BH / 2, z, yaw);
      const cap = box(seg - 0.02, 0.06, 0.16, capMat);
      add(cap, x, BH + 0.03, z, yaw);
      const p = adPlane(adMat, ai++ % ADS.length, seg - 0.2, BH - 0.12);
      // face: which side of the board shows the advert (+1 toward the board's local +Z)
      const nx = Math.sin(yaw) * face;
      const nz = Math.cos(yaw) * face;
      add(p, x + nx * 0.065, BH / 2 + 0.01, z + nz * 0.065, face > 0 ? yaw : yaw + Math.PI);
    }
  };
  boardRun(BX, -BZ, -BX, -BZ, -1); // back: the advert faces the pitch (+Z)
  boardRun(-BX, BZ, BX, BZ, 1); // front: the advert faces the camera (+Z)
  boardRun(-BX, -BZ, -BX, -GW - 0.6, -1); // ends: the adverts face the pitch
  boardRun(-BX, GW + 0.6, -BX, BZ, -1);
  boardRun(BX, BZ, BX, GW + 0.6, -1);
  boardRun(BX, -GW - 0.6, BX, -BZ, -1);
  // behind each goal, a low net fence closes the gap
  for (const s of [-1, 1]) add(box(0.1, 0.35, GW * 2 + 1.2, boardMat), s * BX, 0.175, 0);

  // ------------------------------------------------ the stand with fans
  const tiers = 4;
  const rise = 0.5;
  const step = 1.1;
  const front = -BZ - 1.0;
  const SW = 26;
  const tierCols = ['#fbe6d2', '#f8dcc4', '#f5d2b6', '#f2c9a8'];
  const plankCols = [PAL.pink, '#f4b13d', PAL.teal, PAL.lilac];
  for (let k = 0; k < tiers; k++) {
    const z1 = front - k * step;
    const top = (k + 1) * rise;
    add(box(SW, top, step, tierCols[k], { rough: 0.85 }), 0, top / 2, z1 - step / 2);
    add(box(SW, rise - 0.05, 0.03, [PAL.rose, PAL.yellow, PAL.mint, PAL.sky][k], { rough: 0.7 }), 0, top - rise / 2, z1 + 0.012);
    add(rbox(SW - 0.4, 0.07, 0.38, plankCols[k], 0.025, { rough: 0.6 }), 0, top + 0.07, z1 - 0.3);
  }
  const backZ = front - tiers * step;
  const topH = tiers * rise;
  add(box(SW + 0.4, topH + 0.8, 0.35, '#fff1dc'), 0, (topH + 0.8) / 2, backZ - 0.17);
  add(rbox(SW + 0.6, 0.12, 0.5, PAL.pink, 0.05), 0, topH + 0.86, backZ - 0.17);
  for (const s of [-1, 1]) {
    add(box(0.35, topH + 0.8, tiers * step + 0.35, '#fff1dc'), s * (SW / 2 + 0.17), (topH + 0.8) / 2, front - (tiers * step) / 2 - 0.17);
    add(cyl(0.05, 0.05, 4.2, '#fffaf4', 8), s * (SW / 2 + 0.17), 2.1, backZ - 0.17);
    const flag = mesh(new THREE.PlaneGeometry(0.9, 0.55), mat(s < 0 ? colors[0] : colors[1], { side: THREE.DoubleSide }), { cast: false });
    add(flag, s * (SW / 2 + 0.17) + 0.47 * -s, 3.85, backZ - 0.17);
    keep.push(flag);
    flags.push({ pivot: flag, base: 0, ph: r() * 6, banner: true });
  }
  // Fans on the benches
  const fans = [];
  const kinds = ['cheer', 'wave', 'flag', 'clap', 'cheer', 'flag', 'wave'];
  const flagCols = [PAL.yellow, PAL.pink, PAL.sky, PAL.mint, PAL.rose, colors[0], colors[1]];
  let fi = 0;
  for (let k = 0; k < tiers; k++) {
    const n = 7 - (k % 2);
    for (let j = 0; j < n; j++) {
      const kid = ctx.makeKid(K.randomLook(r, fi + 3));
      const x = -SW / 2 + 1.6 + ((SW - 3.2) / (n - 1)) * j + (r() - 0.5) * 1.4;
      kid.root.position.set(x, (k + 1) * rise, front - k * step - 0.62);
      kid.root.rotation.y = (r() - 0.5) * 0.5;
      K.poseFan(kid, kinds[fi % kinds.length], flagCols[fi % flagCols.length]);
      // the crowd mesh takes plain colours only: give the hair its colour without the strand texture
      kid.root.traverse((o) => {
        if (o.isMesh && o.material.map) o.material = mat(`#${o.material.color.getHexString()}`, { rough: 0.5 });
      });
      fans.push({ kid });
      fi++;
    }
  }
  const crowd = K.makeCrowd(fans);
  g.add(crowd.mesh);
  keep.push(crowd.mesh);

  // ------------------------------------------------ scoreboard and floodlights
  const board = makeScoreboard({ w: 6.4, h: 2.3, post: topH + 1.3, title: 'SUNNY KICKS CUP' });
  add(board.group, 0, 0, backZ - 0.75);
  keep.push(board.face);
  for (const s of [-1, 1]) {
    const x = s * (BX + 3.2);
    const z = backZ + 1.2;
    add(cyl(0.16, 0.24, 8.2, '#fff1dc', 12), x, 4.1, z);
    add(rbox(2.0, 1.1, 0.5, PAL.plum, 0.1), x, 8.4, z);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const lamp = ball(0.2, '#fff6d8', { rough: 0.3, emissive: '#fff1c4', ei: 1 }, 12);
        lamp.scale.z = 0.4;
        add(lamp, x - 0.6 + i * 0.6, 8.15 + j * 0.5, z + 0.24);
      }
    }
    add(rbox(0.6, 0.1, 0.6, PAL.yellow, 0.04), x, 9.0, z);
  }
  g.add(
    makeBunting(
      [new THREE.Vector3(-BX - 3.2, 7.8, backZ + 1.2), new THREE.Vector3(-3.3, topH + 3.1, backZ - 0.6), new THREE.Vector3(3.3, topH + 3.1, backZ - 0.6), new THREE.Vector3(BX + 3.2, 7.8, backZ + 1.2)],
      { sag: 0.9, size: 0.34, spacing: 0.6 },
    ),
  );

  // ------------------------------------------------ team benches beside the stand
  for (const s of [-1, 1]) {
    const x = s * (SW / 2 + 2.6);
    const z = -BZ - 1.9;
    const col = s < 0 ? colors[0] : colors[1];
    add(box(3.2, 1.6, 0.12, '#fff1dc'), x, 0.8, z - 0.7);
    const roofGeo = new THREE.CylinderGeometry(1.65, 1.65, 1.6, 18, 1, true, -Math.PI / 2, Math.PI);
    roofGeo.rotateX(-Math.PI / 2);
    roofGeo.scale(1, 0.32, 1);
    add(mesh(roofGeo, mat(col, { side: THREE.DoubleSide, rough: 0.6 })), x, 1.6, z);
    add(rbox(2.8, 0.07, 0.42, PAL.wood, 0.02), x, 0.45, z - 0.35);
    for (const e of [-1, 1]) add(box(0.1, 1.6, 1.4, '#fff1dc'), x + e * 1.55, 0.8, z);
    for (let i = 0; i < 3; i++) add(cyl(0.05, 0.05, 0.22, [PAL.sky, PAL.yellow, PAL.mint][i], 10), x - 0.8 + i * 0.8, 0.6, z - 0.3);
  }
  // spare balls in a basket by the front corner
  const basket = new THREE.Group();
  basket.add(at(cyl(0.45, 0.35, 0.4, PAL.wood, 16), 0, 0.2, 0));
  for (const [x, y, z] of [[-0.14, 0.5, 0.05], [0.16, 0.48, -0.08], [0.0, 0.62, 0.12]]) basket.add(at(makeBall(0.2, 1), x, y, z));
  add(basket, -BX - 1.4, 0, BZ + 1.2);

  // ------------------------------------------------ the island round the stadium
  K.sky(g, { seed: 9, radius: 150, count: 12 });
  K.scatterNature(g, {
    seed: 6,
    bounds: [-70, 70, -60, 50],
    free: (x, z, kind) => {
      const out = Math.abs(x) > BX + 5.5 || z < backZ - 3 || z > BZ + 3.5;
      if (!out) return false;
      if ((kind === 'tree' || kind === 'bush') && z > BZ + 2 && z < BZ + 22 && Math.abs(x) < BX + 12) return false; // keep the camera's view open
      return true;
    },
    trees: 36,
    bushes: 40,
    flowers: 420,
    tufts: 500,
    rocks: 14,
  });

  K.bakeVC(g, keep, { emissive: 'keep' });
  bakeStatic(g, keep, mergeGeometries);
  return {
    group: g,
    goals,
    board,
    crowd,
    update(dt, t) {
      for (const f of flags) {
        if (f.banner) f.pivot.rotation.y = Math.sin(t * 2.4 + f.ph) * 0.25;
        else f.pivot.rotation.y = f.base + Math.sin(t * 2.2 + f.ph) * 0.35 + Math.sin(t * 5.3 + f.ph) * 0.08;
      }
      for (const gl of goals) gl.update(dt);
      crowd.update(dt, t);
    },
  };
}
