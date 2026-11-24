import { THREE, C, mat, umat, mesh, roundRect, fitText, uvScale, canvasTexture } from '../../places/school/kit.js';
import { seatGeos, RED, DEEP, GOLD, WINE } from './models.js';
import { byId, UNLOCK, leader, drawReel, drawFilmPoster, drawStubBoard, shortTitle } from './films/index.js';
import { Score } from './score.js';
import { createDate } from './date.js';

// The screening room: the big screen with its programme of short films, red curtains, a little stage,
// rows of red velvet seats on steps, the love seat for two, the projector, the board of ticket stubs
// and the secret film's poster. "Watch a movie" seats Roji and Homama in the love seat for a film.

const P = Math.PI;
export const SCREEN = { x: 6, y: 2.55, w: 7.2, h: 3.4 };
// Rows of seats: y is the step height, z the seat line, f the front edge of the step
export const ROWS = [0, 1, 2, 3].map((r) => ({ y: 0.24 * r, z: -1.55 + 1.5 * r, f: -2.6 + 1.5 * r }));
// The love seat: the best seats, in the middle of row three
export const LOVE = { x: 6, z: ROWS[2].z + 0.02, y: ROWS[2].y + 0.44, yaw: P };
const LEAD = 3; // seconds of film leader (3, 2, 1) before every film
const STAMPS = 'roji-weekends-stamps-v1';

// A flat decal with its own canvas, for boards that change (stubs, the secret poster).
export function livePanel(wm, hm, pw, ph, draw) {
  const tex = canvasTexture(pw, ph, draw);
  tex.anisotropy = 8;
  const m = mesh(new THREE.PlaneGeometry(wm, hm), umat('#ffffff', { rough: 0.8, map: tex }), { cast: false });
  m.userData.redraw = () => {
    const c = tex.image.getContext('2d');
    c.clearRect(0, 0, pw, ph);
    draw(c, pw, ph);
    tex.needsUpdate = true;
  };
  return m;
}

