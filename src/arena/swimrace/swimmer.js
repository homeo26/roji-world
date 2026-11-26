import * as THREE from 'three';
import { mat, mesh, canvasTexture } from '../../util.js';
import * as K from '../riding/kit.js';

// A swimmer: one of the kids in a rig that can stand, crouch on a block, fly through a dive,
// glide, swim front crawl with each arm driven by the player's taps, tumble-turn at the wall,
// tread water and cheer. The rig keeps the body centre fixed while the body pitches or tumbles.

const PI = Math.PI;
const TAU = PI * 2;
const C_STAND = new THREE.Vector3(0, 0.72, 0);
const C_SWIM = new THREE.Vector3(0, 0, 0.5);
const HC = new THREE.Vector3(0, 0.29, 0);
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const XA = new THREE.Vector3(1, 0, 0);
const YA = new THREE.Vector3(0, 1, 0);

// A swim cap (and goggles) that hides the hair on top of the head; pigtails and ponytails still peek out.
export function addCap(kid, color, mark = null) {
  const hairColor = new THREE.Color(kid.look.hair);
  const tails = new Set(kid.tails.map((t) => t.pivot));
  for (const o of kid.head.children) {
    if (!o.visible || tails.has(o)) continue;
    const rel = o.position.clone().sub(HC);
    const bow = !o.isMesh && o.isGroup && rel.y > 0.15;
    if (!bow && (!o.isMesh || !o.material.map || !o.material.color?.equals(hairColor))) continue;
    const prm = o.geometry?.parameters || {};
    const isCap = rel.length() < 1e-3 && prm.thetaStart === 0;
    const onTop = rel.length() > 1e-3 && rel.y > 0.1;
    if (bow || isCap || onTop) o.visible = false;
  }
  const g = new THREE.Group();
  g.position.copy(HC);
  g.rotation.x = -0.22;
  const capM = mat(color, { rough: 0.35 });
  const cap = mesh(new THREE.SphereGeometry(0.33, 22, 10, 0, TAU, 0, PI * 0.56), capM);
  cap.scale.set(1.03, 0.97, 1.02);
  g.add(cap);
  // goggles pushed up on the cap
  const strap = mesh(new THREE.TorusGeometry(0.325, 0.016, 5, 28), mat('#3b2b3f', { rough: 0.5 }));
  strap.rotation.x = PI / 2 - 0.55;
  strap.position.y = 0.06;
  g.add(strap);
  const lensM = mat('#9fe6ff', { rough: 0.15, emissive: '#7fdcff', ei: 0.25 });
  const rimM = mat('#ffffff', { rough: 0.4 });
  for (const s of [-1, 1]) {
    const rim = mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 14), rimM);
    rim.position.set(s * 0.085, 0.2, 0.25);
    rim.rotation.x = -0.75;
    const lens = mesh(new THREE.CircleGeometry(0.055, 12), lensM);
    lens.position.set(s * 0.085, 0.2, 0.252);
    lens.rotation.x = -0.75;
    g.add(rim, lens);
  }
  if (mark === 'heart') {
    const hs = new THREE.Shape();
    hs.moveTo(0, -0.05);
    hs.bezierCurveTo(-0.07, 0, -0.05, 0.06, 0, 0.03);
    hs.bezierCurveTo(0.05, 0.06, 0.07, 0, 0, -0.05);
    const h = mesh(new THREE.ShapeGeometry(hs, 6), mat('#ffffff', { rough: 0.5, side: THREE.DoubleSide }), { cast: false });
    h.position.set(0.315, 0.08, -0.02);
    h.rotation.y = PI / 2 + 0.05;
    h.scale.setScalar(1.3);
    g.add(h);
  } else if (mark === 'star') {
    const st = mesh(new THREE.OctahedronGeometry(0.045, 0), mat('#ffd166', { rough: 0.5 }));
    st.scale.set(1, 1, 0.35);
    st.position.set(0.318, 0.08, -0.02);
    st.rotation.y = PI / 2;
    g.add(st);
  }
  kid.head.add(g);
  return g;
}

