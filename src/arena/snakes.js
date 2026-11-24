// Snakes and Ladders: a garden board where Roji and Homama are the tokens. Hit the big die,
// hop square to square, climb the arching ladders and slide down the snakes. Exact roll for 100.
import * as THREE from 'three';
import { damp, dampAngle, clamp, easeOutBack, easeInOut } from '../util.js';
import * as K from './board2/kit.js';
import { buildGarden, cellPos, Y, HALF } from './board2/garden.js';
import { makeDie } from './board2/die.js';

const UP = new THREE.Vector3(0, 1, 0);
const HOP = 0.26;

export default {
  id: 'snakes',
  title: 'Snakes and Ladders',
  tagline: 'Race to square 100',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    const env = ctx.env.outdoor({ sky: '#a6dde2', fog: [38, 110], shadow: 11 });
    const board = buildGarden(ctx);
    const clock = K.makeClock();
    let alive = true;

    // ---------------------------------------------------------------- players
    const ids = [ctx.me, ctx.partner];
    const colors = K.playerColors(looks, ids);
    const P = ids.map((id, i) => {
      const kid = ctx.makeKid(id);
      kid.onEmoteFx = (type) => type === 'heart' && fx.heartsAt(kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 5);
      K.bakeLiveKid(kid);
      kid.root.rotation.order = 'YXZ';
      scene.add(kid.root);
      const p = { i, id, name: looks[id].name, color: colors[i], kid, sq: 1, rolls: 0, pos: cellPos(1).clone(), air: 0, yaw: 0, pitch: 0, speed: 0, mode: 'idle', punch: 0, climbPh: 0, faceYaw: null };
      p.pos.x += i ? 0.27 : -0.27;
      return p;
    });
    const other = (p) => P[1 - p.i];

    // Turn ring under the kid whose turn it is
    const ringMat = new THREE.MeshBasicMaterial({ color: colors[0], transparent: true, opacity: 0.0, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 36), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 2;
    scene.add(ring);

    // ---------------------------------------------------------------- die
    const die = makeDie(0.64);
    scene.add(die.root);
    die.root.scale.setScalar(0.001);
    die.onClack = (k) => K.sfx.clack(sound, k);
    const BOUNDS = { x0: -HALF + 0.05, x1: HALF - 0.05, z0: -HALF + 0.05, z1: HALF - 0.05 };
    let dieHome = null; // the player the die hovers over
    let dieShow = 0;
    let dieWait = null;

    // ---------------------------------------------------------------- HUD
    const ui = K.overlay('', '<div class="b2-say"></div>');
    const sayEl = ui.$('.b2-say');
    const floats = K.floaters(ui.el, 4);
    const say = (html) => (sayEl.innerHTML = html);
    const dot = (p) => `<i style="background:${p.color}"></i>`;
    const touch = () => document.body.classList.contains('touch');
    let turn = 0;
    let mode = ctx.load('mode', 'cpu');
    let phase = 'intro'; // intro | await | busy | over
    const showScore = () =>
      hud.score(
        P.map((p) => `<span style="color:${p.color};${phase !== 'over' && turn === p.i && phase !== 'intro' ? 'text-decoration:underline;text-underline-offset:4px' : ''}">${p.name}</span> ${p.sq}`).join('&nbsp;&nbsp;&nbsp;'),
      );
    showScore();
    hud.buttons({ action: 'Roll', jump: null, stick: false });
    hud.hint('E, Enter or Space to roll the die');
    const isCpu = (p) => mode === 'cpu' && p.i === 1;
    const dbg = {
      fast: 1,
      next: [],
      auto: false,
      P,
      die,
      get phase() {
        return phase;
      },
      get turn() {
        return turn;
      },
      // Test helper: put a player on a square
      place(i, sq) {
        P[i].sq = sq;
        cellPos(sq, P[i].pos);
        showScore();
      },
    };
    window.__snakes = dbg;

    // ---------------------------------------------------------------- moves
    const restPos = (p, sq, out = new THREE.Vector3()) => {
      cellPos(sq, out);
      const o = other(p);
      if (o.sq === sq && o.mode === 'idle') out.x += p.i ? 0.27 : -0.27;
      return out;
    };

    async function hopTo(p, to, h = 0.42, dur = HOP) {
      const from = p.pos.clone();
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      if (Math.hypot(dx, dz) > 0.05) p.faceYaw = Math.atan2(dx, dz);
      p.mode = 'hop';
      await clock.tween(dur, (k) => {
        p.pos.lerpVectors(from, to, k);
        p.air = Math.sin(k * Math.PI) * h;
        p.speed = 3;
      });
      p.air = 0;
      p.speed = 0;
      p.kid.squash = 0.78;
    }

    async function walkSquares(p, list) {
      let i = 0;
      for (const sq of list) {
        const o = other(p);
        const to = cellPos(sq).clone();
        if (o.sq === sq) to.x += p.i ? 0.27 : -0.27;
        await hopTo(p, to);
        if (!alive) return;
        p.sq = sq;
        K.sfx.hop(sound, i++);
        showScore();
        if (i === 1) hideDie();
      }
    }

    async function climb(p, l) {
      p.mode = 'climb';
      K.sfx.ladder(sound);
      floats.show('Ladder!', '#3fbf7f', p.pos.clone().add(new THREE.Vector3(0, 1.9, 0)));
      say(`${dot(p)}Ladder! ${p.name} climbs up to ${l.top}.`);
      const o = other(p);
      if (o.mode === 'idle') o.kid.emote(p.id === 'roji' && o.id === 'homama' ? 'heart' : 'cheer');
      const from = p.pos.clone();
      const L = l.length;
      const T = new THREE.Vector3();
      const n = new THREE.Vector3();
      const yawUp = Math.atan2(l.dir.x, l.dir.z);
      let rung = -1;
      await clock.tween(0.6 + L / 1.4, (k) => {
        const s = easeInOut(k) * L;
        const u = s / L;
        const pt = l.curve.getPointAt(u);
        l.curve.getTangentAt(u, T);
        n.copy(UP).addScaledVector(T, -T.y).normalize();
        pt.addScaledVector(n, 0.07);
        if (k < 0.08) pt.lerp(from, 1 - k / 0.08);
        p.pos.copy(pt);
        p.faceYaw = u < 0.5 ? yawUp : yawUp + Math.PI;
        p.climbPh = (s / 0.3) * Math.PI;
        const r = Math.floor(s / 0.3);
        if (r !== rung) {
          rung = r;
          K.sfx.rung(sound, u < 0.5 ? r : Math.max(0, Math.floor((L - s) / 0.3)), u > 0.5);
        }
      });
      p.sq = l.top;
      p.pos.copy(cellPos(l.top));
      p.mode = 'hop';
      p.kid.squash = 0.75;
      sound.land?.();
      showScore();
      p.mode = 'idle';
      p.faceYaw = null;
      p.kid.emote('cheer');
      fx.burst(p.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), [p.color, '#ffd166', '#ffffff'], 30);
      await clock.sleep(0.6);
    }

    async function slide(p, sn) {
      // The last hop lands right on the snake's head
      const head = sn.curve.getPointAt(0).setY(sn.top - 0.3);
      p.kid.pose = 'sit';
      await hopTo(p, head, 0.5, 0.34);
      if (!alive) return;
      hideDie();
      p.sq = sn.head;
      showScore();
      p.kid.hands = 'wave2';
      sn.gulp = 1;
      K.sfx.hiss(sound);
      floats.show('Oh no!', sn.color, p.pos.clone().add(new THREE.Vector3(0, 1.9, 0)));
      say(`${dot(p)}Oh no, a snake! ${p.name} slides down to ${sn.tail}.`);
      await clock.sleep(0.55);
      if (!alive) return;
      p.mode = 'slide';
      const L = sn.length;
      const dur = 0.8 + L * 0.2;
      K.sfx.whee(sound, dur + 0.2);
      floats.show('Whee!', sn.color, p.pos.clone().add(new THREE.Vector3(0, 1.6, 0)), 1.6);
      const n = new THREE.Vector3();
      const T = new THREE.Vector3();
      await clock.tween(dur, (k) => {
        const u = Math.min(1, Math.pow(k, 1.5) * 0.985);
        const pt = sn.curve.getPointAt(u);
        sn.curve.getTangentAt(u, T);
        sn.ride(u, n);
        pt.addScaledVector(n, sn.radius(u) + 0.02);
        pt.y -= 0.3;
        p.pos.copy(pt);
        const hz = Math.hypot(T.x, T.z);
        if (hz > 0.25) p.faceYaw = Math.atan2(T.x, T.z);
        p.pitch = clamp(-T.y * 0.7, -0.6, 0.6);
      });
      p.pitch = 0;
      p.kid.pose = 'stand';
      p.kid.hands = null;
      p.sq = sn.tail;
      const o = other(p);
      const to = cellPos(sn.tail).clone();
      if (o.sq === sn.tail) to.x += p.i ? 0.27 : -0.27;
      await hopTo(p, to, 0.5, 0.36);
      sound.land?.();
      fx.poof(p.pos);
      showScore();
      p.mode = 'idle';
      p.faceYaw = null;
      p.kid.emote('spin');
      if (o.mode === 'idle' && o.id === 'homama' && p.id === 'roji') o.kid.emote('wave');
      await clock.sleep(0.7);
    }

    async function move(p, v) {
      const start = p.sq;
      let target = start + v;
      const list = [];
      let bounced = false;
      if (target > 100) {
        bounced = true;
        for (let s = start + 1; s <= 100; s++) list.push(s);
        target = 200 - target;
        for (let s = 99; s >= target; s--) list.push(s);
      } else for (let s = start + 1; s <= target; s++) list.push(s);
      say(bounced ? `${dot(p)}${p.name} needs exactly ${100 - start}. Too far, bounce back!` : `${dot(p)}${p.name} hops ${v}.`);
      p.mode = 'hop';
      const sn = board.snakeAt.get(list[list.length - 1]);
      await walkSquares(p, sn ? list.slice(0, -1) : list);
      if (!alive) return;
      if (sn) return slide(p, sn);
      p.mode = 'idle';
      p.faceYaw = null;
      const l = board.ladderAt.get(p.sq);
      if (l) {
        await clock.sleep(0.25);
        await climb(p, l);
      }
    }

    // ---------------------------------------------------------------- die
    function showDieFor(p) {
      dieHome = p;
      die.state = 'idle';
      die.setColor(p.color);
      die.spin.quaternion.setFromEuler(new THREE.Euler(0.5, Math.random() * 6, 0.3));
      dieShow = 0;
      sound.ui('pop');
    }
    function hideDie() {
      if (!dieHome && die.state !== 'done') return;
      const s0 = die.root.scale.x;
      dieHome = null;
      clock.tween(0.25, (k) => die.root.scale.setScalar(Math.max(0.001, s0 * (1 - k))));
    }

    async function roll(p) {
      phase = 'busy';
      K.hotButton('action', false);
      p.rolls++;
      say(`${dot(p)}${p.name} rolls the die...`);
      // Jump and bonk the die from below
      p.mode = 'hop';
      let hit = false;
      const base = p.pos.clone();
      await clock.tween(0.44, (k) => {
        p.air = Math.sin(k * Math.PI) * 0.62;
        p.punch = Math.sin(Math.min(1, k * 1.6) * Math.PI);
        if (!hit && k > 0.42) {
          hit = true;
          K.sfx.bonk(sound);
          dieHome = null;
          die.root.scale.setScalar(1);
          fx.burst(die.root.position, ['#fff3c4', '#ffffff', p.color], 16);
          // Land in front of the kid, toward the middle when near an edge
          const tries = [[0, 1.3], [0.95, 0.95], [-0.95, 0.95], [1.3, 0], [-1.3, 0], [0, -1.3]];
          let tgt = null;
          for (const [dx, dz] of tries) {
            const x = base.x + dx;
            const z = base.z + dz;
            if (x > BOUNDS.x0 + 0.7 && x < BOUNDS.x1 - 0.7 && z > BOUNDS.z0 + 0.7 && z < BOUNDS.z1 - 0.7) {
              tgt = [x, z];
              break;
            }
          }
          tgt = tgt || [base.x * 0.8, base.z * 0.8];
          const tFly = 0.75;
          const w = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(11 + Math.random() * 6);
          die.throw(new THREE.Vector3((tgt[0] - die.root.position.x) / tFly, 3.4, (tgt[1] - die.root.position.z) / tFly), w);
        }
      });
      p.air = 0;
      p.punch = 0;
      p.kid.squash = 0.8;
      p.mode = 'idle';
      await new Promise((r) => (dieWait = r));
      const v = die.value;
      sound.ui('pop');
      floats.show(String(v), p.color, die.root.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 1.6, 'num');
      say(`${dot(p)}${p.name} rolled ${v}`);
      await clock.sleep(0.45);
      return v;
    }

    let rollReq = null;
    async function turnLoop() {
      while (alive && phase !== 'over') {
        const p = P[turn];
        showDieFor(p);
        showScore();
        if (isCpu(p)) {
          phase = 'busy';
          say(`${dot(p)}${p.name} is rolling...`);
          await clock.sleep(0.65);
        } else {
          phase = 'await';
          say(`${dot(p)}${p.name}'s turn. ${touch() ? 'Tap the die or press Roll' : 'Click the die or press E'}`);
          if (dbg.auto) await clock.sleep(0.3);
          else await new Promise((r) => (rollReq = r));
          rollReq = null;
        }
        if (!alive) return;
        const v = await roll(p);
        if (!alive) return;
        await move(p, v);
        if (!alive) return;
        if (p.sq === 100) return win(p);
        turn = 1 - turn;
        await clock.sleep(0.35);
      }
    }

    async function win(p) {
      phase = 'over';
      showScore();
      hideDie();
      hud.hint('');
      const o = other(p);
      say(`${dot(p)}${p.name} reached square 100!`);
      ctx.hud.message(`${p.name} wins!`, 1600);
      fx.burst(p.pos.clone().add(new THREE.Vector3(0, 1.6, 0)), [p.color, '#ffd166', '#ffffff', '#ff9eb5', '#7fd3a7'], 90);
      K.sfx.cheer(sound, 0.06, 1.6);
      p.kid.emote('cheer');
      p.faceYaw = 0;
      // The other kid hops all the way over to celebrate
      const to = p.pos.clone().add(new THREE.Vector3(p.pos.x > 0 ? -0.8 : 0.8, 0, 0.12));
      const from = o.pos.clone();
      const hops = Math.max(1, Math.round(from.distanceTo(to) / 1.05));
      o.mode = 'party';
      o.kid.cancelEmote();
      o.faceYaw = Math.atan2(to.x - from.x, to.z - from.z);
      await clock.tween(hops * 0.27, (k) => {
        o.pos.lerpVectors(from, to, k);
        o.air = Math.abs(Math.sin(k * hops * Math.PI)) * 0.38;
        o.speed = 4;
      });
      if (!alive) return;
      o.air = 0;
      o.speed = 0;
      o.kid.squash = 0.8;
      o.faceYaw = Math.atan2(p.pos.x - o.pos.x, p.pos.z - o.pos.z) * 0.6;
      o.kid.emote(o.id === 'homama' || p.id === 'homama' ? 'heart' : 'cheer');
      await clock.sleep(1.2);
      if (!alive) return;
      p.kid.emote('dance');
      await clock.sleep(1.0);
      if (!alive) return;
      let bestText = '';
      if (p.i === 0) {
        const prev = ctx.load('best', null);
        if (prev == null || p.rolls < prev) {
          ctx.save('best', p.rolls);
          bestText = prev == null ? ' Your first win!' : ' New best!';
        } else bestText = ` Best: ${prev} rolls.`;
      }
      ctx.finish({
        win: mode === 'duo' ? true : p.i === 0,
        title: `${p.name} wins!`,
        text: `${p.name} reached 100 in ${p.rolls} ${p.rolls === 1 ? 'roll' : 'rolls'}, ${o.name} was on ${o.sq}.${bestText}`,
      });
    }

    // ---------------------------------------------------------------- intro
    async function intro() {
      say('');
      const pick = await hud.choose({
        title: 'Snakes and Ladders',
        text: `Race ${looks[ids[1]].name} to square 100. Ladders take you up, snakes slide you down.`,
        options: [
          { id: 'cpu', label: `Play with ${looks[ids[1]].name}`, sub: 'The computer rolls for them' },
          { id: 'duo', label: 'Two players', sub: 'Take turns on this device' },
        ],
      });
      if (!alive) return;
      mode = pick || mode;
      ctx.save('mode', mode);
      const games = ctx.load('games', 0);
      ctx.save('games', games + 1);
      turn = games % 2;
      camMode = 'follow';
      phase = 'busy';
      hud.message(`${P[turn].name} goes first`, 1300);
      await clock.sleep(1.1);
      turnLoop();
    }

    // ---------------------------------------------------------------- camera
    let camMode = 'overview';
    const camPos = new THREE.Vector3(0, 19, 16);
    const camLook = new THREE.Vector3(0, 0, -0.5);
    const focus = new THREE.Vector3();
    function updateCamera(dt, t) {
      const want = new THREE.Vector3();
      const look = new THREE.Vector3();
      const tanV = Math.tan((camera.fov * Math.PI) / 360);
      if (camMode === 'overview') {
        // Fit the whole board in view
        const fitW = 14.5 / 2 / (tanV * camera.aspect);
        const fitH = 12.5 / 2 / tanV;
        const d = Math.max(fitW, fitH) * 1.04;
        look.set(Math.sin(t * 0.15) * 0.4, 0, 0.7);
        want.copy(look).add(new THREE.Vector3(0, 0.78, 0.62).normalize().multiplyScalar(d));
      } else {
        const p = P[turn];
        focus.copy(p.pos);
        focus.y = Math.max(Y, p.pos.y) + p.air * 0.5;
        if (die.state === 'fly' || die.state === 'snap' || (die.state === 'done' && dieHome === null && phase === 'busy' && die.root.scale.x > 0.5)) focus.lerp(die.root.position, 0.35);
        if (phase === 'over') focus.copy(p.pos);
        // Stay over the board near the edges, so less empty lawn shows
        focus.x = clamp(focus.x, -3.1, 3.1);
        focus.z = clamp(focus.z, -3.8, 3.3);
        const zoom = phase === 'over' ? 0.72 : 1;
        // Phones are short and wide: come in a little closer so the kids stay big
        const back = camera.aspect > 1.9 ? 0.88 : 1;
        look.copy(focus).add(new THREE.Vector3(0, 0.75, -0.6));
        want.copy(look).add(new THREE.Vector3(0, 6.0, 6.6).multiplyScalar(zoom * back));
      }
      const r = camMode === 'overview' ? 3 : 2.6;
      camPos.lerp(want, 1 - Math.exp(-r * dt));
      camLook.lerp(look, 1 - Math.exp(-(r + 0.8) * dt));
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      env.follow(camLook);
    }

    // ---------------------------------------------------------------- frame
    const tmp = new THREE.Vector3();
    function stepKids(dt, t) {
      for (const p of P) {
        const k = p.kid;
        if (p.mode === 'idle') {
          restPos(p, p.sq, tmp);
          p.pos.x = damp(p.pos.x, tmp.x, 8, dt);
          p.pos.z = damp(p.pos.z, tmp.z, 8, dt);
          p.pos.y = damp(p.pos.y, tmp.y, 8, dt);
        }
        const want = p.faceYaw ?? (phase === 'over' ? 0 : turn === p.i ? 0 : Math.atan2(P[turn].pos.x - p.pos.x, P[turn].pos.z - p.pos.z + 2.5) * 0.6);
        p.yaw = dampAngle(p.yaw, want, p.mode === 'slide' ? 7 : 10, dt);
        k.root.position.set(p.pos.x, p.pos.y + p.air, p.pos.z);
        k.root.rotation.set(p.pitch, p.yaw, 0);
        const n = Math.max(1, Math.ceil(dt / 0.04));
        for (let i = 0; i < n; i++) k.update(dt / n, t, p.speed, p.air, 0);
        if (p.mode === 'climb') {
          const s = Math.sin(p.climbPh);
          const [lL, lR] = k.legs;
          const [aL, aR] = k.arms;
          lL.rotation.set(-0.45 - Math.max(0, s) * 0.7, 0, 0.05);
          lR.rotation.set(-0.45 - Math.max(0, -s) * 0.7, 0, -0.05);
          aL.rotation.set(-2.55 + s * 0.35, 0, -0.12);
          aR.rotation.set(-2.55 - s * 0.35, 0, 0.12);
          k.body.rotation.x = 0.12;
          k.body.position.y = Math.abs(s) * 0.03;
        }
        if (p.punch > 0) {
          const a = k.arms[1];
          a.rotation.set(-0.2 * p.punch, 0, -0.18 - 2.7 * p.punch);
        }
      }
      // Ring under the player whose turn it is
      const a = P[turn];
      ring.position.set(a.pos.x, Y + 0.012, a.pos.z);
      ringMat.color.set(a.color);
      const on = phase === 'await' || (phase === 'busy' && a.mode === 'idle' && dieHome === a);
      ringMat.opacity = damp(ringMat.opacity, on ? 0.6 + Math.sin(t * 5) * 0.25 : 0, 8, dt);
      ring.scale.setScalar(1 + Math.sin(t * 5) * 0.06);
    }

    function stepDie(dt, t) {
      if (dieHome) {
        dieShow = Math.min(1, dieShow + dt * 3);
        const hp = dieHome.pos;
        const target = tmp.set(hp.x, Math.max(Y, hp.y) + 2.35 + Math.sin(t * 2.6) * 0.07, hp.z);
        if (dieShow < 1 && die.root.position.distanceTo(target) > 3) die.root.position.copy(target);
        die.root.position.lerp(target, 1 - Math.exp(-10 * dt));
        const waiting = phase === 'await';
        die.root.scale.setScalar(Math.max(0.001, easeOutBack(dieShow) * (waiting ? 1 + Math.sin(t * 6) * 0.05 : 1)));
        die.spin.rotateOnWorldAxis(UP, dt * (waiting ? 1.3 : 0.7));
      } else if (die.state === 'fly' || die.state === 'snap') {
        die.step(dt, Y, BOUNDS, dbg.next.length ? dbg.next[0] : null);
        if (die.state === 'done') {
          if (dbg.next.length) dbg.next.shift();
          dieWait?.();
          dieWait = null;
        }
      }
    }

    function handleInput() {
      if (phase !== 'await') return;
      const p = P[turn];
      if (isCpu(p) || !rollReq) return;
      let go = input.pressed('action') || input.pressed('jump');
      if (!go && input.taps().length) {
        const hits = input.pick([die.hit, p.kid.root]);
        go = hits.length > 0;
      }
      if (go) {
        sound.ui('tap');
        rollReq();
      }
      K.hotButton('action', true);
    }

    intro();

    return {
      update(rdt, t) {
        const dt = rdt * clamp(dbg.fast, 1, 40);
        handleInput();
        clock.update(dt);
        stepDie(dt, t);
        stepKids(dt, t);
        board.update(dt, t);
        updateCamera(rdt * Math.min(4, dbg.fast), t);
        floats.update(rdt, camera);
      },
      dispose() {
        alive = false;
        clock.clear();
        ui.remove();
        hud.hint('');
        if (window.__snakes === dbg) delete window.__snakes;
      },
    };
  },
};
