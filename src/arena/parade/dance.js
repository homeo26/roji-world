// Dance moves for Roji and Homama on the float, laid over the kid's own animation after kid.update.
// The kids face the camera, so a move to the screen's left uses the arm on that side (their right).
// Moves: 0 left, 1 down (a squat and a clap), 2 up (a hop with both arms up), 3 right, 'wide' (arms
// out), 'star' (a star jump), 'spin' (while a hold note is held), 'miss' (a wobble), 'clap' (cheering).

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export class Dancer {
  constructor(kid) {
    this.kid = kid;
    this.mv = null;
    this.age = 0;
    this.spin = 0;
    this.spinning = false;
    this.spinBack = 0;
    this.groove = 0.6;
    this.mode = 'dance'; // dance | clap | still
    this.reach = 0; // -1 or +1: hold a hand up high on that side of the screen (twirling the partner)
  }

  move(type) {
    this.mv = type;
    this.age = 0;
    const k = this.kid;
    if (type === 2 || type === 'star') k.squash = 0.84;
    else if (type === 1) k.squash = 0.82;
    else if (type === 'miss') k.squash = 0.92;
    else k.squash = 0.92;
  }

  // beat: song beats (a float); energy 0..1 grows with the combo
  update(dt, t, beat, energy) {
    const k = this.kid;
    if (k.emoteType) return; // a hug or a kiss plays on its own
    const B = k.body;
    const [legL, legR] = k.legs;
    const [armL, armR] = k.arms;
    const ph = ((beat % 1) + 1) % 1;
    const bounce = Math.pow(Math.abs(Math.sin(ph * Math.PI)), 1.6);
    const g = this.mode === 'still' ? 0 : this.groove * (0.6 + 0.6 * energy);
    // the groove: a bounce on every beat and a sway every two
    B.position.y += bounce * 0.045 * g;
    B.rotation.z += Math.sin(beat * Math.PI) * 0.06 * g;
    k.head.rotation.x += bounce * 0.08 * g;
    k.head.rotation.z += Math.sin(beat * Math.PI) * 0.05 * g;
    // relaxed dancing arms between moves
    let aL = 0.35 + 0.25 * g * bounce;
    let aR = 0.35 + 0.25 * g * bounce;
    let xL = -0.2 * g;
    let xR = -0.2 * g;
    if (this.mode === 'clap') {
      // cheering: hands meet in front on the beat
      const clap = Math.pow(1 - ph, 6);
      xL = xR = -1.15;
      aL = aR = 0.1 - 0.42 * clap + 0.3;
    }
    this.age += dt;
    const a = this.age < 0.06 ? smooth(this.age / 0.06) : 1 - smooth((this.age - 0.06) / 0.34);
    const mv = this.age < 0.4 ? this.mv : null;
    if (mv === 0) {
      aR = 0.35 + 2.25 * a;
      xR = 0;
      aL = 0.35 + 0.5 * a;
      B.rotation.z += 0.17 * a;
      B.position.x -= 0.1 * a;
      legR.rotation.z = -0.3 * a;
    } else if (mv === 3) {
      aL = 0.35 + 2.25 * a;
      xL = 0;
      aR = 0.35 + 0.5 * a;
      B.rotation.z -= 0.17 * a;
      B.position.x += 0.1 * a;
      legL.rotation.z = 0.3 * a;
    } else if (mv === 2) {
      aL = aR = 0.35 + 2.55 * a;
      xL = xR = 0;
      B.position.y += 0.22 * Math.sin(Math.min(1, this.age / 0.36) * Math.PI);
    } else if (mv === 1) {
      B.position.y -= 0.1 * a;
      xL = xR = -1.25 * a;
      aL = aR = 0.35 - 0.5 * a;
      legL.rotation.z = 0.18 * a;
      legR.rotation.z = -0.18 * a;
      B.rotation.x += 0.12 * a;
    } else if (mv === 'wide') {
      aL = aR = 0.35 + 1.25 * a;
      xL = xR = 0;
      B.position.y += 0.12 * Math.sin(Math.min(1, this.age / 0.3) * Math.PI);
    } else if (mv === 'star') {
      aL = aR = 0.35 + 2.1 * a;
      xL = xR = 0;
      legL.rotation.z = 0.35 * a;
      legR.rotation.z = -0.35 * a;
      B.position.y += 0.3 * Math.sin(Math.min(1, this.age / 0.4) * Math.PI);
    } else if (mv === 'miss') {
      const w = 1 - this.age / 0.4;
      B.rotation.z += Math.sin(this.age * 34) * 0.14 * w;
      xL = xR = -0.6 * w;
      aL = aR = 0.6 * w + 0.2;
    }
    // a twirl while a hold note is held, easing back to the front after
    if (this.spinning) {
      this.spin += dt * 10;
      aR = 2.7;
      xR = 0;
      aL = 0.9;
      this.spinBack = 0;
    } else if (this.spin) {
      const target = Math.round(this.spin / (Math.PI * 2)) * Math.PI * 2;
      this.spin += (target - this.spin) * Math.min(1, dt * 10);
      if (Math.abs(target - this.spin) < 0.01) this.spin = 0;
    }
    if (this.reach) {
      if (this.reach < 0) {
        aR = 2.55;
        xR = -0.15;
      } else {
        aL = 2.55;
        xL = -0.15;
      }
      B.rotation.z += 0.08 * this.reach * -1;
    }
    B.rotation.y += this.spin;
    // armL hangs on +X (the kid's left, the screen's right): lifting it out is a positive z turn
    armL.rotation.set(xL, 0, aL);
    armR.rotation.set(xR, 0, -aR);
  }
}
