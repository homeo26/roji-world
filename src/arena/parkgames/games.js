import * as THREE from 'three';
import { kit, starGeo, heartGeo } from '../../places/school/kit.js';
import { mat, umat } from '../../util.js';
import { COUNTER_Z } from './scene.js';

// The four booth games. Each takes the same env and returns
//   { hint, buttons, hud(), update(dt, t) -> true when over, score, tiers: [small, medium, big] }
// env: { booth (Group, booth-local coords), bx, level (1..3), input, hud, sound, fx, camera, kid, partner, cheer(n) }
// Booth-local: x across the booth (-2..2), the counter at z 1.1, the back wall at z -2.4, floor y 0.

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, t) => a + (b - a) * t;
const tmp = new THREE.Vector3();
const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const one = new THREE.Vector3(1, 1, 1);
const Y = new THREE.Vector3(0, 1, 0);

// The player's throwing arm: a quick swing forward
function swing(kid, k) {
  if (k <= 0) return;
  const a = Math.sin(Math.min(1, k) * Math.PI);
  kid.arms[1].rotation.set(-2.6 * a, 0, -0.2);
}

// World point under a tap on a plane (booth-local) z = const, or y = const
function tapOnPlane(env, ndc, plane) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, env.camera);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  return env.booth.worldToLocal(hit);
}