export function buildHall(R) {
  const { k, add, dyn, col, hot, upd, atlas, L, api, ictx } = R;
  const { box, rbox, cyl, sph, tor, heart, at, rot } = k;
  const ZB = L.ZB;
  const [x0, x1] = L.HALL;

  // ---------------------------------------------------------------- what they have watched
  const prog = R.prog;
  let cached = null;
  let cachedAt = -99;
  const readInfo = () => {
    let stamps = [];
    try {
      stamps = JSON.parse(localStorage.getItem(STAMPS) || '[]');
    } catch {
      stamps = [];
    }
    return { looks: ictx.looks, stamps };
  };
  // Looks and stamps for the films, read again every few seconds (the wardrobe or a stamp can change them)
  const info = () => {
    const now = performance.now() / 1000;
    if (!cached || now - cachedAt > 4) {
      cached = readInfo();
      cachedAt = now;
    }
    return cached;
  };

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
  tex.anisotropy = 4;
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
  // The board of ticket stubs from their dates, and the secret film's poster by the projector
  add(at(rbox(1.24, 1.64, 0.08, GOLD, 0.04, { metal: 0.3, rough: 0.4 }), -0.75, 1.95, ZB + 0.05));
  const stubs = livePanel(1.14, 1.54, 512, 692, (c, w, h) => drawStubBoard(c, w, h, prog.stubs()));
  add(at(stubs, -0.75, 1.95, ZB + 0.1));
  add(at(rbox(1.14, 1.54, 0.08, GOLD, 0.04, { metal: 0.3, rough: 0.4 }), 12.75, 1.95, ZB + 0.05));
  const secret = livePanel(1.0, 1.4, 256, 358, (c, w, h) => drawFilmPoster(c, w, h, byId.ourmovie, { locked: !prog.unlocked(), watched: prog.watched().size, S: info() }));
  add(at(secret, 12.75, 1.95, ZB + 0.1));
  R.boards.push(stubs, secret);

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
    for (const cx of [3.26, 8.74]) if (r !== 2) col({ type: 'box', x: cx, z: row.z, hw: 3 * 0.72, hd: 0.32, h: row.y + 0.44 });
  });
  col({ type: 'box', x: 3.26 - 0.36, z: ROWS[2].z, hw: 5 * 0.36, hd: 0.32, h: ROWS[2].y + 0.44 });
  col({ type: 'box', x: 8.74 + 0.36, z: ROWS[2].z, hw: 5 * 0.36, hd: 0.32, h: ROWS[2].y + 0.44 });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), P);
  const one = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  const seatMats = [];
  for (const [g, c] of [[geos.velvet, RED], [geos.frame, WINE], [geos.trim, GOLD]]) {
    const sm = umat(c, { rough: c === RED ? 0.9 : 0.5 });
    seatMats.push(sm);
    const im = new THREE.InstancedMesh(g, sm, spots.length);
    spots.forEach(([x, y, z], i) => im.setMatrixAt(i, m4.compose(v.set(x, y, z), q, one)));
    im.castShadow = true;
    im.receiveShadow = true;
    add(im);
  }
  // Easter egg: their initials stitched on the backs of two seats in the back row, a tiny heart between
  const back = ROWS[3];
  for (const [ch, x] of [['R', 1.46 + 2 * 0.72], ['H', 1.46 + 3 * 0.72]]) {
    const tag = atlas.panel(0.2, 0.2, 80, 80, (c, w, h) => {
      c.fillStyle = GOLD;
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 2, 0, P * 2);
      c.fill();
      c.fillStyle = WINE;
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 8, 0, P * 2);
      c.fill();
      c.fillStyle = '#ffe9a8';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, ch, w / 2, h / 2 + 3, w * 0.6, h * 0.56, 700);
    });
    add(at(tag, x, back.y + 0.8, back.z + 0.375));
  }
  add(at(heart(0.09, 0.03, mat('#ff7f9d', { rough: 0.6 })), 1.46 + 2.5 * 0.72, back.y + 0.62, back.z + 0.02)).rotation.x = -P / 2;

  // The love seat for two, with a heart on its back and its reserved card.
  // Built in the seat's own frame (front +Z, toward the screen), then turned.
  const LS = LOVE;
  const ly = ROWS[2].y;
  const ls = new THREE.Group();
  ls.position.set(LS.x, ly, LS.z);
  ls.rotation.y = LS.yaw;
  const lsAdd = (o) => (ls.add(o), o);
  lsAdd(at(rbox(1.62, 0.16, 0.56, '#ff7f9d', 0.06, { rough: 0.9 }), 0, 0.36, 0));
  lsAdd(at(rbox(1.62, 0.62, 0.16, '#ff7f9d', 0.07, { rough: 0.9 }), 0, 0.72, -0.24));
  for (const s of [-1, 1]) {
    lsAdd(at(rbox(0.12, 0.55, 0.58, '#d94f6f', 0.04), s * 0.85, 0.3, 0));
    lsAdd(at(rbox(0.16, 0.06, 0.58, GOLD, 0.02), s * 0.85, 0.6, 0));
  }
  lsAdd(at(rbox(1.5, 0.28, 0.5, '#d94f6f', 0.04), 0, 0.14, 0));
  const backHeart = lsAdd(at(heart(0.34, 0.06, mat('#ffffff', { rough: 0.7 })), 0, 0.86, -0.33));
  backHeart.rotation.y = P;
  const goldHeart = lsAdd(at(heart(0.2, 0.04, mat(GOLD, { rough: 0.4 })), 0, 0.86, -0.37));
  goldHeart.rotation.y = P;
  const card = atlas.panel(0.9, 0.28, 300, 94, (c, w, h) => {
    c.fillStyle = '#fff4e6';
    roundRect(c, 0, 0, w, h, 20);
    c.fill();
    c.fillStyle = WINE;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Reserved for R + H', w / 2, h / 2 + 2, w * 0.86, h * 0.48, 700);
  });
  lsAdd(at(card, 0, 0.55, -0.33)).rotation.y = P;
  add(ls);
  // Where each of them sits (Roji on Homama's left), and points around the seat, in the room's frame
  const seatAt = (dx, dz) => ({ x: LS.x + Math.cos(LS.yaw) * dx + Math.sin(LS.yaw) * dz, z: LS.z - Math.sin(LS.yaw) * dx + Math.cos(LS.yaw) * dz });
  col({ type: 'box', x: LS.x, z: LS.z, hw: 0.92, hd: 0.32, h: ly + 0.44 });
  const front = seatAt(0, 1.05);

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
  // The screen lights the room in the colours of the film
  const glow = new THREE.PointLight('#dff2ff', 0, 16, 1.4);
  glow.position.set(S.x, 2.4, ZB + 2.2);
  add(glow);
  const probe = document.createElement('canvas');
  probe.width = 4;
  probe.height = 2;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const glowCol = new THREE.Color('#dff2ff');
  let lum = 1;
  const sample = () => {
    pctx.drawImage(canvas, 0, 0, 4, 2);
    const d = pctx.getImageData(0, 0, 4, 2).data;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
    }
    const n = (d.length / 4) * 255;
    lum = (r + g + b) / (n * 3);
    glowCol.setRGB(r / n, g / n, b / n, THREE.SRGBColorSpace);
    const m = Math.max(glowCol.r, glowCol.g, glowCol.b, 0.05);
    glowCol.multiplyScalar(1 / m);
  };

  // The room goes dark while a film plays (only this room's own floor, wall and seats)
  const dimmers = [R.carpet, R.hallWall, ...seatMats].filter(Boolean).map((m) => [m, m.color.clone()]);
  let dimK = 0;

  // ---------------------------------------------------------------- watch a movie
  const score = new Score(api.sound);
  const focusMovie = { x: S.x, z: -1.25, y: 1.7, zoom: 0.8 };
  const focusKiss = { x: LS.x, z: LS.z - 2.3, y: 2.15, zoom: 0.62 };
  const mv = { film: null, t: 0, speed: 1, frame: -1, ci: 0, done: false, date: null, keep: {}, glowT: 0, tick: -1, run: 0 };

  function begin(a, film) {
    if (R.state.movie) return;
    R.state.movie = true;
    const run = ++mv.run;
    Object.assign(mv, { film, t: -LEAD, speed: 1, actSpeed: 1, frame: -1, ci: 0, done: false, tick: -1, keep: {} });
    a.activity({
      label: 'Leave the movie',
      seats: [
        { who: 'roji', ...seatAt(0.42, 0.02), y: LS.y - 0.15, yaw: LS.yaw, pose: 'sit' },
        { who: 'homama', ...seatAt(-0.42, 0.02), y: LS.y - 0.15, yaw: LS.yaw, pose: 'sit' },
      ],
      focus: focusMovie,
      music: 0,
      night: film.night ?? 0.74,
      exit: { x: S.x - 0.4, z: -2.3 },
      onEnd: (silent) => finish(a, silent),
    });
    // One big bucket to share, in Homama's hands; anything else they were holding waits for later
    for (const id of ['roji', 'homama']) {
      const c = a[id].kid.carried;
      if (c && !c.userData?.cinemaPopcorn) mv.keep[id] = c;
      if (c) a.carry(a[id], null);
    }
    mv.date = createDate({ api: a, parent: R.g, score, focusMovie, focusKiss, onToss: () => a.sound.ui('pop') });
    R.popcorn().then((obj) => {
      if (mv.run !== run || !R.state.movie) return;
      R.g.add(obj);
      mv.bucket = obj;
      if (mv.date) mv.date.bucket = obj;
    });
    score.start(film, info());
    window.__cinema = {
      speed: (k) => (mv.speed = k),
      actSpeed: (k) => (mv.actSpeed = k),
      seek: (t) => ((mv.t = t), (mv.ci = film.cues.findIndex((c) => c[0] >= t) >>> 0)),
      cue: (kind, arg) => mv.date?.cue([kind, arg]),
      state: () => ({ film: film.id, t: +mv.t.toFixed(2), done: mv.done }),
    };
    a.toast(`Lights down. ${shortTitle(film)} is starting.`, 2400);
  }

  function finish(a, silent) {
    R.state.movie = false;
    score.stop();
    mv.date?.dispose();
    mv.date = null;
    mv.bucket?.removeFromParent();
    mv.bucket = null;
    for (const id of ['roji', 'homama']) {
      if (a[id].kid.carried?.userData?.cinemaPopcorn) a.carry(a[id], null);
      if (mv.keep[id]) a.carry(a[id], mv.keep[id]);
    }
    mv.keep = {};
    delete window.__cinema;
    const film = mv.film;
    mv.film = null;
    mv.frame = -1;
    if (!film || silent) return;
    if (!mv.done) return a.toast('We can finish it another night.', 2200);
    const fresh = prog.finished(film.id);
    R.justWatched = true;
    const lines = [
      `What a film! Homama saved the last piece of popcorn for Roji.`,
      `The lights come up. ${a.playerId === 'roji' ? 'Homama' : 'Roji'} is still holding your hand.`,
      `A ticket stub for ${shortTitle(film)} goes up on the board.`,
    ];
    a.toast(fresh ? `The secret film is on the programme now: ${byId.ourmovie.title}.` : lines[prog.stubs().length % lines.length], 3400);
    for (const b of R.boards) b.userData.redraw();
  }

  async function watch(a) {
    if (R.state.movie) return;
    let id = R.ticket;
    if (!id) {
      id = await a.choose(prog.menu('Watch a movie', 'Which film tonight?'));
      if (!id) return;
      if (id === 'locked') return a.toast(`The secret film opens after ${UNLOCK} films. ${UNLOCK - prog.watched().size} to go.`, 2600);
    }
    R.ticket = null;
    if (byId[id]) begin(a, byId[id]);
  }
  hot({ x: front.x, z: front.z, r: 1.3, icon: 'cinema', label: () => (R.ticket ? `Watch ${shortTitle(byId[R.ticket])}` : 'Watch a movie'), act: watch });

  upd((dt, t, a) => {
    const film = R.state.movie ? mv.film : null;
    const on = !!film;
    if (on) {
      mv.t += dt * mv.speed;
      // Film leader: projector clicks and a pip on every number
      if (mv.t < 0) {
        const tick = Math.floor((mv.t + LEAD) * 4);
        if (tick !== mv.tick && a.sound.ctx && score.bus) {
          mv.tick = tick;
          score.sfx('click', a.sound.ctx.currentTime);
          if (tick % 4 === 0) score.note('pluck', 880, a.sound.ctx.currentTime, 0.25, 0.05);
        }
      }
      score.update(mv.t, mv.speed !== 1);
      while (mv.ci < film.cues.length && film.cues[mv.ci][0] <= mv.t) {
        const [, kind, arg] = film.cues[mv.ci++];
        if (mv.speed <= 8 || kind === 'rest') mv.date?.cue([kind, arg]);
      }
      mv.date?.update(dt * mv.actSpeed, mv.t);
      const f = Math.floor(mv.t * 24);
      if (f !== mv.frame) {
        mv.frame = f;
        if (mv.t < 0) leader(cctx, cw, ch, mv.t + LEAD);
        else film.draw(cctx, cw, ch, Math.min(mv.t, film.len - 0.01), info());
        tex.needsUpdate = true;
      }
      mv.glowT -= dt;
      if (mv.glowT <= 0) {
        mv.glowT = 0.18;
        sample();
      }
      if (mv.t >= film.len + 0.4 && !mv.done) {
        mv.done = true;
        a.endActivity();
      }
    } else {
      const f = Math.floor(t * 12);
      if (f !== mv.frame) {
        mv.frame = f;
        drawReel(cctx, cw, ch, t, prog.open(), info());
        tex.needsUpdate = true;
      }
    }
    const dimTo = on && R.state.movie ? ((film.night ?? 0) > 0.8 ? 0.62 : 0.5) : 0;
    if (Math.abs(dimTo - dimK) > 0.002) {
      dimK += (dimTo - dimK) * (1 - Math.exp(-2.5 * dt));
      for (const [m, c] of dimmers) m.color.copy(c).multiplyScalar(1 - dimK);
    }
    beam.visible = on && R.state.movie;
    beam.material.opacity = 0.06 + Math.sin(t * 9) * 0.008;
    lampMat.emissiveIntensity = beam.visible ? 0.15 : 1.1;
    glow.color.copy(glowCol);
    glow.intensity = beam.visible ? (3 + lum * 9) * (1 + Math.sin(t * 7) * 0.05) : 0;
    if (beam.visible) for (const r of reels) r.rotateX(dt * 3);
  });
  R.onExit(() => {
    score.stop();
    delete window.__cinema;
  });
}
