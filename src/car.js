import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh, damp, clamp, canvasTexture, roundRect, FONT } from './util.js';

// A small two-seat convertible. Faces local +Z. The driver sits on the left (+X).
export class Car {
  constructor(color = '#ff8fb1') {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.speed = 0;
    this.steer = 0;
    this.yaw = 0;
    this.bounce = 0;
    this.hop = 0;
    this.hopV = 0;
    this.radius = 1.15;
    const paint = umat(color, { rough: 0.35, metal: 0.1 });
    this.paint = paint;
    const cream = mat('#fff6e8', { rough: 0.6 });
    const dark = mat('#3b2b3f', { rough: 0.6 });
    const chrome = mat('#e6ebf2', { rough: 0.2, metal: 0.8 });

    const lower = mesh(new RoundedBoxGeometry(1.6, 0.55, 2.7, 4, 0.22), paint);
    lower.position.y = 0.55;
    const hoodBump = mesh(new RoundedBoxGeometry(1.4, 0.3, 0.9, 4, 0.14), paint);
    hoodBump.position.set(0, 0.85, 0.85);
    const trunk = mesh(new RoundedBoxGeometry(1.4, 0.28, 0.6, 4, 0.12), paint);
    trunk.position.set(0, 0.84, -1.0);
    this.body.add(lower, hoodBump, trunk);
    // Cabin and seats
    const cabin = mesh(new RoundedBoxGeometry(1.36, 0.2, 1.1, 3, 0.08), dark);
    cabin.position.set(0, 0.82, -0.15);
    this.body.add(cabin);
    for (const x of [0.33, -0.33]) {
      const seat = mesh(new RoundedBoxGeometry(0.5, 0.18, 0.5, 3, 0.07), cream);
      seat.position.set(x, 0.9, -0.25);
      const back = mesh(new RoundedBoxGeometry(0.5, 0.55, 0.14, 3, 0.07), cream);
      back.position.set(x, 1.15, -0.55);
      back.rotation.x = -0.15;
      this.body.add(seat, back);
    }
    // Windshield
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.42), new THREE.MeshStandardMaterial({ color: '#cdeeff', transparent: true, opacity: 0.45, roughness: 0.05, side: THREE.DoubleSide }));
    glass.position.set(0, 1.18, 0.38);
    glass.rotation.x = -0.35;
    const frame = mesh(new THREE.TorusGeometry(0.65, 0.03, 6, 20, Math.PI), chrome);
    frame.scale.set(1, 0.35, 1);
    frame.position.set(0, 1.0, 0.42);
    frame.rotation.x = -0.35;
    this.body.add(glass, frame);
    // Steering wheel
    this.wheelSteer = mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), dark);
    this.wheelSteer.position.set(0.33, 1.12, 0.18);
    this.wheelSteer.rotation.x = -0.9;
    this.body.add(this.wheelSteer);
    // Lights and bumpers
    this.headMat = umat('#fff8d6', { emissive: '#ffe9a8', ei: 0.6, rough: 0.2 });
    for (const x of [0.5, -0.5]) {
      const hl = mesh(new THREE.SphereGeometry(0.13, 14, 10), this.headMat, { cast: false });
      hl.scale.z = 0.5;
      hl.position.set(x, 0.66, 1.36);
      const tl = mesh(new THREE.SphereGeometry(0.09, 10, 8), mat('#e5484d', { emissive: '#e5484d', ei: 0.5 }), { cast: false });
      tl.scale.z = 0.5;
      tl.position.set(x, 0.68, -1.36);
      this.body.add(hl, tl);
    }
    for (const z of [1.38, -1.38]) {
      const b = mesh(new RoundedBoxGeometry(1.5, 0.14, 0.12, 2, 0.05), chrome);
      b.position.set(0, 0.38, z);
      this.body.add(b);
    }
    // Smile grille and number plate
    const smile = mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16, Math.PI), dark, { cast: false });
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.6, 1.37);
    this.body.add(smile);
    const plate = canvasTexture(256, 96, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 4, 4, w - 8, h - 8, 18);
      ctx.fill();
      ctx.fillStyle = '#3b2b3f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${h * 0.55}px ${FONT}`;
      ctx.fillText('R + H', w / 2, h / 2 + 3);
    });
    const plateM = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.17), new THREE.MeshStandardMaterial({ map: plate }));
    plateM.position.set(0, 0.5, -1.45);
    plateM.rotation.y = Math.PI;
    this.body.add(plateM);
    // Wheels
    this.wheels = [];
    const tire = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18);
    tire.rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.16, 0.16, 0.28, 12);
    hub.rotateZ(Math.PI / 2);
    for (const [x, z] of [[0.78, 0.9], [-0.78, 0.9], [0.78, -0.9], [-0.78, -0.9]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.34, z);
      const spin = new THREE.Group();
      spin.add(mesh(tire, dark), mesh(hub, chrome));
      pivot.add(spin);
      this.root.add(pivot);
      this.wheels.push({ pivot, spin, front: z > 0 });
    }
    this.seats = [new THREE.Vector3(0.33, 0.62, -0.2), new THREE.Vector3(-0.33, 0.62, -0.2)];
    const blob = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), new THREE.MeshBasicMaterial({ color: '#2b3b2a', transparent: true, opacity: 0.2, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.scale.set(0.75, 1.15, 1);
    blob.position.y = 0.02;
    this.root.add(blob);
  }

  setColor(c) {
    this.paint.color.set(c);
  }

  // input: { x: steer (-1..1, right positive), y: throttle (-1..1) }
  drive(dt, input, boost = false) {
    const max = boost ? 15 : 11;
    const accel = input.y > 0 ? 9 : input.y < 0 ? (this.speed > 0.5 ? 18 : 7) : 0;
    if (input.y !== 0) this.speed += input.y * accel * dt;
    else this.speed = damp(this.speed, 0, 1.6, dt);
    this.speed = clamp(this.speed, -5, max);
    this.steer = damp(this.steer, -input.x * 0.55, 8, dt);
    const turn = this.steer * clamp(Math.abs(this.speed) / 4, 0, 1) * Math.sign(this.speed || 1) * 1.7;
    this.yaw += turn * dt;
    this.turnRate = turn;
  }

  // Point-and-go: turn toward wantYaw (world yaw the stick points at) and roll forward.
  // Slows in sharp turns instead of stopping, so a U-turn is a smooth arc. intent 0..1.
  steerToward(dt, wantYaw, intent, boost = false) {
    const max = boost ? 12.5 : 8.5;
    let target = 0;
    if (wantYaw !== null && intent > 0.05) {
      const d = Math.atan2(Math.sin(wantYaw - this.yaw), Math.cos(wantYaw - this.yaw));
      // Asked to go the other way from a near stop (nose against a wall): back up while the nose swings round
      if (Math.abs(d) > 2.2 && Math.abs(this.speed) < 1.5) this.reversing = true;
      else if (Math.abs(d) < 1.6 || this.speed > 0.5) this.reversing = false;
      const grip = clamp(0.4 + Math.abs(this.speed) / 3, 0, 1);
      const rate = 2.9 - 0.9 * clamp(Math.abs(this.speed) / max, 0, 1);
      const turn = clamp(d * 3.4, -rate, rate) * grip;
      this.yaw += turn * dt;
      this.turnRate = turn;
      this.steer = damp(this.steer, clamp(this.reversing ? -d : d, -0.6, 0.6), 10, dt);
      target = this.reversing ? -2.6 * Math.min(1, intent) : max * Math.min(1, intent) * clamp(Math.cos(d) * 1.15, 0.28, 1);
    } else {
      this.reversing = false;
      this.turnRate = 0;
      this.steer = damp(this.steer, 0, 8, dt);
    }
    const dv = target - this.speed;
    // Speeding up forward 5.5, backward 4, braking (toward a stop) 11
    const up = this.speed >= 0 ? 5.5 : 11;
    const down = this.speed <= 0 ? 4 : 11;
    this.speed += clamp(dv, -down * dt, up * dt);
    if (Math.abs(this.speed) < 0.02 && target === 0) this.speed = 0;
  }

  update(dt, t) {
    for (const w of this.wheels) {
      w.spin.rotation.x += (this.speed * dt) / 0.34;
      if (w.front) w.pivot.rotation.y = this.steer;
    }
    this.wheelSteer.rotation.z = -this.steer * 2;
    // Lean into turns and bob on the road
    this.body.rotation.z = damp(this.body.rotation.z, -(this.turnRate || 0) * Math.abs(this.speed) * 0.012, 6, dt);
    this.body.rotation.x = damp(this.body.rotation.x, -clamp((this.lastSpeed ?? 0) - this.speed, -1, 1) * 0.6, 6, dt);
    this.lastSpeed = this.speed;
    this.body.position.y = Math.abs(Math.sin(t * 18)) * 0.02 * Math.min(1, Math.abs(this.speed) / 5) + this.hop;
    if (this.hop > 0 || this.hopV > 0) {
      this.hopV -= 18 * dt;
      this.hop = Math.max(0, this.hop + this.hopV * dt);
      if (this.hop === 0) this.hopV = 0;
    }
    this.root.rotation.y = this.yaw;
  }

  honk() {
    this.hopV = 3.2;
  }
}
