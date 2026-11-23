import * as THREE from 'three';
import { canvasTexture } from './util.js';

// Confetti bursts, footstep dust and the tap-to-walk marker.
export class Effects {
  constructor(scene) {
    this.scene = scene;

    // Confetti
    this.max = 220;
    const geo = new THREE.PlaneGeometry(0.11, 0.18);
    this.confetti = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), this.max);
    this.confetti.frustumCulled = false;
    this.parts = [];
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.max; i++) {
      this.confetti.setMatrixAt(i, zero);
      this.confetti.setColorAt(i, new THREE.Color('#ffffff'));
      this.parts.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() });
    }
    scene.add(this.confetti);
    this.next = 0;

    // Dust puffs
    const dustTex = canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,250,240,0.9)');
      g.addColorStop(1, 'rgba(255,250,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    });
    this.dust = [];
    for (let i = 0; i < 24; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      scene.add(s);
      this.dust.push({ s, life: 0 });
    }
    this.dustNext = 0;

    // Tap marker
    this.markerMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 32), this.markerMat);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.renderOrder = 2;
    scene.add(this.marker);
    this.markerLife = 0;

    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3(1, 1, 1);
    this.c = new THREE.Color();
  }

  // Floating hearts (heart emote, movie night) and a little coin for wishes.
  initExtras() {
    const heartTex = canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = '#ff6b8a';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(64, 108);
      ctx.bezierCurveTo(8, 70, 18, 14, 64, 40);
      ctx.bezierCurveTo(110, 14, 120, 70, 64, 108);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    });
    this.hearts = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
      s.visible = false;
      this.scene.add(s);
      this.hearts.push({ s, life: 0, p: new THREE.Vector3(), dx: 0 });
    }
    this.heartNext = 0;
    this.coin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 14), new THREE.MeshStandardMaterial({ color: '#f4c24f', metalness: 0.7, roughness: 0.3 }));
    this.coin.visible = false;
    this.scene.add(this.coin);
    this.coinT = -1;
  }

  heartsAt(pos, n = 5) {
    if (!this.hearts) this.initExtras();
    for (let i = 0; i < n; i++) {
      const h = this.hearts[this.heartNext];
      this.heartNext = (this.heartNext + 1) % this.hearts.length;
      h.life = 1 + i * 0.12;
      h.p.set(pos.x + (Math.random() - 0.5) * 0.5, pos.y, pos.z + (Math.random() - 0.5) * 0.3);
      h.dx = (Math.random() - 0.5) * 0.6;
      h.s.visible = true;
    }
  }

  tossCoin(from, to, onLand) {
    if (!this.hearts) this.initExtras();
    this.coinFrom = from.clone();
    this.coinTo = to.clone();
    this.coinT = 0;
    this.coinLand = onLand;
    this.coin.visible = true;
  }

  poof(pos) {
    for (let i = 0; i < 7; i++) {
      this.puff({ x: pos.x + (Math.random() - 0.5) * 1.2, z: pos.z + (Math.random() - 0.5) * 1.2 });
    }
  }

  burst(pos, colors, count = 110) {
    for (let i = 0; i < count; i++) {
      const k = this.next;
      this.next = (this.next + 1) % this.max;
      const part = this.parts[k];
      part.life = 3 + Math.random() * 1.5;
      part.p.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y, pos.z + (Math.random() - 0.5) * 0.6);
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 3.5;
      part.v.set(Math.cos(a) * sp, 6 + Math.random() * 4, Math.sin(a) * sp);
      part.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      part.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      this.confetti.setColorAt(k, this.c.set(colors[i % colors.length]));
    }
    this.confetti.instanceColor.needsUpdate = true;
  }

  puff(pos) {
    const d = this.dust[this.dustNext];
    this.dustNext = (this.dustNext + 1) % this.dust.length;
    d.life = 1;
    d.s.visible = true;
    d.s.position.set(pos.x + (Math.random() - 0.5) * 0.2, 0.12, pos.z + (Math.random() - 0.5) * 0.2);
  }

  showMarker(p) {
    this.marker.position.set(p.x, 0.08, p.z);
    this.markerLife = 1;
  }

  hideMarker() {
    this.markerLife = Math.min(this.markerLife, 0.25);
  }

  update(dt, t) {
    let alive = false;
    for (let i = 0; i < this.max; i++) {
      const part = this.parts[i];
      if (part.life <= 0) continue;
      alive = true;
      part.life -= dt;
      if (part.p.y > 0.03) {
        part.v.y -= 9.5 * dt;
        part.v.multiplyScalar(1 - 1.6 * dt);
        part.p.addScaledVector(part.v, dt);
        part.r.x += part.w.x * dt;
        part.r.y += part.w.y * dt;
        part.r.z += part.w.z * dt;
        // Flutter
        part.p.x += Math.sin(t * 7 + i) * 0.4 * dt;
      } else {
        part.p.y = 0.03;
        part.r.x = -Math.PI / 2;
        part.r.y = 0;
      }
      const sc = part.life < 0.6 ? part.life / 0.6 : 1;
      this.s.setScalar(sc);
      this.m4.compose(part.p, this.q.setFromEuler(part.r), this.s);
      this.confetti.setMatrixAt(i, this.m4);
      if (part.life <= 0) this.confetti.setMatrixAt(i, this.m4.makeScale(0, 0, 0));
    }
    if (alive || this._wasAlive) this.confetti.instanceMatrix.needsUpdate = true;
    this._wasAlive = alive;

    for (const d of this.dust) {
      if (d.life <= 0) continue;
      d.life -= dt * 1.8;
      d.s.material.opacity = Math.max(0, d.life) * 0.55;
      d.s.scale.setScalar(0.25 + (1 - d.life) * 0.5);
      d.s.position.y += dt * 0.3;
      if (d.life <= 0) d.s.visible = false;
    }

    if (this.hearts) {
      for (const h of this.hearts) {
        if (h.life <= 0) continue;
        h.life -= dt * 0.55;
        const k = 1 - Math.min(1, h.life);
        h.s.position.set(h.p.x + Math.sin(t * 3 + h.dx * 10) * 0.15 + h.dx * k, h.p.y + k * 1.4, h.p.z);
        h.s.scale.setScalar(0.25 + Math.sin(Math.min(1, k * 3) * Math.PI * 0.5) * 0.15);
        h.s.material.opacity = h.life > 1 ? 0 : Math.min(1, h.life * 2);
        if (h.life <= 0) h.s.visible = false;
      }
      if (this.coinT >= 0) {
        this.coinT += dt * 1.4;
        const k = Math.min(1, this.coinT);
        this.coin.position.lerpVectors(this.coinFrom, this.coinTo, k);
        this.coin.position.y += Math.sin(k * Math.PI) * 1.5;
        this.coin.rotation.x += dt * 14;
        if (k >= 1) {
          this.coinT = -1;
          this.coin.visible = false;
          this.coinLand?.();
        }
      }
    }

    if (this.markerLife > 0) {
      this.markerLife -= dt * 0.9;
      this.markerMat.opacity = Math.max(0, this.markerLife) * 0.85;
      const s = 1 + Math.sin(t * 8) * 0.12;
      this.marker.scale.setScalar(s);
    } else this.markerMat.opacity = 0;
  }
}
