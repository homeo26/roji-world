import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mesh, canvasTexture, FONT, damp, clamp } from '../../util.js';
import { bakeVC } from '../../arena/riding/kit.js';

// A cute go-kart built from primitives, and the racing helmet the drivers wear.
// The kart faces local +Z with its wheels on y = 0. The driver sits at kart.seat (pose 'drive').

const INK = '#3b2b3f';
const CREAM = '#fffaf4';
const TYRE = '#3b3442';
const STEEL = '#d8dde6';

const rbox = (w, h, d, c, r = 0.06) => mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), typeof c === 'string' ? mat(c, { rough: 0.45 }) : c);
const cyl = (rt, rb, h, c, seg = 14) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === 'string' ? mat(c, { rough: 0.6 }) : c);
const ball = (r, c, seg = 12) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), typeof c === 'string' ? mat(c, { rough: 0.5 }) : c);
const at = (o, x, y, z) => (o.position.set(x, y, z), o);

// Race numbers 1 to 8 in one texture, so every number plate shares a material.
let numberMat = null;
function numbers() {
  if (numberMat) return numberMat;
  const tex = canvasTexture(512, 256, (c, w, h) => {
    const cw = w / 4;
    const ch = h / 2;
    for (let n = 1; n <= 8; n++) {
      const cx = ((n - 1) % 4) * cw + cw / 2;
      const cy = Math.floor((n - 1) / 4) * ch + ch / 2;
      c.fillStyle = CREAM;
      c.beginPath();
      c.arc(cx, cy, cw * 0.48, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 7;
      c.strokeStyle = INK;
      c.beginPath();
      c.arc(cx, cy, cw * 0.4, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = INK;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${Math.round(ch * 0.58)}px ${FONT}`;
      c.fillText(String(n), cx, cy + 5);
    }
  });
  numberMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  return numberMat;
}
export function plate(n, r) {
  const g = new THREE.CircleGeometry(r, 20);
  const col = (n - 1) % 4;
  const row = Math.floor((n - 1) / 4);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / 4, 1 - (row + 1 - uv.getY(i)) / 2);
  return mesh(g, numbers(), { cast: false });
}

// opts: { color, accent, number (1..8), seatColor, flag (pennant colour or null), live, shadowBlob }
// live: keep the front wheels and the steering wheel as moving parts (for karts that drive).
export function makeKart({ color = '#ff8fb1', accent = CREAM, number = 1, seatColor = null, flag = null, live = false, shadowBlob = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const paint = mat(color, { rough: 0.38 });
  seatColor = seatColor || '#' + new THREE.Color(color).lerp(new THREE.Color('#4a3a52'), 0.55).getHexString();
  // Chassis
  body.add(at(rbox(0.96, 0.09, 1.66, '#5a5068', 0.04), 0, 0.17, 0));
  for (const s of [1, -1]) {
    body.add(at(rbox(0.26, 0.2, 0.84, paint, 0.09), 0.5 * s, 0.27, -0.04));
    body.add(at(rbox(0.06, 0.05, 0.6, accent, 0.02), 0.5 * s, 0.36, -0.04));
    // Little side numbers
    const p = plate(number, 0.085);
    p.rotation.y = (Math.PI / 2) * s;
    body.add(at(p, 0.632 * s, 0.27, -0.04));
  }
  // Rounded nose with the race number
  body.add(at(rbox(0.82, 0.18, 0.5, paint, 0.08), 0, 0.29, 0.58));
  const nose = ball(0.42, paint, 14);
  nose.scale.set(1, 0.34, 0.62);
  body.add(at(nose, 0, 0.3, 0.8));
  body.add(at(rbox(0.12, 0.04, 0.62, accent, 0.02), 0, 0.395, 0.62));
  const np = plate(number, 0.15);
  np.rotation.x = -Math.PI / 2 + 0.22;
  body.add(at(np, 0, 0.405, 0.72));
  // Soft foam bumpers
  const bumpF = mesh(new THREE.CapsuleGeometry(0.075, 0.95, 4, 10), mat(CREAM, { rough: 0.7 }));
  bumpF.rotation.z = Math.PI / 2;
  body.add(at(bumpF, 0, 0.2, 1.06));
  const bumpR = mesh(new THREE.CapsuleGeometry(0.08, 1.12, 4, 10), mat(CREAM, { rough: 0.7 }));
  bumpR.rotation.z = Math.PI / 2;
  body.add(at(bumpR, 0, 0.24, -0.96));
  for (const s of [1, -1]) {
    body.add(at(cyl(0.03, 0.03, 0.24, STEEL, 6), 0.3 * s, 0.2, 0.95).rotateX(Math.PI / 2));
    body.add(at(cyl(0.03, 0.03, 0.2, STEEL, 6), 0.36 * s, 0.22, -0.86).rotateX(Math.PI / 2));
  }
  // Bucket seat
  body.add(at(rbox(0.6, 0.12, 0.5, seatColor, 0.05), 0, 0.3, -0.2));
  const back = rbox(0.64, 0.56, 0.12, seatColor, 0.05);
  back.rotation.x = -0.16;
  body.add(at(back, 0, 0.6, -0.6));
  for (const s of [1, -1]) {
    const bol = rbox(0.08, 0.26, 0.46, seatColor, 0.035);
    body.add(at(bol, 0.31 * s, 0.42, -0.3));
  }
  body.add(at(rbox(0.5, 0.05, 0.08, accent, 0.02), 0, 0.86, -0.64));
  // Engine and a shiny exhaust on the right
  body.add(at(rbox(0.3, 0.26, 0.28, STEEL, 0.06), -0.3, 0.36, -0.78));
  body.add(at(rbox(0.32, 0.06, 0.3, '#9aa0ad', 0.02), -0.3, 0.5, -0.78));
  const ex = cyl(0.045, 0.045, 0.34, mat(STEEL, { rough: 0.25, metal: 0.6 }), 10);
  ex.rotation.x = Math.PI / 2;
  body.add(at(ex, -0.48, 0.32, -0.98));
  const tip = cyl(0.065, 0.055, 0.08, mat(STEEL, { rough: 0.25, metal: 0.6 }), 10);
  tip.rotation.x = Math.PI / 2;
  body.add(at(tip, -0.48, 0.32, -1.16));
  body.add(at(ball(0.04, INK, 8), -0.48, 0.32, -1.2));
  // Fuel cap and a little heart sticker
  body.add(at(cyl(0.07, 0.07, 0.05, accent, 12), 0.28, 0.43, 0.42));
  // Steering column and wheel
  const col = cyl(0.025, 0.025, 0.42, INK, 8);
  col.rotation.x = 0.95;
  body.add(at(col, 0, 0.46, 0.3));
  const steer = new THREE.Group();
  steer.position.set(0, 0.63, 0.12);
  steer.rotation.x = -0.95;
  const rim = mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 20), mat(INK, { rough: 0.5 }));
  steer.add(rim);
  steer.add(at(ball(0.05, accent, 10), 0, 0, 0));
  steer.add(at(rbox(0.3, 0.035, 0.03, INK, 0.012), 0, 0, 0));
  body.add(steer);
  // Pennant on a whip at the back
  let pennant = null;
  if (flag) {
    body.add(at(cyl(0.012, 0.012, 1.3, CREAM, 5), 0.4, 0.95, -0.9));
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(-0.36, 0.11);
    sh.lineTo(0, 0.22);
    pennant = mesh(new THREE.ShapeGeometry(sh), mat(flag, { rough: 0.7, side: THREE.DoubleSide }));
    pennant.position.set(0.4, 1.36, -0.9);
    pennant.rotation.y = Math.PI / 2;
    body.add(pennant);
  }
  // Wheels: fat tyres with coloured hubs (round all the way, so they never need to spin)
  const tyreM = mat(TYRE, { rough: 0.85 });
  const hubM = mat(accent === CREAM ? '#ffd166' : accent, { rough: 0.4 });
  const wheel = (r, w) => {
    const g = new THREE.Group();
    const t = mesh(new THREE.CylinderGeometry(r, r, w, 14), tyreM);
    t.rotation.z = Math.PI / 2;
    const hub = mesh(new THREE.CylinderGeometry(r * 0.58, r * 0.58, w + 0.02, 10), hubM);
    hub.rotation.z = Math.PI / 2;
    const cap = mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, w + 0.05, 8), mat(CREAM, { rough: 0.4 }));
    cap.rotation.z = Math.PI / 2;
    g.add(t, hub, cap);
    return g;
  };
  const front = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.62 * s, 0.2, 0.6);
    pivot.add(wheel(0.2, 0.2));
    root.add(pivot);
    front.push(pivot);
    const rw = wheel(0.235, 0.27);
    rw.position.set(0.66 * s, 0.235, -0.6);
    root.add(rw);
  }
  root.add(at(cyl(0.025, 0.025, 1.24, INK, 6).rotateZ(Math.PI / 2), 0, 0.2, 0.6));
  root.add(at(cyl(0.03, 0.03, 1.3, INK, 6).rotateZ(Math.PI / 2), 0, 0.235, -0.6));
  // Soft round shadow
  const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#2b3b2a', transparent: true, opacity: 0.2, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.scale.set(0.8, 1.15, 1);
  blob.position.y = 0.012;
  blob.renderOrder = 1;
  if (shadowBlob) root.add(blob);

  const kart = {
    root,
    body,
    steer,
    front,
    pennant,
    blob,
    color,
    seat: new THREE.Vector3(0, 0.17, -0.18),
    driver: null,
    steerAmt: 0,
    // Put a kid in the seat (kid.root becomes a child of the kart body)
    seatKid(kid) {
      kid.pose = 'drive';
      kid.hands = null;
      kid.root.position.copy(kart.seat);
      kid.root.rotation.set(0, 0, 0);
      kid.blob.visible = false;
      body.add(kid.root);
      kart.driver = kid;
      return kid;
    },
    // steer: -1..1 (+ is left), lean: body roll
    animate(dt, t, speed = 0, steer = 0) {
      kart.steerAmt = damp(kart.steerAmt, clamp(steer, -1, 1), 10, dt);
      for (const w of front) w.rotation.y = kart.steerAmt * 0.45;
      kart.steer.rotation.z = kart.steerAmt * 1.2;
      body.position.y = Math.abs(Math.sin(t * 23)) * 0.012 * Math.min(1, Math.abs(speed) / 4) + Math.sin(t * 40) * 0.004;
      if (pennant) pennant.rotation.y = Math.PI / 2 + Math.sin(t * 9) * 0.25 + Math.min(0.5, Math.abs(speed) * 0.04);
    },
  };
  if (live) {
    // Moving karts: merge the static parts so each costs a few draw calls
    bakeVC(body, [steer, ...(pennant ? [pennant] : [])], { coarse: true });
    for (const f of front) bakeVC(f, [], { coarse: true });
    bakeVC(root, [body, ...front, blob], { coarse: true });
  }
  return kart;
}

// ------------------------------------------------------------------ helmet
// An open-face racing helmet on kid.head with a raised visor and a stripe over the top.
// Hides the hair it covers. Returns { group, remove() } to take it off again.
export function addHelmet(kid, color = '#ff7fa3', stripe = CREAM) {
  const HC = new THREE.Vector3(0, 0.29, 0);
  const hairColor = new THREE.Color(kid.look.hair);
  const hidden = [];
  const tails = new Set(kid.tails.map((t) => t.pivot));
  for (const o of kid.head.children) {
    if (!o.visible || tails.has(o)) continue;
    const rel = o.position.clone().sub(HC);
    // The hair bow sits on top of the head, under the helmet
    const bow = !o.isMesh && o.isGroup && rel.y > 0.15;
    if (!bow && (!o.isMesh || !o.material.map || !o.material.color?.equals(hairColor))) continue;
    const prm = o.geometry?.parameters || {};
    const isCap = rel.length() < 1e-3 && prm.thetaStart === 0;
    const onTop = rel.length() > 1e-3 && rel.y > 0.1;
    // A batched kid (Kid.batch) keeps the hair a helmet covers in one mesh marked hairTop
    if (bow || isCap || onTop || o.userData.hairTop) {
      o.visible = false;
      hidden.push(o);
    }
  }
  const g = new THREE.Group();
  g.position.copy(HC);
  const R = 0.375;
  const shellM = mat(color, { rough: 0.32 });
  const shellIn = mat(color, { rough: 0.32, side: THREE.DoubleSide });
  const top = mesh(new THREE.SphereGeometry(R, 26, 12, 0, Math.PI * 2, 0, Math.PI / 2), shellM);
  top.scale.set(1, 0.93, 1.02);
  // Lower band round the back and sides, leaving the face open
  const win = 2.3;
  const band = mesh(new THREE.SphereGeometry(R, 26, 4, Math.PI / 2 + win / 2, Math.PI * 2 - win, Math.PI / 2 - 0.01, 0.42), shellIn);
  band.scale.set(1, 0.93, 1.02);
  // Soft rim along the bottom edge, round the back only
  const rimArm = new THREE.Group();
  rimArm.rotation.y = -(Math.PI / 2 + win / 2);
  rimArm.position.y = -Math.sin(0.41) * R * 0.93;
  const rim = mesh(new THREE.TorusGeometry(R * Math.cos(0.41), 0.026, 6, 26, Math.PI * 2 - win), mat(stripe, { rough: 0.5 }));
  rim.rotation.x = Math.PI / 2;
  rimArm.add(rim);
  // Stripe over the top, front to back
  const st = mesh(new THREE.TorusGeometry(R + 0.004, 0.034, 6, 22, Math.PI), mat(stripe, { rough: 0.4 }));
  st.rotation.y = Math.PI / 2;
  st.scale.set(1.02, 0.93, 1);
  // Raised visor at the front of the shell
  const visor = mesh(new THREE.SphereGeometry(R + 0.03, 20, 3, Math.PI / 2 - 0.95, 1.9, Math.PI * 0.3, Math.PI * 0.16), mat('#bfe6ff', { rough: 0.15, side: THREE.DoubleSide }));
  visor.scale.set(1, 0.93, 1.02);
  // Pads over the ears
  for (const s of [1, -1]) {
    const pad = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 14), mat(stripe, { rough: 0.5 }));
    pad.rotation.z = Math.PI / 2;
    pad.position.set((R - 0.005) * s, -0.06, -0.02);
    g.add(pad);
  }
  g.add(top, band, rimArm, st, visor);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  g.rotation.x = -0.12;
  kid.head.add(g);
  return {
    group: g,
    remove() {
      g.removeFromParent();
      for (const o of hidden) o.visible = true;
    },
  };
}
