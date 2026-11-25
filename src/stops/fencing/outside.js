import { Kid } from '../../kid.js';
import { THREE, kit, makeAtlas, colorBake, boardDraw, fitText, heartPath, glowTexture, mat, umat, mesh, canvasTexture, roundRect, FONT, clamp, COL, person, whites, Fencer, deck, makeMask, bakeParts } from './kit.js';

// The Roji & Homama Fencing Club from the path: a small salle d'armes with tall arched windows under striped dome
// awnings, a crossed-foils crest, a practice piste in the yard with two club fencers at it, a scoreboard on the wall,
// a bench, a rack of masks and foils, and lanterns and fairy lights for the evening.
// Local coordinates: st.origin is 6.2 m behind the pad; the footprint is x -6.5 .. 3, z -5.5 .. 2.

export const B = { x: -2.1, z: -3.7, w: 7.4, d: 3.4, h: 3.8 }; // the building
export const FRONT = B.z + B.d / 2; // -2.0, the facade
export const DOOR = { x: B.x, z: FRONT + 0.25 }; // where "Go inside" sits (local)
const PISTE = { x: 1.05, z: 0.35, len: 3.5, w: 1.15 };
const WIN = [-4.95, -3.65, -0.55, 0.75]; // arched windows along the facade
const P = Math.PI;

function archShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.absarc(0, h, w / 2, 0, P, false);
  s.lineTo(-w / 2, 0);
  return s;
}

// A ShapeGeometry with UVs spread 0..1 over its bounding box
function shapeGeo(shape, seg = 12) {
  const g = new THREE.ShapeGeometry(shape, seg);
  g.computeBoundingBox();
  const b = g.boundingBox;
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - b.min.x) / (b.max.x - b.min.x), (pos.getY(i) - b.min.y) / (b.max.y - b.min.y));
  return g;
}

function shieldShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(w / 2, 0);
  s.quadraticCurveTo(w / 2, -h * 0.32, 0, -h / 2);
  s.quadraticCurveTo(-w / 2, -h * 0.32, -w / 2, 0);
  s.lineTo(-w / 2, h / 2);
  return s;
}

// The warm room behind each window: a banner, a lamp, and in one window two tiny fencers with a heart between them
function paintWindow(c, w, h, i) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffe7b8');
  g.addColorStop(1, '#ffc98a');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.arc(w * 0.5, h * 0.16, w * 0.12, 0, P * 2);
  c.fill();
  c.fillStyle = i % 2 ? '#7fa7ff' : '#ff8fa3';
  c.beginPath();
  c.moveTo(w * 0.2, h * 0.3);
  c.lineTo(w * 0.8, h * 0.3);
  c.lineTo(w * 0.8, h * 0.52);
  c.lineTo(w * 0.5, h * 0.46);
  c.lineTo(w * 0.2, h * 0.52);
  c.fill();
  c.fillStyle = 'rgba(160,110,70,0.35)';
  c.fillRect(0, h * 0.8, w, h * 0.2);
  if (i === 1) {
    // Roji and Homama, en garde, a heart between the blades
    for (const [x, col, d] of [[0.3, '#ef5b6f', 1], [0.7, '#3f7bf0', -1]]) {
      c.fillStyle = '#ffffff';
      roundRect(c, w * x - 9, h * 0.62, 18, 30, 7);
      c.fill();
      c.fillStyle = col;
      c.beginPath();
      c.arc(w * x, h * 0.6, 8, 0, P * 2);
      c.fill();
      c.strokeStyle = '#6a6a7a';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(w * x + d * 9, h * 0.66);
      c.lineTo(w * 0.5 - d * 6, h * 0.6);
      c.stroke();
    }
    c.fillStyle = '#ef5b6f';
    heartPath(c, w * 0.5, h * 0.56, 12);
    c.fill();
  }
}