// ================================================================ Ring Toss
export function ringToss(env) {
  const { booth, level, input, sound, fx } = env;
  const k = kit();
  const N = 7;
  const bottles = [];
  const stand = new THREE.Group();
  booth.add(stand);
  stand.add(k.at(k.box(3.4, 0.5, 0.5, '#d4a373'), 0, 0.95, -1.15));
  stand.add(k.at(k.box(3.4, 0.85, 0.5, '#c28e5e'), 0, 1.12, -1.65));
  const bottleGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.32, 10);
  const neckGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.14, 8);
  for (let i = 0; i < N; i++) {
    const front = i % 2 === 0;
    const x = -1.35 + i * 0.45;
    const y = front ? 1.2 : 1.55;
    const z = front ? -1.15 : -1.65;
    const m = new THREE.MeshStandardMaterial({ color: '#5fb85a', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.92 });
    const b = new THREE.Group();
    const body = new THREE.Mesh(bottleGeo, m);
    body.position.y = 0.16;
    const neck = new THREE.Mesh(neckGeo, m);
    neck.position.y = 0.39;
    b.add(body, neck);
    b.position.set(x, y, z);
    stand.add(b);
    bottles.push({ g: b, x, y, z, mat: m, gold: false, rung: 0 });
  }
  const setGold = () => {
    for (const b of bottles) {
      b.gold = false;
      b.mat.color.set(b.rung ? '#8fd3ff' : '#5fb85a');
      b.mat.emissive.set('#000000');
    }
    const free = bottles.filter((b) => !b.rung);
    const g = free[Math.floor(Math.random() * free.length)] || bottles[0];
    g.gold = true;
    g.mat.color.set('#ffd166');
    g.mat.emissive.set('#a8741a');
  };
  setGold();
  // the aim: a glowing ring sweeping over the bottles
  const aim = new THREE.Group();
  const aimRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  aimRing.rotation.x = 1.1;
  aim.add(aimRing);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }));
  beam.position.y = -0.36;
  aim.add(beam);
  booth.add(aim);
  const ringGeo = new THREE.TorusGeometry(0.12, 0.022, 6, 18);
  const ringCols = ['#ef5b6f', '#ffd166', '#8fd3ff', '#c7a6ff', '#7fd8bf'];
  const rings = [];
  const st = { left: 10, aimX: -1.4, dir: 1, score: 0, throws: [], swingK: 0, hits: 0, done: false, wait: 0 };
  const speed = 0.85 + level * 0.3;
  const throwRing = () => {
    if (st.left <= 0) return;
    st.left--;
    st.swingK = 0.01;
    // the nearest bottle under the aim
    let best = null;
    let bd = 1;
    for (const b of bottles) {
      const d = Math.abs(b.x + stand.position.x - st.aimX);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    const hit = best && bd < 0.1 && best.rung < 2;
    const r = new THREE.Mesh(ringGeo, mat(ringCols[rings.length % ringCols.length], { rough: 0.4 }));
    r.rotation.x = Math.PI / 2;
    booth.add(r);
    rings.push(r);
    const from = new THREE.Vector3(-0.55, 1.4, COUNTER_Z + 0.75);
    const to = hit ? new THREE.Vector3(best.x + stand.position.x, best.y + 0.52, best.z) : new THREE.Vector3(st.aimX, 1.45, -1.3 + Math.random() * 0.3);
    st.throws.push({ r, from, to, t: 0, hit, b: best, settle: hit ? best.y + 0.33 - best.rung * 0.04 : 1.27 });
    sound.ui('swoosh');
  };
  return {
    hint: 'Press Space (or tap) when the white ring is over a bottle',
    buttons: { action: 'Throw', jump: null, stick: false },
    get score() {
      return st.score;
    },
    tiers: [3, 6, 10].map((v) => Math.round(v * (1 + (level - 1) * 0.15))),
    hud: () => `${st.score} ${st.score === 1 ? 'point' : 'points'} <span style="font-weight:400">&middot; ${st.left} rings</span>`,
    update(dt, t) {
      // level 3: the bottle stand slides
      if (level >= 3) stand.position.x = Math.sin(t * 0.9) * 0.28;
      st.aimX += st.dir * speed * dt;
      if (st.aimX > 1.5) st.dir = -1;
      if (st.aimX < -1.5) st.dir = 1;
      aim.position.set(st.aimX, 2.15 + Math.sin(t * 6) * 0.02, -1.4);
      aim.visible = st.left > 0;
      if (input.pressed('action') || input.pressed('jump') || input.taps().length) throwRing();
      for (const th of st.throws) {
        if (th.t >= 1) continue;
        th.t = Math.min(1, th.t + dt / 0.55);
        const u = th.t;
        th.r.position.lerpVectors(th.from, th.to, u);
        th.r.position.y += Math.sin(u * Math.PI) * 0.8;
        th.r.rotation.z = u * 9;
        if (th.t >= 1) {
          if (th.hit) {
            th.b.rung++;
            const pts = th.b.gold ? 3 : 1;
            st.score += pts;
            st.hits++;
            sound.ui(th.b.gold ? 'win' : 'good');
            fx.burst(booth.localToWorld(th.to.clone()), th.b.gold ? ['#ffd166', '#ffffff'] : ['#ef5b6f', '#ffd166', '#8fd3ff'], th.b.gold ? 30 : 16);
            env.cheer(st.hits);
            if (level >= 2 || th.b.gold) setGold();
          } else sound.ui('tick');
        }
      }
      // rings fall onto the neck, or drop onto the stand
      for (const th of st.throws) {
        if (th.t < 1) continue;
        th.r.position.y = lerp(th.r.position.y, th.settle, Math.min(1, dt * 8));
        if (th.hit) th.r.position.x = th.b.x + stand.position.x;
        th.r.rotation.z += dt * (th.hit ? 4 : 0);
      }
      st.swingK = st.swingK > 0 ? st.swingK + dt * 3 : 0;
      if (st.swingK > 1) st.swingK = 0;
      swing(env.kid, st.swingK);
      if (st.left <= 0 && st.throws.every((th) => th.t >= 1)) st.wait += dt;
      return st.wait > 0.8;
    },
  };
}

