import { THREE, mat, umat, mesh, canvasTexture, heartPath, fitText, boardDraw, roundRect, FONT, COL, makeMask, makeFoil } from './kit.js';
import { L } from './layout.js';
import { Board } from './bout.js';

// The hall: three pistes with their scoreboards, the stand for watchers, the armoury, the trophy wall with the
// "Best partner: Roji" cup, the photo corner, the lesson mat and a practice target.

const P = Math.PI;

function pisteTexture(heart) {
  return canvasTexture(1024, 128, (c, w, h) => {
    c.fillStyle = '#c9d4e6';
    c.fillRect(0, 0, w, h);
    // a brushed-metal sheen
    for (let i = 0; i < 60; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(90,110,150,0.06)';
      c.fillRect(0, (i * h) / 60, w, 1);
    }
    c.fillStyle = '#aebcd6';
    c.fillRect(0, 0, w * 0.12, h);
    c.fillRect(w * 0.88, 0, w * 0.12, h);
    c.fillStyle = '#ffffff';
    const g = L.GUARD / L.PISTE.len;
    for (const x of [0.5, 0.5 - g, 0.5 + g]) c.fillRect(w * x - 3, 10, 6, h - 20);
    c.fillRect(w * 0.012, 6, 6, h - 12);
    c.fillRect(w * 0.988 - 6, 6, 6, h - 12);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.strokeRect(4, 4, w - 8, h - 8);
    if (heart) {
      // scratched into the end line: a little heart and R+H
      c.strokeStyle = 'rgba(70,80,110,0.7)';
      c.lineWidth = 2;
      heartPath(c, w * 0.988 - 22, h * 0.32, 22);
      c.stroke();
      c.fillStyle = 'rgba(70,80,110,0.7)';
      c.font = `600 13px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('R+H', w * 0.988 - 22, h * 0.68);
    }
  });
}

// A trophy cup: a lathe body, two handles, a base
function cup(k, h, color, { heart = false } = {}) {
  const g = new THREE.Group();
  const m = mat(color, { rough: 0.3, metal: 0.6 });
  const s = h / 0.5;
  const pts = [[0.0, 0], [0.12, 0], [0.12, 0.04], [0.05, 0.06], [0.03, 0.16], [0.05, 0.2], [0.14, 0.28], [0.15, 0.42], [0.16, 0.48], [0.0, 0.47]].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  g.add(mesh(new THREE.LatheGeometry(pts, 14), m, { cast: h > 0.3 }));
  for (const sd of [-1, 1]) {
    const hd = mesh(new THREE.TorusGeometry(0.07 * s, 0.012 * s, 5, 10, P), m, { cast: false });
    hd.rotation.z = (sd * P) / 2;
    hd.position.set(sd * 0.15 * s, 0.36 * s, 0);
    g.add(hd);
  }
  if (heart) g.add(k.at(k.heart(0.12 * s, 0.03 * s, COL.pink), 0, 0.56 * s, 0));
  return g;
}

export function buildHall(R) {
  const { k, add, atlas, api } = R;
  const { box, rbox, cyl, sph, tor, cone, at, rot } = k;
  const { LX, X1, ZB, ZF, HH, PISTE, BOARD_X, STAND, TROPHY, ARMOURY, MAT } = L;
  const wood = mat(COL.wood, { rough: 0.8 });
  const woodDark = mat(COL.woodDark, { rough: 0.75 });
  const goldM = mat(COL.gold, { rough: 0.3, metal: 0.6 });
  const steel = mat(COL.steel, { rough: 0.25, metal: 0.7 });

  // ---------------------------------------------------------------- three pistes
  const texA = pisteTexture(false);
  const texB = pisteTexture(true);
  const mA = umat('#ffffff', { rough: 0.6, map: texA });
  const mB = umat('#ffffff', { rough: 0.6, map: texB });
  for (const [id, z] of Object.entries(PISTE.z)) {
    add(at(box(PISTE.len + 0.12, PISTE.y, PISTE.w + 0.12, '#93a3c2'), PISTE.x, PISTE.y / 2, z)).castShadow = false;
    const top = add(at(mesh(new THREE.PlaneGeometry(PISTE.len, PISTE.w), id === 'b' ? mB : mA, { cast: false }), PISTE.x, PISTE.y + 0.003, z));
    top.rotation.x = -P / 2;
    R.box(PISTE.x, z, PISTE.len / 2 + 0.06, PISTE.w / 2 + 0.06, PISTE.y);
  }

  // ---------------------------------------------------------------- scoreboards (one lamp mesh for all six lamps)
  const lampMesh = new THREE.InstancedMesh(k.geo('lamp', () => new THREE.SphereGeometry(0.08, 12, 8, 0, P * 2, 0, P / 2)), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 6);
  add(R.dyn(lampMesh));
  const lamps = {
    set(i, color) {
      lampMesh.setColorAt(i, color);
      lampMesh.instanceColor.needsUpdate = true;
    },
  };
  const m4 = new THREE.Matrix4();
  R.boards = {};
  const labels = { a: 'PISTE A', b: 'PRACTICE', c: 'DUEL' };
  Object.entries(PISTE.z).forEach(([id, z], i) => {
    const board = new Board(labels[id], lamps, i);
    R.boards[id] = board;
    const bz = z - 0.05;
    const ry = 0.42;
    add(at(cyl(0.22, 0.26, 0.05, COL.navy, 12), BOARD_X, 0.025, bz));
    add(at(cyl(0.035, 0.035, 1.25, COL.steel, 8), BOARD_X, 0.63, bz));
    const grp = new THREE.Group();
    grp.add(at(rbox(0.92, 0.56, 0.1, COL.navy, 0.04), 0, 0, 0));
    const screen = mesh(new THREE.PlaneGeometry(0.8, 0.4), board.material, { cast: false });
    grp.add(at(screen, 0, -0.02, 0.052));
    grp.position.set(BOARD_X, 1.48, bz);
    grp.rotation.y = ry;
    add(grp);
    R.dyn(screen);
    for (const s of [0, 1]) {
      const lx = s ? 0.3 : -0.3;
      const ly = 0.28;
      lampMesh.setMatrixAt(i * 2 + s, m4.makeTranslation(BOARD_X + lx * Math.cos(ry), 1.48 + ly, bz - lx * Math.sin(ry)));
    }
    board.update(0);
    R.circle(BOARD_X, bz, 0.28);
    R.upd((dt) => board.update(dt));
  });
  lampMesh.instanceMatrix.needsUpdate = true;

  // ---------------------------------------------------------------- the stand for watchers
  {
    const { x0, x1, front, tiers, depth } = STAND;
    const cx = (x0 + x1) / 2;
    const wdt = x1 - x0;
    tiers.forEach((h, i) => {
      const z0 = front - (i + 1) * depth;
      const z1 = front - i * depth;
      const zz0 = i === tiers.length - 1 ? ZB : z0;
      add(at(box(wdt, h, z1 - zz0, i % 2 ? '#c99567' : '#d8a774'), cx, h / 2, (zz0 + z1) / 2));
      add(at(box(wdt, 0.04, 0.05, COL.white), cx, h - 0.02, z1 - 0.02));
      // cushions in the club's colours
      for (let s = 0; s < 6; s++) add(at(rbox(1.0, 0.06, 0.38, s % 2 ? COL.sky : COL.rose, 0.025), x0 + 0.6 + s * 1.2, h + 0.03, z1 - 0.26));
      R.box(cx, (zz0 + z1) / 2, wdt / 2, (z1 - zz0) / 2, h);
    });
    for (const x of [x0 - 0.06, x1 + 0.06]) {
      add(at(box(0.12, 0.95, ZB - front > 0 ? 0 : front - ZB, COL.navy), x, 0.475, (front + ZB) / 2));
      add(at(box(0.14, 0.06, front - ZB, COL.gold), x, 0.97, (front + ZB) / 2));
    }
    R.box(x0 - 0.06, (front + ZB) / 2, 0.08, (front - ZB) / 2);
    R.box(x1 + 0.06, (front + ZB) / 2, 0.08, (front - ZB) / 2);
  }

  // ---------------------------------------------------------------- tall arched windows above the stand, the club banner, sconces
  {
    const archShape = (w, h) => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2, 0);
      s.lineTo(w / 2, 0);
      s.lineTo(w / 2, h);
      s.absarc(0, h, w / 2, 0, P, false);
      s.lineTo(-w / 2, 0);
      return s;
    };
    const sg = new THREE.ShapeGeometry(archShape(1.1, 1.3), 10);
    sg.computeBoundingBox();
    const bb = sg.boundingBox;
    const uv = sg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (sg.attributes.position.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (sg.attributes.position.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
    for (const x of [0.9, 3.6, 6.3]) {
      add(at(mesh(sg, R.sky.material, { cast: false }), x, 1.95, ZB + 0.012));
      for (const s of [-1, 1]) add(at(box(0.08, 1.35, 0.08, COL.white), x + s * 0.58, 1.95 + 0.67, ZB + 0.04));
      add(at(tor(0.58, 0.045, COL.white, P, undefined, 16, 6), x, 3.25, ZB + 0.04));
      add(at(box(0.04, 1.85, 0.04, COL.white), x, 1.95 + 0.92, ZB + 0.03));
      add(at(box(1.1, 0.04, 0.04, COL.white), x, 1.95 + 0.85, ZB + 0.03));
      add(at(rbox(1.3, 0.08, 0.16, COL.white, 0.02), x, 1.92, ZB + 0.08));
    }
    add(at(atlas.panel(8.6, 0.42, 1032, 50, (c, w, h) => {
      c.fillStyle = COL.navy;
      roundRect(c, 0, 0, w, h, 14);
      c.fill();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Roji & Homama Fencing Club', w / 2, h / 2 + 2, w * 0.8, 32, 700);
      c.fillStyle = COL.pink;
      heartPath(c, 40, h / 2, 22);
      c.fill();
      heartPath(c, w - 40, h / 2, 22);
      c.fill();
    }), 3.6, 4.0, ZB + 0.02));
    // pennants in pink, white and blue along the top of the back wall
    const flagG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.12, 0, 0), new THREE.Vector3(0.12, 0, 0), new THREE.Vector3(0, -0.26, 0)]);
    flagG.computeVertexNormals();
    const fl = [COL.pink, '#ffffff', COL.blue, COL.gold];
    for (let i = 0; i < 26; i++) {
      const x = LX + 0.5 + i * 0.7;
      if (x > -0.9 && x < 8.1) continue;
      add(at(mesh(flagG, mat(fl[i % 4], { rough: 0.8, side: THREE.DoubleSide }), { cast: false }), x, 4.25, ZB + 0.06));
    }
    // wall sconces between the windows
    for (const x of [-0.6, 2.25, 4.95, 7.8]) {
      add(at(box(0.08, 0.3, 0.06, COL.gold), x, 2.75, ZB + 0.03));
      const s = add(at(mesh(k.geo('sconce', () => new THREE.SphereGeometry(0.13, 12, 8, 0, P * 2, 0, P / 2)), mat('#fff3cf', { emissive: '#ffd27a', ei: 0.9, rough: 0.4 }), { cast: false }), x, 2.9, ZB + 0.1));
      s.rotation.x = P;
    }
  }

  // ---------------------------------------------------------------- the armoury on the back wall
  {
    const { x0, x1 } = ARMOURY;
    const cx = (x0 + x1) / 2;
    add(at(rbox(x1 - x0, 2.3, 0.08, '#b98457', 0.03), cx, 1.55, ZB + 0.05));
    add(at(atlas.panel(1.5, 0.3, 240, 48, boardDraw(['Armoury'], { edge: COL.gold, ink: COL.navy })), cx, 2.92, ZB + 0.1));
    // masks on pegs along the top
    for (let i = 0; i < 6; i++) {
      const x = x0 + 0.4 + i * ((x1 - x0 - 0.8) / 5);
      add(at(rot(cyl(0.015, 0.015, 0.14, woodDark, 5), P / 2, 0, 0), x, 2.42, ZB + 0.14));
      const m = makeMask([COL.pink, COL.blue, COL.gold, COL.green, COL.red, COL.blue][i], { light: true });
      m.scale.setScalar(0.6);
      add(at(m, x, 2.2, ZB + 0.27));
    }
    // foils, épées and sabres standing in a rack
    add(at(box(x1 - x0 - 0.2, 0.08, 0.3, woodDark), cx, 0.42, ZB + 0.24));
    add(at(box(x1 - x0 - 0.2, 0.05, 0.08, woodDark), cx, 1.55, ZB + 0.15));
    for (let i = 0; i < 14; i++) {
      const x = x0 + 0.3 + i * ((x1 - x0 - 0.6) / 13);
      const kind = i % 3;
      const z = ZB + 0.24;
      add(at(cyl(0.006, 0.01, 1.0, steel, 4), x, 0.95, z));
      if (kind === 0) add(at(rot(sph(0.055, steel, undefined, 8), 0, 0, 0), x, 1.48, z)).scale.set(1, 0.4, 1);
      else if (kind === 1) add(at(rot(sph(0.09, steel, undefined, 8), 0, 0, 0), x, 1.48, z)).scale.set(1, 0.45, 1);
      else add(at(rot(tor(0.07, 0.01, goldM, P, undefined, 8, 4), 0, P / 2, 0), x, 1.5, z + 0.02));
      add(at(cyl(0.016, 0.016, 0.12, i % 2 ? COL.ink : '#7a3a3a', 5), x, 1.58, z));
    }
    // a shelf with folded jackets and gloves
    add(at(box(1.2, 0.05, 0.3, woodDark), x0 + 0.75, 0.95, ZB + 0.2));
    for (let i = 0; i < 3; i++) add(at(rbox(0.32, 0.09, 0.24, '#fbfbff', 0.03), x0 + 0.42 + i * 0.34, 1.02, ZB + 0.2));
    add(at(rbox(0.3, 0.08, 0.22, '#fbfbff', 0.03), x0 + 0.6, 1.11, ZB + 0.2));
    // a tiny drawing of the two of them pinned to the panel
    add(at(atlas.panel(0.34, 0.26, 102, 78, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      for (const [x, col] of [[0.32, COL.pink], [0.68, COL.blue]]) {
        c.fillStyle = col;
        c.beginPath();
        c.arc(w * x, h * 0.4, 10, 0, P * 2);
        c.fill();
        c.fillRect(w * x - 8, h * 0.55, 16, 20);
      }
      c.fillStyle = COL.pink;
      heartPath(c, w / 2, h * 0.3, 14);
      c.fill();
      c.fillStyle = '#5a4050';
      c.font = `500 10px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('us!', w / 2, h - 8);
    }), x1 - 0.4, 1.0, ZB + 0.1));
    R.box(cx, ZB + 0.25, (x1 - x0) / 2, 0.24);
  }

  // ---------------------------------------------------------------- the trophy wall and the Best partner cup
  {
    const { x0, x1, cx } = TROPHY;
    add(at(rbox(x1 - x0, 2.5, 0.08, '#8d5f3c', 0.03), cx, 1.75, ZB + 0.05));
    add(at(atlas.panel(2.2, 0.36, 352, 58, boardDraw(['Hall of Fame'], { edge: COL.gold, ink: COL.navy })), cx, 3.25, ZB + 0.1));
    const shelves = [1.1, 1.75];
    for (const y of shelves) add(at(box(x1 - x0 - 0.2, 0.05, 0.3, COL.cream), cx, y, ZB + 0.24));
    const colors = [COL.gold, '#d8dde6', '#d39a5a'];
    let n = 0;
    for (const y of shelves) {
      for (let i = 0; i < 7; i++) {
        const x = x0 + 0.45 + i * ((x1 - x0 - 0.9) / 6);
        if (y === shelves[0] && Math.abs(x - cx) < 0.5) continue; // room for the big cup in front
        if ((i + n) % 3 === 2) {
          // a medal on a ribbon
          add(at(box(0.06, 0.24, 0.01, (n + i) % 2 ? COL.blue : COL.pink), x, y + 0.17, ZB + 0.13));
          add(at(rot(cyl(0.06, 0.06, 0.015, colors[(n + i) % 3], 12, { rough: 0.3, metal: 0.6 }), P / 2, 0, 0), x, y + 0.08, ZB + 0.15));
        } else {
          const c = cup(k, 0.2 + ((i * 7 + n * 3) % 4) * 0.05, colors[(i + n) % 3]);
          add(at(c, x, y + 0.025, ZB + 0.24));
        }
      }
      n++;
    }
    // the pedestal and the big cup, engraved "Best partner: Roji"
    const px = cx;
    const pz = ZB + 0.62;
    add(at(rbox(0.6, 0.9, 0.6, COL.navy, 0.04), px, 0.45, pz));
    add(at(rbox(0.68, 0.06, 0.68, COL.gold, 0.02), px, 0.92, pz));
    const big = cup(k, 0.62, COL.gold, { heart: true });
    big.position.set(px, 0.95, pz);
    add(R.dyn(big));
    R.bigCup = big;
    add(at(atlas.panel(0.5, 0.26, 150, 78, (c, w, h) => {
      c.fillStyle = '#e8b93c';
      roundRect(c, 2, 2, w - 4, h - 4, 10);
      c.fill();
      c.strokeStyle = '#a87a1f';
      c.lineWidth = 3;
      c.stroke();
      c.fillStyle = '#5a3d00';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Best partner', w / 2, h * 0.36, w * 0.86, 22, 700);
      fitText(c, 'Roji', w / 2, h * 0.7, w * 0.86, 24, 700);
    }), px, 0.55, pz + 0.305));
    R.box(px, pz, 0.32, 0.32);
    R.box(cx, ZB + 0.24, (x1 - x0) / 2, 0.2);

    // three frames for the team photos (filled as photos are taken)
    const pc = document.createElement('canvas');
    pc.width = 768;
    pc.height = 192;
    const ptex = new THREE.CanvasTexture(pc);
    ptex.colorSpace = THREE.SRGBColorSpace;
    const pmat = new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.6 });
    const frames = [];
    for (let i = 0; i < 3; i++) {
      const fx = x0 + 0.75 + i * ((x1 - x0 - 1.5) / 2);
      const fg = new THREE.Group();
      fg.add(at(rbox(0.86, 0.66, 0.05, COL.gold, 0.02), 0, 0, 0));
      const pg = new THREE.PlaneGeometry(0.74, 0.54);
      const uv = pg.attributes.uv;
      for (let j = 0; j < uv.count; j++) uv.setX(j, (i + uv.getX(j)) / 3);
      fg.add(at(mesh(pg, pmat, { cast: false }), 0, 0, 0.027));
      fg.position.set(fx, 2.58, ZB + 0.12);
      fg.rotation.z = (i - 1) * 0.04;
      fg.visible = false;
      add(R.dyn(fg));
      frames.push(fg);
    }
    R.photos = { canvas: pc, tex: ptex, frames };
  }

  // the photo corner: a camera on a tripod facing the trophy wall
  {
    const tx = TROPHY.cx;
    const tz = -3.55;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * P * 2 + 0.3;
      add(at(rot(cyl(0.015, 0.015, 1.2, COL.ink, 5), Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22), tx + Math.cos(a) * 0.13, 0.58, tz + Math.sin(a) * 0.13));
    }
    add(at(rbox(0.32, 0.2, 0.16, '#3b2b3f', 0.04), tx, 1.25, tz));
    add(at(rot(cyl(0.065, 0.075, 0.12, '#55556a', 14), P / 2, 0, 0), tx, 1.25, tz - 0.12));
    add(at(rbox(0.1, 0.06, 0.06, COL.pink, 0.02), tx + 0.09, 1.38, tz));
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: R.k.geo('flashTex', () => {
      return canvasTexture(64, 64, (c) => {
        const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr;
        c.fillRect(0, 0, 64, 64);
      });
    }), transparent: true, opacity: 0, depthWrite: false }));
    flash.position.set(tx, 1.3, tz - 0.2);
    flash.scale.setScalar(1.6);
    add(R.dyn(flash));
    R.flash = flash;
    R.circle(tx, tz, 0.3);
    R.tripod = { x: tx, z: tz };
  }

  // ---------------------------------------------------------------- the lesson mat at the front, with footprints
  {
    const tex = canvasTexture(512, 224, (c, w, h) => {
      c.fillStyle = '#7fb0f0';
      roundRect(c, 0, 0, w, h, 24);
      c.fill();
      c.fillStyle = '#8fbdf6';
      roundRect(c, 10, 10, w - 20, h - 20, 18);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (const y of [0.34, 0.74]) {
        for (let i = 0; i < 6; i++) {
          const x = 70 + i * 66;
          c.beginPath();
          c.ellipse(x, h * y - 8, 12, 6, 0, 0, P * 2);
          c.ellipse(x - 26, h * y + 8, 6, 12, 0, 0, P * 2);
          c.fill();
        }
      }
      c.fillStyle = '#2c3e66';
      c.font = `700 22px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('Footwork', w / 2, 26);
    });
    add(at(box(MAT.w, 0.03, MAT.d, '#6a9ee0'), MAT.x, 0.015, MAT.z)).castShadow = false;
    const top = add(at(mesh(new THREE.PlaneGeometry(MAT.w, MAT.d), umat('#ffffff', { rough: 0.9, map: tex }), { cast: false }), MAT.x, 0.033, MAT.z));
    top.rotation.x = -P / 2;
    R.box(MAT.x, MAT.z, MAT.w / 2, MAT.d / 2, 0.03);
  }

  // ---------------------------------------------------------------- the right side: a practice target, a water cooler, a bench
  {
    const tx = X1 - 0.35;
    const tz = 2.2;
    add(at(cyl(0.2, 0.24, 0.05, COL.navy, 12), tx, 0.025, tz));
    add(at(cyl(0.03, 0.03, 1.1, COL.steel, 6), tx, 0.6, tz));
    const pad = add(at(rot(cyl(0.3, 0.3, 0.08, '#ffffff', 18), 0, 0, P / 2), tx - 0.02, 1.15, tz));
    for (const [r, c] of [[0.22, COL.blue], [0.14, '#ffffff'], [0.07, COL.pink]]) add(at(rot(cyl(r, r, 0.012, c, 16), 0, 0, P / 2), tx - 0.065, 1.15, tz));
    R.circle(tx, tz, 0.3);
    R.target = { x: tx, z: tz, pad };
    // water cooler
    const wx = X1 - 0.4;
    const wz = -2.4;
    add(at(rbox(0.42, 0.9, 0.4, '#ffffff', 0.04), wx, 0.45, wz));
    add(at(cyl(0.16, 0.16, 0.42, '#bfe3ff', 14), wx, 1.12, wz));
    add(at(rot(cyl(0.02, 0.02, 0.06, COL.blue, 6), P / 2, 0, 0), wx - 0.06, 0.72, wz + 0.22));
    add(at(rot(cyl(0.02, 0.02, 0.06, COL.red, 6), P / 2, 0, 0), wx + 0.06, 0.72, wz + 0.22));
    R.box(wx, wz, 0.24, 0.23);
    // a towel rail beside it
    add(at(box(0.05, 1.0, 0.05, COL.steel), X1 - 0.12, 1.0, -1.5));
    add(at(rot(rbox(0.06, 0.5, 0.36, COL.rose, 0.03), 0, 0, 0), X1 - 0.12, 1.2, -1.35));
    // a bench along the low wall and a plant
    add(at(rbox(0.46, 0.07, 1.8, wood, 0.03), X1 - 0.35, 0.44, 5.2));
    for (const s of [-1, 1]) add(at(box(0.4, 0.42, 0.08, woodDark), X1 - 0.35, 0.21, 5.2 + s * 0.78));
    R.box(X1 - 0.35, 5.2, 0.25, 0.92, 0.47);
    add(at(cyl(0.22, 0.18, 0.4, COL.navy, 12), X1 - 0.45, 0.2, 7.1));
    add(at(sph(0.34, COL.leaf, { flat: true }, 9), X1 - 0.45, 0.7, 7.1));
    R.circle(X1 - 0.45, 7.1, 0.26);
    // a clock on the right wall
    const clock = atlas.panel(0.5, 0.5, 100, 100, (c, w, h) => {
      c.fillStyle = '#efe3d0';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 4, 0, P * 2);
      c.fill();
      c.strokeStyle = COL.navy;
      c.lineWidth = 5;
      c.stroke();
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(w / 2, h / 2);
      c.lineTo(w / 2, 20);
      c.moveTo(w / 2, h / 2);
      c.lineTo(w / 2 + 22, h / 2 + 4);
      c.stroke();
      c.fillStyle = COL.pink;
      heartPath(c, w / 2, h / 2, 10);
      c.fill();
    });
    clock.rotation.y = -P / 2;
    add(at(clock, X1 - 0.005, 3.1, -4.8));
  }
}