function stripes(a, b, heart = false) {
  const t = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = a;
    c.fillRect(0, 0, w, h);
    c.fillStyle = b;
    for (let i = 0; i < 4; i++) c.fillRect(0, 10 + i * 32, w, 9);
    if (heart) {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(64, 92);
      c.bezierCurveTo(28, 66, 36, 34, 64, 52);
      c.bezierCurveTo(92, 34, 100, 66, 64, 92);
      c.fill();
    }
  });
  return t;
}

// A rolled towel to hold, and the same towel wrapped round the shoulders.
export function towelFolded(color = '#ff8fb1') {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ map: stripes(color, '#ffffff'), roughness: 0.95 });
  const t = mesh(new THREE.CapsuleGeometry(0.09, 0.32, 4, 10), m);
  t.rotation.z = PI / 2;
  g.add(t);
  return g;
}

export function towelDrape(color = '#ff8fb1') {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ map: stripes(color, '#ffffff', true), roughness: 0.95, side: THREE.DoubleSide });
  const cape = mesh(new THREE.CylinderGeometry(0.23, 0.38, 0.46, 18, 1, true, 0.8, TAU - 1.6), m);
  cape.position.y = 0.57;
  const roll = mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 18, TAU - 1.3), mat(color, { rough: 0.95 }));
  roll.rotation.set(PI / 2, 0, PI / 2 + 0.65);
  roll.position.y = 0.79;
  g.add(cape, roll);
  return g;
}

function markCheeks(kid) {
  const skin = new THREE.Color(kid.look.skin);
  kid.root.traverse((o) => {
    if (o.isMesh && o !== kid.blob && o.material.isMeshBasicMaterial && o.material.transparent) {
      o.userData.bakeColor = skin.clone().lerp(o.material.color, o.material.opacity * 0.8);
    }
  });
}

// Fewest draw calls for a background swimmer: the body, the head and four limbs.
export function bakeLean(kid) {
  markCheeks(kid);
  const o = { emissive: 'bake', coarse: true };
  K.bakeVC(kid.body, [kid.head, ...kid.legs, ...kid.arms], o);
  K.bakeVC(kid.head, [], o);
  for (const p of [...kid.legs, ...kid.arms]) K.bakeVC(p, [], o);
  kid.root.traverse((m) => m.isMesh && (m.castShadow = false));
}

export class Swimmer {
  // who: 'roji' | 'homama' | a look. o: { name, cap, mark, main, color }
  constructor(ctx, who, o = {}) {
    const kid = ctx.makeKid(who);
    this.name = o.name || kid.look.name;
    this.color = o.color || o.cap || '#ffffff';
    this.capColor = o.cap;
    this.main = !!o.main;
    if (o.cap) this.cap = addCap(kid, o.cap, o.mark);
    if (this.main) {
      K.lowpoly(kid.root, 0.72);
      K.bakeLiveKid(kid);
    }
    else {
      K.lowpoly(kid.root, 0.55);
      bakeLean(kid);
    }
    if (ctx.fx) kid.onEmoteFx = (type) => type === 'heart' && ctx.fx.heartsAt(kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 5);
    this.kid = kid;
    this.rig = new THREE.Group();
    this.rig.add(kid.root);
    ctx.scene.add(this.rig);
    this.mode = 'stand';
    this.cen = new THREE.Vector3(); // body centre, world
    this.yaw = 0;
    this.pitch = 0;
    this.walk = 0; // walking speed while standing
    this.speed = 0; // swimming speed (animation)
    this.arm = [{ ph: -1 }, { ph: -1 }];
    this.rightCount = 0;
    this.flip = -1;
    this.flipDur = 0.55;
    this.flipYaw0 = 0;
    this.cheer = 0; // arms up in the water
    this.streamline = 0;
    this.autoRate = 0; // strokes per second when the arms run by themselves
    this.autoT = 0;
    this.autoSide = 0;
    this.pose2 = null; // (kid, dt, t) last-word pose override
    this.onEntry = null; // (side, handWorldPos) when a hand enters the water
    this._vis = true;
  }