// ================================================================ Hook a Duck
export function hookDuck(env) {
  const { booth, level, input, sound, fx } = env;
  const k = kit();
  // the stream: an oval trough
  const CX = 0;
  const CZ = -0.75;
  const RX = 1.45;
  const RZ = 0.62;
  const trough = new THREE.Group();
  booth.add(trough);
  const ring = (rx, rz, h, c, y) => {
    const s = new THREE.Shape();
    s.absellipse(0, 0, rx, rz, 0, Math.PI * 2);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 36 }), mat(c, { rough: 0.6 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(CX, y, CZ);
    trough.add(m);
  };
  ring(RX + 0.32, RZ + 0.32, 1.0, '#6fb8ff', 0);
  ring(RX - 0.32, RZ - 0.3, 1.12, '#fff4e3', 0);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2 + 0.6, RZ * 2 + 0.6), new THREE.MeshStandardMaterial({ color: '#8fd8ef', roughness: 0.15 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(CX, 1.02, CZ);
  trough.add(water);
  const duckG = new THREE.Group();
  const body = k.sph(0.11, '#ffffff', undefined, 10);
  body.scale.set(1, 0.8, 1.3);
  duckG.add(body);
  duckG.add(k.at(k.sph(0.075, '#ffffff', undefined, 9), 0, 0.1, 0.09));
  duckG.add(k.at(k.rot(k.cone(0.03, 0.08, '#ff9a3c', 6), Math.PI / 2, 0, 0), 0, 0.095, 0.17));
  duckG.add(k.at(k.tor(0.03, 0.012, '#ffffff', Math.PI * 2, undefined, 8, 4), 0, 0.03, -0.14));
  duckG.updateMatrixWorld(true);
  const list = [];
  duckG.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal'].includes(n)) g.deleteAttribute(n);
    g.applyMatrix4(o.matrixWorld);
    const c = new THREE.Color(o.material.color);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < g.attributes.position.count; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    list.push(g);
  });
  const dgeo = env.merge(list);
  const ND = 9;
  const ducksMesh = new THREE.InstancedMesh(dgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }), ND);
  ducksMesh.castShadow = true;
  booth.add(ducksMesh);
  const KIND = { 1: '#ffd166', 2: '#ff9eb5', 3: '#8fd3ff', 5: '#ffcf40' };
  const ducks = [];
  const col = new THREE.Color();
  const pickPts = () => {
    const r = Math.random();
    return r < 0.12 ? 5 : r < 0.35 ? 3 : r < 0.62 ? 2 : 1;
  };
  for (let i = 0; i < ND; i++) {
    const pts = pickPts();
    ducks.push({ a: (i / ND) * Math.PI * 2, pts, caught: 0, y: 0 });
    ducksMesh.setColorAt(i, col.set(KIND[pts]));
  }
  ducksMesh.instanceColor.needsUpdate = true;
  // the hook on its rod
  const rod = new THREE.Group();
  booth.add(rod);
  rod.add(k.at(k.cyl(0.02, 0.025, 1.6, '#9b6a43', 6), 0, 0.8, 0));
  rod.children[0].rotation.z = Math.PI / 2;
  rod.children[0].position.set(0.75, 2.2, 0);
  const line = k.cyl(0.006, 0.006, 1, '#3b2b3f', 4);
  rod.add(line);
  const hook = k.tor(0.05, 0.012, '#d3dbe5', Math.PI * 1.4, { metal: 0.5, rough: 0.3 }, 10, 4);
  rod.add(hook);
  const FRONT_Z = CZ + RZ;
  const st = { time: 30, hx: 0, drop: 0, dropping: false, score: 0, caught: 0, carry: null, done: false, end: 0, swim: 0.32 + level * 0.12, targetX: null };
  const duckPos = (d, out) => out.set(CX + Math.cos(d.a) * RX, 1.08 + d.y, CZ + Math.sin(d.a) * RZ);
  const startDrop = () => {
    if (st.dropping || st.time <= 0) return;
    st.dropping = true;
    st.drop = 0;
    st.caughtThis = null;
    sound.ui('swoosh');
  };
  return {
    hint: 'Left and right to move the hook, Space to dip it (or tap a duck)',
    buttons: { action: 'Hook', jump: null },
    get score() {
      return st.score;
    },
    tiers: [6, 12, 20].map((v) => Math.round(v * (1 + (level - 1) * 0.15))),
    hud: () => `${st.score} ${st.score === 1 ? 'point' : 'points'} <span style="font-weight:400">&middot; ${Math.ceil(Math.max(0, st.time))}s</span>`,
    update(dt, t) {
      st.time -= dt;
      // the ducks swim round
      for (let i = 0; i < ND; i++) {
        const d = ducks[i];
        d.a += st.swim * dt * (1 + (level >= 3 ? Math.sin(t * 0.7) * 0.4 : 0));
        if (d.caught > 0) {
          d.caught -= dt;
          if (d.caught <= 0) {
            d.pts = pickPts();
            ducksMesh.setColorAt(i, col.set(KIND[d.pts]));
            ducksMesh.instanceColor.needsUpdate = true;
          }
        }
        duckPos(d, tmp);
        tmp.y += Math.sin(t * 3 + i) * 0.012;
        const yaw = Math.atan2(-Math.sin(d.a) * RX, Math.cos(d.a) * RZ);
        q.setFromAxisAngle(Y, yaw);
        const s = d === st.carry ? 0 : d.caught > 0 ? 0 : 1;
        ducksMesh.setMatrixAt(i, m4.compose(tmp, q, one.clone().setScalar(s)));
      }
      ducksMesh.instanceMatrix.needsUpdate = true;
      // move the hook: stick or arrows, or toward a tapped duck
      const taps = input.taps();
      if (taps.length) {
        const hits = input.pick([ducksMesh], taps[taps.length - 1].ndc);
        if (hits.length && hits[0].instanceId !== undefined) {
          const d = ducks[hits[0].instanceId];
          // aim where that duck will be when the hook gets down
          const lead = d.a + st.swim * 0.22;
          st.hx = CX + Math.cos(lead) * RX;
          st.hz = CZ + Math.sin(lead) * RZ;
          startDrop();
        } else startDrop();
      }
      const ax = input.axis().x;
      if (!st.dropping) {
        st.hx = Math.max(-RX, Math.min(RX, st.hx + ax * 1.6 * dt));
        st.hz = st.hz === undefined ? FRONT_Z : st.hz + (FRONT_Z - st.hz) * Math.min(1, dt * 2);
      }
      if (input.pressed('action') || input.pressed('jump')) startDrop();
      // the dip: down, catch, back up
      let depth = 0;
      if (st.dropping) {
        st.drop += dt / 0.6;
        depth = Math.sin(Math.min(1, st.drop) * Math.PI);
        if (st.drop > 0.5 && !st.caughtThis) {
          st.caughtThis = 'no';
          for (const d of ducks) {
            if (d.caught > 0) continue;
            duckPos(d, tmp);
            if (Math.hypot(tmp.x - st.hx, tmp.z - st.hz) < 0.2) {
              st.caughtThis = d;
              d.caught = 1.6;
              st.carry = d;
              st.score += d.pts;
              st.caught++;
              sound.ui(d.pts >= 5 ? 'win' : 'coin');
              fx.burst(booth.localToWorld(tmp.clone().setY(1.4)), d.pts >= 5 ? ['#ffd166', '#ffffff'] : ['#8fd3ff', '#ffffff', '#ffd166'], d.pts >= 5 ? 30 : 12);
              env.cheer(st.caught);
              break;
            }
          }
          if (st.caughtThis === 'no') sound.ui('tick');
        }
        if (st.drop >= 1) {
          st.dropping = false;
          st.carry = null;
        }
      }
      const top = 2.2;
      const bottom = 1.16;
      const hy = lerp(top - 0.55, bottom, depth);
      hook.position.set(st.hx, hy, st.hz);
      hook.rotation.set(0, 0, Math.PI * 0.3);
      line.scale.y = top - hy;
      line.position.set(st.hx, (top + hy) / 2, st.hz);
      rod.children[0].position.set(st.hx / 2 + 0.75, top, st.hz);
      rod.children[0].scale.y = Math.max(0.3, (1.6 + Math.abs(st.hx - 1.5)) / 1.6);
      env.kid.hands = 'hold';
      if (st.carry) {
        // the caught duck dangles from the hook
        tmp.set(st.hx, hy - 0.12, st.hz);
        ducksMesh.getMatrixAt(ducks.indexOf(st.carry), m4);
        ducksMesh.setMatrixAt(ducks.indexOf(st.carry), m4.compose(tmp, q.identity(), one));
      }
      if (st.time <= 0 && !st.dropping) st.end += dt;
      return st.end > 0.8;
    },
  };
}

