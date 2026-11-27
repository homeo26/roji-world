import * as THREE from 'three';
import { makeTool, C } from '../../places/hospital/models.js';
import { clamp, damp, easeOutCubic, canvasTexture, FONT, roundRect } from '../../util.js';
import * as M from './models.js';
import { Board, darkLens, throatPic, earPic, eyesPic, xrayPic, skinPic } from './art.js';
import { TREATS, TOOL_NAMES } from './cases.js';

// The hands-on steps of Dr. Roji's Shift. Each step is a small moment with its own controls:
// drag (stethoscope, thermometer, light, plaster, swab, tweezers), trace (stitches, the incision),
// circle (the plaster cast), tap in time (reflexes, vaccine, sleepy count), hold and let go
// (thermometer, breathing), a slider (the dose) and buttons (the treatment, the drugs).
// A step: { title, hint, keys, enter(), update(dt), auto(dt), exit(), done, q (0..1), word }.
// G (the game) gives each step the scene, the camera director, the cursor, the patient and the sounds.

const V = () => new THREE.Vector3();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

// ------------------------------------------------------------------ pointing on a surface
// A surface is an Object3D whose local XY plane is where the tool moves (x right, y up as seen).
export function surface(G, obj, w, h) {
  const plane = new THREE.Plane();
  const n = V();
  const p = V();
  const hit = V();
  const ray = new THREE.Raycaster();
  return {
    obj,
    w,
    h,
    fromNdc(ndc) {
      ray.setFromCamera(ndc, G.camera);
      obj.updateWorldMatrix(true, false);
      n.set(0, 0, 1).transformDirection(obj.matrixWorld);
      p.setFromMatrixPosition(obj.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(n, p);
      if (!ray.ray.intersectPlane(plane, hit)) return null;
      obj.worldToLocal(hit);
      return { x: hit.x, y: hit.y };
    },
    world(x, y, z = 0, out = V()) {
      obj.updateWorldMatrix(true, false);
      return obj.localToWorld(out.set(x, y, z));
    },
  };
}

// The tool pointer: the mouse (hover on desktop, drag on touch), the arrow keys, or the auto player.
export class Cursor {
  constructor(G) {
    this.G = G;
    this.x = this.y = 0;
    this.down = this.pressed = this.released = false;
    this.src = 'none';
    this.surface = null;
    this.last = new THREE.Vector2(9, 9);
  }
  use(surf, { x = 0, y = 0, speed = 0.35, lift = 0, keysDown = false, bounds = null } = {}) {
    this.surface = surf;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.lift = lift; // on touch the tool sits a little above the finger
    this.keysDown = keysDown; // arrow keys count as pressing down (tracing with the keyboard)
    this.bounds = bounds || (surf ? { x: surf.w / 2, y: surf.h / 2 } : null);
    this.down = this.pressed = this.released = false;
  }
  update(dt) {
    this.pressed = this.released = false;
    const G = this.G;
    if (!this.surface || G.auto) return;
    const { input } = G;
    const p = input.pointer;
    const was = this.down;
    const moved = p.ndc.distanceToSquared(this.last) > 1e-7;
    this.last.copy(p.ndc);
    if (p.justDown || p.down || (moved && !G.touch)) {
      const l = this.surface.fromNdc(p.ndc);
      if (l) {
        this.x = l.x;
        this.y = l.y + (G.touch && p.down ? this.lift : 0);
        this.src = 'pointer';
      }
    }
    const ax = input.axis();
    const keying = Math.abs(ax.x) + Math.abs(ax.y) > 0.1;
    if (keying) {
      this.x += ax.x * this.speed * dt;
      this.y += ax.y * this.speed * dt;
      this.src = 'keys';
    }
    if (this.bounds) {
      this.x = clamp(this.x, -this.bounds.x, this.bounds.x);
      this.y = clamp(this.y, -this.bounds.y, this.bounds.y);
    }
    const keyHeld = input.held('action') || input.held('jump') || (this.keysDown && keying);
    this.down = p.down || keyHeld;
    this.pressed = p.justDown || input.pressed('action') || input.pressed('jump') || (this.down && !was);
    this.released = was && !this.down;
  }
  // The auto player moves the tool
  drive(x, y, down = this.down) {
    const was = this.down;
    this.x = x;
    this.y = y;
    this.down = down;
    this.pressed = down && !was;
    this.released = !down && was;
    this.src = 'auto';
  }
  // Move toward (x, y) at speed (m/s); returns true when there
  toward(x, y, speed, dt, down = this.down) {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    const s = Math.min(d, speed * dt);
    this.drive(this.x + (d ? (dx / d) * s : 0), this.y + (d ? (dy / d) * s : 0), down);
    return d < 0.004;
  }
  world(z = 0, out = V()) {
    return this.surface.world(this.x, this.y, z, out);
  }
}

// Follows a path of points (local x, y) while the cursor is down. Tracks the progress (0..1) and the wobble.
export class Tracer {
  constructor(pts, tol) {
    this.pts = pts;
    this.tol = tol;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    this.L = this.cum[this.cum.length - 1];
    this.s = 0;
    this.devSum = 0;
    this.devN = 0;
    this.off = 0;
    this.prev = null;
  }
  get k() {
    return this.s / this.L;
  }
  at(s, out = { x: 0, y: 0 }) {
    s = clamp(s, 0, this.L);
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < s) i++;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    const f = (s - this.cum[i - 1]) / Math.max(1e-6, this.cum[i] - this.cum[i - 1]);
    out.x = a.x + (b.x - a.x) * f;
    out.y = a.y + (b.y - a.y) * f;
    return out;
  }
  // Closest point on the path between s0 and s1. Returns { s, d }.
  near(x, y, s0, s1) {
    let best = { s: s0, d: Infinity };
    for (let i = 1; i < this.pts.length; i++) {
      if (this.cum[i] < s0 || this.cum[i - 1] > s1) continue;
      const a = this.pts[i - 1];
      const b = this.pts[i];
      const lx = b.x - a.x;
      const ly = b.y - a.y;
      const l2 = lx * lx + ly * ly || 1e-9;
      let f = ((x - a.x) * lx + (y - a.y) * ly) / l2;
      f = clamp(f, 0, 1);
      let s = this.cum[i - 1] + f * (this.cum[i] - this.cum[i - 1]);
      s = clamp(s, s0, s1);
      const p = this.at(s);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < best.d) best = { s, d };
    }
    return best;
  }
  // Feed the cursor (down). Steps in small bits so a fast stroke still counts. Returns the distance from the path.
  feed(x, y) {
    const from = this.prev || { x, y };
    const n = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (this.tol * 0.4)));
    let dist = 0;
    for (let i = 1; i <= n; i++) {
      const px = from.x + ((x - from.x) * i) / n;
      const py = from.y + ((y - from.y) * i) / n;
      const r = this.near(px, py, Math.max(0, this.s - this.tol), this.s + this.tol * 2.2);
      dist = r.d;
      if (r.d < this.tol) {
        if (r.s > this.s) {
          this.devSum += r.d * (r.s - this.s);
          this.devN += r.s - this.s;
          this.s = r.s;
        }
      } else this.off += 1 / n;
    }
    // Reaching the last dot finishes the line
    const end = this.pts[this.pts.length - 1];
    if (this.s > this.L - this.tol * 2 && Math.hypot(x - end.x, y - end.y) < this.tol * 0.8) this.s = this.L;
    this.prev = { x, y };
    return dist;
  }
  lift() {
    this.prev = null;
  }
  // 0..1: 1 is a perfectly steady line
  get steady() {
    const dev = this.devN ? this.devSum / this.devN / this.tol : 0;
    return clamp(1 - dev * 0.75 - Math.min(0.3, this.off * 0.02), 0.2, 1);
  }
}

// A tool pointed so its tip (model-local, at scale 1) sits at the group origin and its body runs along dir.
export function aimTool(model, tip, dir, scale = 1) {
  const g = new THREE.Group();
  model.scale.setScalar(scale);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
  model.quaternion.copy(q);
  model.position.copy(tip.clone().multiplyScalar(-scale).applyQuaternion(q));
  g.add(model);
  return g;
}
const TIP = { tweezers: [-0.095, 0.01, 0], scalpel: [-0.066, 0, 0], needle: [-0.03, 0, 0], thermometer: [-0.15, 0.03, 0], light: [-0.118, 0.02, -0.04], swab: [-0.075, 0, 0], syringe: [-0.105, 0, 0] };
const tipOf = (id) => new THREE.Vector3(...TIP[id]);
// Steel that reads well without reflections
function brighten(model) {
  model.traverse((m) => {
    if (m.isMesh && m.material.metalness > 0.3) {
      m.material = m.material.clone();
      m.material.metalness = 0.15;
      m.material.roughness = 0.35;
    }
  });
  return model;
}

// A ring flat on a surface (a torus facing +Z), for targets and timing.
function ringMesh(r, tube, color, opacity = 0.9) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, toneMapped: false }));
  m.renderOrder = 9;
  return m;
}

// ------------------------------------------------------------------ the base step
class Step {
  constructor(G, spec = {}) {
    this.G = G;
    this.spec = spec;
    this.done = false;
    this.q = 1;
    this.t = 0;
    this.objs = [];
    this.word = '';
    this.scored = true;
  }
  get P() {
    return this.G.patient;
  }
  add(o, parent = this.G.scene) {
    parent.add(o);
    this.objs.push(o);
    return o;
  }
  finish(q, word) {
    if (this.done) return;
    this.done = true;
    this.q = clamp(q, 0, 1);
    const w = word || (this.q >= 0.9 ? 'Perfect!' : this.q >= 0.7 ? 'Great!' : this.q >= 0.5 ? 'Good!' : 'Done!');
    this.word = w;
    if (this.scored) {
      this.G.word(w, this.wordAt || null, this.q >= 0.7 ? '#2a9479' : '#c9822a');
      this.G.sfx.good();
    }
  }
  enter() {}
  update() {}
  auto() {}
  exit() {
    for (const o of this.objs) this.G.bin.add(o); // kept in the scene, hidden: the host frees them at the end
    this.objs.length = 0;
    for (const b of [this.board, this.lens?.board]) b?.dispose();
    this.G.ui.clearDock();
    this.G.cursor.use(null);
  }
}

// Places a face-the-camera anchor in front of a world point (toward the camera goal).
function anchorAt(G, p, toward = 0) {
  const a = new THREE.Object3D();
  const cam = G.cam.goalPos;
  a.position.copy(p).add(tmp.copy(cam).sub(p).normalize().multiplyScalar(toward));
  a.lookAt(cam);
  G.scene.add(a);
  return a;
}

// ------------------------------------------------------------------ triage
export class Triage extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Who needs Dr. Roji first?';
    this.hint = 'Read the cards and tap the most poorly patient';
    this.keys = 'Press 1 to 4 to pick';
  }
  enter() {
    const G = this.G;
    this.waiting = this.spec.waiting; // [{ entry, kid, seat, card }]
    const top = Math.max(...this.waiting.map((w) => w.entry.urgNow));
    this.right = this.waiting.filter((w) => w.entry.urgNow === top);
    this.waiting.forEach((w) => {
      w.card = G.ui.triCard({ name: w.name, chips: w.entry.c.chips, urg: w.entry.urgNow, pair: w.entry.pair || w.entry.pairWith }, () => this.pick(w));
    });
    G.say('roji', G.nurse ? 'Nurse Homama, who should I see first?' : 'Who needs me first? Let me read their cards.');
  }
  pick(w) {
    if (this.chosen || this.done) return;
    const G = this.G;
    this.chosen = w;
    G.sfx.pop();
    const ok = this.right.includes(w);
    for (const x of this.waiting) x.card.tag();
    if (ok) {
      w.card.pick();
      G.say('roji', G.nurse ? 'Good choice, Nurse Homama. Let us go!' : `${w.name} first. Let us go!`);
      this.q = 1;
    } else {
      const r = this.right[0];
      r.card.pick();
      this.chosen = r;
      G.sfx.bad();
      G.say('roji', `Hmm, look at the red card: ${r.name} needs us first.`);
      this.q = 0.35;
    }
    this.wordAt = this.chosen.kid.head.getWorldPosition(V()).add(tmp.set(0, 0.9, 0));
    this.endT = 1.6;
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    for (const w of this.waiting) w.card.at(w.kid.head.getWorldPosition(tmp).add(tmp2.set(0, 0.68, 0)));
    if (!this.chosen) {
      for (let i = 0; i < this.waiting.length; i++) if (G.input.pressed(String(i + 1))) this.pick(this.waiting[i]);
      const taps = G.input.taps();
      if (taps.length) {
        const hits = G.input.pick(this.waiting.map((w) => w.kid.root));
        if (hits.length) {
          const w = this.waiting.find((x) => hits[0].object && isUnder(hits[0].object, x.kid.root));
          if (w) this.pick(w);
        }
      }
    } else {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.q, this.q >= 1 ? 'Right!' : 'Next time!');
    }
  }
  auto() {
    if (!this.chosen && this.t > 0.8) this.pick(this.right[0]);
  }
  exit() {
    for (const w of this.waiting) w.card?.remove();
    super.exit();
  }
}
const isUnder = (o, root) => {
  for (let p = o; p; p = p.parent) if (p === root) return true;
  return false;
};