  get visible() {
    return this._vis;
  }

  set visible(v) {
    this._vis = !!v;
    this.rig.visible = !!v;
  }

  get dirX() {
    return Math.sin(this.yaw);
  }

  // Put the swimmer somewhere. Standing modes take the feet position, swimming modes the body centre.
  // mode: 'stand' | 'set' | 'air' | 'swim' | 'glide' | 'tread'
  place(mode, x, y, z, yaw = this.yaw) {
    this.mode = mode;
    this.yaw = yaw;
    this.pitch = 0;
    this.cen.set(x, y + (this.centreOffset() === C_STAND ? C_STAND.y : 0), z);
    if (mode === 'swim' || mode === 'glide') this.kid.swimLean = 1;
    if (mode === 'tread') this.kid.swimLean = 0;
    this.arm[0].ph = this.arm[1].ph = -1;
    this.flip = -1;
    this.cheer = 0;
    this.kid.squash = 1;
    this.update(0.001, 0);
  }

  centreOffset() {
    return this.mode === 'stand' || this.mode === 'set' || this.mode === 'air' ? C_STAND : C_SWIM;
  }

  // Head position (the part that touches the wall), world
  head(out = tmp2) {
    const reach = this.mode === 'stand' || this.mode === 'set' ? 0.2 : 0.85;
    return out.set(this.cen.x + Math.sin(this.yaw) * reach, this.cen.y, this.cen.z + Math.cos(this.yaw) * reach);
  }

  setMode(mode) {
    if (mode === this.mode) return;
    if (mode === 'swim' && (this.mode === 'stand' || this.mode === 'set' || this.mode === 'air')) this.kid.swimLean = 1;
    this.mode = mode;
  }

  // Start a pull with one arm (0 left, 1 right). Returns false when that arm is still busy.
  stroke(side) {
    const a = this.arm[side];
    if (a.ph >= 0 && a.ph < PI * 1.45) return false;
    a.ph = 0;
    if (side === 1) this.rightCount++;
    return true;
  }

  startFlip(dur = 0.55) {
    this.mode = 'flip';
    this.flip = 0;
    this.flipDur = dur;
    this.flipYaw0 = this.yaw;
  }