// ================================================================ Balloon Darts
export function balloonDarts(env) {
  const { booth, level, input, sound, fx } = env;
  const k = kit();
  const board = k.box(3.5, 2.0, 0.08, '#d4a373');
  board.position.set(0, 2.15, -2.25);
  booth.add(board);
  const BZ = -2.15;
  const COLS = 6;
  const ROWS = 4;
  const bGeo = new THREE.SphereGeometry(0.17, 14, 10);
  bGeo.scale(1, 1.15, 0.8);
  const balloons = [];
  const bm = new THREE.InstancedMesh(bGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }), COLS * ROWS);
  bm.castShadow = false;
  booth.add(bm);
  const palette = ['#ef5b6f', '#8fd3ff', '#7fd8bf', '#c7a6ff', '#ff9eb5'];
  const col = new THREE.Color();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const gold = Math.random() < 0.12;
      const heart = !gold && Math.random() < 0.15;
      balloons.push({ i, bx: -1.4 + c * 0.56, by: 1.45 + r * 0.46, x: 0, y: 0, popped: false, pts: gold ? 3 : heart ? 2 : 1, ph: Math.random() * 6, row: r });
      bm.setColorAt(i, col.set(gold ? '#ffd166' : heart ? '#ff3d6e' : palette[(r + c) % palette.length]));
    }
  }
  bm.instanceColor.needsUpdate = true;
  const cross = new THREE.Group();
  cross.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 24), new THREE.MeshBasicMaterial({ color: '#ffffff' })));
  cross.add(new THREE.Mesh(new THREE.CircleGeometry(0.025, 10), new THREE.MeshBasicMaterial({ color: '#ef5b6f' })));
  cross.renderOrder = 3;
  booth.add(cross);
  const dartGeo = new THREE.ConeGeometry(0.025, 0.28, 6);
  dartGeo.rotateX(-Math.PI / 2);
  const darts = [];
  const st = { left: 10, cx: 0, cy: 2.1, score: 0, hits: 0, wait: 0, swingK: 0, pointerMoved: false };
  const wob = 0.05 + level * 0.025;
  const plane = new THREE.Plane();
  const balloonPos = (b, t) => {
    b.x = b.bx + (level >= 3 && b.row % 2 ? Math.sin(t * 0.8 + b.row) * 0.35 : 0);
    b.y = b.by + (level >= 2 ? Math.sin(t * 1.4 + b.ph) * 0.07 : 0);
  };
  const throwDart = (t) => {
    if (st.left <= 0) return;
    st.left--;
    st.swingK = 0.01;
    const tx = st.cx + Math.sin(t * 2.3) * wob;
    const ty = st.cy + Math.cos(t * 1.9) * wob;
    const m = new THREE.Mesh(dartGeo, mat(['#ef5b6f', '#3f5fb0', '#ffd166'][darts.length % 3], { rough: 0.4 }));
    booth.add(m);
    darts.push({ m, from: new THREE.Vector3(-0.55, 1.5, COUNTER_Z + 0.7), to: new THREE.Vector3(tx, ty, BZ + 0.02), t: 0 });
    sound.ui('swoosh');
  };
  return {
    hint: 'Aim with the mouse, arrows or stick, then Space (or tap a balloon)',
    buttons: { action: 'Throw', jump: null },
    get score() {
      return st.score;
    },
    tiers: [4, 8, 13].map((v) => Math.round(v * (1 + (level - 1) * 0.15))),
    hud: () => `${st.score} ${st.score === 1 ? 'point' : 'points'} <span style="font-weight:400">&middot; ${st.left} darts</span>`,
    update(dt, t) {
      for (const b of balloons) {
        balloonPos(b, t);
        bm.setMatrixAt(b.i, m4.compose(tmp.set(b.x, b.y, BZ + 0.15), q.identity(), one.clone().setScalar(b.popped ? 0 : 1 + Math.sin(t * 2 + b.ph) * 0.02)));
      }
      bm.instanceMatrix.needsUpdate = true;
      // aim: the pointer on the board, or the arrows / stick
      plane.setFromNormalAndCoplanarPoint(tmp.set(0, 0, 1), booth.localToWorld(new THREE.Vector3(0, 0, BZ)));
      const ax = input.axis();
      st.cx = Math.max(-1.6, Math.min(1.6, st.cx + ax.x * 1.5 * dt));
      st.cy = Math.max(1.3, Math.min(3.0, st.cy + ax.y * 1.5 * dt));
      const p = input.pointer;
      if (p.justDown || (p.down && st.pointerMoved) || (!p.down && st.lastNdc && !st.lastNdc.equals(p.ndc))) {
        const hit = tapOnPlane(env, p.ndc, plane);
        if (hit) {
          st.cx = Math.max(-1.6, Math.min(1.6, hit.x));
          st.cy = Math.max(1.3, Math.min(3.0, hit.y));
        }
        st.pointerMoved = true;
      }
      st.lastNdc = (st.lastNdc || new THREE.Vector2()).copy(p.ndc);
      cross.position.set(st.cx + Math.sin(t * 2.3) * wob, st.cy + Math.cos(t * 1.9) * wob, BZ + 0.36);
      cross.visible = st.left > 0;
      const taps = input.taps();
      if (taps.length) {
        const hit = tapOnPlane(env, taps[taps.length - 1].ndc, plane);
        if (hit) {
          st.cx = hit.x;
          st.cy = hit.y;
        }
        throwDart(t);
      } else if (input.pressed('action') || input.pressed('jump')) throwDart(t);
      for (const d of darts) {
        if (d.t >= 1) continue;
        d.t = Math.min(1, d.t + dt / 0.35);
        d.m.position.lerpVectors(d.from, d.to, d.t);
        d.m.position.y += Math.sin(d.t * Math.PI) * 0.25;
        d.m.lookAt(d.to);
        if (d.t >= 1) {
          let got = null;
          for (const b of balloons) if (!b.popped && Math.hypot(b.x - d.to.x, b.y - d.to.y) < 0.2) got = b;
          if (got) {
            got.popped = true;
            st.score += got.pts;
            st.hits++;
            sound.ui('pop');
            fx.burst(booth.localToWorld(tmp.set(got.x, got.y, BZ + 0.2)), got.pts >= 3 ? ['#ffd166', '#ffffff'] : ['#ef5b6f', '#8fd3ff', '#ffffff'], got.pts >= 3 ? 26 : 14);
            env.cheer(st.hits);
          } else sound.ui('tick');
        }
      }
      st.swingK = st.swingK > 0 ? st.swingK + dt * 3.5 : 0;
      if (st.swingK > 1) st.swingK = 0;
      swing(env.kid, st.swingK);
      if (st.left <= 0 && darts.every((d) => d.t >= 1)) st.wait += dt;
      return st.wait > 0.8 || balloons.every((b) => b.popped);
    },
  };
}

