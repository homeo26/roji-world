import * as THREE from 'three';
import { damp, clamp, lerp, easeOutBack } from '../util.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, playerColors, roomColors, scheduler, frame, boardUi, markSvg, chooseMode, closeChoices, glow, sounds, esc, PURPLE } from './board/kit.js';
import { buildRoom } from './board/room.js';
import { Player } from './board/players.js';
import { SIGNS, SIGN_NAMES, BEATS, VERBS, handSet, handGeo, resetHands } from './board/hands.js';
import { together, seal, salt } from './board/online.js';

// Rock Paper Scissors: Roji and Homama face each other on the rug in the Game Night room, shake
// their fists for "rock, paper, scissors, go!" and show big chunky hands. Best of five.
// In an online room "Play together" plays it for real: both pick at the same time on their own device.
// Each sends a fingerprint of its pick first and the pick itself only once both fingerprints are in, then
// both devices shake and show the two hands together at one shared moment.

const TARGET = 3;
const KX = 0.8;
const BX = 0.95;
const BY = 2.12;
const TOKEN_Z = 1.3;
const TOKEN_Y = 0.42;
const BEAT = 0.46;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default {
  id: 'rps',
  title: 'Rock Paper Scissors',
  tagline: 'Best of five',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    resetHands();
    const env = ctx.env.indoor({ color: '#f4d8c8', warm: 1.0 });
    env.sun.position.set(-3, 8, 7);
    const sc = env.sun.shadow.camera;
    sc.left = sc.bottom = -5;
    sc.right = sc.top = 5;
    env.sun.shadow.mapSize.set(2048, 2048);
    env.sun.shadow.bias = -0.0005;
    env.sun.shadow.normalBias = 0.02;
    sc.updateProjectionMatrix();
    fx.confetti?.geometry?.scale(0.6, 0.6, 0.6);
    const snd = sounds(sound);
    const S = scheduler();
    let disposed = false;
    const dbg = { fast: 1 };
    window.__board = dbg;

    const meId = ctx.me;
    const paId = ctx.partner;
    const duo = together(ctx);
    const [colMe, colPa] = duo.can ? roomColors(ctx) : playerColors(looks[meId].top, looks[paId].top);
    const room = buildRoom(ctx, { table: false });
    const gt = room.glowTex;

    // ---------------------------------------------------------------- the two players
    const yawL = Math.PI / 2 - 0.5;
    const mk = (id, s) => new Player(ctx, id, { seat: { x: s * KX, y: 0, z: 0, yaw: s < 0 ? yawL : -yawL }, stand: { x: s * KX, z: 0, yaw: s < 0 ? yawL : -yawL }, sitting: false, keepHands: true });
    const P = { me: mk(meId, -1), pa: mk(paId, 1) };
    const color = { me: colMe, pa: colPa };
    const side = { me: -1, pa: 1 };
    for (const k of ['me', 'pa']) {
      const pl = P[k];
      pl.kid.root.position.set(side[k] * KX, 0, 0);
      pl.kid.root.rotation.y = side[k] < 0 ? yawL : -yawL;
      pl.hands[pl.near].visible = false;
      const hs = handSet(pl.look.skin);
      hs.group.position.set(0, -0.255, 0);
      hs.group.scale.setScalar(1.75);
      pl.kid.arms[pl.near].add(hs.group);
      pl.hs = hs;
      pl.arm = { mode: 'ready', x: -1.2, t: 0 };
      pl.armOverride = (kid, t, dt, A, O) => {
        const a = pl.arm;
        if (a.mode === 'free') {
          a.x = A.rotation.x;
          return;
        }
        a.t += dt;
        let tx = -1.25 + Math.sin(t * 2.2 + side[k]) * 0.05;
        let bob = 0;
        if (a.mode === 'pump') {
          const ph = (a.t % BEAT) / BEAT;
          const up = Math.sin(ph * Math.PI);
          tx = -1.15 - up * 1.15;
          bob = up * 0.05;
        } else if (a.mode === 'show') tx = -1.5;
        a.x = damp(a.x, tx, a.mode === 'pump' ? 30 : 16, dt);
        A.rotation.set(a.x, 0, pl.inward * 0.06);
        O.rotation.set(0.15, 0, -pl.inward * 0.35);
        kid.body.position.y += bob;
      };
    }

    // Score stars above each head and the big reveal bubbles
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const r = i % 2 ? 0.032 : 0.075;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.025, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
    starGeo.translate(0, 0, -0.0125);
    const stars = { me: [], pa: [] };
    const bubbles = {};
    const bubbleDisc = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 36).rotateX(Math.PI / 2);
    const bubbleRim = new THREE.TorusGeometry(0.3, 0.03, 10, 40);
    const tailGeo = new THREE.ConeGeometry(0.09, 0.18, 12).rotateZ(Math.PI);
    for (const k of ['me', 'pa']) {
      for (let i = 0; i < TARGET; i++) {
        const m = mesh(starGeo, umat('#d9ccf5', { rough: 0.5 }), { cast: false });
        m.userData.on = 0;
        scene.add(m);
        stars[k].push(m);
      }
      const g = new THREE.Group();
      const disc = mesh(bubbleDisc, mat('#fffaf4', { rough: 0.5 }), { cast: false });
      const rimMat = umat(color[k], { rough: 0.4, emissive: color[k], ei: 0.15 });
      const rim = mesh(bubbleRim, rimMat, { cast: false });
      const tail = mesh(tailGeo, mat('#fffaf4', { rough: 0.5 }), { cast: false });
      tail.position.set(-side[k] * 0.12, -0.32, -0.01);
      tail.rotation.z = side[k] * 0.5;
      const halo = glow(gt, '#fff3a0', 1.2, 0);
      halo.position.z = -0.06;
      const hand = new THREE.Group();
      const sign = {};
      for (const s of SIGNS) {
        sign[s] = mesh(handGeo(s), mat(P[k].look.skin, { rough: 0.6 }), { cast: false });
        sign[s].visible = false;
        hand.add(sign[s]);
      }
      // fingers point at the other player, palm toward the camera
      const m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, side[k] < 0 ? -1 : 1), new THREE.Vector3(side[k] < 0 ? -1 : 1, 0, 0), new THREE.Vector3(0, 1, 0));
      hand.quaternion.setFromRotationMatrix(m4);
      hand.position.set(side[k] * 0.2, -0.01, 0.07);
      hand.scale.setScalar(2.6);
      g.add(halo, disc, rim, tail, hand);
      g.visible = false;
      scene.add(g);
      bubbles[k] = { g, sign, rimMat, halo, k: 0, on: false, glow: 0, dim: 0 };
    }

    // ---------------------------------------------------------------- pick tokens
    const tokens = SIGNS.map((s, i) => {
      const g = new THREE.Group();
      const wood = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 36).rotateX(Math.PI / 2), mat('#e4b47e', { rough: 0.6 }), { cast: false });
      const face = mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.02, 36).rotateX(Math.PI / 2), mat('#fffaf4', { rough: 0.5 }), { cast: false });
      face.position.z = 0.035;
      const ringMat = umat('#ffffff', { rough: 0.4, emissive: '#ffffff', ei: 0.5 });
      const ring = mesh(new THREE.TorusGeometry(0.235, 0.024, 10, 40), ringMat, { cast: false });
      ring.visible = false;
      const hand = mesh(handGeo(s), mat('#f8dccb', { rough: 0.6 }), { cast: false });
      hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0)));
      hand.position.set(0, -0.12, 0.06);
      hand.scale.setScalar(1.6);
      const labelTex = canvasTexture(256, 72, (c, w, h) => {
        c.fillStyle = '#fffaf4';
        roundRect(c, 4, 4, w - 8, h - 8, 30);
        c.fill();
        c.fillStyle = '#3b2b3f';
        c.font = `700 44px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(SIGN_NAMES[s], w / 2, h / 2 + 2);
      });
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.1), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }));
      label.position.set(0, -0.29, 0.03);
      g.add(wood, face, ring, hand, label);
      g.position.set((i - 1) * 0.58, TOKEN_Y, TOKEN_Z);
      g.rotation.x = -0.18;
      g.userData.sign = s;
      g.traverse((o) => (o.userData.sign = s));
      scene.add(g);
      return { g, ring, ringMat, hand, s, k: 0, lift: 0 };
    });

    // ---------------------------------------------------------------- HUD and state
    const ui = boardUi();
    const tally = ctx.load('tally', { me: 0, partner: 0 });
    const st = { phase: 'choose', mode: 'cpu', picker: 'me', choice: { me: null, pa: null }, score: { me: 0, pa: 0 }, round: 0, focus: 0, lock: 0, showTokens: 0, throwN: 0 };
    const name = { me: looks[meId].name, pa: looks[paId].name };
    const showScore = () => {
      hud.score(`<span style="color:${colMe}">${name.me}</span> ${st.score.me} - ${st.score.pa} <span style="color:${colPa}">${name.pa}</span>`);
      room.chalk('Best of five', [[name.me, st.score.me, '#ffc2cf'], [name.pa, st.score.pa, '#b9d4ff'], ['First to', TARGET, '#fff3c4']]);
    };
    showScore();
    hud.buttons({ action: null, jump: null, stick: false });
    hud.hint('Click a hand, or press 1 2 3 (R P S). Arrows and E work too');
    dbg.state = () => ({ phase: st.phase, picker: st.picker, mode: st.mode, score: `${st.score.me}-${st.score.pa}`, round: st.round, throwN: st.throwN, picks: `${st.choice.me || '-'}:${st.choice.pa || '-'}`, kids: `${meId}:${st.score.me},${paId}:${st.score.pa}` });
    dbg.pick = (s) => {
      if (st.phase === 'pick') onPick(s);
    };

    function startRound() {
      st.round++;
      st.throwN++;
      st.choice = { me: null, pa: null };
      st.picker = 'me';
      st.phase = 'pick';
      st.focus = 0;
      st.lock = 0.3;
      for (const k of ['me', 'pa']) {
        P[k].arm.mode = 'ready';
        P[k].hs.show('rock');
        bubbles[k].on = false;
        bubbles[k].glow = 0;
        bubbles[k].dim = 0;
      }
      setPickUi();
    }

    function setPickUi() {
      const k = st.picker;
      st.showTokens = 1;
      for (const t of tokens) {
        t.ringMat.color.set(color[k]);
        t.ringMat.emissive.set(color[k]);
        t.hand.material = mat(P[k].look.skin, { rough: 0.6 });
      }
      if (st.mode === 'cpu') ui.turn(markSvg.face(color.me), color.me, st.round === 1 ? `Pick your hand, ${name.me}` : `Round ${st.round}: pick your hand`);
      else if (st.mode === 'online') {
        // They pick at the same time on their device
        const done = !!net.commit[st.throwN];
        ui.turn(markSvg.face(color.me), color.me, done ? `${name.pa} has picked. Pick your hand!` : st.round === 1 ? `Pick your hand, ${name.me}` : `Round ${st.round}: pick your hand`);
        P.pa.arm.mode = 'ready';
        P.pa.think(!done);
      } else {
        ui.turn(markSvg.face(color[k]), color[k], `${name[k]}, pick in secret`);
        const o = k === 'me' ? 'pa' : 'me';
        P[o].arm.mode = 'free';
        P[o].covering = true;
        P[k].covering = false;
        P[k].arm.mode = 'ready';
      }
      P[k].think(false);
      P[k].gesture('nod');
    }

    async function onPick(s) {
      if (st.phase !== 'pick' || !SIGNS.includes(s) || st.lock > 0) return;
      sound.ui('tap');
      const k = st.picker;
      st.choice[k] = s;
      const tok = tokens.find((t) => t.s === s);
      tok.lift = 1;
      if (st.mode === 'online') {
        st.phase = 'wait';
        st.showTokens = 0;
        const n = st.throwN;
        net.salt[n] = salt();
        duo.send('commit', { r: n, h: seal(`${s}:${net.salt[n]}`) });
        if (!net.commit[n]) ui.turn(markSvg.face(color.pa), color.pa, `Waiting for ${name.pa} to pick`, true);
        else ui.hideTurn();
        reveal();
        return;
      }
      if (st.mode === 'cpu') {
        st.choice.pa = pick(SIGNS);
        shoot();
        return;
      }
      if (k === 'me') {
        st.phase = 'pass';
        st.showTokens = 0;
        ui.hideTurn();
        await S.wait(0.35);
        if (disposed) return;
        await hud.choose({ title: `Pass to ${name.pa}`, text: `${esc(name.me)} has picked. ${esc(name.pa)}, pick in secret. ${esc(name.me)}, no peeking!`, options: [{ id: 'ok', label: `I'm ${name.pa}, ready` }] });
        if (disposed) return;
        st.picker = 'pa';
        st.phase = 'pick';
        st.lock = 0.35;
        setPickUi();
      } else shoot();
    }

    async function shoot() {
      st.phase = 'shoot';
      dbg.shootAt = duo.now();
      st.showTokens = 0;
      ui.hideTurn();
      for (const k of ['me', 'pa']) {
        P[k].covering = false;
        P[k].arm.mode = 'pump';
        P[k].arm.t = 0;
      }
      const words = ['Rock', 'Paper', 'Scissors'];
      for (let i = 0; i < 3; i++) {
        await S.wait(i === 0 ? BEAT : BEAT);
        if (disposed) return;
        ui.word(words[i], '#fff', BEAT * 1000 * 1.6);
        snd.tok(0.9 + i * 0.12);
        sound.ui('tick');
      }
      await S.wait(BEAT);
      if (disposed) return;
      ui.word('Go!', '#ffd166', 900);
      snd.whoosh();
      for (const k of ['me', 'pa']) {
        P[k].arm.mode = 'show';
        P[k].hs.show(st.choice[k]);
        const b = bubbles[k];
        for (const s of SIGNS) b.sign[s].visible = s === st.choice[k];
        b.on = true;
        b.k = 0;
        P[k].kid.squash = 1.15;
      }
      await S.wait(0.75);
      if (disposed) return;
      resolve();
    }

    async function resolve() {
      const a = st.choice.me;
      const b = st.choice.pa;
      if (a === b) {
        st.phase = 'tie';
        ui.turn(markSvg.face(PURPLE), PURPLE, `Both picked ${SIGN_NAMES[a].toLowerCase()}. Go again!`);
        snd.giggle();
        for (const k of ['me', 'pa']) P[k].gesture('nod');
        await S.wait(1.6);
        if (disposed) return;
        st.round--;
        return startRound();
      }
      const w = BEATS[a] === b ? 'me' : 'pa';
      const l = w === 'me' ? 'pa' : 'me';
      st.phase = 'won';
      st.score[w]++;
      showScore();
      stars[w][st.score[w] - 1].userData.on = 1;
      bubbles[w].glow = 1;
      bubbles[l].dim = 1;
      ui.turn(markSvg.face(color[w]), color[w], `${name[w]} wins the round`);
      ui.say(`${VERBS[st.choice[w]]}!`, 2000);
      sound.ui(st.mode !== 'duo' && w === 'pa' ? 'bad' : 'good');
      snd.sparkle();
      P[w].arm.mode = 'free';
      P[w].kid.emote('cheer');
      if (P[l].id === 'homama') {
        P[l].arm.mode = 'free';
        P[l].kid.emote('heart');
      } else P[l].gesture('sad');
      const over = st.score[w] >= TARGET;
      if (!over) {
        await S.wait(2.2);
        if (disposed) return;
        return startRound();
      }
      st.phase = 'over';
      duo.end();
      hud.hint('');
      if (w === 'me') tally.me++;
      else tally.partner++;
      ctx.save('tally', tally);
      await S.wait(1.1);
      if (disposed) return;
      fx.burst(new THREE.Vector3(P[w].kid.root.position.x, 1.8, 0.2), [color[w], '#ffd166', '#ffffff', '#ff9eb5'], 100);
      const champ = duo.winner(name[w], w === 'pa');
      ui.turn(markSvg.face(color[w]), color[w], `${champ} wins the match!`);
      P[w].kid.emote('dance');
      P[l].arm.mode = 'free';
      P[l].kid.emote(P[l].id === 'homama' ? 'heart' : 'bow');
      await S.wait(2.4);
      if (disposed) return;
      st.phase = 'done';
      ctx.finish({
        win: st.mode === 'duo' ? true : w === 'me',
        title: `${champ} wins!`,
        text: `${champ} beat ${name[l]} ${st.score[w]} - ${st.score[l]}. Matches so far: ${name.me} ${tally.me}, ${name.pa} ${tally.partner}.`,
      });
    }

    // ---------------------------------------------------------------- played together
    // Per throw n: their fingerprint, their pick with its salt, our salt and when each side showed its pick
    const net = { commit: {}, reveal: {}, salt: {}, sent: {}, shot: {} };
    duo.on('commit', (d) => {
      if (!Number.isInteger(d?.r) || typeof d.h !== 'string' || net.commit[d.r]) return;
      net.commit[d.r] = d.h;
      if (d.r !== st.throwN || st.mode !== 'online') return;
      P.pa.think(false);
      P.pa.gesture('nod');
      if (st.phase === 'pick') ui.turn(markSvg.face(color.me), color.me, `${name.pa} has picked. Pick your hand!`);
      else if (st.phase === 'wait') ui.hideTurn();
      reveal();
    });
    duo.on('reveal', (d) => {
      if (!Number.isInteger(d?.r) || net.reveal[d.r]) return;
      net.reveal[d.r] = d;
      go();
    });
    // Both fingerprints are in: show ours
    function reveal() {
      const n = st.throwN;
      if (st.mode !== 'online' || st.phase !== 'wait' || !net.commit[n] || net.sent[n]) return;
      net.sent[n] = duo.now();
      duo.send('reveal', { r: n, s: st.choice.me, k: net.salt[n], t: net.sent[n] });
      go();
    }
    // Both picks are in: check theirs against its fingerprint, then shake together at one shared moment
    async function go() {
      const n = st.throwN;
      const d = net.reveal[n];
      if (st.mode !== 'online' || st.phase !== 'wait' || !net.sent[n] || !d || net.shot[n]) return;
      net.shot[n] = true;
      const fair = SIGNS.includes(d.s) && typeof d.k === 'string' && seal(`${d.s}:${d.k}`) === net.commit[n];
      if (!fair) console.warn('Rock Paper Scissors: the pick does not match its fingerprint', d);
      st.choice.pa = SIGNS.includes(d.s) ? d.s : pick(SIGNS);
      const at = Math.max(net.sent[n], Number.isFinite(d.t) ? d.t : 0) + 900;
      await new Promise((r) => setTimeout(r, clamp(at - duo.now(), 0, 1500)));
      if (disposed || st.phase !== 'wait') return;
      shoot();
    }
    duo.onGone(() => {
      if (st.mode !== 'online' || st.phase === 'over' || st.phase === 'done') return;
      st.mode = 'cpu';
      P.pa.think(false);
      ui.say(`${name.pa} left, so the computer plays for ${duo.him}`, 3600);
      if (st.phase === 'wait') {
        st.choice.pa ||= pick(SIGNS); // their pick if it came before they left
        shoot();
      }
    });

    (async () => {
      let mode = await chooseMode(ctx, { title: 'Rock Paper Scissors', text: 'Best of five: the first to win three rounds takes the match.' }, duo);
      if (disposed) return;
      if (!mode) return ctx.end({ quit: true });
      if (mode === 'online') {
        ui.turn(markSvg.face(PURPLE), PURPLE, `Waiting for ${name.pa}`, true);
        P.pa.think(true);
        const r = await duo.link('online');
        if (disposed) return;
        P.pa.think(false);
        ui.hideTurn();
        if (!r.ok) {
          mode = 'cpu';
          ui.say(duo.why(r), 3600);
        }
      } else duo.link(mode);
      st.mode = mode;
      for (const k of ['me', 'pa']) {
        P[k].arm.mode = 'free';
        P[k].kid.emote('wave');
      }
      await S.wait(1.2);
      if (disposed) return;
      startRound();
    })();

    // ---------------------------------------------------------------- camera
    const look = new THREE.Vector3(0, 1.1, 0);
    const camDir = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    const camTgt = new THREE.Vector3();
    let camKey = '';
    let camGoal = null;
    const touch = () => document.body.classList.contains('touch');
    const tokenScale = () => (touch() ? 1.22 : 1);
    const tokenY = () => TOKEN_Y + (tokenScale() - 1) * 0.36;
    const fitPts = (mode) => {
      const ts = tokenScale();
      const kids = [-1, 1].flatMap((s) => [new THREE.Vector3(s * (KX + 0.35), 0, 0), new THREE.Vector3(s * (KX + 0.3), 1.78, 0)]);
      if (mode === 'show') return [...kids, ...[-1, 1].map((s) => new THREE.Vector3(s * (BX + 0.34), BY + 0.36, 0))];
      return [...kids, ...[-1, 1].flatMap((s) => [new THREE.Vector3(s * 0.84 * ts, tokenY() - 0.37 * ts, TOKEN_Z), new THREE.Vector3(s * 0.84 * ts, tokenY() + 0.26 * ts, TOKEN_Z)])];
    };
    const camMode = () => (['choose', 'pick', 'pass'].includes(st.phase) ? 'pick' : 'show');
    function placeCamera(dt, first) {
      if (camera.fov !== 32) {
        camera.fov = 32;
        camera.updateProjectionMatrix();
      }
      const mode = camMode();
      const key = `${camera.aspect.toFixed(3)}|${window.innerHeight}|${mode}`;
      if (key !== camKey) {
        camKey = key;
        const el = THREE.MathUtils.degToRad(13);
        camDir.set(0, Math.sin(el), Math.cos(el));
        const top = touch() ? 0.1 : clamp(64 / window.innerHeight, 0.08, 0.17);
        camGoal = frame(camera, look, camDir, fitPts(mode), { top, bottom: touch() ? 0.13 : 0.07, side: 0.04 });
      }
      if (first) {
        camPos.copy(camGoal.pos);
        camTgt.copy(camGoal.target);
      }
      camPos.lerp(camGoal.pos, 1 - Math.exp(-3 * dt));
      camTgt.lerp(camGoal.target, 1 - Math.exp(-3 * dt));
      camera.position.copy(camPos);
      camera.lookAt(camTgt);
    }
    placeCamera(0, true);

    // ---------------------------------------------------------------- frame
    let lastPointer = '';
    const tokenObjs = tokens.map((t) => t.g);
    function update(rawDt, t) {
      const dt = rawDt * dbg.fast;
      S.update(dt);
      st.lock = Math.max(0, st.lock - dt);
      if (st.mode === 'online') duo.tick();

      if (st.phase === 'pick' && st.lock <= 0) {
        const k = (n) => input.pressed(n);
        if (k('arrowleft') || k('a')) (st.focus = Math.max(0, st.focus - 1)), sound.ui('tick');
        if (k('arrowright') || k('d')) (st.focus = Math.min(2, st.focus + 1)), sound.ui('tick');
        const direct = k('1') || k('r') ? 'rock' : k('2') || k('p') ? 'paper' : k('3') || k('s') ? 'scissors' : null;
        if (direct) onPick(direct);
        else if (k('action') || k('jump')) onPick(SIGNS[st.focus]);
        const ptr = input.pointer;
        const pk = `${ptr.x}|${ptr.y}`;
        if (st.phase === 'pick' && pk !== lastPointer && !document.body.classList.contains('touch')) {
          lastPointer = pk;
          const h = input.pick(tokenObjs, ptr.ndc)[0];
          if (h) st.focus = SIGNS.indexOf(h.object.userData.sign);
        }
        for (const tap of input.taps()) {
          if (st.phase !== 'pick') break;
          const h = input.pick(tokenObjs, tap.ndc)[0];
          if (h) onPick(h.object.userData.sign);
        }
      }

      // Tokens rise in for picking and sink away for the shake
      tokens.forEach((tk, i) => {
        tk.k = damp(tk.k, st.showTokens, 9, dt);
        tk.lift = Math.max(0, tk.lift - dt * 2);
        const focus = st.phase === 'pick' && st.focus === i && st.lock <= 0;
        const hover = focus ? 1 : 0;
        tk.g.visible = tk.k > 0.02;
        tk.g.position.y = tokenY() - (1 - tk.k) * 0.6 + hover * 0.05 + Math.sin(t * 2 + i) * 0.012 + tk.lift * 0.1;
        tk.g.scale.setScalar((0.6 + 0.4 * tk.k) * (1 + hover * 0.08) * tokenScale());
        tk.g.position.x = (i - 1) * 0.58 * tokenScale();
        tk.ring.visible = focus;
        tk.ringMat.emissiveIntensity = 0.5 + Math.sin(t * 6) * 0.2;
      });

      // Stars above the heads and reveal bubbles
      for (const k of ['me', 'pa']) {
        const head = P[k].headTop(new THREE.Vector3());
        stars[k].forEach((s, i) => {
          const on = s.userData.on;
          s.userData.k = damp(s.userData.k || 0, on, 6, dt);
          s.position.set(head.x + (i - 1) * 0.2, head.y + 0.13 + Math.sin(t * 3 + i) * 0.01, 0.12);
          s.rotation.y = Math.sin(t * 1.5 + i) * 0.3 + (s.userData.k < 0.99 && on ? (1 - s.userData.k) * 6 : 0);
          s.scale.setScalar(0.9 + s.userData.k * 0.35);
          s.material.color.set(on ? color[k] : '#d9ccf5');
          s.material.emissive.set(on ? color[k] : '#000000');
          s.material.emissiveIntensity = on ? 0.35 : 0;
        });
        const b = bubbles[k];
        b.k = damp(b.k, b.on ? 1 : 0, b.on ? 9 : 12, dt);
        b.g.visible = b.k > 0.02;
        if (b.g.visible) {
          const pop = b.on ? easeOutBack(clamp(b.k, 0, 1)) : b.k;
          b.g.position.set(side[k] * BX, BY + Math.sin(t * 2.5 + side[k]) * 0.02 + b.glow * Math.abs(Math.sin(t * 5)) * 0.05, 0.1);
          b.g.scale.setScalar(pop * (1 + b.glow * 0.12 - b.dim * 0.12));
          b.g.quaternion.copy(camera.quaternion);
          b.halo.material.opacity = b.glow * (0.6 + Math.sin(t * 6) * 0.15);
          b.halo.visible = b.glow > 0.01;
          b.rimMat.emissiveIntensity = 0.15 + b.glow * (0.5 + Math.sin(t * 6) * 0.2);
          b.rimMat.color.set(b.dim ? '#cfc4cc' : color[k]);
        }
      }

      for (const k of ['me', 'pa']) {
        const pl = P[k];
        if (pl.arm.mode === 'free' && !pl.covering && !pl.kid.emoteType && st.phase !== 'done') pl.arm.mode = st.phase === 'over' ? 'free' : 'ready';
        // Turn toward the camera to celebrate the match
        const yaw = st.phase === 'over' || st.phase === 'done' ? side[k] * -0.45 : side[k] < 0 ? yawL : -yawL;
        pl.kid.root.rotation.y = damp(pl.kid.root.rotation.y, yaw, 4, dt);
        pl.update(dt, t);
      }
      room.update(dt, t);
      placeCamera(dt, false);
    }

    return {
      update,
      dispose() {
        disposed = true;
        duo.dispose();
        closeChoices();
        ui.remove();
        if (window.__board === dbg) delete window.__board;
      },
    };
  },
};