  update(dt, t) {
    const kid = this.kid;
    const mode = this.mode;
    const B = kid.body;
    if (mode === 'stand' || mode === 'set' || mode === 'air') {
      kid.pose = 'stand';
      kid.update(dt, t, mode === 'stand' ? this.walk : 0, mode === 'air' ? 0.4 : 0, 0);
      const [aL, aR] = kid.arms;
      const [lL, lR] = kid.legs;
      if (mode === 'set') {
        B.rotation.x = 0.95;
        B.position.y = -0.04;
        aL.rotation.set(-1.6, 0, 0.1);
        aR.rotation.set(-1.6, 0, -0.1);
        lL.rotation.set(-0.25, 0, 0);
        lR.rotation.set(0.15, 0, 0);
        kid.head.rotation.x = -0.65;
      } else if (mode === 'air') {
        aL.rotation.set(0, 0, 2.98);
        aR.rotation.set(0, 0, -2.98);
        lL.rotation.set(0.05, 0, 0.02);
        lR.rotation.set(0.05, 0, -0.02);
        kid.head.rotation.x = 0.1;
      }
    } else {
      kid.pose = 'swim';
      const lean = mode === 'tread' ? 0 : 2 + this.speed * 0.6;
      kid.update(dt, t, mode === 'tread' ? 0 : lean, 0, 0);
      const L = kid.swimLean || 0;
      const [aL, aR] = kid.arms;
      const [lL, lR] = kid.legs;
      // automatic strokes (computer swimmers, free swimming)
      if (this.autoRate > 0 && (mode === 'swim')) {
        this.autoT -= dt;
        if (this.autoT <= 0) {
          this.autoT = 1 / this.autoRate;
          this.autoSide = 1 - this.autoSide;
          this.stroke(this.autoSide);
        }
      }
      let roll = 0;
      for (let s = 0; s < 2; s++) {
        const a = this.arm[s];
        if (a.ph >= 0) {
          a.ph += dt * (a.ph < PI ? PI / 0.22 : PI / 0.27);
          if (a.ph >= TAU) {
            a.ph = -1;
            if (this.onEntry) {
              const pv = kid.arms[s];
              pv.updateWorldMatrix(true, false);
              this.onEntry(s, pv.localToWorld(tmp.set(0, 0.35, 0)));
            }
          }
        }
        if (a.ph >= 0 && a.ph < PI) roll += (s ? 1 : -1) * Math.sin(a.ph) * 0.32;
      }
      if (mode === 'flip') {
        this.flip += dt / this.flipDur;
        const u = Math.min(1, this.flip);
        const e = u * u * (3 - 2 * u);
        this.pitch = TAU * e;
        this.yaw = this.flipYaw0 + PI * e;
        kid.squash = 0.86;
        aL.rotation.set(-0.7, 0, 0.35);
        aR.rotation.set(-0.7, 0, -0.35);
        lL.rotation.set(-1.25, 0, 0.05);
        lR.rotation.set(-1.15, 0, -0.05);
        if (u >= 1) {
          this.pitch = 0;
          this.yaw = this.flipYaw0 + PI;
          this.mode = 'glide';
          this.flip = -1;
        }
      } else if (L > 0.45) {
        const glide = mode === 'glide' ? 1 : this.streamline;
        for (let s = 0; s < 2; s++) {
          const a = this.arm[s];
          const sg = s ? -1 : 1;
          const piv = kid.arms[s];
          if (glide > 0.5 || a.ph < 0) piv.rotation.set(-PI, 0, sg * 0.1);
          else piv.rotation.set(-PI + a.ph, 0, sg * (0.14 + Math.max(0, Math.sin(a.ph - PI)) * 0.32));
        }
        if (glide > 0.5) {
          lL.rotation.x = Math.sin(t * 16) * 0.22;
          lR.rotation.x = -Math.sin(t * 16) * 0.22;
        }
        B.rotation.y += roll;
        // breathe to the right on every other right-arm pull
        const r = this.arm[1];
        if (this.rightCount % 2 === 0 && r.ph >= 0 && r.ph < PI * 1.2) kid.head.rotation.y -= Math.sin((r.ph / (PI * 1.2)) * PI) * 0.75;
      }
      if (this.cheer > 0.01) {
        const k = this.cheer;
        aL.rotation.set(-0.2 * k, 0, 0.2 + 2.5 * k + Math.sin(t * 13) * 0.25 * k);
        aR.rotation.set(-0.2 * k, 0, -0.2 - 2.5 * k - Math.sin(t * 13 + 1) * 0.25 * k);
        B.position.y += Math.abs(Math.sin(t * 7)) * 0.1 * k;
      }
    }
    if (this.pose2) this.pose2(kid, dt, t);
    // rig: keep the body centre fixed while the body pitches
    const c = this.centreOffset();
    kid.root.rotation.set(this.pitch, 0, 0);
    tmp.copy(c).applyAxisAngle(XA, this.pitch);
    kid.root.position.copy(c).sub(tmp);
    this.rig.rotation.y = this.yaw;
    tmp.copy(c).applyAxisAngle(YA, this.yaw);
    this.rig.position.copy(this.cen).sub(tmp);
  }

  // Feet position on the ground for standing modes (world)
  feet(out = tmp2) {
    return out.set(this.cen.x, this.cen.y - C_STAND.y, this.cen.z);
  }

  dispose() {
    this.rig.removeFromParent();
  }
}