export function buildOutside(st) {
  const g = st.group;
  const k = kit();
  const { box, rbox, cyl, sph, tor, cone, at, rot } = k;
  const add = (o) => (g.add(o), o);
  const dynamic = [];
  const dyn = (o) => (dynamic.push(o), o);
  const updates = [];
  const col = (c) => st.addCollider(c);
  const atlas = makeAtlas(1024, 1024, { rough: 0.75 });
  const glass = makeAtlas(512, 512, { rough: 0.3, glow: 0.38 });
  const lampGlass = umat('#fff3cf', { emissive: '#ffc35a', ei: 0.55, rough: 0.3 });
  const lanterns = [];
  const make = (look) => new Kid(look);

  const stucco = mat(COL.stucco, { rough: 0.9 });
  const trim = mat(COL.white, { rough: 0.7 });
  const stone = mat(COL.stone, { rough: 0.9 });
  const navy = mat(COL.navy, { rough: 0.6 });
  const goldM = mat(COL.gold, { rough: 0.35, metal: 0.5 });
  const iron = mat('#3a4052', { rough: 0.5, metal: 0.4 });

  // ---------------------------------------------------------------- the terrace
  const flags = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#e9dccb';
    c.fillRect(0, 0, w, h);
    const r = [0.92, 0.97, 1.0, 0.95];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const o = j % 2 ? 32 : 0;
      c.fillStyle = `rgba(${Math.round(240 * r[(i + j) % 4])},${Math.round(228 * r[(i + j * 3) % 4])},${Math.round(210 * r[(i * 3 + j) % 4])},1)`;
      roundRect(c, i * 64 + o + 3, j * 64 + 3, 58, 58, 8);
      c.fill();
    }
    // a tiny heart in one stone
    c.fillStyle = 'rgba(239,91,111,0.45)';
    heartPath(c, 160, 96, 14);
    c.fill();
  });
  flags.wrapS = flags.wrapT = THREE.RepeatWrapping;
  flags.repeat.set(9.4 / 2.2, 4.0 / 2.2);
  const terrace = mesh(new THREE.PlaneGeometry(9.4, 4.0), new THREE.MeshStandardMaterial({ map: flags, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { cast: false });
  terrace.rotation.x = -P / 2;
  terrace.position.set(-1.75, 0.022, -0.05);
  add(terrace);
  // stone kerb along the front of the terrace
  add(at(rbox(9.4, 0.08, 0.16, COL.stone, 0.03), -1.75, 0.04, 1.95));

  // ---------------------------------------------------------------- the building
  const { x: bx, z: bz, w: bw, d: bd, h: bh } = B;
  // walls (front wall split round the door and windows would cost a lot; one block, the openings drawn on top)
  add(at(box(bw, bh, bd, stucco), bx, bh / 2, bz));
  add(at(box(bw + 0.12, 0.42, bd + 0.12, stone), bx, 0.21, bz)); // plinth
  // corner pilasters and the ones between the windows
  for (const x of [bx - 3.6, bx + 3.6, bx - 2.2, bx + 2.2]) add(at(box(0.2, bh - 0.42, 0.08, trim), x, 0.42 + (bh - 0.42) / 2, FRONT + 0.04));
  // frieze with the club's name, cornice and the mansard roof
  const frieze = atlas.panel(bw - 0.6, 0.44, 880, 54, (c, w, h) => {
    c.fillStyle = '#fffaf0';
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.gold;
    c.fillRect(0, 3, w, 3);
    c.fillRect(0, h - 6, w, 3);
    c.fillStyle = COL.navy;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Roji & Homama', w * 0.26, h / 2 + 2, w * 0.4, 38, 700);
    fitText(c, 'Fencing Club', w * 0.74, h / 2 + 2, w * 0.4, 38, 700);
    c.fillStyle = COL.pink;
    heartPath(c, 22, h / 2, 16);
    c.fill();
    heartPath(c, w - 22, h / 2, 16);
    c.fill();
  });
  add(at(frieze, bx, bh - 0.42, FRONT + 0.09));
  add(at(box(bw + 0.3, 0.12, bd + 0.3, trim), bx, bh - 0.14, bz));
  add(at(box(bw + 0.42, 0.14, bd + 0.42, trim), bx, bh + 0.0, bz));
  const roofGeo = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.66, Math.SQRT1_2, 1, 4, 1);
  roofGeo.rotateY(P / 4);
  const roof = add(mesh(roofGeo, mat(COL.slate, { rough: 0.75, flat: true })));
  roof.scale.set(bw + 0.3, 1.25, bd + 0.3);
  roof.position.set(bx, bh + 0.07 + 0.625, bz);
  add(at(box((bw + 0.3) * 0.66, 0.08, (bd + 0.3) * 0.66, COL.slateDark), bx, bh + 1.33, bz));
  // a little gold railing with finials along the roof top
  const topZ = bz + ((bd + 0.3) * 0.66) / 2 - 0.05;
  add(at(box((bw + 0.3) * 0.62, 0.03, 0.03, goldM), bx, bh + 1.52, topZ));
  for (let i = 0; i <= 6; i++) add(at(cyl(0.012, 0.012, 0.18, goldM, 5), bx - ((bw + 0.3) * 0.31) + i * (((bw + 0.3) * 0.62) / 6), bh + 1.45, topZ));
  for (const s of [-1, 1]) add(at(sph(0.05, goldM, undefined, 8), bx + s * (bw + 0.3) * 0.31, bh + 1.58, topZ));
  // round dormer windows on the front slope
  for (const x of [bx - 2.3, bx, bx + 2.3]) {
    const d = new THREE.Group();
    d.add(at(box(0.62, 0.62, 0.36, stucco), 0, 0, 0));
    d.add(at(rot(cyl(0.34, 0.34, 0.1, trim, 18), P / 2, 0, 0), 0, 0.12, 0.13));
    const gl = glass.wrap(new THREE.CircleGeometry(0.24, 18), 64, 64, (c, w, h) => {
      c.fillStyle = '#ffd99a';
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.fillRect(w / 2 - 2, 0, 4, h);
      c.fillRect(0, h / 2 - 2, w, 4);
    });
    d.add(at(gl, 0, 0.12, 0.185));
    d.add(at(rot(box(0.72, 0.06, 0.46, COL.slateDark), -0.25, 0, 0), 0, 0.42, 0.02));
    d.position.set(x, bh + 0.62, FRONT + 0.15 - 0.42);
    add(d);
  }

  // ---------------------------------------------------------------- the crest over the door, in the middle of the frieze
  {
    const c = new THREE.Group();
    const back = mesh(new THREE.ExtrudeGeometry(shieldShape(0.78, 0.9), { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 6 }), navy);
    const face = mesh(new THREE.ExtrudeGeometry(shieldShape(0.62, 0.74), { depth: 0.04, bevelEnabled: false, curveSegments: 6 }), trim);
    face.position.z = 0.05;
    c.add(back, face);
    for (const s of [-1, 1]) {
      const f = new THREE.Group();
      f.add(at(cyl(0.012, 0.012, 1.0, goldM, 6), 0, 0, 0));
      f.add(at(sph(0.07, goldM, undefined, 10), 0, -0.42, 0));
      f.children.at(-1).scale.set(1, 0.45, 1);
      f.add(at(cyl(0.02, 0.02, 0.14, navy, 6), 0, -0.52, 0));
      f.rotation.z = s * 0.72;
      f.position.set(0, 0.02, 0.13);
      c.add(f);
    }
    c.add(at(k.heart(0.2, 0.05, COL.pink), 0, 0.03, 0.17));
    c.add(at(k.star(0.06, 0.025, 0.02, COL.gold), 0, 0.3, 0.12));
    c.position.set(bx, bh - 0.36, FRONT + 0.25);
    c.scale.setScalar(0.92);
    add(c);
  }

  // ---------------------------------------------------------------- windows: tall arches under striped dome awnings
  const archG = shapeGeo(archShape(0.8, 1.55), 10);
  const stripes = canvasTexture(256, 32, (c, w, h) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : COL.blue;
      c.fillRect((i * w) / 16, 0, w / 16 + 1, h);
    }
  });
  const awnMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.85, side: THREE.DoubleSide });
  const awnGeo = new THREE.SphereGeometry(0.56, 16, 5, 0, P, 0, P / 2);
  // one window in its own frame: the wall face at z = 0, facing +Z
  const windowAt = (i, x, z, ry) => {
    const w = new THREE.Group();
    w.add(at(glass.wrap(archG.clone(), 96, 150, (c, cw, ch) => paintWindow(c, cw, ch, i)), 0, 0.72, 0.012));
    for (const s of [-1, 1]) w.add(at(box(0.07, 1.6, 0.07, trim), s * 0.42, 0.72 + 0.8, 0.04));
    w.add(at(tor(0.42, 0.035, trim, P, undefined, 14, 6), 0, 0.72 + 1.55, 0.04));
    w.add(at(rbox(1.0, 0.07, 0.2, COL.white, 0.02), 0, 0.7, 0.1));
    w.add(at(box(0.03, 1.95, 0.03, trim), 0, 0.72 + 0.97, 0.03));
    w.add(at(box(0.8, 0.03, 0.03, trim), 0, 0.72 + 1.05, 0.03));
    w.add(at(box(0.12, 0.16, 0.06, COL.stone), 0, 0.72 + 1.55 + 0.42, 0.05));
    // window box with flowers
    w.add(at(rbox(0.9, 0.2, 0.24, COL.navy, 0.03), 0, 0.55, 0.15));
    for (let f = 0; f < 6; f++) {
      const fx = -0.36 + f * 0.145;
      w.add(at(sph(0.07, COL.leafDark, undefined, 7), fx, 0.67, 0.15));
      w.add(at(sph(0.045, f % 2 ? COL.rose : COL.white, undefined, 7), fx + 0.02, 0.73 + (f % 3) * 0.02, 0.2));
    }
    const aw = mesh(awnGeo, awnMat);
    aw.scale.set(1, 0.85, 0.75);
    aw.position.set(0, 0.72 + 1.62, 0.02);
    w.add(aw);
    const edge = at(rot(tor(0.56, 0.028, COL.white, P, undefined, 16, 5), P / 2, 0, 0), 0, 0.72 + 1.62, 0.02);
    edge.scale.set(1, 0.75, 1);
    w.add(edge);
    for (let sc = 0; sc < 7; sc++) {
      const a2 = (sc + 0.5) * (P / 7);
      w.add(at(sph(0.05, sc % 2 ? COL.white : COL.blue, undefined, 6), Math.cos(a2) * 0.56, 0.72 + 1.58, 0.02 + Math.sin(a2) * 0.42));
    }
    w.position.set(x, 0, z);
    w.rotation.y = ry;
    add(w);
  };
  WIN.forEach((x, i) => {
    windowAt(i, x, FRONT, 0);
    col({ type: 'box', x, z: FRONT + 0.15, hw: 0.46, hd: 0.13 });
  });
  // one on each side wall
  windowAt(4, bx - bw / 2, bz, -P / 2);
  windowAt(5, bx + bw / 2, bz, P / 2);
  for (const s of [-1, 1]) col({ type: 'box', x: bx + s * (bw / 2 + 0.15), z: bz, hw: 0.13, hd: 0.46 });

  // ---------------------------------------------------------------- the door
  {
    const dx = bx;
    // white surround, fanlight and keystone
    for (const s of [-1, 1]) add(at(box(0.14, 2.18, 0.1, trim), dx + s * 0.78, 1.09, FRONT + 0.05));
    add(at(tor(0.78, 0.07, trim, P, undefined, 18, 6), dx, 2.18, FRONT + 0.05));
    const fan = glass.wrap(shapeGeo((() => {
      const s = new THREE.Shape();
      s.moveTo(-0.71, 0);
      s.lineTo(0.71, 0);
      s.absarc(0, 0, 0.71, 0, P, false);
      return s;
    })(), 12), 128, 64, (c, w, h) => {
      c.fillStyle = '#ffdca0';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.lineWidth = 3;
      for (let i = 1; i < 6; i++) {
        const a = (i / 6) * P;
        c.beginPath();
        c.moveTo(w / 2, h);
        c.lineTo(w / 2 - Math.cos(a) * w, h - Math.sin(a) * h * 2);
        c.stroke();
      }
    });
    add(at(fan, dx, 2.18, FRONT + 0.012));
    add(at(box(0.2, 0.24, 0.08, COL.stone), dx, 2.98, FRONT + 0.06));
    // double doors with panels and gold knobs
    for (const s of [-1, 1]) {
      add(at(box(0.69, 2.12, 0.08, COL.navy), dx + s * 0.355, 1.06, FRONT + 0.03));
      for (const y of [0.55, 1.45]) add(at(box(0.46, 0.62, 0.03, '#3b5287'), dx + s * 0.355, y, FRONT + 0.075));
      add(at(sph(0.04, goldM, undefined, 8), dx + s * 0.08, 1.05, FRONT + 0.1));
    }
    add(at(box(1.42, 0.04, 0.05, goldM), dx, 0.12, FRONT + 0.09)); // kick plate
    // the step and the doormat
    add(at(rbox(2.2, 0.12, 0.46, COL.stone, 0.03), dx, 0.06, FRONT + 0.23));
    const matT = atlas.panel(1.1, 0.5, 220, 100, (c, w, h) => {
      c.fillStyle = '#9b6a43';
      roundRect(c, 2, 2, w - 4, h - 4, 14);
      c.fill();
      c.fillStyle = '#c99567';
      roundRect(c, 10, 10, w - 20, h - 20, 10);
      c.fill();
      c.fillStyle = '#6e4630';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Welcome', w / 2 - 12, h / 2 + 2, w * 0.6, 38, 700);
      c.fillStyle = COL.pink;
      heartPath(c, w - 40, h / 2, 26);
      c.fill();
    });
    matT.rotation.x = -P / 2;
    add(at(matT, dx, 0.03, FRONT + 0.85));
    col({ type: 'box', x: dx, z: FRONT + 0.23, hw: 1.1, hd: 0.23, h: 0.12 });
    // wall lanterns either side
    for (const s of [-1, 1]) {
      const lx = dx + s * 0.98;
      add(at(box(0.04, 0.04, 0.26, iron), lx, 2.3, FRONT + 0.13));
      add(at(cyl(0.11, 0.08, 0.06, iron, 6), lx, 2.12, FRONT + 0.28));
      const gl = add(at(mesh(k.geo('lg', () => new THREE.CylinderGeometry(0.085, 0.07, 0.24, 6)), lampGlass, { cast: false }), lx, 2.0, FRONT + 0.28));
      gl.userData.glow = true;
      add(at(cone(0.13, 0.12, iron, 6), lx, 2.18, FRONT + 0.28));
      add(at(cyl(0.09, 0.07, 0.04, iron, 6), lx, 1.87, FRONT + 0.28));
      lanterns.push(new THREE.Vector3(lx, 2.0, FRONT + 0.3));
    }
    // a potted topiary either side of the step
    for (const s of [-1, 1]) {
      const px = dx + s * 1.42;
      add(at(cyl(0.22, 0.17, 0.38, COL.navy, 12), px, 0.19, FRONT + 0.28));
      add(at(tor(0.22, 0.025, goldM, P * 2, undefined, 14, 4), px, 0.37, FRONT + 0.28)).rotation.x = P / 2;
      add(at(cyl(0.025, 0.025, 0.3, COL.woodDark, 5), px, 0.5, FRONT + 0.28));
      add(at(sph(0.26, COL.leaf, { flat: true }, 9), px, 0.82, FRONT + 0.28));
      add(at(sph(0.04, COL.rose, undefined, 6), px + 0.12, 0.92, FRONT + 0.48));
      col({ type: 'circle', x: px, z: FRONT + 0.28, r: 0.26, h: 0.56 });
    }
  }


  // ---------------------------------------------------------------- the brass plaque between the right windows (an easter egg)
  add(at(atlas.panel(0.3, 0.22, 92, 66, (c, w, h) => {
    c.fillStyle = '#d9a83a';
    roundRect(c, 2, 2, w - 4, h - 4, 8);
    c.fill();
    c.strokeStyle = '#a87a1f';
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#6b4a00';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Since the', w / 2, h * 0.36, w * 0.84, 15, 700);
    fitText(c, 'day we met', w / 2, h * 0.68, w * 0.84, 15, 700);
  }), bx + 2.2, 1.6, FRONT + 0.09));

  // ---------------------------------------------------------------- the practice piste with fairy lights over it
  const pisteTex = canvasTexture(512, 128, (c, w, h) => {
    c.fillStyle = '#c9d4e6';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#aebcd6';
    c.fillRect(0, 0, w * 0.1, h);
    c.fillRect(w * 0.9, 0, w * 0.1, h);
    c.fillStyle = '#ffffff';
    for (const x of [0.5, 0.3, 0.7]) c.fillRect(w * x - 3, 8, 6, h - 16);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.strokeRect(5, 5, w - 10, h - 10);
  });
  add(at(box(PISTE.len, 0.04, PISTE.w, '#aebcd6'), PISTE.x, 0.045, PISTE.z)).castShadow = false;
  const pisteTop = add(at(mesh(new THREE.PlaneGeometry(PISTE.len, PISTE.w), new THREE.MeshStandardMaterial({ map: pisteTex, roughness: 0.75 }), { cast: false }), PISTE.x, 0.066, PISTE.z));
  pisteTop.rotation.x = -P / 2;
  const poleX = [PISTE.x - PISTE.len / 2 - 0.08, PISTE.x + PISTE.len / 2 + 0.12];
  const poleZ = PISTE.z - PISTE.w / 2 - 0.15;
  for (const x of poleX) {
    add(at(cyl(0.035, 0.045, 2.4, COL.white, 8), x, 1.2, poleZ));
    add(at(sph(0.06, goldM, undefined, 8), x, 2.43, poleZ));
    add(at(cyl(0.14, 0.16, 0.08, COL.stone, 10), x, 0.04, poleZ));
    col({ type: 'circle', x, z: poleZ, r: 0.12 });
  }
  const bulbs = [];
  const NB = 11;
  for (let i = 0; i < NB; i++) {
    const u = i / (NB - 1);
    const x = poleX[0] + (poleX[1] - poleX[0]) * u;
    const y = 2.32 - Math.sin(u * P) * 0.38;
    bulbs.push(new THREE.Vector3(x, y, poleZ));
  }
  const wire = new THREE.CatmullRomCurve3(bulbs.map((b) => b.clone().add(new THREE.Vector3(0, 0.05, 0))));
  add(mesh(new THREE.TubeGeometry(wire, 24, 0.008, 3, false), mat('#4a4a58'), { cast: false }));
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const bulbMesh = add(dyn(new THREE.InstancedMesh(k.geo('bulb', () => new THREE.SphereGeometry(0.045, 8, 6)), bulbMat, NB)));
  const m4 = new THREE.Matrix4();
  const bulbCols = ['#ffd27a', '#ff9eb5', '#ffffff', '#8fc4ff'].map((c) => new THREE.Color(c));
  bulbs.forEach((b, i) => {
    bulbMesh.setMatrixAt(i, m4.makeTranslation(b.x, b.y, b.z));
    bulbMesh.setColorAt(i, bulbCols[i % 4]);
  });

  // ---------------------------------------------------------------- the scoreboard
  const scoreCanvas = document.createElement('canvas');
  scoreCanvas.width = 256;
  scoreCanvas.height = 128;
  const scoreTex = new THREE.CanvasTexture(scoreCanvas);
  scoreTex.colorSpace = THREE.SRGBColorSpace;
  const score = [0, 0];
  const drawScore = () => {
    const c = scoreCanvas.getContext('2d');
    c.fillStyle = '#1f2433';
    c.fillRect(0, 0, 256, 128);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 84px ${FONT}`;
    c.fillStyle = '#ff8a8f';
    c.fillText(String(score[0]), 64, 70);
    c.fillStyle = '#8af0b6';
    c.fillText(String(score[1]), 192, 70);
    c.fillStyle = '#ffffff';
    c.fillText(':', 128, 64);
    c.font = `600 18px ${FONT}`;
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fillText('PRACTICE', 128, 16);
    scoreTex.needsUpdate = true;
  };
  drawScore();
  // on the right fairy-light pole at the end of the piste, turned a little toward the path
  const SB = { x: PISTE.x + PISTE.len / 2 + 0.12, z: PISTE.z - PISTE.w / 2 - 0.15, y: 1.62 };
  const sbG = new THREE.Group();
  sbG.add(at(rbox(0.8, 0.5, 0.12, COL.navy, 0.04), 0, 0, 0.08));
  const screen = mesh(new THREE.PlaneGeometry(0.68, 0.34), new THREE.MeshStandardMaterial({ map: scoreTex, emissive: '#ffffff', emissiveMap: scoreTex, emissiveIntensity: 0.55, roughness: 0.5 }), { cast: false });
  sbG.add(at(screen, 0, -0.02, 0.145));
  const lampOff = [new THREE.Color('#5a2a30'), new THREE.Color('#244d38')];
  const lampOn = [new THREE.Color('#ff4d5a'), new THREE.Color('#3dff8f')];
  const lampMats = [0, 1].map((i) => new THREE.MeshBasicMaterial({ color: lampOff[i].clone() }));
  const lamps = [-1, 1].map((s, i) => sbG.add(dyn(at(mesh(k.geo('slamp', () => new THREE.SphereGeometry(0.075, 12, 8, 0, P * 2, 0, P / 2)), lampMats[i], { cast: false }), s * 0.28, 0.25, 0.08))));
  sbG.position.set(SB.x, SB.y, SB.z);
  sbG.rotation.y = -0.5;
  add(sbG);
  let lampT = [0, 0];

  // ---------------------------------------------------------------- two club fencers at practice
  const looks = [
    { id: 'clubA', name: 'Club fencer', gender: 'girl', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'ponytail', accent: COL.red },
    { id: 'clubB', name: 'Club fencer', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', accent: COL.green },
  ];
  const fencers = looks.map((l, i) => {
    const p = person(make, whites(l), { mode: 'live', kit: i ? COL.green : COL.red, mask: 'head', cast: true });
    const f = new Fencer(p.kid, p.gear, i ? -1 : 1);
    f.to('idle');
    add(dyn(p.kid.root));
    return f;
  });
  const GUARD = 0.92;
  col({ type: 'box', x: PISTE.x, z: PISTE.z, hw: 1.55, hd: 0.42 });

  // A practice loop: footwork, an attack, a touch or a parry and riposte, back to the lines; a salute every five touches
  let seg = null;
  let segT = 0;
  let queue = [];
  let touches = 0;
  const pick = deck(['touch', 'touch', 'parry', 'touch', 'parry', 'double', 'short']);
  const light = (i) => {
    lampT[i] = 0.9;
    score[i] = Math.min(score[i] + 1, 15);
    drawScore();
  };
  const exchange = () => {
    const a = Math.random() < 0.5 ? 0 : 1;
    const A = fencers[a];
    const D = fencers[1 - a];
    const out = pick();
    const steps = [];
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const fwd = Math.random() < 0.65;
      steps.push({ d: 0.36, go: () => (A.stepBy(fwd ? 0.16 : -0.12), D.stepBy(fwd ? -0.12 : 0.1)) });
    }
    steps.push({ d: 0.2, go: () => A.to('windup', 14) });
    if (out === 'double') {
      steps.push({ d: 0.5, go: () => (A.to('lunge', 16), D.to('lunge', 16), light(0), light(1)) });
    } else if (out === 'short') {
      steps.push({ d: 0.45, go: () => (A.to('lunge', 16), D.stepBy(-0.2, 0.25)) });
    } else {
      steps.push({ d: 0.3, go: () => A.to('lunge', 16) });
      if (out === 'touch') steps.push({ d: 0.55, go: () => (D.to('hit', 10), light(a)) });
      else {
        steps.push({ d: 0.22, go: () => (D.to('parry', 18), A.to('parried', 12)) });
        steps.push({ d: 0.5, go: () => (D.to('lunge', 16), A.to('hit', 10), light(1 - a)) });
      }
    }
    steps.push({ d: 0.9, go: () => (A.to('idle', 7), D.to('idle', 7), (A.offT = 0), (D.offT = 0)) });
    if (out !== 'short') touches += out === 'double' ? 2 : 1;
    if (touches >= 6) {
      touches = 0;
      steps.push({ d: 0.6, go: () => fencers.forEach((f) => f.to('stand', 6)) });
      steps.push({ d: 1.8, go: () => fencers.forEach((f) => (f.salute = 0)) });
      steps.push({ d: 0.8, go: () => (fencers.forEach((f) => ((f.salute = null), f.to('idle', 6))), (score[0] = score[1] = 0), drawScore()) });
    }
    return steps;
  };

  // ---------------------------------------------------------------- the bench (hop on it) with a sleeping cat
  {
    const bx2 = -4.0;
    const bz2 = 0.2;
    const benchWood = mat(COL.wood, { rough: 0.8 });
    for (const dz of [-0.12, 0.0, 0.12]) add(at(rbox(1.9, 0.05, 0.11, benchWood, 0.02), bx2, 0.45, bz2 + dz));
    for (const dy of [0.62, 0.78]) add(at(rbox(1.9, 0.09, 0.04, benchWood, 0.02), bx2, dy, bz2 - 0.2));
    for (const s of [-1, 1]) {
      add(at(box(0.06, 0.44, 0.36, iron), bx2 + s * 0.82, 0.22, bz2 - 0.02));
      add(at(box(0.06, 0.5, 0.05, iron), bx2 + s * 0.82, 0.68, bz2 - 0.2));
      add(at(box(0.05, 0.04, 0.36, iron), bx2 + s * 0.82, 0.62, bz2 - 0.03));
    }
    // a heart cut into the backrest
    add(at(k.heart(0.12, 0.02, COL.pink), bx2, 0.71, bz2 - 0.18));
    col({ type: 'box', x: bx2, z: bz2 - 0.04, hw: 0.96, hd: 0.24, h: 0.48 });
    // a little club member watching the practice, her mask beside her
    const fan = person(make, { id: 'clubKid', name: 'Club kid', gender: 'girl', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'buns', outfit: 'skirt', top: COL.sky, bottom: COL.navy, shoes: COL.white, accent: COL.pink }, { pose: 'sit', mode: 'still', cast: false });
    fan.kid.root.position.set(bx2 - 0.6, 0.2, bz2 + 0.02);
    fan.kid.root.rotation.y = 0.35;
    add(fan.kid.root);
    col({ type: 'circle', x: bx2 - 0.6, z: bz2 + 0.05, r: 0.3 });
    const spare = makeMask(COL.blue, { light: true });
    spare.scale.setScalar(0.6);
    spare.rotation.set(0, 0.9, 0);
    add(at(spare, bx2 - 0.15, 0.66, bz2 - 0.02));
    // a water bottle with a heart sticker
    add(at(cyl(0.04, 0.04, 0.2, '#bfe6ff', 10), bx2 + 0.18, 0.58, bz2 + 0.02));
    add(at(cyl(0.025, 0.025, 0.04, COL.white, 8), bx2 + 0.18, 0.7, bz2 + 0.02));
    add(at(k.heart(0.05, 0.01, COL.pink), bx2 + 0.18, 0.58, bz2 + 0.063));
    // the cat, curled up at the warm end
    const cat = new THREE.Group();
    const fur = mat('#f2a65a', { rough: 0.9 });
    cat.add(at(sph(0.16, fur, undefined, 12), 0, 0.1, 0)).children.at(-1).scale.set(1.25, 0.72, 1);
    cat.add(at(sph(0.1, fur, undefined, 12), 0.15, 0.14, 0.06));
    for (const s of [-1, 1]) cat.add(at(rot(cone(0.035, 0.07, fur, 5), 0, 0, -s * 0.2), 0.15 + s * 0.05, 0.24, 0.05));
    for (const s of [-1, 1]) cat.add(at(rot(box(0.035, 0.006, 0.01, '#6b3d1f'), 0, 0, 0), 0.15 + s * 0.035, 0.14, 0.155));
    cat.add(at(sph(0.012, COL.pink, undefined, 6), 0.15, 0.125, 0.16));
    const tail = new THREE.Group();
    tail.position.set(-0.18, 0.06, 0);
    const tailM = mesh(new THREE.CapsuleGeometry(0.03, 0.22, 3, 6), fur, { cast: false });
    tailM.rotation.z = P / 2;
    tailM.position.x = -0.12;
    tail.add(tailM);
    cat.add(dyn(tail));
    cat.position.set(bx2 + 0.6, 0.48, bz2 + 0.02);
    cat.rotation.y = -0.4;
    add(cat);
    updates.push((dt, t) => (tail.rotation.y = Math.sin(t * 1.3) * 0.5 + 0.4));
  }

  // ---------------------------------------------------------------- the rack of masks and foils
  {
    const rx = 2.42;
    const rz = -2.55;
    const wood = mat(COL.woodDark, { rough: 0.75 });
    for (const s of [-1, 1]) add(at(box(0.07, 1.45, 0.07, wood), rx + s * 0.5, 0.72, rz));
    for (const s of [-1, 1]) add(at(box(0.07, 0.07, 0.5, wood), rx + s * 0.5, 0.04, rz));
    add(at(box(1.07, 0.06, 0.08, wood), rx, 1.38, rz));
    add(at(box(1.07, 0.06, 0.18, wood), rx, 0.32, rz));
    add(at(atlas.panel(0.6, 0.14, 120, 28, boardDraw(['Masks and foils'], { edge: COL.blue })), rx, 1.52, rz + 0.04));
    [COL.red, COL.blue, COL.green].forEach((c, i) => {
      const m = makeMask(c, { light: true });
      m.position.set(rx - 0.33 + i * 0.33, 1.05, rz + 0.12);
      m.scale.setScalar(0.62);
      add(m);
      add(at(cyl(0.012, 0.012, 0.12, wood, 5), rx - 0.33 + i * 0.33, 1.3, rz + 0.04)).rotation.x = P / 2;
    });
    for (let i = 0; i < 5; i++) {
      const fx = rx - 0.36 + i * 0.18;
      add(at(cyl(0.004, 0.007, 0.86, COL.steel, 4, { metal: 0.6, rough: 0.3 }), fx, 0.74, rz + 0.07));
      add(at(rot(sph(0.055, COL.steel, { metal: 0.6, rough: 0.3 }, 8), 0, 0, 0), fx, 1.2, rz + 0.07)).scale.set(1, 0.45, 1);
      add(at(cyl(0.015, 0.015, 0.1, COL.ink, 5), fx, 1.27, rz + 0.07));
    }
    col({ type: 'box', x: rx, z: rz, hw: 0.56, hd: 0.26 });
  }

  // ---------------------------------------------------------------- the chalk board by the door
  {
    const cx = -5.05;
    const cz = -1.2;
    const board = new THREE.Group();
    board.add(at(rot(box(0.62, 0.86, 0.04, COL.wood), -0.18, 0, 0), 0, 0.45, 0.09));
    board.add(at(rot(box(0.62, 0.86, 0.04, COL.wood), 0.18, 0, 0), 0, 0.45, -0.09));
    const face = atlas.panel(0.52, 0.72, 104, 144, (c, w, h) => {
      c.fillStyle = '#33403a';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Open today', w / 2, 20, w * 0.86, 17, 700);
      c.fillStyle = '#ffd166';
      fitText(c, 'Lessons at 5', w / 2, 48, w * 0.86, 14, 600);
      c.fillStyle = '#ffffff';
      fitText(c, 'Masks for two', w / 2, 72, w * 0.86, 14, 600);
      c.fillStyle = '#ff9eb5';
      heartPath(c, w / 2, 108, 30);
      c.fill();
      c.fillStyle = '#33403a';
      fitText(c, 'R+H', w / 2, 106, 24, 11, 700);
    });
    face.rotation.x = -0.18;
    face.position.set(0, 0.47, 0.118);
    board.add(face);
    board.position.set(cx, 0, cz);
    board.rotation.y = 0.3;
    add(board);
    col({ type: 'box', x: cx, z: cz, hw: 0.32, hd: 0.2 });
  }

  // ---------------------------------------------------------------- a weather vane: crossed foils and a heart, turning in the breeze
  const vane = new THREE.Group();
  vane.add(at(cyl(0.015, 0.015, 0.7, goldM, 6), 0, 0.35, 0));
  const arrow = new THREE.Group();
  arrow.add(at(rot(cyl(0.008, 0.008, 0.62, goldM, 5), 0, 0, P / 2), 0, 0, 0));
  arrow.add(at(rot(k.heart(0.16, 0.02, COL.pink), 0, 0, -P / 2), 0.32, 0, 0));
  arrow.add(at(rot(box(0.12, 0.1, 0.01, goldM), 0, 0, 0), -0.3, 0, 0));
  arrow.position.y = 0.62;
  bakeParts(arrow);
  vane.add(dyn(arrow));
  vane.add(at(sph(0.04, goldM, undefined, 8), 0, 0.72, 0));
  vane.position.set(bx, bh + 1.37, bz);
  add(vane);
  updates.push((dt, t) => (arrow.rotation.y = Math.sin(t * 0.23) * 0.9 + Math.sin(t * 0.71) * 0.25));

  // ---------------------------------------------------------------- two pigeons on the roof top
  const pigeons = [];
  for (const [px, ry] of [[bx - 1.6, 0.4], [bx - 1.25, -0.6]]) {
    const p = new THREE.Group();
    const grey = mat('#a9b0c2', { rough: 0.8 });
    p.add(at(sph(0.08, grey, undefined, 8), 0, 0.08, 0)).children.at(-1).scale.set(1, 0.85, 1.35);
    const head = new THREE.Group();
    head.add(at(sph(0.045, '#8f97ab', undefined, 8), 0, 0, 0));
    head.add(at(rot(cone(0.012, 0.035, COL.gold, 5), P / 2, 0, 0), 0, -0.005, 0.05));
    head.position.set(0, 0.16, 0.07);
    bakeParts(head);
    p.add(dyn(head));
    p.add(at(sph(0.05, '#7bb3a1', undefined, 6), 0, 0.12, 0.06)).children.at(-1).scale.set(1, 0.6, 0.8);
    p.position.set(px, bh + 1.37, topZ - 0.15);
    p.rotation.y = ry;
    add(p);
    pigeons.push({ head, ph: Math.random() * 6 });
  }
  updates.push((dt, t) => {
    for (const q of pigeons) {
      const b = Math.max(0, Math.sin(t * 2.2 + q.ph));
      q.head.position.z = 0.07 + b * b * 0.04;
      q.head.rotation.x = b * 0.5;
    }
  });

  // ---------------------------------------------------------------- night halos round the lanterns and the bulbs
  const haloTex = glowTexture();
  const haloPts = [...lanterns, ...bulbs.filter((_, i) => i % 2 === 0)];
  const halos = new THREE.Points(new THREE.BufferGeometry().setFromPoints(haloPts), new THREE.PointsMaterial({ size: 1.2, map: haloTex, color: '#ffd9a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halos.frustumCulled = false;
  add(dyn(halos));
  dynamic.push(screen);

  // Plain-coloured static parts become a few vertex-coloured meshes
  dynamic.push(...colorBake(g, dynamic));

  // ---------------------------------------------------------------- colliders for the building
  col({ type: 'box', x: bx, z: bz, hw: bw / 2 + 0.06, hd: bd / 2 + 0.06 });

  let tw = 0;
  return {
    dynamic,
    update(dt, t, near) {
      for (const fn of updates) fn(dt, t);
      const night = st.world?.nightGlow ?? 0;
      halos.material.opacity = clamp((night - 0.15) * 1.4, 0, 0.85);
      bulbMat.color.setScalar(0.75 + night * 0.6);
      tw += dt;
      if (tw > 0.25) {
        tw = 0;
        bulbs.forEach((_, i) => bulbMesh.setColorAt(i, bulbCols[(i + Math.floor(t * 1.5)) % 4]));
        bulbMesh.instanceColor.needsUpdate = true;
      }
      for (let i = 0; i < 2; i++) {
        lampT[i] = Math.max(0, lampT[i] - dt);
        lampMats[i].color.copy(lampT[i] > 0 ? lampOn[i] : lampOff[i]);
      }
      if (near < 0.05) return;
      // the fencers keep practising while anyone is close enough to see
      if (!seg || segT >= seg.d) {
        if (!queue.length) queue = exchange();
        seg = queue.shift();
        segT = 0;
        seg.go();
      }
      segT += dt;
      fencers.forEach((f, i) => {
        f.kid.update(dt, t, 0, 0, 0);
        f.apply(dt, PISTE.x + (i ? GUARD : -GUARD), 0.065, PISTE.z);
      });
    },
  };
}