// ------------------------------------------------------------------ thermometer: drag to the mouth, hold until it beeps
export class Thermo extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Check the temperature';
    this.hint = 'Drag the thermometer to the mouth';
    this.keys = 'Arrow keys move it, then hold Space until it beeps';
  }
  enter() {
    const G = this.G;
    const mouth = this.P.part('mouth');
    G.frameAt(mouth.clone().add(tmp.set(0.12, -0.05, 0)), 0.95, 1.25);
    this.anchor = this.add(anchorAt(G, mouth, 0.12));
    const surf = surface(G, this.anchor, 0.9, 0.7);
    this.tool = this.add(aimTool(makeTool(G.k, 'thermometer'), tipOf('thermometer'), new THREE.Vector3(0.85, -0.35, 0.4), 1.4));
    this.start = { x: 0.3, y: -0.12 };
    G.cursor.use(surf, { x: this.start.x, y: this.start.y, lift: 0.05 });
    this.target = this.add(ringMesh(0.05, 0.008, '#7fd8bf'), this.anchor);
    this.phase = 'drag';
    this.temp = 35.0;
    this.disp = this.add(lcd(G));
    this.disp.position.copy(surf.world(-0.27, 0.12, 0.02));
    this.disp.visible = false;
    this.wordAt = mouth;
    this.mistakes = 0;
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    this.t += dt;
    const P = this.P;
    if (this.phase === 'drag') {
      // The tool follows the cursor while it is held (the keys always hold it)
      if (c.down || c.src === 'keys' || c.src === 'auto') this.held = true;
      const pos = this.held ? { x: c.x, y: c.y } : this.start;
      const w = c.surface.world(pos.x, pos.y, 0.03);
      this.tool.position.lerp(w, 1 - Math.exp(-20 * dt));
      this.tool.quaternion.copy(this.anchor.quaternion);
      this.target.scale.setScalar(1 + Math.sin(this.t * 6) * 0.12);
      if (this.held && Math.hypot(pos.x, pos.y) < 0.06) {
        this.phase = 'hold';
        this.target.visible = false;
        G.sfx.pop();
        P.over.mouth = 0.4;
        this.hold = G.ui.hold('Hold');
        this.disp.visible = true;
        this.disp.userData.show('35.0');
        G.setHint('Hold until it beeps, then let go', 'Hold Space until it beeps, then let go');
      }
      if (!c.down && c.src === 'pointer') this.held = false;
    } else if (this.phase === 'hold') {
      this.tool.position.lerp(c.surface.world(0.0, 0, 0.03), 1 - Math.exp(-20 * dt));
      const hb = this.hold.take();
      const holding = this.hold.held || G.input.held('jump') || G.input.held('action') || this.autoHold || G.input.pointer.down;
      const final = this.spec.temp;
      if (holding) {
        if (this.temp < final) {
          const before = Math.floor(this.temp * 2);
          this.temp = Math.min(final, this.temp + dt * ((final - 35) / 2.4));
          if (Math.floor(this.temp * 2) !== before) G.sfx.tick();
          this.disp.userData.show(this.temp.toFixed(1));
          this.hold.progress((this.temp - 35) / (final - 35));
          if (this.temp >= final) {
            this.beepT = 0;
            G.sfx.beep(3);
            this.disp.userData.show(final.toFixed(1), true);
            this.hold.label('Let go!');
          }
        } else {
          this.beepT += dt;
          if (this.beepT > 1.8) this.read(0.75);
        }
      } else if (hb.up || !holding) {
        if (this.temp >= final) this.read(this.beepT < 1.0 ? 1 : 0.85);
        else if (this.temp > 35.05) {
          this.mistakes++;
          G.say('roji', 'Too soon! Hold until it beeps.');
          G.sfx.bad();
          this.temp = 35;
          this.disp.userData.show('35.0');
          this.hold.progress(0);
        }
      }
    } else if (this.phase === 'read') {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.rq);
    }
  }
  read(q) {
    const G = this.G;
    this.phase = 'read';
    this.endT = 1.2;
    this.rq = clamp(q - this.mistakes * 0.2, 0.3, 1);
    const t = this.spec.temp;
    const what = t >= 38 ? 'a fever' : t >= 37.5 ? 'a little warm' : 'just right';
    G.find(`Temperature ${t.toFixed(1)}: ${what}`);
    G.say('roji', t >= 38 ? `${t.toFixed(1)}. That is a fever.` : t >= 37.5 ? `${t.toFixed(1)}. A little warm.` : `${t.toFixed(1)}. Nice and normal.`);
    this.P.over.mouth = 0;
    G.ui.clearDock();
  }
  auto(dt) {
    const c = this.G.cursor;
    if (this.phase === 'drag') c.toward(0, 0, 0.5, dt, true);
    else if (this.phase === 'hold') this.autoHold = this.temp < this.spec.temp || this.beepT < 0.4;
  }
}