// ================================================================ Whack-a-Mole
export function whackMole(env) {
  const { booth, level, input, sound, fx } = env;
  const k = kit();
  const cab = k.rbox(3.0, 1.15, 1.9, '#3fbf9f', 0.08);
  cab.position.set(0, 0.6, -0.95);
  booth.add(cab);
  booth.add(k.at(k.box(3.05, 0.05, 1.95, '#2b8f76'), 0, 1.18, -0.95));
  const HOLES = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) HOLES.push({ x: -0.9 + c * 0.9, z: -1.55 + r * 0.6, up: 0, t: 0, kind: null });
  for (const h of HOLES) booth.add(k.at(k.cyl(0.21, 0.21, 0.02, '#1d4f42', 14), h.x, 1.21, h.z));
  // moles, golden moles and a Mimi plush (don't whack Mimi!)
  const moleG = (fur, nose) => {
    const g = new THREE.Group();
    g.add(k.at(k.cyl(0.15, 0.17, 0.3, fur, 12), 0, 0.15, 0));
    g.add(k.at(k.sph(0.15, fur, undefined, 12), 0, 0.3, 0));
    g.add(k.at(k.sph(0.055, nose, undefined, 8), 0, 0.3, 0.14));
    for (const s of [-1, 1]) {
      g.add(k.at(k.sph(0.025, '#3b2b3f', undefined, 6), s * 0.06, 0.37, 0.12));
      g.add(k.at(k.sph(0.04, '#ffd1dc', undefined, 6), s * 0.11, 0.29, 0.1));
    }
    return g;
  };
  const mimiG = () => {
    const g = new THREE.Group();
    g.add(k.at(k.cyl(0.15, 0.17, 0.3, '#c7a6ff', 12), 0, 0.15, 0));
    g.add(k.at(k.sph(0.16, '#ffb3cc', undefined, 12), 0, 0.33, 0));
    for (const s of [-1, 1]) {
      const ear = k.sph(0.05, '#ffb3cc', undefined, 8);
      ear.scale.set(1, 3.2, 0.7);
      ear.position.set(s * 0.07, 0.6, 0);
      g.add(ear);
      g.add(k.at(k.sph(0.025, '#3b2b3f', undefined, 6), s * 0.06, 0.37, 0.14));
    }
    g.add(k.at(k.sph(0.03, '#ef5b6f', undefined, 6), 0, 0.31, 0.16));
    return g;
  };
  const kinds = { mole: moleG('#a0602e', '#ff9eb5'), gold: moleG('#ffd166', '#ef5b6f'), mimi: mimiG() };
  const meshes = {};
  for (const [id, g] of Object.entries(kinds)) {
    g.visible = false;
    meshes[id] = HOLES.map(() => {
      const c = g.clone();
      booth.add(c);
      return c;
    });
  }
  const mallet = new THREE.Group();
  const head = k.cyl(0.1, 0.1, 0.32, '#ef5b6f', 12);
  head.rotation.z = Math.PI / 2;
  head.position.y = 0.55;
  mallet.add(head);
  mallet.add(k.at(k.cyl(0.025, 0.025, 0.6, '#d4a373', 6), 0, 0.27, 0));
  booth.add(mallet);
  const st = { time: 25, next: 0.6, score: 0, hits: 0, cursor: 4, whack: 0, whackAt: 4, end: 0 };
  const upFor = 1.05 - level * 0.13;
  const gap = 0.8 - level * 0.1;
  const all = () => HOLES.flatMap((h, i) => Object.values(meshes).map((list) => list[i]));
  const whack = (i) => {
    if (st.whack > 0) return;
    st.whack = 0.001;
    st.whackAt = i;
    st.cursor = i;
  };
  const resolve = (i) => {
    const h = HOLES[i];
    if (h.kind && h.up > 0.5) {
      if (h.kind === 'mimi') {
        st.score = Math.max(0, st.score - 2);
        sound.ui('bad');
        env.hud.message('Sorry, Mimi!', 900);
      } else {
        const pts = h.kind === 'gold' ? 3 : 1;
        st.score += pts;
        st.hits++;
        sound.ui(pts > 1 ? 'win' : 'pop');
        fx.burst(booth.localToWorld(tmp.set(h.x, 1.6, h.z)), pts > 1 ? ['#ffd166', '#ffffff'] : ['#a0602e', '#ffd166', '#ffffff'], pts > 1 ? 26 : 12);
        env.cheer(st.hits);
      }
      h.t = 99;
    } else sound.ui('tick');
  };
  const keyHole = { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 };
  return {
    hint: 'Tap the moles, or arrows to move and Space to whack. Not Mimi!',
    buttons: { action: 'Whack', jump: null, stick: false },
    get score() {
      return st.score;
    },
    tiers: [6, 12, 18].map((v) => Math.round(v * (1 + (level - 1) * 0.15))),
    hud: () => `${st.score} ${st.score === 1 ? 'point' : 'points'} <span style="font-weight:400">&middot; ${Math.ceil(Math.max(0, st.time))}s</span>`,
    update(dt, t) {
      st.time -= dt;
      // pop up a new one now and then
      st.next -= dt;
      if (st.next <= 0 && st.time > 0.8) {
        st.next = gap * (0.7 + Math.random() * 0.6);
        const free = HOLES.map((h, i) => i).filter((i) => !HOLES[i].kind);
        if (free.length) {
          const i = free[Math.floor(Math.random() * free.length)];
          const r = Math.random();
          HOLES[i].kind = r < 0.12 ? 'gold' : r < 0.12 + 0.08 + level * 0.04 ? 'mimi' : 'mole';
          HOLES[i].t = 0;
        }
      }
      HOLES.forEach((h, i) => {
        if (h.kind) {
          h.t += dt;
          const life = h.kind === 'mimi' ? upFor * 1.3 : upFor;
          const want = h.t < life ? 1 : 0;
          h.up += (want - h.up) * Math.min(1, dt * 14);
          if (h.t > life && h.up < 0.05) {
            h.kind = null;
            h.up = 0;
          }
        }
        for (const [id, list] of Object.entries(meshes)) {
          const m = list[i];
          m.visible = h.kind === id && h.up > 0.02;
          if (m.visible) m.position.set(h.x, 0.88 + h.up * 0.33, h.z);
        }
      });
      // controls
      const taps = input.taps();
      if (taps.length) {
        const hits = input.pick(all().filter((m) => m.visible), taps[taps.length - 1].ndc);
        if (hits.length) {
          let o = hits[0].object;
          let idx = -1;
          for (const list of Object.values(meshes)) {
            for (let i = 0; i < list.length; i++) {
              let p = o;
              while (p && p !== list[i]) p = p.parent;
              if (p) idx = i;
            }
          }
          if (idx >= 0) whack(idx);
        }
      }
      const c = st.cursor;
      if (input.pressed('arrowleft') || input.pressed('a')) st.cursor = c % 3 > 0 ? c - 1 : c;
      if (input.pressed('arrowright') || input.pressed('d')) st.cursor = c % 3 < 2 ? c + 1 : c;
      if (input.pressed('arrowup') || input.pressed('w')) st.cursor = c >= 3 ? c - 3 : c;
      if (input.pressed('arrowdown') || input.pressed('s')) st.cursor = c < 6 ? c + 3 : c;
      for (const [key, i] of Object.entries(keyHole)) if (input.pressed(key)) whack(i);
      if (input.pressed('action') || input.pressed('jump')) whack(st.cursor);
      // the mallet: hovers over the cursor, swings down on a whack
      const h = HOLES[st.whack > 0 ? st.whackAt : st.cursor];
      let swingA = 0;
      if (st.whack > 0) {
        const prev = st.whack;
        st.whack += dt / 0.22;
        if (prev < 0.5 && st.whack >= 0.5) resolve(st.whackAt);
        swingA = Math.sin(Math.min(1, st.whack) * Math.PI);
        if (st.whack >= 1) st.whack = 0;
      }
      mallet.position.set(h.x + 0.5, 1.35, h.z + 0.1);
      mallet.rotation.set(0, 0, 0.5 + swingA * 1.0);
      swing(env.kid, st.whack > 0 ? st.whack : 0);
      if (st.time <= 0) st.end += dt;
      return st.end > 1.0;
    },
  };
}

export const GAMES = { ring: ringToss, ducks: hookDuck, darts: balloonDarts, moles: whackMole };
