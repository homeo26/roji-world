import * as THREE from 'three';
import { mat, mesh, damp, clamp } from './util.js';
import { hasSkirt } from './looks.js';

// A chibi kid (Roji or Homama) built from primitives and a look from looks.js.
// Frame: feet at y = 0, faces local +Z, about 1.4 units tall.
// Limb arrays: index 0 is the kid's left side (+X), index 1 the right side (-X).

const WHITE = '#fffaf4';
const EYE = '#1d130f';

function shade(hex, k) {
  return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
}

// Hair: soft strands (map) and a glossy shine band near the crown (emissive map), per colour.
let strandTex = null;
let shineTex = null;
function hairTextures() {
  if (strandTex) return [strandTex, shineTex];
  const make = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  strandTex = make(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 150; i++) {
      const x = r() * w;
      const dark = r() < 0.55;
      ctx.strokeStyle = dark ? `rgba(0,0,0,${0.1 + r() * 0.16})` : `rgba(255,255,255,${0.12 + r() * 0.15})`;
      ctx.lineWidth = 1 + r() * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (r() - 0.5) * 14, h * 0.35, x + (r() - 0.5) * 14, h * 0.7, x + (r() - 0.5) * 10, h);
      ctx.stroke();
    }
  });
  shineTex = make(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, h * 0.14, 0, h * 0.42);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    for (let x = 0; x < w; x += 16) {
      const wob = Math.sin(x * 0.11) * 5;
      ctx.fillRect(x + 2, h * 0.14 + wob, 12, h * 0.28);
    }
  });
  return [strandTex, shineTex];
}
const hairCache = new Map();
function hairMat(hex) {
  if (hairCache.has(hex)) return hairCache.get(hex);
  const [map, shine] = hairTextures();
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  const glow = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 0.8), Math.min(0.85, hsl.l * 0.6 + 0.3));
  const m = new THREE.MeshStandardMaterial({ color: c, map, roughness: 0.42, emissive: glow, emissiveMap: shine, emissiveIntensity: 0.32 });
  hairCache.set(hex, m);
  return m;
}

export const EMOTES = {
  wave: { name: 'Wave', duration: 1.8 },
  dance: { name: 'Dance', duration: 3.6 },
  spin: { name: 'Spin', duration: 1.5 },
  cheer: { name: 'Cheer', duration: 1.7 },
  heart: { name: 'Heart', duration: 2.2 },
  bow: { name: 'Bow', duration: 1.4 },
  // More dances. duo: a dance for two; when the partner is close they take their place for it
  // ('side': side by side holding hands, 'face': facing each other). See src/life/npcs/dances.js.
  dabke: { name: 'Dabke', duration: 4.8, duo: 'side' },
  slow: { name: 'Slow dance', duration: 7.2, duo: 'face' },
  twirl: { name: 'Twirl', duration: 2.2 },
  robot: { name: 'Robot', duration: 3.6 },
  salsa: { name: 'Salsa', duration: 4.2, duo: 'face' },
  moonwalk: { name: 'Moonwalk', duration: 3.4 },
  hop: { name: 'Happy hop', duration: 2.8 },
  shimmy: { name: 'Shimmy', duration: 2.6 },
  ballet: { name: 'Ballet', duration: 3.8 },
  jazz: { name: 'Jazz hands', duration: 2.4 },
  // Moves for two (games and places trigger these; they are not on the dance wheel)
  kiss: { name: 'Kiss', duration: 1.6, wheel: false },
  hug: { name: 'Hug', duration: 2.4, wheel: false },
  nod: { name: 'Nod', duration: 1.6, wheel: false },
  // With people around town (src/life/npcs.js)
  highfive: { name: 'High five', duration: 1.3, wheel: false },
  handshake: { name: 'Handshake', duration: 1.6, wheel: false },
  selfie: { name: 'Selfie', duration: 2.4, wheel: false },
};

// Robot dance poses, one every 0.3 s: [left arm x, left arm z, right arm x, right arm z, body turn, head turn]
const ROBOT = [
  [-1.57, 0.1, -1.57, -0.1, 0, 0],
  [0, 1.57, -1.57, -0.1, 0.5, -0.4],
  [0, 1.57, 0, -1.57, 0, 0.4],
  [-1.57, 0.1, 0.3, -2.5, -0.5, 0],
  [0.3, 2.5, 0.3, -2.5, 0, 0],
  [-0.8, 0.9, -0.8, -0.9, 0.5, 0.4],
  [0, 1.57, -1.57, -0.1, -0.5, -0.4],
  [-1.57, 0.1, -1.57, -0.1, 0, 0],
];
const ROBOT_REST = [0, 0.18, 0, -0.18, 0, 0];
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const bump = (x, a, b) => (x <= a || x >= b ? 0 : Math.sin((Math.PI * (x - a)) / (b - a)));

export class Kid {
  constructor(look) {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.walkPhase = 0;
    this.walkAmount = 0;
    this.blinkTimer = 2 + Math.random() * 2;
    this.blink = 0;
    this.lookYaw = 0;
    this.tailSwing = new THREE.Vector2();
    this.tailVel = new THREE.Vector2();
    this.squash = 1;
    this.pose = 'stand'; // stand | sit | sleep | ride | drive | swim | ski | bike
    this.hands = null; // null | carry | type | stir | read | hold | wave2 (arms on top of any pose)
    this.flip = 0; // 0..1 progress of a forward flip (double jump)
    this.holdSide = 0; // +1 holding with the left hand, -1 with the right
    this.emoteType = null;
    this.emoteTime = 0;
    this.onEmoteFx = null;
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 24),
      new THREE.MeshBasicMaterial({ color: '#2b3b2a', transparent: true, opacity: 0.22, depthWrite: false }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.015;
    this.blob.renderOrder = 1;
    this.root.add(this.blob);
    this.setLook(look);
  }

  get name() {
    return this.look.name;
  }

  setLook(look) {
    this.look = { ...look };
    for (const c of [...this.body.children]) {
      c.traverse((o) => o.geometry?.dispose());
      this.body.remove(c);
    }
    this.build();
  }