// The thermometer's digital display: a small sprite. userData.show(text, done)
function lcd(G) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(0.2, 0.0875, 1);
  s.renderOrder = 10;
  s.userData.show = (text, done) => {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, 256, 112);
    g.fillStyle = done ? '#ffdfe4' : '#fffaf4';
    roundRect(g, 4, 4, 248, 104, 26);
    g.fill();
    g.lineWidth = 7;
    g.strokeStyle = done ? '#ef5b6f' : '#3fbf9f';
    g.stroke();
    g.fillStyle = '#3b2b3f';
    g.font = `700 64px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 60);
    tex.needsUpdate = true;
  };
  return s;
}

// ------------------------------------------------------------------ stethoscope: find the sound
const STETH = {
  heart: { text: 'Find the heartbeat', found: 'A strong, happy heartbeat', area: [0.04, 0.05, 0.08, 0.06] },
  rumble: { text: 'Find the rumbly sound', found: 'Rumbly crackles in the chest', area: [0, -0.02, 0.12, 0.07] },
  gurgle: { text: 'Find the tummy gurgles', found: 'A gurgly, grumbly tummy', area: [0, -0.16, 0.1, 0.05] },
  whistle: { text: 'Find the whistle', found: 'A little whistle inside!', area: [0, -0.1, 0.08, 0.06] },
};
export class Steth extends Step {
  constructor(G, spec) {
    super(G, spec);
    const s = STETH[spec.spot] || STETH.heart;
    this.info = s;
    this.title = 'Listen with the stethoscope';
    this.hint = `${s.text}: drag it over the ${spec.spot === 'gurgle' || spec.spot === 'whistle' ? 'tummy' : 'chest'}`;
    this.keys = 'Arrow keys move the stethoscope';
  }
  enter() {
    const G = this.G;
    const chest = this.P.part('chest');
    G.frameAt(chest.clone().add(tmp.set(0, 0.12, 0)), 1.05, 1.35);
    this.anchor = this.add(anchorAt(G, chest, 0.06));
    const surf = surface(G, this.anchor, 0.5, 0.45);
    G.cursor.use(surf, { x: 0.18, y: -0.15, lift: 0.04 });
    const [ax, ay, rx, ry] = this.info.area;
    const r = G.r;
    this.spot = { x: ax + (r() - 0.5) * 2 * rx * 0.7, y: ay + (r() - 0.5) * 2 * ry * 0.7 };
    if (this.spec.spot === 'heart') this.spot.x = Math.abs(this.spot.x);
    this.piece = this.add(new THREE.Group());
    const disc = G.k.cyl(0.045, 0.045, 0.022, C.steel, 20, { metal: 0.6, rough: 0.25 });
    disc.rotation.x = Math.PI / 2;
    const rim = G.k.tor(0.047, 0.009, '#ff8fb1', Math.PI * 2, undefined, 20);
    this.piece.add(disc, rim);
    const tube = G.k.cyl(0.008, 0.008, 0.28, C.mintDeep, 6);
    tube.position.set(0.05, 0.14, -0.02);
    tube.rotation.z = -0.4;
    this.piece.add(tube);
    this.glow = this.add(ringMesh(0.07, 0.01, '#ff8fb1', 0), this.piece);
    this.lock = 0;
    this.beatT = 0;
    this.found = false;
    this.heart = null;
    this.wordAt = chest;
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    this.t += dt;
    const w = c.world(0.02);
    this.piece.position.lerp(w, 1 - Math.exp(-22 * dt));
    this.piece.quaternion.copy(this.anchor.quaternion);
    const d = Math.hypot(c.x - this.spot.x, c.y - this.spot.y);
    const near = clamp(1 - d / 0.22, 0, 1);
    this.glow.material.opacity = near * near * 0.9;
    this.glow.scale.setScalar(1 + Math.sin(this.t * 9) * 0.1 * near);
    if (this.found) {
      this.endT -= dt;
      const beat = Math.max(0, Math.sin(this.t * 9));
      if (this.heart) this.heart.scale.setScalar(0.9 + beat * 0.35);
      if (this.lockRing) {
        this.lockRing.visible = true;
        this.lockRing.scale.setScalar(1 + beat * 0.45);
        this.lockRing.material.opacity = 1 - beat * 0.5;
      }
      if (this.endT <= 0) this.finish(this.fq);
      return;
    }
    // The sound gets louder close to the spot
    this.beatT -= dt;
    if (this.beatT <= 0 && near > 0.05) {
      this.beatT = 0.62;
      G.sfx.listen(this.spec.spot, near);
    }
    if (d < 0.05 && (c.src !== 'pointer' || c.down || !G.touch)) {
      this.lock += dt;
      if (!this.lockRing) {
        this.lockRing = this.add(ringMesh(0.06, 0.012, '#3fbf9f', 1), this.anchor);
      }
      this.lockRing.visible = true;
      this.lockRing.position.set(this.spot.x, this.spot.y, 0.03);
      this.lockRing.scale.setScalar(1.6 - Math.min(1, this.lock / 0.8) * 0.6);
      if (this.lock > 0.8) this.discover();
    } else {
      this.lock = Math.max(0, this.lock - dt * 2);
      if (this.lockRing) this.lockRing.visible = false;
    }
    // A soft hint after a while
    if (this.t > 7 && !this.hintRing) {
      this.hintRing = this.add(ringMesh(0.09, 0.006, '#ffd166', 0.6), this.anchor);
      this.hintRing.position.set(this.spot.x, this.spot.y, 0.02);
    }
    if (this.hintRing) this.hintRing.scale.setScalar(1 + Math.sin(this.t * 4) * 0.15);
  }
  discover() {
    const G = this.G;
    this.found = true;
    this.endT = 1.6;
    this.fq = this.t < 5 ? 1 : this.t < 9 ? 0.85 : 0.65;
    G.sfx.found(this.spec.spot);
    G.find(this.info.found);
    const h = G.k.heart(0.05, 0.015, C.rose);
    this.heart = this.add(h, this.anchor);
    h.position.set(this.spot.x, this.spot.y + 0.1, 0.05);
    G.fx.heartsAt(c3(this.anchor, this.spot.x, this.spot.y + 0.05), 2);
    const lines = { heart: 'Ba-dum, ba-dum. Lovely and strong.', rumble: 'I can hear the rumbles. That is the cough.', gurgle: 'Grumble, gurgle! Your tummy is talking.', whistle: 'Wheee-oo! The whistle is in there!' };
    G.say('roji', lines[this.spec.spot] || lines.heart);
  }
  auto(dt) {
    const c = this.G.cursor;
    if (this.t < 0.4) return;
    c.toward(this.spot.x, this.spot.y, 0.35, dt, true);
  }
}
const c3 = (anchor, x, y, z = 0) => anchor.localToWorld(V().set(x, y, z));

// ------------------------------------------------------------------ the little light (throat, ear, eyes)
const LIGHT = {
  throat: { hint: 'Find the sore spots in the throat', found: 'Red spots in the throat', say: 'Say ahh!', done: 'Red, sore spots. A poorly throat.' },
  ear: { hint: 'Find the sore spots in the ear', found: 'A red, sore ear', say: 'Let me peek in your ear.', done: 'There it is: a sore, red ear.' },
  eyes: { hint: 'Shine it in each eye', found: 'Both eyes react to the light', say: 'Look at my light, please.', done: 'Both eyes are fine. Clever eyes!' },
};
export class Light extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.info = LIGHT[spec.view] || LIGHT.throat;
    this.title = 'Shine the little light';
    this.hint = this.info.hint;
    this.keys = 'Arrow keys move the light';
  }
  enter() {
    const G = this.G;
    const P = this.P;
    const head = this.spec.view === 'ear' ? P.part('ear') : this.spec.view === 'eyes' ? P.part('eyes') : P.part('mouth');
    const goal = G.frameAt(head.clone(), 0.85, 1.2);
    // The magnifier between the camera and the face
    const lensDist = goal.dist * 0.62;
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(G.camera.fov / 2)) * lensDist;
    const D = Math.min(visH * 0.72, visH * G.camera.aspect * 0.5);
    this.anchor = this.add(anchorAt(G, head, goal.dist - lensDist));
    this.anchor.position.y -= visH * 0.03;
    this.board = new Board(D, D, 512, { round: true });
    this.add(this.board.mesh, this.anchor);
    this.dark = darkLens(D / 2);
    this.add(this.dark.mesh, this.anchor);
    this.dark.mesh.position.z = 0.002;
    const frame = this.add(new THREE.Mesh(new THREE.TorusGeometry(D / 2, D * 0.035, 10, 48), new THREE.MeshStandardMaterial({ color: C.mintDeep, roughness: 0.4 })), this.anchor);
    frame.position.z = 0.004;
    const handle = this.add(G.k.rbox(D * 0.09, D * 0.4, D * 0.06, C.mintDeep, 0.01), this.anchor);
    handle.position.set(D * 0.42, -D * 0.62, 0);
    handle.rotation.z = 0.7;
    const r = G.r;
    const skin = P.look.skin;
    this.pic = this.spec.view === 'ear' ? earPic(this.board, r) : this.spec.view === 'eyes' ? eyesPic(this.board, r, skin) : throatPic(this.board, r);
    this.board.flush();
    this.found = this.pic.spots.map(() => false);
    this.lit = this.pic.spots.map(() => 0);
    this.D = D;
    G.cursor.use(surface(G, this.anchor, D, D), { x: -D * 0.25, y: D * 0.25, lift: D * 0.08, speed: D * 0.9, bounds: { x: D * 0.48, y: D * 0.48 } });
    this.torch = this.add(aimTool(makeTool(G.k, 'light'), tipOf('light'), new THREE.Vector3(0.7, -0.62, 0.25), 0.62));
    this.beam = this.add(new THREE.Mesh(new THREE.CircleGeometry(D * 0.15, 24), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0.18, depthWrite: false })), this.anchor);
    this.beam.renderOrder = 9;
    this.beam.position.z = 0.006;
    if (this.spec.view === 'throat') P.over.mouth = 1;
    G.say('patient', this.spec.view === 'throat' ? 'Ahhhhh...' : 'Okay!');
    this.wordAt = head;
    this.hold = 0;
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    this.t += dt;
    const D = this.D;
    const u = c.x / D + 0.5;
    const v = 0.5 - c.y / D;
    this.dark.set(u, v, 0.17);
    this.beam.position.set(c.x, c.y, 0.006);
    this.torch.position.lerp(c.surface.world(c.x + D * 0.13, c.y - D * 0.13, 0.03, tmp2), 1 - Math.exp(-20 * dt));
    this.torch.quaternion.copy(this.anchor.quaternion);
    if (this.endT !== undefined) {
      this.endT -= dt;
      this.dark.fade(Math.max(0, this.endT / 1.2) * 0.93);
      if (this.endT <= 0) this.finish(this.t < 7 ? 1 : this.t < 12 ? 0.85 : 0.65);
      return;
    }
    let redraw = false;
    this.pic.spots.forEach((s, i) => {
      if (this.found[i]) return;
      const d = Math.hypot(u - s.u, v - s.v);
      if (d < s.r + 0.03) {
        this.lit[i] += dt;
        if (this.spec.view === 'eyes') redraw = true;
        if (this.lit[i] > 0.5) {
          this.found[i] = true;
          redraw = true;
          G.sfx.chime(this.found.filter(Boolean).length);
        }
      } else this.lit[i] = Math.max(0, this.lit[i] - dt);
    });
    if (redraw) {
      this.pic.draw(this.found, this.lit.map((x) => Math.min(1, x * 2)));
      this.board.flush();
    }
    if (this.found.every(Boolean)) {
      this.endT = 1.2;
      G.find(this.info.found);
      G.say('roji', this.info.done);
      this.P.over.mouth = 0;
    }
  }
  auto(dt) {
    const c = this.G.cursor;
    const i = this.found.findIndex((f) => !f);
    if (i < 0 || this.t < 0.4) return;
    const s = this.pic.spots[i];
    c.toward((s.u - 0.5) * this.D, (0.5 - s.v) * this.D, this.D * 1.2, dt, true);
  }
}

// ------------------------------------------------------------------ reflex hammer: tap at the right moment
export class Reflex extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Check the reflexes';
    this.hint = 'Tap when the hammer reaches the knee';
    this.keys = 'Press Space when the hammer reaches the knee';
  }
  enter() {
    const G = this.G;
    const knee = this.P.part('knee');
    G.frameAt(knee.clone().add(tmp.set(0, 0.26, 0.06)), 1.3, 1.7, new THREE.Vector3(1, 0.3, 0.8));
    this.anchor = this.add(anchorAt(G, knee, 0.12));
    this.pivot = this.add(new THREE.Group());
    this.pivot.position.copy(knee).add(tmp.set(0.0, 0.36, 0.11));
    const h = brighten(M.hammer(G.k));
    h.scale.setScalar(1.7);
    h.rotation.set(0, Math.PI / 2, Math.PI / 2);
    h.position.y = -0.2;
    this.head = h;
    this.pivot.add(h);
    this.zone = this.add(ringMesh(0.06, 0.012, '#7fd8bf', 0.85), this.anchor);
    this.zone.position.set(0, 0.03, 0.02);
    this.hits = 0;
    this.tries = 0;
    this.score = 0;
    this.phase = Math.PI;
    this.speed = 3.6;
    this.cool = 0;
    this.btn = G.ui.buttons([{ id: 'tap', label: 'Tap!', icon: 'hammer', go: true, key: 'Space' }], { big: true });
    G.ui.dock.classList.add('right');
    this.wordAt = knee;
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    // The hammer lifts away and comes back down to the knee, again and again
    const ang = 0.5 - 0.5 * Math.cos(this.phase);
    this.pivot.rotation.x = -ang * 1.1;
    this.cool -= dt;
    const close = 1 - Math.min(1, ang / 0.3);
    this.zone.material.color.set(close > 0.4 ? '#3fbf9f' : '#7fd8bf');
    this.zone.scale.setScalar(1 + close * 0.3);
    if (this.kickT !== undefined) {
      this.kickT += dt;
      this.P.over.kick = Math.sin(Math.min(1, this.kickT / 0.45) * Math.PI);
      if (this.kickT > 0.45) this.kickT = undefined;
    }
    if (this.hits >= 3) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(clamp(this.score / 3, 0.3, 1));
      this.phase = Math.min(this.phase + dt * 2, Math.ceil(this.phase / (Math.PI * 2)) * Math.PI * 2 + Math.PI);
      return;
    }
    const tap = this.btn.take('tap') || G.input.pressed('jump') || G.input.pressed('action') || G.input.pointer.justDown || this.autoTap;
    this.autoTap = false;
    if (tap && this.cool <= 0) {
      this.cool = 0.35;
      this.tries++;
      if (ang < 0.12) this.hit(1, 'Boing!');
      else if (ang < 0.3) this.hit(0.75, 'Good!');
      else {
        G.sfx.bad();
        G.word(Math.sin(this.phase) < 0 ? 'Too early' : 'Too late', this.wordAt, '#c9822a', true);
        this.score -= 0.15;
      }
      if (this.tries >= 8 && this.hits < 3) {
        this.hits = 3;
        this.endT = 0.8;
      }
    }
    this.phase += dt * this.speed;
  }
  hit(q, w) {
    const G = this.G;
    this.hits++;
    this.score += q;
    this.kickT = 0;
    G.sfx.boing();
    G.word(w, this.wordAt.clone().add(tmp.set(0, 0.25, 0)), '#2a9479', true);
    this.speed += 0.45;
    if (this.hits >= 3) {
      this.endT = 1.1;
      G.find('Knee reflex: boing, all good');
      G.say('patient', 'Hee hee, my leg jumped!');
    }
  }
  auto() {
    const ang = 0.5 - 0.5 * Math.cos(this.phase);
    if (ang < 0.1 && this.cool <= 0 && this.t > 0.5) this.autoTap = true;
  }
}

// ------------------------------------------------------------------ X-ray: tap the break
export class Xray extends Step {
  constructor(G, spec) {
    super(G, spec);
    const what = { arm: 'the break', leg: 'the break', toy: 'the toy', stones: 'every stone', splinter: 'the splinter' }[spec.view];
    this.title = 'Read the X-ray';
    this.hint = `Tap ${what}`;
    this.keys = 'Arrow keys aim, Space taps';
  }
  enter() {
    const G = this.G;
    const lb = G.rooms.exam.lightbox;
    const sc = lb.userData.screen;
    this.sc = sc;
    const p = sc.mesh.getWorldPosition(V());
    G.frameAt(p.clone(), 0.85, 1.05, new THREE.Vector3(0, 0.08, 1));
    this.pic = xrayPic(sc.canvas, this.spec.view, G.r);
    sc.tex.needsUpdate = true;
    this.found = this.pic.targets.map(() => false);
    this.misses = [];
    const surf = surface(G, sc.mesh, 0.92, 0.72);
    G.cursor.use(surf, { x: 0, y: 0, speed: 0.5 });
    this.aim = this.add(ringMesh(0.045, 0.007, '#ffd166', 0.9), sc.mesh);
    this.aim.position.z = 0.01;
    this.aim.visible = !G.touch;
    this.wordAt = p;
    G.sfx.swoosh();
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    this.t += dt;
    this.aim.position.set(c.x, c.y, 0.01);
    if (c.src === 'keys' || c.src === 'auto') this.aim.visible = true;
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(clamp(1 - this.misses.length * 0.2, 0.3, 1));
      return;
    }
    if (c.pressed) {
      const u = c.x / 0.92 + 0.5;
      const v = 0.5 - c.y / 0.72;
      const i = this.pic.targets.findIndex((t, j) => !this.found[j] && Math.hypot((u - t.u) * 1.28, v - t.v) < t.r + 0.05);
      if (i >= 0) {
        this.found[i] = true;
        G.sfx.chime(this.found.filter(Boolean).length);
      } else {
        this.misses.push({ u, v });
        G.sfx.bad();
        G.word('Not there', c.world(0.02), '#c9822a', true);
      }
      this.pic.draw(this.found, this.misses);
      this.sc.tex.needsUpdate = true;
      if (this.found.every(Boolean)) {
        this.endT = 1.3;
        const v0 = this.spec.view;
        const txt = { arm: 'A break in the arm bone', leg: 'A break in the leg bone', toy: 'A toy duck in the tummy!', stones: 'Three little stones', splinter: 'A big splinter, deep inside' }[v0];
        G.find(txt);
        G.say('roji', { arm: 'There is the break. Poor arm!', leg: 'Found it: a break in the leg.', toy: 'I can see the duck! Quack.', stones: 'Three stones. We will get them out.', splinter: 'That splinter is deep. We need the theatre.' }[v0]);
      }
    }
  }
  auto(dt) {
    const c = this.G.cursor;
    const i = this.found.findIndex((f) => !f);
    if (i < 0 || this.t < 0.5) return;
    const tg = this.pic.targets[i];
    const x = (tg.u - 0.5) * 0.92;
    const y = (0.5 - tg.v) * 0.72;
    if (c.toward(x, y, 0.6, dt, false)) c.drive(x, y, true);
  }
  exit() {
    super.exit();
  }
}

// ------------------------------------------------------------------ magnifier on the skin (clean, stitches)
function magnifier(step, part, { size = 0.85 } = {}) {
  const G = step.G;
  const P = step.P;
  const p = P.part(part);
  const goal = G.frameAt(p.clone(), size, size * 1.4);
  const lensDist = goal.dist * 0.6;
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(G.camera.fov / 2)) * lensDist;
  const D = Math.min(visH * 0.74, visH * G.camera.aspect * 0.5);
  const anchor = step.add(anchorAt(G, p, goal.dist - lensDist));
  const board = new Board(D, D, 512, { round: true });
  step.add(board.mesh, anchor);
  const frame = step.add(new THREE.Mesh(new THREE.TorusGeometry(D / 2, D * 0.035, 10, 48), new THREE.MeshStandardMaterial({ color: C.mintDeep, roughness: 0.4 })), anchor);
  frame.position.z = 0.004;
  const handle = step.add(G.k.rbox(D * 0.09, D * 0.4, D * 0.06, C.mintDeep, 0.01), anchor);
  handle.position.set(D * 0.42, -D * 0.62, 0);
  handle.rotation.z = 0.7;
  return { anchor, board, D, at: p };
}

export class Clean extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Clean the scrape';
    this.hint = 'Rub the dirt away with the swab';
    this.keys = 'Hold Space and move with the arrow keys';
  }
  enter() {
    const G = this.G;
    const part = this.spec.part === 'knee' ? 'knee' : 'elbow';
    this.P.over.armOut = part === 'elbow' ? 1 : 0;
    this.lens = magnifier(this, part);
    const { board, D, anchor } = this.lens;
    this.pic = skinPic(board, G.r, this.P.look.skin);
    this.dirt = this.pic.dirt.map(() => 1);
    this.pic.draw({ cut: this.P.entry.c.treat === 'stitches', dirtOn: this.dirt });
    board.flush();
    G.cursor.use(surface(G, anchor, D, D), { x: D * 0.3, y: -D * 0.3, lift: D * 0.06, speed: D * 0.9, keysDown: true, bounds: { x: D * 0.47, y: D * 0.47 } });
    this.swab = this.add(aimTool(M.swab(G.k), tipOf('swab'), new THREE.Vector3(0.6, -0.5, 0.6), 1.6));
    this.prev = null;
    this.wordAt = this.lens.at;
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    const { D, anchor, board } = this.lens;
    this.t += dt;
    this.swab.position.lerp(c.world(0.02), 1 - Math.exp(-22 * dt));
    this.swab.quaternion.copy(anchor.quaternion);
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.t < 6 ? 1 : this.t < 10 ? 0.85 : 0.7);
      return;
    }
    const u = c.x / D + 0.5;
    const v = 0.5 - c.y / D;
    if (c.down) {
      const moved = this.prev ? Math.hypot(u - this.prev.u, v - this.prev.v) : 0;
      let changed = false;
      this.pic.dirt.forEach((d, i) => {
        if (this.dirt[i] <= 0) return;
        if (Math.hypot(u - d.u, v - d.v) < d.r + 0.06) {
          this.dirt[i] = Math.max(0, this.dirt[i] - moved * 9 - dt * 0.3);
          changed = true;
          if (this.dirt[i] <= 0) G.sfx.sparkle();
        }
      });
      if (moved > 0.002) this.swab.rotateZ(Math.sin(this.t * 30) * 0.08);
      if (changed) {
        this.pic.draw({ cut: this.P.entry.c.treat === 'stitches', dirtOn: this.dirt });
        board.flush();
      }
      this.prev = { u, v };
    } else this.prev = null;
    if (this.dirt.every((d) => d <= 0)) {
      this.endT = 1.0;
      G.find('Scrape cleaned, no more dirt');
      G.say('roji', 'All clean. That was brave!');
    }
  }
  auto(dt) {
    const c = this.G.cursor;
    const D = this.lens.D;
    const i = this.dirt.findIndex((d) => d > 0);
    if (i < 0) return;
    const d = this.pic.dirt[i];
    this.wig = (this.wig || 0) + dt * 14;
    c.toward((d.u - 0.5) * D + Math.sin(this.wig) * D * 0.05, (0.5 - d.v) * D, D * 1.4, dt, true);
  }
}

export class Stitches extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Stitch the cut';
    this.hint = 'Trace the blue dots with the needle';
    this.keys = 'Follow the dots with the arrow keys';
  }
  enter() {
    const G = this.G;
    const part = this.spec.part === 'head' ? 'forehead' : 'elbow';
    this.P.over.armOut = part === 'elbow' ? 1 : 0;
    this.lens = magnifier(this, part, { size: part === 'forehead' ? 0.9 : 0.85 });
    const { board, D, anchor } = this.lens;
    this.pic = skinPic(board, G.r, this.P.look.skin);
    this.pts = this.pic.stitch.map((p) => ({ x: (p.u - 0.5) * D, y: (0.5 - p.v) * D }));
    this.tr = new Tracer(this.pts, D * 0.09);
    this.drawn = -1;
    this.repaint();
    const s0 = this.pts[0];
    G.cursor.use(surface(G, anchor, D, D), { x: s0.x - D * 0.05, y: s0.y - D * 0.12, lift: D * 0.07, speed: D * 0.55, keysDown: true, bounds: { x: D * 0.47, y: D * 0.47 } });
    this.needle = this.add(aimTool(M.needle(G.k), tipOf('needle'), new THREE.Vector3(0.6, -0.45, 0.65), 1.3));
    this.wordAt = this.lens.at;
    this.offT = 0;
  }
  repaint() {
    const n = Math.floor((this.tr.s / this.tr.L) * (this.pts.length - 1) + 1e-6);
    if (n === this.drawn) return;
    if (n > this.drawn && this.drawn >= 0) this.G.sfx.stitch(n);
    this.drawn = n;
    this.pic.draw({ cut: true, stitched: n, dots: true, closed: n / (this.pts.length - 1) });
    this.lens.board.flush();
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    const { anchor, D } = this.lens;
    this.t += dt;
    this.needle.position.lerp(c.world(0.015), 1 - Math.exp(-24 * dt));
    this.needle.quaternion.copy(anchor.quaternion);
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.tr.steady * (this.t < 9 ? 1 : 0.9));
      return;
    }
    if (c.down) {
      const d = this.tr.feed(c.x, c.y);
      this.offT = d > this.tr.tol * 1.6 ? this.offT + dt : 0;
      if (this.offT > 0.6) {
        this.offT = -1.5;
        G.word('Follow the dots', c.world(0.03), '#c9822a', true);
      }
    } else this.tr.lift();
    this.repaint();
    if (this.tr.k > 0.97) {
      this.endT = 1.0;
      G.find('Neat stitches');
      G.say('roji', 'Neat stitches, all closed up.');
    }
  }
  auto(dt) {
    const c = this.G.cursor;
    const p = this.tr.at(this.tr.s + this.tr.tol * 0.8);
    c.toward(p.x, p.y, this.lens.D * 0.8, dt, true);
  }
}

// ------------------------------------------------------------------ choose the treatment
export class Choice extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Pick the treatment';
    this.hint = `What will help ${G.patient.name}?`;
    this.keys = 'Press 1, 2 or 3';
  }
  enter() {
    const G = this.G;
    G.frameMedium();
    const right = this.P.entry.c.treat;
    const others = Object.keys(TREATS).filter((t) => t !== right);
    const pick = [];
    while (pick.length < 2) {
      const o = others[Math.floor(G.r() * others.length)];
      if (!pick.includes(o)) pick.push(o);
    }
    const list = [right, ...pick].sort(() => G.r() - 0.5);
    this.list = list;
    this.right = right;
    this.wrong = 0;
    this.row = G.ui.cards(
      list.map((id) => ({ id, label: TREATS[id].name, sub: TREATS[id].sub, icon: id })),
      (id, el) => this.pick(id, el),
    );
    G.showNotes();
    G.say('roji', 'What did we find? Let me think...');
    this.wordAt = this.P.part('head').add(tmp.set(0, 0.6, 0));
  }
  pick(id, el) {
    if (this.chose) return;
    const G = this.G;
    el = el || this.row.querySelector(`[data-id="${id}"]`);
    if (id === this.right) {
      this.chose = true;
      el.classList.add('yes');
      G.sfx.pop();
      G.say('roji', `${TREATS[id].name}. That will help!`);
      this.endT = 0.9;
    } else {
      this.wrong++;
      el.classList.add('no');
      setTimeout(() => el.classList.remove('no'), 450);
      G.sfx.bad();
      G.say('roji', 'Hmm, not that one. Look at what we found.');
      if (this.wrong >= 2) this.row.querySelector(`[data-id="${this.right}"]`).classList.add('hint');
    }
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    if (!this.chose) for (let i = 0; i < this.list.length; i++) if (G.input.pressed(String(i + 1))) this.pick(this.list[i]);
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.wrong === 0 ? 1 : this.wrong === 1 ? 0.6 : 0.35, this.wrong === 0 ? 'Right!' : 'Got there!');
    }
  }
  auto() {
    if (this.t > 0.8 && !this.chose) this.pick(this.right);
  }
  exit() {
    this.G.ui.notes(null);
    super.exit();
  }
}

// ------------------------------------------------------------------ plaster cast: drag round and round
export class Cast extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.leg = spec.limb === 'leg';
    this.title = 'Wrap a plaster cast';
    this.hint = `Drag round and round the ${this.leg ? 'leg' : 'arm'}`;
    this.keys = 'Hold the Left or Right arrow to wrap';
  }
  enter() {
    const G = this.G;
    const P = this.P;
    if (!this.leg) P.over.armOut = 1;
    P.update(0);
    const centre = P.part(this.leg ? 'shin' : 'forearm');
    G.frameAt(centre.clone(), 0.8, 1.1);
    this.anchor = this.add(anchorAt(G, centre, 0.08));
    G.cursor.use(surface(G, this.anchor, 0.7, 0.6), { x: 0.16, y: 0, lift: 0 });
    this.guide = this.add(ringMesh(0.15, 0.006, '#ffffff', 0.7), this.anchor);
    this.dot = this.add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd166', depthTest: false })), this.anchor);
    this.dot.renderOrder = 10;
    this.roll = this.add(M.castRoll(G.k, P.castColor));
    this.roll.scale.setScalar(1.2);
    // The cast grows along the limb from the far end
    const limb = this.leg ? P.kid.legs[0] : P.kid.arms[0];
    const len = this.leg ? 0.17 : 0.22;
    const geo = new THREE.CylinderGeometry(1, 1, 1, 18, 1, false);
    const mat = new THREE.MeshStandardMaterial({ color: P.castColor, roughness: 0.85, map: G.rainbow ? rainbowTex() : null });
    this.cast = new THREE.Mesh(geo, mat);
    this.cast.castShadow = true;
    limb.add(this.cast);
    this.cast.visible = false;
    this.castLen = len;
    this.castEnd = this.leg ? -0.23 : -0.27;
    this.P.keep.push(this.cast);
    this.ang = null;
    this.total = 0;
    this.need = Math.PI * 2 * 3;
    this.meter = G.ui.meter('Wrap 3 times');
    this.wordAt = centre;
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    this.t += dt;
    let delta = 0;
    // Keyboard: hold left or right to wrap
    const ax = G.input.axis().x;
    if (!G.auto && Math.abs(ax) > 0.3 && c.src !== 'pointer') delta = Math.abs(ax) * dt * 5.5;
    if (c.down || G.auto) {
      const r = Math.hypot(c.x, c.y);
      const a = Math.atan2(c.y, c.x);
      if (r > 0.05 && this.ang !== null) {
        let d = a - this.ang;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        delta += Math.min(Math.abs(d), 1.2);
      }
      this.ang = r > 0.05 ? a : null;
    } else this.ang = null;
    if (this.endT === undefined) {
      const before = Math.floor(this.total / (Math.PI * 2));
      this.total = Math.min(this.need, this.total + delta);
      if (Math.floor(this.total / (Math.PI * 2)) > before) G.sfx.layer(before + 1);
      if (delta > 0) this.rollSpin = (this.rollSpin || 0) + delta;
    }
    const k = this.total / this.need;
    this.meter.set(k);
    this.meter.label(k >= 1 ? 'All wrapped!' : `Wrap ${3 - Math.floor(this.total / (Math.PI * 2))} more`);
    // The cast: longer and a little thicker with every turn
    this.cast.visible = k > 0.01;
    const L = this.castLen * Math.min(1, k * 1.15);
    const R = (this.leg ? 0.072 : 0.06) + Math.floor(this.total / (Math.PI * 2)) * 0.004;
    this.cast.scale.set(R, Math.max(0.01, L), R);
    this.cast.position.y = this.castEnd + L / 2;
    // The roll goes round the limb, the guide dot shows the way
    const ra = (this.rollSpin || 0) + this.t * 0.0;
    this.roll.position.copy(c3(this.anchor, Math.cos(ra) * 0.15, Math.sin(ra) * 0.15, 0.03));
    this.roll.quaternion.copy(this.anchor.quaternion);
    const da = this.t * 3.2;
    this.dot.position.set(Math.cos(da) * 0.15, Math.sin(da) * 0.15, 0.03);
    this.dot.visible = k < 1;
    this.guide.visible = k < 1;
    if (k >= 1 && this.endT === undefined) {
      this.endT = 1.1;
      G.fx.burst(this.wordAt.clone(), ['#ffffff', '#ffd166', '#ff8fb1'], 24);
      G.say('roji', 'A brand new cast. Everyone can sign it!');
      this.meter.remove();
    }
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.t < 7 ? 1 : this.t < 12 ? 0.85 : 0.7);
    }
  }
  auto(dt) {
    this.aa = (this.aa ?? 0) + dt * 6;
    this.G.cursor.drive(Math.cos(this.aa) * 0.15, Math.sin(this.aa) * 0.15, true);
  }
  exit() {
    this.meter?.remove();
    super.exit();
  }
}

let rainbow = null;
function rainbowTex() {
  if (rainbow && rainbow.image?.width > 1) return rainbow;
  rainbow = canvasTexture(64, 128, (g, w, h) => {
    const cols = ['#ff8fb1', '#ffd166', '#7fd8bf', '#8fd3ff', '#c7a6ff'];
    for (let i = 0; i < 10; i++) {
      g.fillStyle = cols[i % 5];
      g.fillRect(0, (i * h) / 10, w, h / 10);
    }
  });
  return rainbow;
}

// ------------------------------------------------------------------ plaster on a scrape: drag it on, press it down
export class Bandage extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Put on a plaster';
    this.hint = 'Drag it onto the scrape';
    this.keys = 'Arrow keys move it, Space sticks it';
  }
  enter() {
    const G = this.G;
    const P = this.P;
    const knee = this.spec.part === 'knee';
    P.over.armOut = knee ? 0 : 1;
    P.update(0);
    const p = P.part(knee ? 'scrape' : 'elbowScrape');
    G.frameAt(p.clone(), 0.7, 1.0);
    this.anchor = this.add(anchorAt(G, p, 0.04));
    G.cursor.use(surface(G, this.anchor, 0.6, 0.5), { x: 0.2, y: -0.12, lift: 0.05 });
    this.pl = this.add(M.plaster(G.k));
    this.pl.scale.setScalar(1.2);
    this.target = this.add(ringMesh(0.05, 0.008, '#7fd8bf', 0.9), this.anchor);
    this.target.position.z = 0.02;
    this.phase = 'drag';
    this.start = { x: 0.2, y: -0.12 };
    this.press = 0;
    this.limb = knee ? P.kid.legs[0] : P.kid.arms[0];
    this.wordAt = p;
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    this.t += dt;
    this.target.scale.setScalar(1 + Math.sin(this.t * 6) * 0.12);
    if (this.phase === 'drag') {
      if (c.down || c.src === 'keys' || c.src === 'auto') this.held = true;
      if (c.src === 'pointer' && !c.down && this.held && !c.released) this.held = false;
      const pos = this.held ? c : this.start;
      const w = c3(this.anchor, pos.x, pos.y, 0.03);
      this.pl.position.lerp(w, 1 - Math.exp(-20 * dt));
      this.pl.quaternion.copy(this.anchor.quaternion);
      this.pl.rotateX(Math.PI / 2);
      const d = Math.hypot(c.x, c.y);
      const drop = (c.released && c.src === 'pointer') || ((c.src === 'keys' || c.src === 'auto') && c.pressed);
      if (this.held && drop) {
        if (d < 0.07) this.stick(d);
        else if (c.src === 'pointer') this.held = false;
      }
    } else if (this.phase === 'press') {
      const holding = this.hold.held || G.input.held('jump') || G.input.held('action') || G.input.pointer.down || this.autoHold;
      if (holding) {
        this.press += dt;
        this.pl.scale.setScalar(1.2 * (1 - Math.sin(this.t * 20) * 0.03));
      }
      this.hold.progress(this.press / 0.8);
      if (this.press >= 0.8) {
        this.phase = 'end';
        this.endT = 0.9;
        G.ui.clearDock();
        G.sfx.pop();
        // Stick it to the limb so it stays
        this.limb.attach(this.pl);
        this.objs.splice(this.objs.indexOf(this.pl), 1);
        this.P.keep.push(this.pl);
        G.say('patient', 'It does not sting anymore!');
        G.fx.heartsAt(this.wordAt.clone().add(tmp.set(0, 0.15, 0)), 2);
      }
    } else {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.acc);
    }
  }
  stick(d) {
    const G = this.G;
    this.phase = 'press';
    this.acc = d < 0.025 ? 1 : d < 0.045 ? 0.85 : 0.7;
    this.target.visible = false;
    this.pl.position.copy(c3(this.anchor, 0, 0, 0.012));
    G.sfx.pop();
    this.hold = G.ui.hold('Press');
    G.setHint('Hold to press it down', 'Hold Space to press it down');
  }
  auto(dt) {
    const c = this.G.cursor;
    if (this.phase === 'drag') {
      if (c.toward(0, 0, 0.4, dt, true) && this.t > 0.6) c.drive(0, 0, true), (c.pressed = true);
    } else if (this.phase === 'press') this.autoHold = true;
  }
}

// ------------------------------------------------------------------ medicine: the right dose
export class Dose extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Measure the medicine';
    this.hint = 'Slide to the right dose, then Give';
    this.keys = 'Left and Right change the dose, Enter gives';
  }
  enter() {
    const G = this.G;
    const P = this.P;
    const med = P.entry.c.med || { name: 'Medicine', color: '#ff8fb1', taste: 'cherry' };
    this.med = med;
    G.frameMedium(0.85);
    const age = P.age;
    this.right = age === 'grown-up' ? 10 : age < 6 ? 2.5 : 5;
    G.ui.notes(`${med.name}`, [`Under 6 years: 2.5 ml`, `6 to 12 years: 5 ml`, `Grown-ups: 10 ml`, `<b>${P.name}: ${age === 'grown-up' ? 'a grown-up' : `${age} years old`}</b>`]);
    // The bottle and the cup on a little tray in front of the patient
    const head = P.part('head');
    this.base = head.clone().add(tmp.set(0.55, -0.55, 0.35));
    this.bottle = this.add(M.bottle(G.k, med.color));
    this.bottle.position.copy(this.base).add(tmp.set(-0.12, -0.08, 0));
    this.bottle.scale.setScalar(1.3);
    this.cup = this.add(M.cup(G.k));
    this.cup.position.copy(this.base).add(tmp.set(0.08, -0.08, 0));
    this.cup.scale.setScalar(1.6);
    this.cup.userData.fill(0, med.color);
    this.slider = G.ui.slider({ min: 0, max: 10, step: 0.5, value: 0, color: med.color });
    this.btn = G.ui.buttons([{ id: 'give', label: 'Give', icon: 'dose', go: true, key: 'Enter' }]);
    this.tries = 0;
    this.wordAt = head.clone().add(tmp.set(0, 0.5, 0));
    this.fly = -1;
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    if (this.fly < 0) {
      if (G.input.pressed('arrowright') || G.input.pressed('d')) this.slider.set(this.slider.value + 0.5);
      if (G.input.pressed('arrowleft') || G.input.pressed('a')) this.slider.set(this.slider.value - 0.5);
      this.cup.userData.fill(this.slider.value / 10);
      this.bottle.rotation.z = damp(this.bottle.rotation.z, this.slider.moved ? 0.25 : 0, 6, dt);
      const give = this.btn.take('give') || G.input.pressed('enter') || this.autoGive;
      this.autoGive = false;
      if (give) {
        const d = Math.abs(this.slider.value - this.right);
        if (d < 0.01) this.give(1 - this.tries * 0.25, 'Just right!');
        else if (d <= 0.5 && this.tries >= 1) this.give(0.55, 'Nearly!');
        else {
          this.tries++;
          G.sfx.bad();
          G.say('roji', this.slider.value > this.right ? 'That is too much. Check the card.' : 'Not enough yet. Check the card.');
          if (this.tries >= 3) this.slider.set(this.right);
        }
      }
    } else {
      this.fly += dt;
      const k = Math.min(1, this.fly / 0.7);
      const mouth = this.P.part('mouth');
      this.cup.position.lerpVectors(this.cupFrom, mouth.clone().add(tmp.set(0.05, -0.06, 0.12)), easeOutCubic(k));
      this.cup.rotation.z = k * 1.1;
      if (k >= 1 && !this.drank) {
        this.drank = true;
        this.cup.userData.fill(0);
        G.sfx.gulp();
        G.say('patient', `Mmm, ${this.med.taste}!`);
        this.P.over.mouth = 0.5;
      }
      if (this.fly > 1.7) {
        this.P.over.mouth = 0;
        this.finish(this.gq, this.gw);
      }
    }
  }
  give(q, w) {
    this.fly = 0;
    this.gq = q;
    this.gw = w;
    this.cupFrom = this.cup.position.clone();
    this.G.ui.clearDock();
    this.G.ui.notes(null);
    this.G.sfx.pop();
  }
  auto() {
    if (this.t < 0.6) return;
    if (Math.abs(this.slider.value - this.right) > 0.01) {
      if (Math.floor(this.t * 6) !== this.lastStep) {
        this.lastStep = Math.floor(this.t * 6);
        this.slider.set(this.slider.value + 0.5);
      }
    } else if (this.t > 1.2) this.autoGive = true;
  }
  exit() {
    this.G.ui.notes(null);
    super.exit();
  }
}

// ------------------------------------------------------------------ calm a nervous kid: breathe together
export class Calm extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = `Help ${G.patient.name} feel calm`;
    this.hint = 'Hold to breathe in, let go to breathe out';
    this.keys = 'Hold Space to breathe in, let go to breathe out';
  }
  enter() {
    const G = this.G;
    const P = this.P;
    const head = P.part('head');
    G.frameAt(head.clone().add(tmp.set(0.22, 0.0, 0)), 1.15, 1.6);
    const b = M.balloon(G.k, '#8fd3ff');
    this.balloon = this.add(b.ball);
    this.balloon.position.copy(head).add(tmp.set(0.52, 0.32, 0.1));
    this.hold = G.ui.hold('Breathe');
    this.meter = G.ui.meter('Breathe in...');
    this.cycle = 3.2;
    this.breaths = 3;
    this.good = 0;
    this.n = 0;
    this.size = 0.6;
    P.over.nervous = 1;
    G.say('roji', `Breathe with me, ${P.name}. In... and out.`);
    this.wordAt = head.clone().add(tmp.set(0, 0.5, 0));
    this.t = -0.6;
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    const holding = this.hold.held || G.input.held('jump') || G.input.held('action') || G.input.pointer.down || this.autoHold;
    this.hold.take();
    if (this.endT !== undefined) {
      this.endT -= dt;
      this.size = damp(this.size, 0.8, 4, dt);
      this.balloon.scale.setScalar(this.size);
      if (this.endT <= 0) this.finish(clamp(this.good / this.n, 0.35, 1));
      return;
    }
    if (this.t < 0) return;
    const ph = (this.t % this.cycle) / this.cycle;
    const wantIn = ph < 0.5;
    this.n += dt;
    if (holding === wantIn) this.good += dt;
    this.size = clamp(this.size + (holding ? 0.45 : -0.45) * dt, 0.45, 1.25);
    this.balloon.scale.setScalar(this.size);
    this.balloon.position.y += Math.sin(this.t * 2) * 0.0005;
    this.meter.label(wantIn ? 'Breathe in... (hold)' : 'Breathe out... (let go)');
    this.meter.set(wantIn ? ph * 2 : 2 - ph * 2);
    this.hold.label(wantIn ? 'Breathe in' : 'Breathe out');
    this.P.over.nervous = clamp(1 - this.t / (this.cycle * this.breaths), 0, 1);
    if (this.t >= this.cycle * this.breaths) {
      this.endT = 1.0;
      G.ui.clearDock();
      this.meter.remove();
      this.P.over.nervous = 0;
      this.P.calm = true;
      G.fx.heartsAt(this.wordAt.clone(), 4);
      G.say('patient', 'I feel better now. I am ready!');
    }
  }
  auto() {
    const ph = ((Math.max(0, this.t) + 0.1) % this.cycle) / this.cycle;
    this.autoHold = ph < 0.5;
  }
  exit() {
    this.meter?.remove();
    this.P.over.nervous = 0;
    super.exit();
  }
}

// ------------------------------------------------------------------ vaccine: tap when the rings meet
export class Shot extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Give the vaccine';
    this.hint = 'Tap when the rings meet';
    this.keys = 'Press Space when the rings meet';
  }
  enter() {
    const G = this.G;
    const P = this.P;
    P.over.armOut = 1;
    P.update(0);
    const p = P.part('upperArm');
    G.frameAt(p.clone().add(tmp.set(0.05, 0.05, 0)), 0.7, 1.0);
    this.anchor = this.add(anchorAt(G, p, 0.07));
    this.inner = this.add(ringMesh(0.035, 0.007, '#3fbf9f', 1), this.anchor);
    this.outer = this.add(ringMesh(0.035, 0.009, '#ffd166', 1), this.anchor);
    this.syr = this.add(aimTool(M.syringe(G.k), tipOf('syringe'), new THREE.Vector3(0.75, 0.45, 0.5), 1.3));
    this.syrHome = c3(this.anchor, 0.1, 0.08, 0.06);
    this.syr.position.copy(this.syrHome);
    this.syr.quaternion.copy(this.anchor.quaternion);
    this.btn = G.ui.buttons([{ id: 'tap', label: 'Tap!', icon: 'syringe', go: true, key: 'Space' }], { big: true });
    G.ui.dock.classList.add('right');
    this.k = 0;
    this.miss = 0;
    this.wordAt = p;
    this.cool = 0;
    if (!P.calm && P.entry.nervous) G.say('patient', 'Eek...');
    else G.say('roji', 'Just a tiny pinch, like a little ant.');
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    this.cool -= dt;
    if (this.endT !== undefined) {
      this.endT -= dt;
      const k = 1 - Math.max(0, this.endT - 0.6) / 0.5;
      this.syr.position.lerpVectors(this.syrHome, c3(this.anchor, 0.005, 0.003, 0.01), Math.sin(clamp(k, 0, 1) * Math.PI));
      if (this.endT <= 0) this.finish(clamp(1 - this.miss * 0.25, 0.35, 1), 'So brave!');
      return;
    }
    // The outer ring shrinks to the inner one, then starts again (a tap is judged on what was shown)
    const s = 3.2 - this.k * 2.6;
    const tap = this.btn.take('tap') || G.input.pressed('jump') || G.input.pressed('action') || G.input.pointer.justDown || this.autoTap;
    this.autoTap = false;
    if (tap && this.cool <= 0) {
      this.cool = 0.3;
      if (Math.abs(s - 1) < 0.28 || this.miss >= 4) {
        this.endT = 1.1;
        this.outer.visible = this.inner.visible = false;
        G.sfx.pop();
        G.ui.clearDock();
        // A heart sticker on the arm afterwards
        const st = M.sticker(G.k, '#ff8fb1');
        st.scale.setScalar(0.5);
        this.P.kid.arms[0].add(st);
        st.position.set(0, -0.08, 0.06);
        st.rotation.set(Math.PI / 2, 0, 0);
        this.P.keep.push(st);
        G.say('patient', 'Is it done already? That was nothing!');
        G.fx.heartsAt(this.wordAt.clone().add(tmp.set(0, 0.1, 0)), 3);
        return;
      }
      this.miss++;
      G.sfx.bad();
      G.word(s > 1 ? 'Wait for it' : 'A bit late', this.wordAt, '#c9822a', true);
    }
    this.k = (this.k + dt / 1.3) % 1;
    this.outer.scale.setScalar(3.2 - this.k * 2.6);
  }
  auto() {
    const s = 3.2 - this.k * 2.6;
    if (Math.abs(s - 1) < 0.12 && this.t > 0.6) this.autoTap = true;
  }
}

// ------------------------------------------------------------------ hand-off: Nurse Homama gives Dr. Roji the tool
export class Handoff extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.want = spec.tool;
    this.title = 'Hand Dr. Roji the tool';
    this.hint = `${TOOL_NAMES[this.want]}, please!`;
    this.keys = 'Press 1 to 4';
  }
  enter() {
    const G = this.G;
    G.frameMedium();
    const all = Object.keys(TOOL_NAMES).filter((t) => t !== this.want);
    const pick = [];
    while (pick.length < 3) {
      const o = all[Math.floor(G.r() * all.length)];
      if (!pick.includes(o)) pick.push(o);
    }
    this.list = [this.want, ...pick].sort(() => G.r() - 0.5);
    this.wrong = 0;
    const ic = { stethoscope: 'stethoscope', light: 'light', hammer: 'hammer', xray: 'xray', cast: 'cast', needle: 'needle', syringe: 'syringe', scalpel: 'scalpel', tweezers: 'tweezers', thermometer: 'thermometer', bandage: 'bandage' };
    this.row = G.ui.cards(this.list.map((id) => ({ id, label: TOOL_NAMES[id], icon: ic[id] })), (id, el) => this.pick(id, el));
    G.say('roji', `${TOOL_NAMES[this.want]}, please, Nurse Homama!`);
    this.wordAt = G.roji.head.getWorldPosition(V()).add(tmp.set(0, 0.6, 0));
  }
  pick(id, el) {
    if (this.chose) return;
    const G = this.G;
    el = el || this.row.querySelector(`[data-id="${id}"]`);
    if (id === this.want) {
      this.chose = true;
      el.classList.add('yes');
      G.sfx.pop();
      G.say('roji', ['Thank you, Nurse Homama!', 'Perfect, thank you!', 'Just what I needed.'][Math.floor(G.r() * 3)]);
      this.endT = 0.8;
      G.roji.hands = 'hold';
    } else {
      this.wrong++;
      el.classList.add('no');
      setTimeout(() => el.classList.remove('no'), 450);
      G.sfx.bad();
      G.say('roji', `Not that one. The ${TOOL_NAMES[this.want].toLowerCase()}, please.`);
      if (this.wrong >= 2) this.row.querySelector(`[data-id="${this.want}"]`).classList.add('hint');
    }
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    if (!this.chose) for (let i = 0; i < 4; i++) if (G.input.pressed(String(i + 1))) this.pick(this.list[i]);
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.wrong === 0 ? 1 : this.wrong === 1 ? 0.6 : 0.35, this.wrong === 0 ? 'Thank you!' : 'Got it!');
    }
  }
  auto() {
    if (this.t > 0.7) this.pick(this.want);
  }
}

// ------------------------------------------------------------------ the theatre: scrub, gown, sleep
export class Scrub extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Scrub in';
    this.hint = 'Rub your hands: drag back and forth';
    this.keys = 'Press Left and Right, again and again';
  }
  enter() {
    const G = this.G;
    const who = G.player;
    this.who = who;
    const sink = G.rooms.theatre.spots.sink;
    G.place(who, sink.clone().add(tmp.set(0, 0, -0.6)), 0, 'theatre');
    this.hands = who.root.position.clone().add(tmp.set(0, 0.62, 0.32));
    G.frameAt(this.hands.clone().add(tmp.set(0, 0.22, 0)), 1.35, 1.9, new THREE.Vector3(0.1, 0.42, 1));
    this.anchor = this.add(anchorAt(G, this.hands, 0.1));
    G.cursor.use(surface(G, this.anchor, 1.2, 0.9), { x: 0, y: 0 });
    this.foam = 0;
    this.lastX = null;
    this.dir = 0;
    this.meter = G.ui.meter('Soap bubbles', { up: false });
    this.bubbles = [];
    const glow = G.softTex;
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
      s.position.copy(this.hands).add(tmp.set((G.r() - 0.5) * 0.3, (G.r() - 0.3) * 0.2, (G.r() - 0.5) * 0.15));
      s.userData.base = s.position.clone();
      this.add(s);
      this.bubbles.push(s);
    }
    this.water = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.013, 0.1, 8), new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.75, roughness: 0.1 })));
    this.water.position.copy(sink).add(tmp.set(0, 0.66, -0.06));
    this.lk = 0;
    this.prevKey = 0;
    G.say(who === G.roji ? 'roji' : 'homama', 'Scrub, scrub, scrub!');
    this.wordAt = this.hands.clone().add(tmp.set(0, 0.3, 0));
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    this.t += dt;
    let add = 0;
    if (c.down && c.src !== 'keys') {
      if (this.lastX !== null) add += Math.abs(c.x - this.lastX) * 1.0;
      this.lastX = c.x;
    } else this.lastX = null;
    const kx = G.input.axis().x;
    const ks = Math.sign(Math.round(kx));
    if (ks && ks !== this.prevKey) add += 0.09;
    this.prevKey = ks || this.prevKey;
    if (this.endT === undefined) this.foam = Math.min(1, this.foam + add * 0.35);
    this.lk = damp(this.lk, add > 0 ? 1 : 0, 8, dt);
    this.rub = (this.rub || 0) + add * 30;
    this.who.over = { rub: Math.sin(this.rub) * (0.3 + this.lk * 0.7) };
    this.meter.set(this.foam);
    this.bubbles.forEach((b, i) => {
      const on = this.foam > i / this.bubbles.length;
      b.material.opacity = damp(b.material.opacity, on ? 0.9 : 0, 6, dt);
      b.scale.setScalar(0.06 + (i % 3) * 0.02 + Math.sin(this.t * 3 + i) * 0.006);
      b.position.copy(b.userData.base).add(tmp.set(0, Math.sin(this.t * 2 + i) * 0.01, 0));
    });
    if (this.foam >= 1 && this.endT === undefined) {
      this.endT = 1.0;
      G.sfx.sparkle();
      G.say(this.who === G.roji ? 'roji' : 'homama', 'Squeaky clean hands!');
      this.meter.label('Squeaky clean!');
    }
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.t < 5 ? 1 : this.t < 9 ? 0.85 : 0.7);
    }
  }
  auto(dt) {
    this.aa = (this.aa || 0) + dt * 9;
    this.G.cursor.drive(Math.sin(this.aa) * 0.25, 0, true);
  }
  exit() {
    this.meter?.remove();
    this.who.over = null;
    super.exit();
  }
}

export class Gown extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Gown and mask on';
    this.hint = 'Ready for surgery';
    this.scored = false;
  }
  enter() {
    const G = this.G;
    const who = [G.roji, ...(G.nurse ? [G.homama] : [])];
    this.who = who;
    // At the scrub sink, where everyone can see: whoever scrubbed stands there, the other beside
    const sink = G.rooms.theatre.spots.sink;
    if (G.nurse) G.place(G.roji, sink.clone().add(tmp.set(0.95, 0, -0.3)), -0.35, 'theatre');
    const c = sink.clone().add(tmp.set(G.nurse ? 0.45 : 0, 0.95, -0.35));
    G.frameAt(c, 1.7, G.nurse ? 2.6 : 2.0, new THREE.Vector3(0.1, 0.3, 1));
    this.parts = who.map((kid) => M.gownUp(G.k, kid, kid === G.roji ? '#8fd3ff' : '#9fe0c8'));
    for (const ps of this.parts) for (const p of ps) p.visible = false;
    G.gowned = this.parts;
    this.i = 0;
    G.say(G.nurse ? 'homama' : 'roji', G.nurse ? 'Cap, mask, gown. Ready, Dr. Roji!' : 'Cap, mask, gown. Ready!');
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    const n = Math.floor(this.t / 0.4);
    if (n > this.i && this.i < 3) {
      for (const ps of this.parts) ps[this.i].visible = true;
      for (const kid of this.who) G.fx.poof(kid.head.getWorldPosition(V()).add(tmp.set(0, this.i === 2 ? -0.6 : 0.3, 0.2)));
      G.sfx.pop();
      this.i++;
    }
    if (this.t > 1.9) this.finish(1);
  }
}

export class Sleep extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Sleepy time';
    this.hint = 'Tap with each number';
    this.keys = 'Press Space with each number';
  }
  enter() {
    const G = this.G;
    const P = this.P;
    const head = P.part('head');
    // Dr. Roji stands at the head end and holds the sleepy mask
    const t = G.rooms.theatre.spots.table;
    G.place(G.roji, new THREE.Vector3(t.x - 1.3, 0, t.z + 0.2), Math.PI / 2 - 0.25, 'theatre');
    G.frameAt(head.clone().add(tmp.set(-0.05, 0.12, 0)), 1.15, 1.7, new THREE.Vector3(0.75, 0.62, 0.3));
    this.anchor = this.add(anchorAt(G, head, 0.25));
    this.ring = this.add(ringMesh(0.06, 0.009, '#c7a6ff', 0.9), this.anchor);
    this.ring.position.set(0.33, 0.06, 0);
    this.core = this.add(ringMesh(0.06, 0.007, '#ffffff', 0.9), this.anchor);
    this.core.position.copy(this.ring.position);
    this.mask = M.sleepMask(G.k);
    P.kid.head.add(this.mask);
    this.mask.position.set(0, 0.2, 0.33);
    this.mask.scale.setScalar(1.2);
    P.keepTheatre.push(this.mask);
    this.beat = 1.15;
    this.count = 5;
    this.n = 0;
    this.score = 0;
    this.lastTap = -9;
    this.btn = G.ui.buttons([{ id: 'tap', label: 'Tap', icon: 'heart', go: true, key: 'Space' }], { big: true });
    G.ui.dock.classList.add('right');
    G.say('roji', 'Count down with me. Sweet dreams!');
    this.t = -0.8;
    this.wordAt = head.clone().add(tmp.set(0, 0.4, 0));
  }
  update(dt) {
    const G = this.G;
    this.t += dt;
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(clamp(this.score / this.count, 0.4, 1), 'Fast asleep');
      return;
    }
    if (this.t < 0) return;
    const ph = this.t / this.beat;
    const i = Math.floor(ph + 0.5);
    const f = ph - Math.floor(ph);
    this.ring.scale.setScalar(1 + (1 - f) * 1.0);
    this.ring.material.opacity = 0.3 + f * 0.6;
    if (i !== this.n && i >= 1 && i <= this.count) {
      this.n = i;
      G.say('patient', `${this.count - i + 1}...`, 'big');
      G.sfx.count(i);
      if (i === this.count) this.closeAt = this.t + 0.6;
    }
    const tap = this.btn.take('tap') || G.input.pressed('jump') || G.input.pressed('action') || G.input.pointer.justDown || this.autoTap;
    this.autoTap = false;
    if (tap && this.t - this.lastTap > 0.4) {
      this.lastTap = this.t;
      const seen = Math.max(0, this.t - dt) / this.beat;
      const off = Math.min(Math.abs(ph - Math.round(ph)), Math.abs(seen - Math.round(seen))) * this.beat;
      if (Math.round(ph) >= 1 && Math.round(ph) <= this.count) {
        if (off < 0.18) {
          this.score += 1;
          G.word('In time!', this.wordAt, '#7a5ad0', true);
          G.sfx.soft();
        } else if (off < 0.35) {
          this.score += 0.6;
          G.sfx.soft();
        }
      }
    }
    if (this.closeAt && this.t > this.closeAt) {
      this.endT = 1.2;
      this.P.asleep = true;
      G.monitor.asleep = true;
      this.ring.visible = this.core.visible = false;
      G.ui.clearDock();
      G.say('patient', 'Zzz...');
    }
  }
  auto() {
    const ph = this.t / this.beat;
    if (Math.abs(ph - Math.round(ph)) < 0.06 && this.t - this.lastTap > 0.5) this.autoTap = true;
  }
}

// ------------------------------------------------------------------ surgery on the window over the tummy
// G.op: { board, pic, anchor, items: [mesh], dish } set up by the main game when the patient lies down.
export class Incise extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Make the incision';
    this.hint = 'Trace the dotted line, nice and steady';
    this.keys = 'Follow the line with the arrow keys';
  }
  enter() {
    const G = this.G;
    const op = G.op;
    G.frameOp();
    const { board } = op;
    this.pts = op.pic.line.map((p) => board.local(p.u, p.v));
    this.tr = new Tracer(this.pts, board.w * 0.05 * (G.boost ? 1.4 : 1));
    const s0 = this.pts[0];
    G.cursor.use(surface(G, op.anchor, board.w, board.h), { x: s0.x - 0.04, y: s0.y - 0.05, lift: 0.04, speed: 0.12, keysDown: true });
    this.tool = this.add(aimTool(M.scalpel(G.k), tipOf('scalpel'), new THREE.Vector3(0.4, -0.35, 0.85), 1.05));
    this.wordAt = op.anchor.getWorldPosition(V());
    this.offT = 0;
    op.pic.draw({ dots: true });
    board.flush();
    this.k = 0;
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    const op = G.op;
    this.t += dt;
    this.tool.position.lerp(c.world(0.006), 1 - Math.exp(-24 * dt));
    this.tool.quaternion.copy(op.anchor.quaternion);
    if (this.endT !== undefined) {
      this.endT -= dt;
      const o = clamp(1 - this.endT / 0.7, 0, 1);
      op.pic.draw({ open: o });
      op.board.flush();
      G.showItems(o);
      if (this.endT <= 0) this.finish(this.tr.steady);
      return;
    }
    if (c.down) {
      const d = this.tr.feed(c.x, c.y);
      this.offT = d > this.tr.tol * 1.6 ? this.offT + dt : 0;
      if (this.offT > 0.5) {
        this.offT = -1.5;
        G.word('Steady: follow the line', c.world(0.03), '#c9822a', true);
      }
    } else this.tr.lift();
    const k = this.tr.k;
    if (Math.abs(k - this.k) > 0.01) {
      this.k = k;
      op.pic.draw({ cut: k, dots: true });
      op.board.flush();
      if (Math.random() < 0.5) G.sfx.cut();
    }
    if (k > 0.97) {
      this.endT = 0.7;
      G.sfx.swoosh();
      G.say('roji', G.nurse ? 'A neat cut. Now let us look inside.' : 'A neat little opening. No ouch, just sleepy.');
    }
  }
  auto(dt) {
    const p = this.tr.at(this.tr.s + this.tr.tol * 0.7);
    this.G.cursor.toward(p.x, p.y, 0.15, dt, true);
  }
}

export class Remove extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = `Take out ${G.patient.entry.c.what}`;
    this.hint = 'Grab it, lift it out at the dotted circle. No touching the edges!';
    this.keys = 'Arrow keys move, Space grabs and lets go';
  }
  enter() {
    const G = this.G;
    const op = G.op;
    G.frameOp();
    const { board } = op;
    this.b = board;
    this.items = op.items.map((m, i) => ({ mesh: m, uv: { ...op.pic.items[i] }, out: false }));
    G.cursor.use(surface(G, op.anchor, board.w, board.h), { x: board.local(0.5, 0.38).x, y: board.local(0.5, 0.38).y, lift: 0.045, speed: 0.1 });
    this.tip = { u: 0.5, v: 0.38 };
    const tw = brighten(makeTool(G.k, 'tweezers'));
    if (G.gold) tw.traverse((m) => m.isMesh && m.material.color.getHexString() !== 'ff8fb1' && ((m.material = m.material.clone()), m.material.color.set('#ffcf4d'), (m.material.metalness = 0.2)));
    this.tool = this.add(aimTool(tw, tipOf('tweezers'), new THREE.Vector3(0.35, -0.4, 0.85), 1.0));
    this.tw = tw;
    this.held = null;
    this.touches = 0;
    this.flash = 0;
    this.buzzCool = 0;
    this.wordAt = op.anchor.getWorldPosition(V());
    this.draw();
  }
  draw() {
    this.G.op.pic.draw({ open: 1, flash: this.flash > 0 ? 1 : 0 });
    this.b.flush();
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    const op = G.op;
    const pic = op.pic;
    this.t += dt;
    this.buzzCool -= dt;
    // Move the tip toward the cursor inside the opening, sliding along the edge where it is in the way
    const want = this.b.uv(c.x, c.y);
    const bw = this.b.w;
    const bh = this.b.h;
    const rad = this.held ? 0.012 : 0.006;
    let { u, v } = this.tip;
    for (let i = 0; i < 48; i++) {
      const dx = (want.u - u) * bw;
      const dy = (want.v - v) * bh;
      const d = Math.hypot(dx, dy);
      if (d < 0.002) break;
      const st = Math.min(d, 0.004);
      const a0 = Math.atan2(dy, dx);
      let moved = false;
      for (const off of [0, 0.45, -0.45, 0.9, -0.9, 1.3, -1.3]) {
        const nu = u + (Math.cos(a0 + off) * st) / bw;
        const nv = v + (Math.sin(a0 + off) * st) / bh;
        if (pic.safe(nu, nv, rad)) {
          u = nu;
          v = nv;
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }
    this.tip = { u, v };
    // Touching the edge: the pointer pushes into it close to where the tweezers are
    const gap = Math.hypot((want.u - u) * bw, (want.v - v) * bh);
    const active = c.down || this.held || c.src === 'keys' || c.src === 'auto';
    if (active && gap > 0.006 && gap < 0.05 && !pic.safe(want.u, want.v, 0)) this.edge();
    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0) this.draw();
    }
    const lp = this.b.local(u, v);
    const w = c3(op.anchor, lp.x, lp.y, 0.012);
    this.tool.position.lerp(w, 1 - Math.exp(-28 * dt));
    this.tool.quaternion.copy(op.anchor.quaternion);

    // Grab and let go: the pointer holds while down; the keys toggle
    const keyToggle = (c.src === 'keys' || c.src === 'auto') && c.pressed;
    const grab = this.held ? null : this.items.find((it) => !it.out && Math.hypot((it.uv.u - u) * 1.39, it.uv.v - v) < 0.06);
    if (!this.held && grab && ((c.src === 'pointer' && c.down) || keyToggle)) {
      this.held = grab;
      G.sfx.pick();
      this.keyHold = c.src !== 'pointer';
    } else if (this.held && ((c.src === 'pointer' && !c.down && !this.keyHold) || (keyToggle && this.keyHold && this.heldT > 0.2))) this.letGo();
    if (this.held) {
      this.heldT = (this.heldT || 0) + dt;
      this.held.uv = { u, v };
      const p = this.b.local(u, v);
      this.held.mesh.position.copy(c3(op.anchor, p.x, p.y, 0.02 + Math.sin(this.t * 8) * 0.002));
      if (Math.hypot((u - pic.lift.u) * 1.39, v - pic.lift.v) < pic.lift.r) this.liftOut(this.held);
    } else this.heldT = 0;
    for (const it of this.items) if (it.flying) this.fly(it, dt);
    if (this.items.every((it) => it.out && !it.flying) && this.endT === undefined) {
      this.endT = 1.0;
      G.say('roji', `Out it comes! ${G.patient.entry.c.item === 'appendix' ? 'Bye-bye, poorly appendix.' : 'All gone.'}`);
    }
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(clamp(1 - this.touches * 0.12 - (this.t > 25 ? 0.15 : 0), 0.3, 1), this.touches === 0 ? 'Not one touch!' : '');
    }
  }
  edge() {
    if (this.buzzCool > 0) return;
    const G = this.G;
    this.buzzCool = 0.6;
    this.touches++;
    this.flash = 0.25;
    this.draw();
    G.sfx.buzz();
    G.monitor.hr = Math.min(150, G.monitor.hr + 9);
    G.word('Bzzt! Careful', this.wordAt, '#e0485a', true);
  }
  letGo() {
    this.held = null;
    this.G.sfx.soft();
  }
  liftOut(it) {
    const G = this.G;
    this.held = null;
    it.out = true;
    it.flying = 0;
    it.from = it.mesh.position.clone();
    G.sfx.plop();
    G.fx.burst(it.from.clone(), ['#ffffff', '#ffd166', '#ff8fb1'], 14);
  }
  fly(it, dt) {
    it.flying += dt;
    const k = Math.min(1, it.flying / 0.8);
    const to = this.G.op.dish.getWorldPosition(V()).add(tmp.set((this.items.indexOf(it) - 1) * 0.05, 0.03, 0));
    it.mesh.position.lerpVectors(it.from, to, easeOutCubic(k));
    it.mesh.position.y += Math.sin(k * Math.PI) * 0.25;
    it.mesh.rotation.y += dt * 6;
    if (k >= 1) it.flying = false;
  }
  auto(dt) {
    const c = this.G.cursor;
    const pic = this.G.op.pic;
    if (this.t < 0.4) return;
    const it = this.held || this.items.find((x) => !x.out);
    if (!it) return;
    // Follow the channel's curve: the lift spot, then along the bezier to the item (and back when holding)
    const ch = pic.channels[this.items.indexOf(it)];
    if (this.autoFor !== it || this.autoHeld !== !!this.held) {
      const path = [pic.lift];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const d = t * t;
        path.push({ u: a * ch[0].u + b * ch[1].u + d * ch[2].u, v: a * ch[0].v + b * ch[1].v + d * ch[2].v });
      }
      this.autoPath = this.held ? path.reverse() : path;
      this.autoFor = it;
      this.autoHeld = !!this.held;
      this.autoI = 0;
    }
    const path = this.autoPath;
    const tgt = path[Math.min(this.autoI, path.length - 1)];
    const p = this.b.local(tgt.u, tgt.v);
    c.toward(p.x, p.y, 0.08, dt, !!this.held);
    const tipNear = Math.hypot((this.tip.u - tgt.u) * 1.39, this.tip.v - tgt.v) < 0.02;
    if (tipNear) {
      if (this.autoI < path.length - 1) this.autoI++;
      else if (!this.held) c.drive(p.x, p.y, true), (c.pressed = true);
    }
  }
}

export class Vitals extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Keep the heart steady';
    this.hint = 'Too fast: Calm drops. Too slow: Boost drops';
    this.keys = 'Press 1 for Calm, 2 for Boost';
  }
  enter() {
    const G = this.G;
    G.frameMonitor();
    this.btn = G.ui.buttons([
      { id: 'calm', label: 'Calm drops', sub: 'slower', icon: 'tired', color: '#8fd3ff', key: '1' },
      { id: 'boost', label: 'Boost drops', sub: 'faster', icon: 'heart', color: '#ff8fb1', key: '2' },
    ], { big: true });
    this.mon = G.monitor;
    this.mon.hr = 96;
    this.events = [G.r() < 0.5 ? 1 : -1, G.r() < 0.5 ? 1 : -1, 0];
    this.events[2] = -this.events[1];
    this.ev = 0;
    this.drift = 0;
    this.nextAt = 1.2;
    this.inBand = 0;
    this.n = 0;
    this.wrong = 0;
    this.wordAt = G.rooms.theatre.spots.monitor.clone().add(tmp.set(0, 0.4, 0));
  }
  update(dt) {
    const G = this.G;
    const m = this.mon;
    this.t += dt;
    if (this.endT !== undefined) {
      this.endT -= dt;
      m.hr = damp(m.hr, 92, 3, dt);
      if (this.endT <= 0) this.finish(clamp(this.inBand / this.n - this.wrong * 0.1, 0.35, 1));
      return;
    }
    if (this.ev < this.events.length && this.t > this.nextAt) {
      this.drift = this.events[this.ev++] * 30;
      this.nextAt = this.t + 3.4;
      G.sfx.alarm(this.drift > 0);
    }
    m.hr += this.drift * dt;
    m.hr += (92 - m.hr) * 0.05 * dt;
    m.hr = clamp(m.hr, 40, 170);
    const ok = m.hr >= m.lo && m.hr <= m.hi;
    this.n += dt;
    if (ok) this.inBand += dt;
    const take = (id, key) => this.btn.take(id) || G.input.pressed(key);
    const calm = take('calm', '1') || G.input.pressed('arrowdown') || this.autoCalm;
    const boost = take('boost', '2') || G.input.pressed('arrowup') || this.autoBoost;
    this.autoCalm = this.autoBoost = false;
    if (calm || boost) {
      const right = (calm && m.hr > m.hi - 8) || (boost && m.hr < m.lo + 8);
      m.hr += calm ? -26 : 26;
      this.drift *= 0.2;
      if (right) {
        G.sfx.soft();
        G.word('Steady!', this.wordAt, '#2a9479', true);
      } else {
        this.wrong++;
        G.sfx.bad();
        G.word(calm ? 'It was not too fast' : 'It was not too slow', this.wordAt, '#c9822a', true);
      }
    }
    if (this.ev >= this.events.length && this.t > this.nextAt - 0.4 && ok) {
      this.endT = 1.0;
      G.ui.clearDock();
      G.say('roji', 'Steady and happy. Well done!');
    }
    if (this.t > 18) this.endT = 0.5;
  }
  auto() {
    const m = this.mon;
    if (m.hr > m.hi - 4 && this.drift > 0) this.autoCalm = true;
    if (m.hr < m.lo + 4 && this.drift < 0) this.autoBoost = true;
  }
}

export class Close extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'Close up';
    this.hint = 'Stitch along the blue dots';
    this.keys = 'Follow the dots with the arrow keys';
  }
  enter() {
    const G = this.G;
    const op = G.op;
    G.frameOp();
    const { board } = op;
    this.pts = op.pic.stitch.map((p) => board.local(p.u, p.v));
    this.tr = new Tracer(this.pts, board.w * 0.06 * (G.boost ? 1.4 : 1));
    const s0 = this.pts[0];
    G.cursor.use(surface(G, op.anchor, board.w, board.h), { x: s0.x - 0.03, y: s0.y - 0.05, lift: 0.04, speed: 0.12, keysDown: true });
    this.tool = this.add(aimTool(M.needle(G.k), tipOf('needle'), new THREE.Vector3(0.4, -0.35, 0.85), 0.9));
    this.drawn = -1;
    this.wordAt = op.anchor.getWorldPosition(V());
    this.closeT = 0;
    this.offT = 0;
    G.showItems(0);
  }
  repaint() {
    const op = this.G.op;
    const n = Math.floor(this.tr.k * (this.pts.length - 1) + 1e-6);
    if (n === this.drawn && this.closeT >= 1) return;
    if (n > this.drawn && this.drawn >= 0) this.G.sfx.stitch(n);
    this.drawn = n;
    op.pic.draw({ open: 1 - this.closeT, cut: 1, closed: n / (this.pts.length - 1), stitched: n, dots: this.closeT >= 1, showStitch: this.closeT >= 1 });
    op.board.flush();
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    const op = G.op;
    this.t += dt;
    this.tool.position.lerp(c.world(0.006), 1 - Math.exp(-24 * dt));
    this.tool.quaternion.copy(op.anchor.quaternion);
    if (this.closeT < 1) {
      this.closeT = Math.min(1, this.closeT + dt / 0.6);
      this.drawn = -2;
      this.repaint();
      return;
    }
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.tr.steady);
      return;
    }
    if (c.down) {
      const d = this.tr.feed(c.x, c.y);
      this.offT = d > this.tr.tol * 1.6 ? this.offT + dt : 0;
      if (this.offT > 0.6) {
        this.offT = -1.5;
        G.word('Follow the dots', c.world(0.03), '#c9822a', true);
      }
    } else this.tr.lift();
    this.repaint();
    if (this.tr.k > 0.97) {
      this.endT = 0.8;
      G.say('roji', 'All stitched up. Neat as a button.');
    }
  }
  auto(dt) {
    if (this.closeT < 1) return;
    const p = this.tr.at(this.tr.s + this.tr.tol * 0.7);
    this.G.cursor.toward(p.x, p.y, 0.15, dt, true);
  }
}

export class Sticker extends Step {
  constructor(G, spec) {
    super(G, spec);
    this.title = 'A heart sticker';
    this.hint = 'Tap the stitches to stick it on';
    this.keys = 'Arrow keys move it, Space sticks it';
  }
  enter() {
    const G = this.G;
    const op = G.op;
    G.frameOp();
    const { board } = op;
    const mid = op.pic.line[Math.floor(op.pic.line.length / 2)];
    this.goal = board.local(mid.u, mid.v);
    G.cursor.use(surface(G, op.anchor, board.w, board.h), { x: this.goal.x + 0.12, y: this.goal.y - 0.06, lift: 0.04, speed: 0.15 });
    this.st = this.add(M.sticker(G.k, '#ff8fb1'));
    this.st.scale.setScalar(1.1);
    this.target = this.add(ringMesh(0.05, 0.007, '#ffffff', 0.9), op.anchor);
    this.target.position.set(this.goal.x, this.goal.y, 0.01);
    this.wordAt = op.anchor.getWorldPosition(V());
  }
  update(dt) {
    const G = this.G;
    const c = G.cursor;
    const op = G.op;
    this.t += dt;
    this.target.scale.setScalar(1 + Math.sin(this.t * 6) * 0.12);
    if (this.endT !== undefined) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.sq, 'Lovely!');
      return;
    }
    this.st.position.lerp(c.world(0.03), 1 - Math.exp(-20 * dt));
    this.st.quaternion.copy(op.anchor.quaternion);
    this.st.rotateX(Math.PI / 2);
    if (c.pressed || (c.released && c.src === 'pointer')) {
      const d = Math.hypot(c.x - this.goal.x, c.y - this.goal.y);
      if (d < 0.08) {
        this.sq = d < 0.03 ? 1 : 0.8;
        this.endT = 0.9;
        this.target.visible = false;
        this.st.position.copy(c3(op.anchor, c.x, c.y, 0.008));
        G.sfx.pop();
        G.fx.heartsAt(this.st.position.clone().add(tmp.set(0, 0.08, 0)), 3);
      } else if (c.pressed && c.src !== 'pointer') G.word('On the stitches', this.wordAt, '#c9822a', true);
    }
  }
  auto(dt) {
    const c = this.G.cursor;
    if (c.toward(this.goal.x, this.goal.y, 0.2, dt, false) && this.t > 0.5) c.drive(this.goal.x, this.goal.y, true);
  }
}

export const STEPS = { thermo: Thermo, steth: Steth, light: Light, reflex: Reflex, xray: Xray, clean: Clean, choice: Choice, cast: Cast, stitches: Stitches, bandage: Bandage, dose: Dose, calm: Calm, vaccine: Shot, shot: Shot, handoff: Handoff, scrub: Scrub, gown: Gown, sleep: Sleep, incise: Incise, remove: Remove, vitals: Vitals, close: Close, sticker: Sticker, triage: Triage };

// Steps Nurse Homama does himself (the rest Dr. Roji does after he hands her the tool)
export const NURSE_STEPS = new Set(['triage', 'handoff', 'thermo', 'clean', 'bandage', 'dose', 'calm', 'scrub', 'gown', 'sleep', 'vitals', 'sticker']);

