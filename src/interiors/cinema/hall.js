import { THREE, C, mat, umat, mesh, roundRect, fitText, uvScale } from '../../places/school/kit.js';
import { seatGeos, drawPoster, RED, DEEP, GOLD, WINE } from './models.js';
import { drawCartoon } from './cartoon.js';

// The screening room: the big screen playing "Moon Bunny", red curtains, a little stage,
// rows of red velvet seats on steps, a love seat for two and the projector at the back.

const P = Math.PI;
export const SCREEN = { x: 6, y: 2.55, w: 7.2, h: 3.4 };
// Rows of seats: y is the step height, z the seat line, f the front edge of the step
export const ROWS = [0, 1, 2, 3].map((r) => ({ y: 0.24 * r, z: -1.55 + 1.5 * r, f: -2.6 + 1.5 * r }));
export const LOVE = { x: 6, z: ROWS[2].z + 0.02, y: ROWS[2].y + 0.44 };

export function buildHall(R) {
  const { k, add, dyn, col, hot, upd, atlas, L } = R;
  const { box, rbox, cyl, sph, tor, heart, at, rot } = k;
  const ZB = L.ZB;
  const [x0, x1] = L.HALL;
  const name = (a) => (a.playerId === 'roji' ? 'Roji' : 'Homama');
  const other = (a) => (a.playerId === 'roji' ? 'Homama' : 'Roji');

  // ---------------------------------------------------------------- screen, frame, curtains and stage
  const S = SCREEN;
  add(at(rbox(S.w + 0.5, S.h + 0.5, 0.1, GOLD, 0.06, { metal: 0.3, rough: 0.4 }), S.x, S.y, ZB + 0.05));
  add(at(rbox(S.w + 0.22, S.h + 0.22, 0.06, '#2a1a24', 0.03), S.x, S.y, ZB + 0.1));
  const cw = 640;
  const ch = 302;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const cctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  drawCartoon(cctx, cw, ch, 0);
  const screen = mesh(new THREE.PlaneGeometry(S.w, S.h), new THREE.MeshBasicMaterial({ map: tex }), { cast: false, receive: false });
  add(dyn(at(screen, S.x, S.y, ZB + 0.14)));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const c = cyl(0.17, 0.19, 4.25, i % 2 ? DEEP : RED, 12, { rough: 0.9 });
      add(at(c, S.x + s * (S.w / 2 + 0.25 + i * 0.22), 2.43, ZB + 0.32 + (i % 2) * 0.07));
    }
    const tie = rot(tor(0.5, 0.05, GOLD, P * 2, undefined, 20, 6), P / 2, 0, 0);
    tie.scale.set(1, 0.4, 1);
    add(at(tie, S.x + s * (S.w / 2 + 0.7), 1.7, ZB + 0.38));
    add(at(sph(0.09, GOLD, undefined, 10), S.x + s * (S.w / 2 + 0.25), 1.5, ZB + 0.62));
  }
  add(at(rbox(S.w + 2.6, 0.5, 0.3, RED, 0.06, { rough: 0.9 }), S.x, 4.6, ZB + 0.36));
  for (let i = 0; i < 14; i++) {
    const x = S.x - (S.w + 2.4) / 2 + ((S.w + 2.4) / 14) * (i + 0.5);
    add(at(rot(cyl(0.32, 0.32, 0.12, i % 2 ? DEEP : RED, 14, { rough: 0.9 }), P / 2, 0, 0), x, 4.35, ZB + 0.42));
    add(at(sph(0.05, GOLD, undefined, 8), x, 4.0, ZB + 0.48));
  }
  add(at(box(S.w + 2.62, 0.06, 0.32, GOLD), S.x, 4.86, ZB + 0.36));
  // Stage with footlights (bulbs are drawn by the marquee mesh)
  add(at(rbox(8.4, 0.35, 0.95, '#8a4a3a', 0.04), S.x, 0.175, ZB + 0.55));
  add(at(box(8.42, 0.05, 0.05, GOLD), S.x, 0.33, ZB + 1.03));
  for (let x = S.x - 3.9; x <= S.x + 3.91; x += 0.4) R.bulbs.push([x, 0.2, ZB + 1.05]);
  col({ type: 'box', x: S.x, z: ZB + 0.55, hw: 4.2, hd: 0.48, h: 0.35 });
  // Wall lamps that dim for the movie
  const lampMat = umat('#fff1c9', { emissive: '#ffc977', ei: 1.1, rough: 0.6 });
  for (const x of [0.4, 11.6, -1.9, 13.9]) {
    add(at(rbox(0.36, 0.5, 0.06, GOLD, 0.03), x, 2.9, ZB + 0.04));
    const shade = mesh(new THREE.SphereGeometry(0.22, 14, 8, 0, P * 2, 0, P / 2), lampMat);
    shade.rotation.x = P;
    add(at(shade, x, 3.1, ZB + 0.18));
  }
  // Posters by the side walls
  for (const [id, x] of [['cupcake', -0.75], ['twostars', 12.75]]) {
    add(at(rbox(1.14, 1.54, 0.08, GOLD, 0.04, { metal: 0.3, rough: 0.4 }), x, 1.95, ZB + 0.05));
    add(at(atlas.panel(1.0, 1.4, 256, 358, (c, w, h) => drawPoster(c, w, h, id)), x, 1.95, ZB + 0.1));
  }

  // ---------------------------------------------------------------- steps
  for (let r = 1; r < 4; r++) {
    const { y, f } = ROWS[r];
    const z1 = r < 3 ? f + 1.5 : L.ZF;
    const g = new THREE.BoxGeometry(x1 - x0, y, z1 - f);
    uvScale(g, (x1 - x0) / 1.2, (z1 - f) / 1.2);
    add(at(mesh(g, R.carpet), (x0 + x1) / 2, y / 2, (f + z1) / 2));
    add(at(box(x1 - x0, 0.2, 0.03, WINE), (x0 + x1) / 2, y - 0.12, f - 0.005));
    add(at(box(x1 - x0, 0.03, 0.06, GOLD), (x0 + x1) / 2, y, f + 0.02));
    for (const x of [-2.2, -0.6, 12.6, 14.2]) add(at(sph(0.035, mat('#fff2c2', { emissive: '#ffd27a', ei: 1.4 }), undefined, 8), x, y - 0.12, f - 0.03));
    col({ type: 'box', x: (x0 + x1) / 2, z: (f + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - f) / 2, h: y });
  }

  // ---------------------------------------------------------------- seats
  const geos = seatGeos(k);
  const spots = [];
  ROWS.forEach((row, r) => {
    for (let i = 0; i < 6; i++) {
      for (const [bx, skip] of [[1.46, r === 2 && i === 5], [6.94, r === 2 && i === 0]]) if (!skip) spots.push([bx + i * 0.72, row.y, row.z]);
    }
    for (const [cx, n] of [[3.26, 6], [8.74, 6]]) {
      const w = n * 0.72;
      if (r === 2) continue;
      col({ type: 'box', x: cx, z: row.z, hw: w / 2, hd: 0.32, h: row.y + 0.44 });
    }
  });
  col({ type: 'box', x: 3.26 - 0.36, z: ROWS[2].z, hw: 5 * 0.36, hd: 0.32, h: ROWS[2].y + 0.44 });
  col({ type: 'box', x: 8.74 + 0.36, z: ROWS[2].z, hw: 5 * 0.36, hd: 0.32, h: ROWS[2].y + 0.44 });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), P);
  const one = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  for (const [g, c] of [[geos.velvet, RED], [geos.frame, WINE], [geos.trim, GOLD]]) {
    const im = new THREE.InstancedMesh(g, mat(c, { rough: c === RED ? 0.9 : 0.5 }), spots.length);
    spots.forEach(([x, y, z], i) => im.setMatrixAt(i, m4.compose(v.set(x, y, z), q, one)));
    im.castShadow = true;
    im.receiveShadow = true;
    add(im);
  }
  // The love seat for two, with a heart on its back and a little reserved card
  const LS = LOVE;
  const ly = ROWS[2].y;
  add(at(rbox(1.62, 0.16, 0.56, '#ff7f9d', 0.06, { rough: 0.9 }), LS.x, ly + 0.36, LS.z));
  add(at(rbox(1.62, 0.62, 0.16, '#ff7f9d', 0.07, { rough: 0.9 }), LS.x, ly + 0.72, LS.z + 0.24));
  for (const s of [-1, 1]) {
    add(at(rbox(0.12, 0.55, 0.58, '#d94f6f', 0.04), LS.x + s * 0.85, ly + 0.3, LS.z));
    add(at(rbox(0.16, 0.06, 0.58, GOLD, 0.02), LS.x + s * 0.85, ly + 0.6, LS.z));
  }
  add(at(rbox(1.5, 0.28, 0.5, '#d94f6f', 0.04), LS.x, ly + 0.14, LS.z));
  const bigHeart = heart(0.62, 0.12, mat('#ff7f9d', { rough: 0.85 }));
  add(at(bigHeart, LS.x, ly + 1.1, LS.z + 0.27));
  add(at(heart(0.3, 0.05, mat(GOLD, { rough: 0.4 })), LS.x, ly + 1.1, LS.z + 0.35));
  const card = atlas.panel(0.9, 0.28, 300, 94, (c, w, h) => {
    c.fillStyle = '#fff4e6';
    roundRect(c, 0, 0, w, h, 20);
    c.fill();
    c.fillStyle = WINE;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Reserved for two', w / 2, h / 2 + 2, w * 0.86, h * 0.5, 700);
  });
  add(at(card, LS.x, ly + 0.66, LS.z + 0.33));
  col({ type: 'box', x: LS.x, z: LS.z, hw: 0.92, hd: 0.32, h: ly + 0.44 });

  // ---------------------------------------------------------------- projector at the back with its light beam
  const PJ = { x: 13.5, z: 3.95, y: ROWS[3].y };
  add(at(rbox(0.8, 0.62, 0.6, WINE, 0.04), PJ.x, PJ.y + 0.31, PJ.z));
  add(at(rbox(0.88, 0.05, 0.68, GOLD, 0.02), PJ.x, PJ.y + 0.64, PJ.z));
  const proj = new THREE.Group();
  proj.position.set(PJ.x, PJ.y + 0.66, PJ.z);
  proj.rotation.y = Math.atan2(S.x - PJ.x, ZB - PJ.z);
  proj.add(at(rbox(0.36, 0.3, 0.56, C.ink, 0.05), 0, 0.15, 0));
  const lens = rot(cyl(0.08, 0.1, 0.16, '#5a4a6a', 14), P / 2, 0, 0);
  proj.add(at(lens, 0, 0.15, 0.34));
  proj.add(at(rot(cyl(0.065, 0.065, 0.01, '#fff6c8', 14), P / 2, 0, 0), 0, 0.15, 0.43)).material = mat('#fff6c8', { emissive: '#ffe680', ei: 1.0 });
  add(proj);
  col({ type: 'box', x: PJ.x, z: PJ.z, hw: 0.42, hd: 0.32, h: PJ.y + 0.64 });
  const reels = [];
  const fwd = new THREE.Vector3(Math.sin(proj.rotation.y), 0, Math.cos(proj.rotation.y));
  for (const d of [-0.15, 0.17]) {
    const reel = new THREE.Group();
    reel.add(rot(cyl(0.2, 0.2, 0.04, C.steel, 18, { metal: 0.4, rough: 0.35 }), 0, 0, P / 2));
    for (let i = 0; i < 3; i++) reel.add(rot(box(0.05, 0.3, 0.04, C.ink), (i * P) / 3, 0, 0));
    reel.position.set(PJ.x, PJ.y + 1.05, PJ.z).addScaledVector(fwd, d);
    reel.rotation.y = proj.rotation.y;
    add(dyn(reel));
    reels.push(reel);
  }
  const lensPos = new THREE.Vector3(PJ.x, PJ.y + 0.81, PJ.z).add(new THREE.Vector3(Math.sin(proj.rotation.y) * 0.43, 0, Math.cos(proj.rotation.y) * 0.43));
  const target = new THREE.Vector3(S.x, S.y, ZB + 0.15);
  const len = lensPos.distanceTo(target);
  const beamGeo = new THREE.CylinderGeometry(0.05, 2.0, len, 24, 1, true);
  beamGeo.translate(0, -len / 2, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.copy(lensPos);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(lensPos).normalize());
  beam.visible = false;
  beam.renderOrder = 3;
  add(dyn(beam));
  // Screen glow on the room during the movie
  const glow = new THREE.PointLight('#dff2ff', 0, 16, 1.4);
  glow.position.set(S.x, 2.4, ZB + 2.2);
  add(glow);

  // ---------------------------------------------------------------- watch a movie
  const mv = { t: 0, frame: -1, hearts: 0, cartoon: 0 };
  function watch(a) {
    if (R.state.movie) return;
    R.state.movie = true;
    mv.hearts = 0;
    mv.cartoon = 0;
    a.activity({
      label: 'Leave the movie',
      seats: [
        { who: 'player', x: LS.x - 0.38, z: LS.z, y: LS.y - 0.15, yaw: P, pose: 'sit' },
        { who: 'partner', x: LS.x + 0.38, z: LS.z, y: LS.y - 0.15, yaw: P, pose: 'sit' },
      ],
      focus: { x: S.x, z: -1.4, y: 1.75, zoom: 0.84 },
      music: 0.15,
      exit: { x: S.x - 0.4, z: -2.25 },
      update: (dt) => {
        mv.hearts += dt;
        if (mv.hearts > 4.5) {
          mv.hearts = 0;
          a.fx.heartsAt(a.world(LS.x, LS.z, LS.y + 1.25), 3);
        }
      },
      onEnd: (silent) => {
        R.state.movie = false;
        a.setNight(0);
        for (const actor of [a.player, a.partner]) if (R.isOurs(actor)) a.carry(actor, null);
        if (!silent) a.toast('What a lovely movie! Every last piece of popcorn is gone.', 2800);
      },
    });
    a.setNight(0.7);
    for (const actor of [a.player, a.partner]) {
      if (R.isOurs(actor)) actor.kid.hands = 'carry';
      else if (!actor.kid.carried) R.popcorn().then((obj) => R.state.movie && !actor.kid.carried && a.carry(actor, obj));
    }
    a.toast(`Lights down! ${name(a)} and ${other(a)} snuggle into the love seat for Moon Bunny.`, 3200);
  }
  hot({ x: LS.x, z: ROWS[2].f + 0.35, r: 1.4, icon: 'cinema', label: 'Watch a movie', act: watch });

  upd((dt, t) => {
    mv.cartoon += dt;
    const f = Math.floor(mv.cartoon * 15);
    if (f !== mv.frame) {
      mv.frame = f;
      drawCartoon(cctx, cw, ch, mv.cartoon);
      tex.needsUpdate = true;
    }
    const on = R.state.movie;
    beam.visible = on;
    beam.material.opacity = 0.06 + Math.sin(t * 9) * 0.008;
    lampMat.emissiveIntensity = on ? 0.2 : 1.1;
    const scene = (mv.cartoon % 30) / 10;
    glow.color.set(scene < 1 ? '#dff2ff' : scene < 2 ? '#ffd9c8' : '#b9a8ff');
    glow.intensity = on ? 7 + Math.sin(t * 7) * 0.8 + Math.sin(t * 2.3) * 0.6 : 0;
    if (on) for (const r of reels) r.rotateX(dt * 3);
  });
}