  build() {
    const L = this.look;
    const skin = mat(L.skin, { rough: 0.6 });
    const hair = hairMat(L.hair);
    const top = mat(L.top, { rough: 0.7 });
    const bottom = mat(L.bottom, { rough: 0.7 });
    const white = mat(WHITE, { rough: 0.7 });
    const shoe = mat(L.shoes, { rough: 0.4 });
    const accent = mat(L.accent || '#ff7fa3', { rough: 0.5 });
    const outfit = L.outfit;
    const longLegs = outfit === 'tee-pants' || outfit === 'overalls' || outfit === 'hoodie';
    const B = this.body;

    // Legs
    this.legs = [];
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.1 * side, 0.33, 0);
      if (longLegs) {
        const leg = mesh(new THREE.CapsuleGeometry(0.062, 0.16, 4, 10), bottom);
        leg.position.y = -0.11;
        pivot.add(leg);
      } else {
        const leg = mesh(new THREE.CapsuleGeometry(0.052, 0.12, 4, 10), skin);
        leg.position.y = -0.1;
        pivot.add(leg);
        if (outfit === 'tee-shorts') {
          const s = mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.12, 12), bottom);
          s.position.y = -0.03;
          pivot.add(s);
        }
      }
      const sock = mesh(new THREE.CylinderGeometry(0.058, 0.056, 0.08, 12), white);
      sock.position.y = -0.2;
      const foot = mesh(new THREE.SphereGeometry(0.075, 14, 10), shoe);
      foot.scale.set(1, 0.72, 1.45);
      foot.position.set(0, -0.265, 0.03);
      pivot.add(sock, foot);
      B.add(pivot);
      this.legs.push(pivot);
    }

    // Torso
    const lathe = (pts, m) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 28), m);
    const ring = (r, tube, y, m) => {
      const t = mesh(new THREE.TorusGeometry(r, tube, 8, 32), m);
      t.rotation.x = Math.PI / 2;
      t.position.y = y;
      B.add(t);
      return t;
    };
    if (outfit === 'dress') {
      this.torso = lathe([[0, 0.29], [0.3, 0.29], [0.335, 0.31], [0.315, 0.36], [0.25, 0.5], [0.19, 0.62], [0.165, 0.72], [0.12, 0.76], [0, 0.77]], top);
      B.add(this.torso);
      ring(0.318, 0.022, 0.305, white);
      ring(0.205, 0.022, 0.6, mat(shade(L.top, 0.82), { rough: 0.6 }));
    } else if (outfit === 'skirt') {
      this.torso = lathe([[0, 0.46], [0.19, 0.46], [0.2, 0.56], [0.17, 0.72], [0.12, 0.77], [0, 0.78]], top);
      B.add(this.torso);
      B.add(lathe([[0, 0.3], [0.29, 0.3], [0.31, 0.33], [0.2, 0.5], [0, 0.5]], bottom));
      ring(0.3, 0.02, 0.315, white);
    } else {
      const wide = outfit === 'hoodie' ? 1.08 : 1;
      this.torso = lathe([[0, 0.3], [0.19 * wide, 0.3], [0.205 * wide, 0.42], [0.195 * wide, 0.6], [0.17 * wide, 0.72], [0.12, 0.77], [0, 0.78]], top);
      B.add(this.torso);
      const hips = mesh(new THREE.CylinderGeometry(0.205, 0.2, 0.16, 20), bottom);
      hips.position.y = 0.36;
      B.add(hips);
      if (outfit === 'overalls') {
        const bib = mesh(new THREE.BoxGeometry(0.24, 0.2, 0.06), bottom);
        bib.position.set(0, 0.52, 0.17);
        B.add(bib);
        for (const s of [1, -1]) {
          const strap = mesh(new THREE.BoxGeometry(0.05, 0.3, 0.04), bottom);
          strap.position.set(0.09 * s, 0.6, 0.15);
          strap.rotation.x = -0.25;
          const back = strap.clone();
          back.position.z = -0.17;
          back.rotation.x = 0.25;
          const btn = mesh(new THREE.SphereGeometry(0.022, 8, 6), mat('#f4c24f', { metal: 0.6, rough: 0.3 }));
          btn.position.set(0.09 * s, 0.6, 0.205);
          B.add(strap, back, btn);
        }
      } else if (outfit === 'hoodie') {
        const hood = mesh(new THREE.TorusGeometry(0.13, 0.06, 8, 16), top);
        hood.position.set(0, 0.76, -0.1);
        hood.rotation.x = -1.1;
        const pocket = mesh(new THREE.BoxGeometry(0.22, 0.1, 0.04), mat(shade(L.top, 0.85)));
        pocket.position.set(0, 0.44, 0.19);
        B.add(hood, pocket);
        for (const s of [1, -1]) {
          const str = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), white);
          str.position.set(0.04 * s, 0.68, 0.16);
          B.add(str);
        }
      } else {
        ring(0.13, 0.02, 0.765, mat(shade(L.top, 0.8)));
      }
    }
    if (outfit === 'dress' || outfit === 'skirt') {
      for (const s of [1, -1]) {
        const c = mesh(new THREE.SphereGeometry(0.075, 14, 10), white);
        c.scale.set(1.1, 0.38, 0.8);
        c.position.set(0.06 * s, 0.755, 0.08);
        c.rotation.z = -0.3 * s;
        B.add(c);
      }
    }

    // Arms
    this.arms = [];
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.19 * side, 0.69, 0);
      pivot.rotation.z = 0.18 * side;
      if (outfit === 'dress' || outfit === 'skirt') {
        const sleeve = mesh(new THREE.SphereGeometry(0.085, 14, 10), top);
        sleeve.scale.set(1, 0.9, 1);
        pivot.add(sleeve);
      } else if (outfit === 'hoodie') {
        const sleeve = mesh(new THREE.CapsuleGeometry(0.055, 0.18, 4, 10), top);
        sleeve.position.y = -0.14;
        pivot.add(sleeve);
      } else {
        const sleeve = mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.12, 12), top);
        sleeve.position.y = -0.04;
        pivot.add(sleeve);
      }
      if (outfit !== 'hoodie') {
        const arm = mesh(new THREE.CapsuleGeometry(0.047, 0.17, 4, 10), skin);
        arm.position.y = -0.15;
        pivot.add(arm);
      }
      const hand = mesh(new THREE.SphereGeometry(0.058, 12, 10), skin);
      hand.position.y = -0.28;
      pivot.add(hand);
      B.add(pivot);
      this.arms.push(pivot);
    }

    const neck = mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.08, 12), skin);
    neck.position.y = 0.79;
    B.add(neck);

    // Head
    this.head = new THREE.Group();
    this.head.position.y = 0.8;
    B.add(this.head);
    const HC = new THREE.Vector3(0, 0.29, 0);
    const R = 0.3;
    const H = this.head;
    const skull = mesh(new THREE.SphereGeometry(R, 32, 24), skin);
    skull.position.copy(HC);
    skull.scale.set(1.02, 0.96, 0.98);
    H.add(skull);
    for (const s of [1, -1]) {
      const ear = mesh(new THREE.SphereGeometry(0.06, 10, 8), skin);
      ear.position.set(HC.x + 0.29 * s, HC.y - 0.03, HC.z);
      ear.scale.set(0.6, 1, 0.8);
      H.add(ear);
    }
    this.tails = [];
    this.buildHair(L.hairstyle, hair, accent, HC);

    // Face
    const eyeMat = mat(EYE, { rough: 0.2 });
    this.eyes = [];
    for (const side of [1, -1]) {
      const g = new THREE.Group();
      g.position.set(HC.x + 0.108 * side, HC.y - 0.025, HC.z + 0.262);
      const e = mesh(new THREE.SphereGeometry(0.052, 16, 12), eyeMat, { cast: false });
      e.scale.set(0.82, 1.12, 0.45);
      const shine = mesh(new THREE.SphereGeometry(0.016, 8, 6), mat('#ffffff', { rough: 0.1, emissive: '#ffffff', ei: 0.6 }), { cast: false });
      shine.position.set(0.014 * side, 0.024, 0.02);
      g.add(e, shine);
      g.lookAt(HC.x + 0.108 * side * 3, HC.y - 0.025, HC.z + 3);
      H.add(g);
      this.eyes.push(g);
      if (L.gender === 'girl') {
        const lash = mesh(new THREE.TorusGeometry(0.045, 0.008, 4, 10, Math.PI * 0.9), eyeMat, { cast: false });
        lash.position.set(HC.x + 0.108 * side, HC.y + 0.012, HC.z + 0.268);
        lash.rotation.set(-0.2, 0.35 * side, 0.15 + Math.PI * 0.05);
        H.add(lash);
      } else {
        const brow = mesh(new THREE.CapsuleGeometry(0.012, 0.05, 2, 6), mat(L.hair, { rough: 0.5 }), { cast: false });
        brow.rotation.z = Math.PI / 2 + 0.15 * side;
        brow.position.set(HC.x + 0.11 * side, HC.y + 0.06, HC.z + 0.272);
        H.add(brow);
      }
      const cheek = new THREE.Mesh(
        new THREE.CircleGeometry(0.045, 18),
        new THREE.MeshBasicMaterial({ color: '#ff8fa0', transparent: true, opacity: L.gender === 'girl' ? 0.55 : 0.35, depthWrite: false }),
      );
      const cp = new THREE.Vector3(0.175 * side, -0.095, 0).add(HC);
      cp.z = HC.z + Math.sqrt(R * R - 0.175 * 0.175 - 0.095 * 0.095) + 0.004;
      cheek.position.copy(cp);
      cheek.lookAt(cp.clone().sub(HC).multiplyScalar(3).add(HC));
      H.add(cheek);
    }
    this.mouth = mesh(new THREE.TorusGeometry(0.036, 0.01, 6, 14, Math.PI), mat('#b23a48', { rough: 0.5 }), { cast: false });
    this.mouth.rotation.set(-0.25, 0, Math.PI);
    this.mouth.position.set(HC.x, HC.y - 0.105, HC.z + 0.278);
    H.add(this.mouth);
    const nose = mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(shade(L.skin, 0.95), { rough: 0.6 }), { cast: false });
    nose.position.set(HC.x, HC.y - 0.055, HC.z + 0.298);
    H.add(nose);

    // Grown-ups: a moustache and a beard (look.mustache / look.beard: true or a colour)
    const facial = L.beard || L.mustache;
    if (facial) {
      const fm = mat(typeof facial === 'string' ? facial : L.hair, { rough: 0.8 });
      const tache = mesh(new THREE.CapsuleGeometry(0.026, 0.1, 4, 8), fm, { cast: false });
      tache.rotation.z = Math.PI / 2;
      tache.position.set(HC.x, HC.y - 0.078, HC.z + 0.288);
      tache.scale.set(1, 1, 0.7);
      H.add(tache);
      for (const s of [1, -1]) {
        const end = mesh(new THREE.SphereGeometry(0.024, 8, 6), fm, { cast: false });
        end.position.set(HC.x + 0.068 * s, HC.y - 0.094, HC.z + 0.272);
        H.add(end);
      }
      if (L.beard) {
        const beard = mesh(new THREE.SphereGeometry(R * 1.01, 24, 12, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.6, Math.PI * 0.3), fm, { cast: false });
        beard.position.copy(HC);
        beard.rotation.y = 0;
        beard.material.side = THREE.DoubleSide;
        H.add(beard);
        this.mouth.position.z += 0.012;
      }
    }

    // Anchor in front of the chest for carried things (gift box, book, plate)
    this.carryAnchor = new THREE.Group();
    this.carryAnchor.position.set(0, 0.5, 0.3);
    B.add(this.carryAnchor);
    if (this.carried) this.carryAnchor.add(this.carried);
  }

  // Hold an object in both hands in front of the chest (null to let go). Returns the previous one.
  carry(obj) {
    const prev = this.carried || null;
    if (prev) prev.removeFromParent();
    this.carried = obj || null;
    this.hands = obj ? 'carry' : this.hands === 'carry' ? null : this.hands;
    if (obj) this.carryAnchor.add(obj);
    return prev;
  }

  buildHair(style, hair, accent, HC) {
    const H = this.head;
    const girl = this.look.gender === 'girl';
    const add = (m) => {
      H.add(m);
      return m;
    };
    // Grown-ups only: a bald crown with a horseshoe of short hair round the back and sides
    if (style === 'bald') {
      const ring = add(mesh(new THREE.TorusGeometry(0.27, 0.05, 8, 24, Math.PI * 1.25), hair));
      ring.position.set(HC.x, HC.y + 0.01, HC.z - 0.01);
      // The arc lies flat round the head with its open part over the forehead
      ring.rotation.set(Math.PI / 2 - 0.12, 0, Math.PI * 0.875);
      ring.scale.set(1.12, 1.1, 1);
      return;
    }
    const cap = (len = 1.12, r = 0.33) => {
      const m = add(mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, len), hair));
      m.position.copy(HC);
      m.material.side = THREE.DoubleSide;
      return m;
    };
    const back = (start = 0.85, len = 1.42, win = 1.55, sx = 1.04) => {
      const m = add(mesh(new THREE.SphereGeometry(0.335, 32, 18, Math.PI / 2 + win / 2, Math.PI * 2 - win, start, len), hair));
      m.position.copy(HC);
      m.scale.set(sx, 1, 1.02);
      return m;
    };
    const bangs = (angles = [-0.62, -0.26, 0.1, 0.44], y = 0.13) => {
      const g = new THREE.SphereGeometry(0.1, 14, 10);
      angles.forEach((a, i) => {
        const b = add(mesh(g, hair));
        const r = 0.285;
        b.position.set(HC.x + Math.sin(a) * r, HC.y + y - Math.abs(a) * 0.05, HC.z + Math.cos(a) * r);
        b.scale.set(1.05, 0.72 + (i % 2) * 0.12, 0.55);
        b.lookAt(HC.x + Math.sin(a) * 2, HC.y + 0.2, HC.z + Math.cos(a) * 2);
      });
    };
    const swing = (pos, parts) => {
      const pivot = new THREE.Group();
      pivot.position.copy(pos);
      for (const p of parts) pivot.add(p);
      add(pivot);
      return pivot;
    };
    const tie = () => mesh(new THREE.SphereGeometry(0.048, 12, 8), accent);

    switch (style) {
      case 'pigtails': {
        cap();
        back();
        bangs();
        for (const side of [1, -1]) {
          const tail = mesh(new THREE.SphereGeometry(0.11, 16, 12), hair);
          tail.scale.set(0.8, 1.45, 0.8);
          tail.position.set(0.05 * side, -0.15, -0.02);
          tail.rotation.z = 0.35 * side;
          const tip = mesh(new THREE.SphereGeometry(0.06, 12, 8), hair);
          tip.position.set(0.1 * side, -0.29, -0.02);
          const pivot = swing(new THREE.Vector3(HC.x + 0.27 * side, HC.y - 0.02, HC.z - 0.1), [tie(), tail, tip]);
          this.tails.push({ pivot, side, base: [0.15 * side, 0.2] });
        }
        break;
      }
      case 'ponytail': {
        cap();
        back(0.85, 1.35);
        bangs();
        const tail = mesh(new THREE.SphereGeometry(0.12, 16, 12), hair);
        tail.scale.set(0.85, 1.9, 0.85);
        tail.position.set(0, -0.2, -0.04);
        const pivot = swing(new THREE.Vector3(HC.x, HC.y + 0.16, HC.z - 0.3), [tie(), tail]);
        this.tails.push({ pivot, side: 0, base: [0, 0.35] });
        break;
      }
      case 'bob': {
        cap();
        const b = back(0.85, 1.72, 1.6, 1.1);
        b.scale.z = 1.06;
        bangs([-0.7, -0.35, 0, 0.35, 0.7], 0.12);
        break;
      }
      case 'long': {
        cap();
        back(0.85, 1.55, 1.55, 1.06);
        bangs([-0.62, -0.2, 0.22, 0.6], 0.13);
        const sheet = mesh(new THREE.SphereGeometry(0.3, 20, 14), hair);
        sheet.scale.set(1.05, 1.55, 0.42);
        sheet.position.set(0, -0.26, -0.04);
        const pivot = swing(new THREE.Vector3(HC.x, HC.y - 0.08, HC.z - 0.16), [sheet]);
        this.tails.push({ pivot, side: 0, base: [0, 0.08], soft: true });
        break;
      }
      case 'buns': {
        cap();
        back(0.85, 1.3);
        bangs();
        for (const side of [1, -1]) {
          const bun = add(mesh(new THREE.SphereGeometry(0.115, 16, 12), hair));
          bun.position.set(HC.x + 0.17 * side, HC.y + 0.27, HC.z - 0.04);
          const t = add(tie());
          t.position.set(HC.x + 0.15 * side, HC.y + 0.2, HC.z - 0.02);
          t.scale.setScalar(0.8);
        }
        break;
      }
      case 'curly': {
        cap(1.15);
        back(0.8, 1.05, 1.95, 1.04);
        const g = new THREE.SphereGeometry(0.085, 10, 8);
        for (let i = 0; i < 26; i++) {
          const th = 0.25 + (i % 4) * 0.27;
          const ph = (i / 26) * Math.PI * 2 * 3.1;
          if (th > 0.9 && Math.cos(ph) > 0.4) continue;
          const c = add(mesh(g, hair));
          c.position.set(HC.x + Math.sin(th) * Math.sin(ph) * 0.33, HC.y + Math.cos(th) * 0.33, HC.z + Math.sin(th) * Math.cos(ph) * 0.33);
        }
        break;
      }
      case 'spiky': {
        cap(1.15);
        back(0.8, 1.05, 1.95, 1.03);
        const cone = new THREE.ConeGeometry(0.07, 0.2, 8);
        for (let i = 0; i < 11; i++) {
          const th = 0.15 + (i % 3) * 0.32;
          const ph = (i / 11) * Math.PI * 2;
          const n = new THREE.Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
          const c = add(mesh(cone, hair));
          c.position.copy(HC).addScaledVector(n, 0.33);
          c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        }
        bangs([-0.4, 0, 0.4], 0.17);
        break;
      }
      case 'sidepart': {
        cap(1.18);
        back(0.8, 1.05, 1.95, 1.03);
        const swoop = add(mesh(new THREE.SphereGeometry(0.14, 16, 12), hair));
        swoop.scale.set(1.7, 0.55, 0.7);
        swoop.position.set(HC.x - 0.07, HC.y + 0.17, HC.z + 0.22);
        swoop.rotation.set(-0.5, 0, -0.25);
        break;
      }
      default: {
        // short
        cap(1.2);
        back(0.8, 1.05, 1.95, 1.03);
        bangs([-0.45, -0.12, 0.2, 0.5], 0.18);
      }
    }
    if (girl && style !== 'buns') {
      const bow = new THREE.Group();
      for (const side of [1, -1]) {
        const wing = mesh(new THREE.SphereGeometry(0.06, 12, 8), accent);
        wing.scale.set(1.2, 0.8, 0.5);
        wing.position.x = 0.06 * side;
        bow.add(wing);
      }
      bow.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), mat(shade(this.look.accent || '#ff7fa3', 0.85), { rough: 0.5 })));
      bow.position.set(HC.x - 0.17, HC.y + 0.23, HC.z + 0.13);
      bow.rotation.set(-0.5, 0.5, 0.35);
      H.add(bow);
    }
  }

  emote(type) {
    if (!EMOTES[type] || this.pose !== 'stand') return;
    this.emoteType = type;
    this.emoteTime = 0;
    if (type === 'heart') setTimeout(() => this.onEmoteFx?.('heart', this), 500);
  }

  wave() {
    this.emote('wave');
  }

  cancelEmote() {
    this.emoteType = null;
  }

  // speed: ground speed; air: height above ground; turnRate: rad/s
  update(dt, t, speed = 0, air = 0, turnRate = 0) {
    const pose = this.pose;
    const standing = pose === 'stand';
    const moving = clamp(speed / 4.5, 0, 1.4);
    this.walkAmount = damp(this.walkAmount, !standing ? 0 : air > 0.01 ? 0.2 : moving, 10, dt);
    this.walkPhase += dt * (4 + speed * 2.4);
    if (this.emoteType && moving > 0.2) this.emoteType = null;
    const s = Math.sin(this.walkPhase);
    const w = this.walkAmount;
    const B = this.body;
    const [legL, legR] = this.legs;
    const [armL, armR] = this.arms;

    // Base walk pose
    legL.rotation.set(s * 0.75 * w, 0, 0);
    legR.rotation.set(-s * 0.75 * w, 0, 0);
    B.position.set(0, Math.abs(Math.cos(this.walkPhase)) * 0.07 * w, 0);
    // Walk lean is kept apart from the body rotation, so a flip or a bow never carries into the next frame
    this.lean = damp(this.lean || 0, 0.1 * w, 8, dt);
    B.rotation.set(this.lean, 0, 0);
    const breathe = Math.sin(t * 2.2) * 0.012;
    this.torso.scale.set(1 + breathe * 0.5, 1 + breathe, 1 + breathe * 0.5);
    const swingA = -s * 0.65 * w;
    armL.rotation.set(swingA, 0, damp(armL.rotation.z, 0.18, 10, dt));
    armR.rotation.set(-swingA, 0, damp(armR.rotation.z, -0.18, 10, dt));
    if (air > 0.01) {
      armL.rotation.z = damp(armL.rotation.z, 1.2, 12, dt);
      armR.rotation.z = damp(armR.rotation.z, -1.2, 12, dt);
    }

    // Holding hands: the arm on the partner's side reaches out
    if (this.holdSide && standing) {
      const arm = this.holdSide > 0 ? armL : armR;
      arm.rotation.z = 0.62 * this.holdSide;
      arm.rotation.x = swingA * 0.25;
    }

    // Seated poses
    if (pose === 'sit' || pose === 'drive' || pose === 'ride') {
      legL.rotation.x = legR.rotation.x = pose === 'ride' ? -0.5 : -1.5;
      if (pose === 'ride') {
        legL.rotation.z = 0.55;
        legR.rotation.z = -0.55;
      }
      const reach = pose === 'drive' ? -1.15 : pose === 'ride' ? -0.95 : -0.55;
      armL.rotation.set(reach, 0, 0.12);
      armR.rotation.set(reach, 0, -0.12);
      B.rotation.x = pose === 'ride' ? 0.08 : -0.05;
    } else if (pose === 'sleep') {
      armL.rotation.set(0, 0, 0.12);
      armR.rotation.set(-0.4, 0, -0.5);
      B.position.y = Math.sin(t * 1.6) * 0.008;
    } else if (pose === 'swim') {
      // speed > 0.4: front crawl; otherwise tread water upright
      this.swimPhase = (this.swimPhase || 0) + dt * (3 + speed * 1.6);
      const sp = this.swimPhase;
      const crawl = clamp(speed / 2, 0, 1);
      this.swimLean = damp(this.swimLean || 0, crawl, 4, dt);
      const lean = this.swimLean;
      B.rotation.x = lean * 1.25;
      B.position.set(0, -0.62 + lean * 0.38 + Math.sin(t * 2.4) * 0.03, -lean * 0.2);
      legL.rotation.set(Math.sin(sp * 2.2) * (0.25 + lean * 0.3), 0, 0.08);
      legR.rotation.set(-Math.sin(sp * 2.2) * (0.25 + lean * 0.3), 0, -0.08);
      if (lean > 0.3) {
        armL.rotation.set(-sp % (Math.PI * 2), 0, 0.15);
        armR.rotation.set(-(sp + Math.PI) % (Math.PI * 2), 0, -0.15);
      } else {
        armL.rotation.set(-0.3, 0, 1.0 + Math.sin(sp * 1.5) * 0.35);
        armR.rotation.set(-0.3, 0, -1.0 - Math.sin(sp * 1.5) * 0.35);
      }
    } else if (pose === 'ski') {
      const tuck = clamp(speed / 10, 0, 1);
      legL.rotation.set(-0.35 - tuck * 0.25, 0, 0.04);
      legR.rotation.set(-0.35 - tuck * 0.25, 0, -0.04);
      B.position.y = -0.06 - tuck * 0.05;
      B.rotation.set(0.22 + tuck * 0.2, 0, clamp(-turnRate * 0.12, -0.35, 0.35));
      armL.rotation.set(-0.55 + Math.sin(t * 3) * 0.05, 0, 0.35);
      armR.rotation.set(-0.55 - Math.sin(t * 3) * 0.05, 0, -0.35);
    } else if (pose === 'bike') {
      this.pedal = (this.pedal || 0) + dt * (2 + speed * 2.2);
      legL.rotation.set(-1.15 + Math.sin(this.pedal) * 0.55, 0, 0.06);
      legR.rotation.set(-1.15 - Math.sin(this.pedal) * 0.55, 0, -0.06);
      armL.rotation.set(-1.05, 0, 0.1);
      armR.rotation.set(-1.05, 0, -0.1);
      B.rotation.set(0.28, 0, clamp(-turnRate * 0.1, -0.3, 0.3));
    }

    // Tucked legs mid-air
    if (standing && air > 0.15) {
      const tk = clamp((air - 0.15) * 2, 0, 1) * 0.7;
      legL.rotation.x -= tk;
      legR.rotation.x -= tk * 0.6;
    }

    // Arm presets that sit on top of any pose
    if (this.hands) {
      const h = this.hands;
      if (h === 'carry') {
        armL.rotation.set(-1.25, 0, -0.32);
        armR.rotation.set(-1.25, 0, 0.32);
      } else if (h === 'type') {
        armL.rotation.set(-1.35 + Math.max(0, Math.sin(t * 17)) * 0.12, 0, -0.18);
        armR.rotation.set(-1.35 + Math.max(0, Math.sin(t * 15 + 1)) * 0.12, 0, 0.18);
      } else if (h === 'stir') {
        armL.rotation.set(-0.9, 0, -0.15);
        armR.rotation.set(-1.05 + Math.sin(t * 6) * 0.18, Math.cos(t * 6) * 0.25, 0.1);
      } else if (h === 'read') {
        armL.rotation.set(-1.05, 0, -0.42);
        armR.rotation.set(-1.05, 0, 0.42);
      } else if (h === 'hold') {
        armR.rotation.set(-1.2, 0, 0.1);
      } else if (h === 'wave2') {
        armL.rotation.set(0, 0, 2.3 + Math.sin(t * 12) * 0.3);
        armR.rotation.set(0, 0, -2.3 - Math.sin(t * 12 + 1) * 0.3);
      }
    }

    // Forward flip around the waist (double jump)
    if (this.flip > 0) {
      const a = this.flip * Math.PI * 2;
      B.rotation.x += a;
      B.position.y += 0.5 - 0.5 * Math.cos(a);
      B.position.z -= 0.5 * Math.sin(a);
    }

    // Emotes
    if (this.emoteType && standing) {
      this.emoteTime += dt;
      const e = this.emoteType;
      const T = this.emoteTime;
      const D = EMOTES[e].duration;
      const k = Math.min(1, T * 4, (D - T) * 4);
      if (e === 'wave') {
        armR.rotation.z = -0.18 - k * (2.4 + Math.sin(t * 14) * 0.3);
        armR.rotation.x = 0;
      } else if (e === 'dance') {
        const b = T * 8;
        B.position.y += Math.abs(Math.sin(b)) * 0.12 * k;
        B.rotation.y = Math.sin(T * 4) * 0.45 * k;
        armL.rotation.z = 0.2 + (1 + Math.sin(b)) * 1.1 * k;
        armR.rotation.z = -(0.2 + (1 + Math.sin(b + Math.PI)) * 1.1 * k);
        legL.rotation.x = Math.max(0, Math.sin(b)) * -0.5 * k;
        legR.rotation.x = Math.max(0, -Math.sin(b)) * -0.5 * k;
      } else if (e === 'spin') {
        const p = Math.min(1, T / (D * 0.85));
        B.rotation.y = (1 - Math.pow(1 - p, 3)) * Math.PI * 2;
        armL.rotation.z = 1.4 * k;
        armR.rotation.z = -1.4 * k;
        B.position.y += Math.sin(p * Math.PI) * 0.12;
      } else if (e === 'cheer') {
        B.position.y += Math.abs(Math.sin((T / 0.8) * Math.PI)) * 0.35 * k;
        armL.rotation.z = 0.18 + 2.6 * k;
        armR.rotation.z = -0.18 - 2.6 * k;
      } else if (e === 'heart') {
        armL.rotation.set(-0.35 * k, 0, 0.18 + 2.45 * k);
        armR.rotation.set(-0.35 * k, 0, -0.18 - 2.45 * k);
        B.rotation.z = Math.sin(T * 3) * 0.06 * k;
      } else if (e === 'bow') {
        B.rotation.x = 0.55 * Math.sin(Math.min(1, T / D) * Math.PI);
        armL.rotation.x = armR.rotation.x = 0.3 * k;
      } else if (e === 'kiss') {
        // Lean in on tiptoe, a little peck, then back
        const p = Math.sin(Math.min(1, T / D) * Math.PI);
        B.rotation.x = 0.22 * p;
        B.position.y += 0.05 * p;
        B.position.z += 0.06 * p;
        armL.rotation.set(-0.5 * p, 0, 0.3 * p + 0.18);
        armR.rotation.set(-0.5 * p, 0, -0.3 * p - 0.18);
        this.mouth.scale.set(1 - 0.45 * p, 1, 1);
      } else if (e === 'hug') {
        // Arms wrap forward round the other one, with a gentle sway
        armL.rotation.set(-1.35 * k, 0, -0.55 * k + 0.18 * (1 - k));
        armR.rotation.set(-1.35 * k, 0, 0.55 * k - 0.18 * (1 - k));
        B.rotation.x = 0.12 * k;
        B.rotation.z = Math.sin(T * 2.6) * 0.07 * k;
      } else this.moreMoves(e, T, D, k, t, dt);
      if (e !== 'kiss') this.mouth.scale.set(1, 1, 1);
      if (e === 'jazz') this.mouth.scale.set(1 + 0.3 * k, 1 + 0.5 * k, 1);
      if (T >= D) this.emoteType = e === 'dance' && this.danceLoop ? (this.emoteTime = 0, 'dance') : null;
    } else if (this.emoteHead || this.blob.position.z) {
      this.emoteHead = null;
      this.blob.position.z = 0;
      this.mouth.scale.set(1, 1, 1);
    }

    // Head: counter-bob, idle look-around, look up at the camera when still
    const idle = standing && !this.emoteType ? 1 - Math.min(1, w * 2) : 0;
    this.lookYaw = damp(this.lookYaw, idle * Math.sin(t * 0.6) * 0.35, 3, dt);
    this.head.rotation.set(-0.06 * w - 0.2 * idle, this.lookYaw, Math.sin(this.walkPhase) * 0.05 * w + Math.sin(t * 0.9) * 0.03 * idle);
    if (this.emoteType === 'nod') {
      const kn = Math.min(1, this.emoteTime * 4, (EMOTES.nod.duration - this.emoteTime) * 4);
      this.head.rotation.x += Math.max(0, Math.sin(this.emoteTime * 9)) * 0.32 * kn;
    }
    if (this.emoteType === 'kiss') this.head.rotation.x -= 0.12;
    if (this.emoteType && this.emoteHead) {
      this.head.rotation.x += this.emoteHead[0];
      this.head.rotation.y += this.emoteHead[1];
      this.head.rotation.z += this.emoteHead[2];
    }
    if (this.emoteType && !standing) this.emoteType = null;
    if (pose === 'sleep') this.head.rotation.set(0, 0, 0.12);

    // Blink, or closed eyes while asleep
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blink = 0.14;
      this.blinkTimer = 2.2 + Math.random() * 3;
    }
    if (this.blink > 0) this.blink -= dt;
    const eyeY = pose === 'sleep' || this.blink > 0 ? 0.12 : 1;
    for (const e of this.eyes) e.scale.y = eyeY;

    // Hair spring
    const kick = Math.cos(this.walkPhase * 2) * 2.2 * w;
    this.tailVel.x += (-this.tailSwing.x * 60 - this.tailVel.x * 7 + turnRate * 4) * dt;
    this.tailVel.y += (-this.tailSwing.y * 60 - this.tailVel.y * 7 + kick + (air > 0.01 ? 6 : 0) + (this.emoteType === 'dance' ? Math.sin(t * 16) * 8 : 0)) * dt;
    this.tailSwing.addScaledVector(this.tailVel, dt);
    for (const { pivot, side, base, soft } of this.tails) {
      const amt = soft ? 0.25 : 1;
      if (side) {
        pivot.rotation.z = (base[0] + this.tailSwing.y * 0.6 * side) + this.tailSwing.x * 0.5;
        pivot.rotation.x = base[1] + this.tailSwing.y * 0.4 + w * 0.25;
      } else {
        pivot.rotation.z = this.tailSwing.x * 0.6 * amt;
        pivot.rotation.x = base[1] + (this.tailSwing.y * 0.5 + w * 0.3) * amt;
      }
    }

    // Squash and stretch
    this.squash = damp(this.squash, 1, 12, dt);
    const sq = this.squash;
    B.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));

    this.blob.visible = standing;
    this.blob.scale.setScalar(1 - Math.min(0.6, air * 0.35));
    this.blob.position.y = 0.015 - air;
    this.blob.material.opacity = 0.22 * (1 - Math.min(0.7, air * 0.4));
  }

  // The dances added for the wheel and the moves used with people around town (see EMOTES).
  // this.duet (set by src/life/npcs/dances.js while dancing with the partner):
  //   { side: +1 partner on my left (+X) | -1 on my right, mirror: +1 | -1, hold: 'shoulders' | 'waist', lead }
  // this.emoteBeat counts the hits of a move (a stamp, a beep, a landing) and this.beatKind names the
  // last one, so town life code can add a puff or a sound without touching the animation.
  moreMoves(e, T, D, k, t, dt) {
    const B = this.body;
    const [legL, legR] = this.legs;
    const [armL, armR] = this.arms;
    const duo = this.duet;
    const head = (this.emoteHead = [0, 0, 0]);
    if (T <= dt + 1e-6) this.beatStep = -1;
    const TAU = Math.PI * 2;
    if (e === 'dabke') {
      // Step, kick, hop, stamp, three rounds; the kicking leg swaps each round
      const c = T / 1.6;
      const n = Math.floor(c);
      const u = c - n;
      const s = n % 2 ? -1 : 1;
      const kick = s > 0 ? legL : legR;
      const stamp = s > 0 ? legR : legL;
      B.position.x += Math.sin(u * TAU) * 0.04 * s * k;
      kick.rotation.x = -1.05 * bump(u, 0.2, 0.55) * k;
      B.rotation.x -= 0.08 * bump(u, 0.2, 0.55) * k;
      B.position.y += 0.13 * bump(u, 0.45, 0.72) * k;
      stamp.rotation.x = -0.75 * bump(u, 0.6, 0.86) * k;
      if (u > 0.86 && this.beat('stamp', n)) this.squash = 0.84;
      const bob = Math.sin(u * TAU) * 0.08 * k;
      if (duo) {
        // The hand on the partner's side holds theirs; the leader rolls the other hand up high
        const inner = duo.side > 0 ? armL : armR;
        const outer = duo.side > 0 ? armR : armL;
        inner.rotation.set(-0.12 + bob, 0, 0.62 * duo.side);
        if (duo.lead) outer.rotation.set(0.3 * k, 0, -duo.side * (0.18 + (2.15 + Math.sin(t * 7) * 0.2) * k));
        else outer.rotation.set(-0.12 + bob, 0, -duo.side * (0.18 + 0.35 * k));
      } else {
        armR.rotation.set(0.3 * k, 0, -0.18 - (2.15 + Math.sin(t * 7) * 0.2) * k);
        armL.rotation.set(-0.12 + bob, 0, 0.18 + 0.4 * k);
      }
    } else if (e === 'slow') {
      // Sway from foot to foot; with the partner: hands on the shoulders or the waist
      const w = Math.sin(T * 1.8);
      const m = duo?.mirror ?? 1;
      B.rotation.z = w * 0.07 * k * m;
      B.position.x += w * 0.025 * k * m;
      legL.rotation.x = -Math.max(0, w) * 0.16 * k;
      legR.rotation.x = -Math.max(0, -w) * 0.16 * k;
      head[0] = -0.08 * k;
      head[2] = (0.1 - w * 0.05 * m) * k;
      if (duo?.hold === 'shoulders') {
        armL.rotation.set(-1.72 * k, 0, 0.18 * (1 - k));
        armR.rotation.set(-1.72 * k, 0, -0.18 * (1 - k));
        B.rotation.x += 0.07 * k;
      } else if (duo) {
        armL.rotation.set(-1.05 * k, 0, 0.18 * (1 - k));
        armR.rotation.set(-1.05 * k, 0, -0.18 * (1 - k));
        B.rotation.x += 0.05 * k;
      } else {
        armL.rotation.set(-1.3 * k, 0, 0.18 - 0.4 * k);
        armR.rotation.set(-1.3 * k, 0, -0.18 + 0.4 * k);
      }
    } else if (e === 'twirl') {
      // Two turns on tiptoe with one hand up, then a little curtsy
      B.rotation.y = smooth((T - 0.15) / 1.45) * TAU * 2;
      B.position.y += 0.06 * k + 0.05 * bump(T, 0.15, 1.6);
      armR.rotation.set(0.35 * k, 0, -0.18 - 2.35 * k);
      armL.rotation.set(-1.0 * k, 0, 0.18 + 0.35 * k);
      const dip = bump(T, 1.65, D);
      B.position.y -= 0.1 * dip;
      B.rotation.x += 0.12 * dip;
      legL.rotation.x = -0.2 * dip;
      legR.rotation.x = 0.35 * dip;
      head[2] = 0.15 * k;
      if (T > 1.6) this.beat('sparkle', 0);
    } else if (e === 'robot') {
      // Stiff poses that snap into place, a beep on each
      const i = Math.floor(T / 0.3);
      const a = ROBOT[i % ROBOT.length];
      const b = i === 0 ? ROBOT_REST : ROBOT[(i - 1) % ROBOT.length];
      const f = smooth(((T % 0.3) / 0.3) * 4);
      const P = (j) => ROBOT_REST[j] + (b[j] + (a[j] - b[j]) * f - ROBOT_REST[j]) * k;
      armL.rotation.set(P(0), 0, P(1));
      armR.rotation.set(P(2), 0, P(3));
      B.rotation.y = P(4);
      head[1] = P(5) - P(4) * 0.5;
      B.position.y -= (i % 2 ? 0.025 : 0) * k;
      legL.rotation.x = (i % 4 === 1 ? -0.3 : 0) * k;
      legR.rotation.x = (i % 4 === 3 ? -0.3 : 0) * k;
      this.beat('beep', i);
    } else if (e === 'salsa') {
      // Side steps with swinging hips; facing the partner, the follower turns under a raised hand
      const om = TAU / 1.2;
      const w = Math.sin(T * om);
      const m = duo?.mirror ?? 1;
      B.position.x += w * 0.08 * k * m;
      B.rotation.z = -w * 0.09 * k * m;
      B.rotation.y = Math.sin(T * om * 2) * 0.12 * k;
      legL.rotation.x = -Math.max(0, w) * 0.35 * k;
      legR.rotation.x = -Math.max(0, -w) * 0.35 * k;
      const turn = bump(T, 2.3, 3.4);
      const fwd = -1.0 * k * (1 - turn) + 0.4 * turn;
      if (duo && duo.hold !== 'shoulders') {
        // The lead holds both hands and lifts the right one for the follower's turn
        armL.rotation.set(-1.0 * k, 0, 0.18 * (1 - k));
        armR.rotation.set(fwd, 0, -0.18 * (1 - k) - 2.2 * turn);
      } else if (duo) {
        // The follower turns under the lifted hand
        B.rotation.y += smooth((T - 2.4) / 0.9) * TAU;
        armL.rotation.set(fwd, 0, 0.18 * (1 - k) + 2.2 * turn);
        armR.rotation.set(-1.0 * k, 0, -0.18 * (1 - k));
      } else {
        armL.rotation.set((-0.7 + w * 0.2) * k, 0, 0.18 + 0.6 * k);
        armR.rotation.set((-0.7 - w * 0.2) * k, 0, -0.18 - 0.6 * k);
      }
      this.beat('shake', Math.floor((T * om) / Math.PI));
    } else if (e === 'moonwalk') {
      // Glide backwards, a spin back to the start, then a pose with a hand at the brow
      const glide = smooth(T / 2.4) * (1 - smooth((T - 2.4) / 0.7));
      B.position.z -= 0.42 * glide;
      this.blob.position.z = -0.42 * glide;
      const g = k * (1 - smooth((T - 2.25) / 0.2));
      const w = Math.sin((T * Math.PI) / 0.6);
      legL.rotation.x = (0.3 * Math.max(0, w) - 0.12 * Math.max(0, -w)) * g;
      legR.rotation.x = (0.3 * Math.max(0, -w) - 0.12 * Math.max(0, w)) * g;
      B.position.y += 0.03 * Math.abs(w) * g + 0.06 * bump(T, 2.4, D);
      armL.rotation.x = w * 0.25 * g;
      armR.rotation.x = -w * 0.25 * g;
      B.rotation.y = smooth((T - 2.4) / 0.6) * TAU;
      const tip = bump(T, 2.85, D + 0.1);
      if (tip > 0) armR.rotation.set(-2.7 * tip, 0, -0.18 - 0.12 * tip);
      head[0] = 0.14 * g - 0.1 * tip;
      if (T > 2.95) this.beat('pop', 0);
    } else if (e === 'hop') {
      // Bunny hops from side to side, arms flapping, a squash on each landing
      const c = T / 0.7;
      const n = Math.floor(c);
      const v = c - n;
      const h = bump(v, 0.08, 0.86) * k;
      const from = n === 0 ? 0 : (n % 2 ? -0.09 : 0.09);
      const to = n % 2 ? 0.09 : -0.09;
      B.position.x += (from + (to - from) * smooth((v - 0.08) / 0.78)) * k;
      B.position.y += 0.27 * h;
      legL.rotation.x = legR.rotation.x = -0.55 * h;
      armL.rotation.z = 0.18 + (0.5 + 1.6 * h) * k;
      armR.rotation.z = -0.18 - (0.5 + 1.6 * h) * k;
      B.rotation.z = (n % 2 ? 0.1 : -0.1) * h;
      head[2] = (n % 2 ? 0.08 : -0.08) * h;
      if (v > 0.86 && this.beat('land', n)) this.squash = 0.8;
    } else if (e === 'shimmy') {
      // Quick shoulder shakes while dipping down low and back up
      const dip = Math.sin(Math.min(1, T / D) * Math.PI);
      const sh = Math.sin(T * 30) * 0.14 * k;
      B.rotation.y = sh;
      B.rotation.x -= 0.1 * k;
      B.position.y -= 0.07 * dip;
      legL.rotation.x = legR.rotation.x = -0.28 * dip;
      armL.rotation.set(-0.5 * k, 0, 0.18 + 0.85 * k);
      armR.rotation.set(-0.5 * k, 0, -0.18 - 0.85 * k);
      head[1] = -sh * 0.7;
      this.beat('shimmer', Math.floor(T / 0.6));
    } else if (e === 'ballet') {
      // Up on the toes, arms in a crown, a pirouette, then an arabesque
      const up = smooth(T / 0.45) * (1 - smooth((T - (D - 0.45)) / 0.45));
      B.position.y += 0.08 * up;
      B.rotation.y = smooth((T - 0.45) / 1.45) * TAU;
      const passe = bump(T, 0.4, 2.0);
      const ara = smooth((T - 2.0) / 0.5) * (1 - smooth((T - 3.1) / 0.45));
      B.rotation.x += 0.32 * ara;
      legL.rotation.x = -0.32 * ara;
      legR.rotation.set(-0.95 * passe + 1.2 * ara, 0, -0.35 * passe);
      const crown = up * (1 - ara);
      armL.rotation.set(0.45 * crown - 1.6 * ara, 0, 0.18 + 2.25 * crown + 0.1 * ara);
      armR.rotation.set(0.45 * crown + 0.3 * ara, 0, -0.18 - 2.25 * crown - 1.3 * ara);
      head[0] = -0.12 * up - 0.2 * ara;
      if (T > 1.9) this.beat('sparkle', 0);
    } else if (e === 'jazz') {
      // Hands up and out, shaking, a side step and a kick
      const sh = Math.sin(T * 32) * 0.09 * k;
      armL.rotation.set(-0.35 * k, 0, 0.18 + 1.8 * k + sh);
      armR.rotation.set(-0.35 * k, 0, -0.18 - 1.8 * k - sh);
      B.position.x += Math.sin((T * Math.PI) / 0.6) * 0.06 * k;
      B.position.y += Math.abs(Math.sin((T * Math.PI) / 0.3)) * 0.04 * k;
      const kick = bump(T, 1.0, 1.5);
      legL.rotation.set(-0.3 * kick, 0, 0.5 * kick);
      B.rotation.z = -0.08 * kick;
      head[2] = Math.sin((T * Math.PI) / 0.6) * 0.08 * k;
      this.beat('twinkle', Math.floor(T / 0.8));
    } else if (e === 'highfive') {
      // Hand up, a slap forward, back down
      const up = smooth(T / 0.32);
      const slap = smooth((T - 0.32) / 0.14);
      const back = smooth((T - 0.85) / 0.4);
      armR.rotation.set((-0.3 * up + 1.2 * slap) * (1 - back), 0, -0.18 - 2.5 * up * (1 - back));
      B.rotation.x += 0.08 * slap * (1 - back);
      B.position.y += 0.06 * bump(T, 0.3, 0.6);
      if (T > 0.44) this.beat('slap', 0);
    } else if (e === 'handshake') {
      // A hand forward, a few friendly shakes and a small nod
      const shake = bump(T, 0.35, 1.25);
      armR.rotation.set(-1.2 * k + Math.sin(T * 18) * 0.12 * shake, 0, -0.18 * (1 - k) + 0.1 * k);
      B.rotation.x += 0.08 * shake;
      head[0] = 0.12 * shake;
      if (T > 0.5) this.beat('shake', 0);
    } else if (e === 'selfie') {
      // Phone up high in one hand, a peace sign by the cheek, head tilted
      armR.rotation.set(-2.5 * k, 0, -0.18 - 0.27 * k);
      armL.rotation.set(-2.7 * k, 0, 0.18 + 0.12 * k);
      B.rotation.z = 0.05 * k;
      head[2] = 0.16 * k;
      head[0] = -0.1 * k;
    }
  }

  // Count a hit of the current move once per step (see moreMoves). Returns true when it counts.
  beat(kind, step) {
    if (step === this.beatStep) return false;
    this.beatStep = step;
    this.emoteBeat = (this.emoteBeat || 0) + 1;
    this.beatKind = kind;
    return true;
  }

  // World position of a hand (0 left, 1 right), for hand-holding checks.
  handWorld(i, out = new THREE.Vector3()) {
    return this.arms[i].localToWorld(out.set(0, -0.28, 0));
  }
}

export { hasSkirt };
