// Memory Match: picture cards on a picnic table in the Play Park. Flip two at a time and find
// every pair. Just me, with the computer partner, or two players taking turns on one device.
// In an online room "Play together" plays it for real on the two devices: the host deals the deck, both
// tables show the same cards, and every flip travels to the other copy.
import * as THREE from 'three';
import { damp, dampAngle, clamp, easeOutBack, easeOutCubic } from '../util.js';
import * as K from './board2/kit.js';
import { buildPark } from './board2/park.js';
import { PICS, CARD_W, CARD_D, CARD_T, cardAtlas, cardGeometry, disposeCards } from './board2/cards.js';
import { together } from './board/online.js';

const GAP = 0.08;
const AI_RECALL = 0.65; // chance the computer remembers a card it saw
const AI_FORGET = 0.1; // chance per turn it forgets each remembered card
const FLIP = 0.42;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const PAIR = {
  heart: 'A pair of Hearts!',
  popcorn: 'A popcorn pair!',
  pony: 'A pair of Ponies!',
  giraffe: 'A pair of Giraffes!',
  cat: 'A pair of Kitties!',
  gift: 'A pair of Gifts!',
  stethoscope: 'A pair of Stethoscopes!',
  laptop: 'A pair of Laptops!',
  ski: 'A pair of Skis!',
  ball: 'A pair of Beach balls!',
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default {
  id: 'memory',
  title: 'Memory Match',
  tagline: 'Find every pair',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    const env = ctx.env.outdoor({ sky: '#a6dde2', fog: [30, 90], shadow: 9 });
    const clock = K.makeClock();
    let alive = true;

    // ---------------------------------------------------------------- layout
    const duo = together(ctx);
    let wide = window.innerWidth / Math.max(1, window.innerHeight) >= 1.45;
    // In a room both tables have the starter's size, so a deck dealt there fits here
    if (duo.can) {
      if (ctx.online.isHost) ctx.online.setting('wide', wide);
      else if (typeof ctx.online.setting('wide') === 'boolean') wide = ctx.online.setting('wide');
    }
    const pairs = wide ? 9 : 8;
    const cols = wide ? 6 : 4;
    const rows = (pairs * 2) / cols;
    const gridW = cols * CARD_W + (cols - 1) * GAP;
    const gridD = rows * CARD_D + (rows - 1) * GAP;
    const tableW = gridW + 0.42;
    const tableD = gridD + 0.38;
    const park = buildPark(ctx, { tableW, tableD });
    const TOP = park.top;
    const slot = (i, out = new THREE.Vector3()) => out.set(((i % cols) - (cols - 1) / 2) * (CARD_W + GAP), TOP + CARD_T / 2 + 0.006, (Math.floor(i / cols) - (rows - 1) / 2) * (CARD_D + GAP));

    // ---------------------------------------------------------------- cards
    const picks = shuffle([...PICS.keys()]).slice(0, pairs);
    const deck = shuffle([...picks, ...picks]);
    const atlas = cardAtlas();
    const cards = deck.map((pic, i) => {
      const m = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.55, emissive: '#ffffff', emissiveMap: atlas, emissiveIntensity: 0 });
      const card = new THREE.Mesh(cardGeometry(pic), m);
      card.castShadow = true;
      card.receiveShadow = true;
      card.userData.i = i;
      const holder = new THREE.Group();
      holder.add(card);
      scene.add(holder);
      const home = slot(i);
      holder.position.set(0, TOP + 0.02 + i * 0.006, 0);
      return { i, pic, holder, card, mat: m, home, state: 'down', flip: 0, anim: null, lift: 0, hover: 0, bounce: 0, glow: 0, dealt: false, shake: 0 };
    });
    const hitList = cards.map((c) => c.card);

    // Soft glow under found pairs (one additive draw call)
    const glowTex = ctx.util.canvasTexture(128, 128, (g) => {
      const r = g.createRadialGradient(64, 64, 10, 64, 64, 64);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(0.5, 'rgba(255,255,255,.55)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    });
    const halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(CARD_W * 1.9, CARD_D * 1.7), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), cards.length);
    halo.renderOrder = 1;
    halo.frustumCulled = false;
    const hm = new THREE.Matrix4();
    const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const black = new THREE.Color(0, 0, 0);
    cards.forEach((c, i) => {
      halo.setMatrixAt(i, hm.compose(c.home.clone().setY(TOP + 0.003), hq, new THREE.Vector3(1, 1, 1)));
      halo.setColorAt(i, black);
    });
    scene.add(halo);

    // Keyboard and hover highlight: a rounded frame under the card
    const frameShape = (w, d, r) => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2 + r, -d / 2);
      s.lineTo(w / 2 - r, -d / 2);
      s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
      s.lineTo(w / 2, d / 2 - r);
      s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
      s.lineTo(-w / 2 + r, d / 2);
      s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
      s.lineTo(-w / 2, -d / 2 + r);
      s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
      return s;
    };
    const fs = frameShape(CARD_W + 0.1, CARD_D + 0.1, 0.09);
    fs.holes.push(frameShape(CARD_W + 0.02, CARD_D + 0.02, 0.06));
    const cursorMat = new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0, depthWrite: false });
    const cursor = new THREE.Mesh(new THREE.ShapeGeometry(fs, 6), cursorMat);
    cursor.rotation.x = -Math.PI / 2;
    cursor.renderOrder = 2;
    scene.add(cursor);
    let cur = Math.floor(cols / 2) - 1 + Math.floor(rows / 2) * cols;
    let cursorOn = false;
    cursor.position.copy(cards[cur].home).setY(TOP + 0.004);

    // ---------------------------------------------------------------- kids
    let mode = ctx.load('mode', 'cpu');
    if (mode === 'online') mode = 'cpu';
    const ids = [ctx.me, ctx.partner];
    const COLORS = K.playerColors(looks, ids);
    const P = ids.map((id, i) => {
      const kid = ctx.makeKid(id);
      kid.onEmoteFx = (type) => type === 'heart' && fx.heartsAt(kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 5);
      K.bakeLiveKid(kid, [kid.mouth]);
      scene.add(kid.root);
      return { i, id, name: looks[id].name, color: COLORS[i], kid, pos: new THREE.Vector3(), yaw: 0, look: null, lean: 0, shake: 0, smile: 0, frown: 0, score: 0, home: new THREE.Vector3(), homeYaw: 0 };
    });
    const ringMat = new THREE.MeshBasicMaterial({ color: COLORS[0], transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 36), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 2;
    scene.add(ring);
    // The kids stand at the two ends of the table, turned toward the cards and the camera
    function placeKids() {
      for (const p of P) {
        const s = p.i ? 1 : -1;
        p.home.set(s * (tableW / 2 + 0.42), 0, -0.2);
        p.homeYaw = -s * 0.85;
      }
      for (const p of P) {
        p.pos.copy(p.home);
        p.yaw = p.homeYaw;
      }
    }
    placeKids();

    // ---------------------------------------------------------------- HUD
    const ui = K.overlay('', '<div class="b2-say"></div>');
    const sayEl = ui.$('.b2-say');
    const floats = K.floaters(ui.el, 4);
    const dot = (p) => `<i style="background:${p.color}"></i>`;
    // A line can be held for a moment (news from the other device), the next one waits for it
    let holdUntil = 0;
    let held = null;
    let holdTimer = 0;
    const say = (html) => {
      if (performance.now() < holdUntil) held = html;
      else sayEl.innerHTML = html;
    };
    const sayHold = (html, ms) => {
      sayEl.innerHTML = html;
      holdUntil = performance.now() + ms;
      held = null;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => held !== null && alive && (sayEl.innerHTML = held), ms);
    };
    hud.buttons({ action: null, jump: null, stick: false });
    let phase = 'intro'; // intro | deal | play | over
    let turn = 0;
    let first = -1;
    let lock = true;
    let moves = 0;
    let found = 0;
    let elapsed = 0;
    let started = false;
    const memory = new Map(); // the computer's memory: card index -> picture
    const bestKey = `best-${pairs * 2}`;
    let best = ctx.load(bestKey, null);
    const isCpuTurn = () => mode === 'cpu' && turn === 1;
    const isRemoteTurn = () => mode === 'online' && turn === 1; // flips on the other device
    let flips = 0; // cards turned so far, both players (played together, every flip carries it)
    const clockT = { first: null, last: null }; // played together: the shared time of the first and last flip
    const u = (p) => (phase === 'play' && mode !== 'solo' && turn === p.i ? 'text-decoration:underline;text-underline-offset:4px;' : '');
    function showScore() {
      if (mode === 'solo') hud.score(`Moves ${moves} &nbsp; ${fmt(elapsed)}`);
      else hud.score(`<span style="color:${P[0].color};${u(P[0])}">${P[0].name}</span> ${P[0].score} : ${P[1].score} <span style="color:${P[1].color};${u(P[1])}">${P[1].name}</span> &nbsp; ${fmt(elapsed)}`);
    }
    const touch = () => document.body.classList.contains('touch');
    function turnText() {
      const p = P[turn];
      if (mode === 'solo') say(`${dot(p)}${found ? `${found} of ${pairs} pairs found` : 'Flip two cards. Same picture? Keep them!'}`);
      else if (isCpuTurn()) say(`${dot(p)}${p.name} is thinking...`);
      else if (isRemoteTurn()) say(`${dot(p)}${p.name}'s turn`);
      else say(`${dot(p)}${p.name}'s turn. ${touch() ? 'Tap two cards' : 'Pick two cards'}`);
    }

    // ---------------------------------------------------------------- flipping
    const isOpen = (i) => cards[i].state !== 'down';
    function animFlip(c, to) {
      c.anim = { from: c.flip, to, t: 0 };
    }
    function reveal(i) {
      const c = cards[i];
      dbg.seen?.set(i, c.pic);
      c.state = 'up';
      animFlip(c, 1);
      K.sfx.flip(sound);
      if (mode === 'cpu' && Math.random() < AI_RECALL) memory.set(i, c.pic);
    }
    function hide(i) {
      const c = cards[i];
      c.state = 'down';
      animFlip(c, 0);
    }
    function lookAt(p, i) {
      if (i < 0) {
        p.look = null;
        p.lean = 0;
        return;
      }
      p.look = cards[i].home;
      p.lean = 1;
    }

    async function flip(i, at = null) {
      if (lock || phase !== 'play' || !cards[i] || isOpen(i)) return;
      if (mode === 'online') {
        const tNow = Number.isFinite(at) ? at : duo.now();
        if (turn === 0) duo.send('flip', { i, n: flips, t: tNow });
        clockT.first ??= tNow;
        clockT.last = tNow;
      }
      flips++;
      started = true;
      const p = P[turn];
      lookAt(p, i);
      reveal(i);
      if (first < 0) {
        first = i;
        return;
      }
      const a = first;
      const b = i;
      first = -1;
      moves++;
      lock = true;
      showScore();
      await clock.sleep(FLIP + 0.2);
      if (!alive) return;
      const ca = cards[a];
      const cb = cards[b];
      if (ca.pic === cb.pic) {
        for (const c of [ca, cb]) {
          c.state = 'done';
          c.bounce = 1;
          c.glow = 1;
          fx.burst(c.home.clone().setY(TOP + 0.3), ['#ffd166', '#ffffff', PICS[c.pic].bg, p.color], 18);
        }
        memory.delete(a);
        memory.delete(b);
        found++;
        p.score++;
        K.sfx.match(sound, found % 3);
        floats.show(PAIR[PICS[ca.pic].id], p.color, ca.home.clone().lerp(cb.home, 0.5).setY(TOP + 0.6), 1.4);
        p.kid.emote('cheer');
        p.smile = 1.2;
        const o = P[1 - p.i];
        if (o.id === 'homama' && p.id === 'roji') setTimeout(() => alive && o.kid.emote('heart'), 300);
        else setTimeout(() => alive && o.kid.emote(mode === 'solo' ? 'cheer' : 'wave'), 300);
        o.smile = 0.8;
        lookAt(p, -1);
        showScore();
        if (found === pairs) {
          await clock.sleep(0.9);
          return end();
        }
        lock = false;
        turnText();
        if (isCpuTurn()) cpuMove();
      } else {
        K.sfx.miss(sound);
        p.shake = 0.7;
        p.frown = 1;
        ca.shake = cb.shake = 0.4;
        await clock.sleep(0.75);
        if (!alive) return;
        hide(a);
        hide(b);
        lookAt(p, -1);
        await clock.sleep(FLIP * 0.6);
        if (!alive) return;
        if (mode !== 'solo') {
          turn = 1 - turn;
          if (mode === 'cpu') for (const k of [...memory.keys()]) if (Math.random() < AI_FORGET) memory.delete(k);
        }
        lock = false;
        showScore();
        turnText();
        if (isCpuTurn()) cpuMove();
      }
    }

    // The computer: uses what it remembers, otherwise guesses. The highlight glides to each pick.
    async function cpuMove() {
      await clock.sleep(0.6);
      if (!alive || !isCpuTurn() || lock || phase !== 'play') return;
      const closed = cards.map((c) => c.i).filter((i) => !isOpen(i));
      if (!closed.length) return;
      const known = [...memory.entries()].filter(([i]) => !isOpen(i));
      let pair = null;
      for (let x = 0; x < known.length && !pair; x++) for (let y = x + 1; y < known.length; y++) if (known[x][1] === known[y][1]) pair = [known[x][0], known[y][0]];
      const unknown = closed.filter((i) => !memory.has(i));
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      let a;
      let b = null;
      if (pair && Math.random() < 0.85) [a, b] = pair;
      else a = pick(unknown.length ? unknown : closed);
      await aim(a);
      if (!alive || phase !== 'play') return;
      flip(a);
      await clock.sleep(0.75);
      if (!alive || phase !== 'play') return;
      if (b == null) {
        const mate = [...memory.entries()].find(([i, pc]) => i !== a && pc === cards[a].pic && !isOpen(i));
        if (mate && Math.random() < 0.8) b = mate[0];
        else {
          const rest = cards.map((c) => c.i).filter((i) => !isOpen(i));
          const fresh = rest.filter((i) => !memory.has(i));
          b = pick(fresh.length ? fresh : rest);
        }
      }
      if (b == null) return;
      await aim(b);
      if (alive && phase === 'play') flip(b);
    }
    async function aim(i) {
      cur = i;
      cursorOn = true;
      lookAt(P[turn], i);
      await clock.sleep(0.45);
    }

    function end() {
      // Played together, the time runs from the first flip to the last on the shared clock, so both say the same
      if (mode === 'online' && clockT.first != null) elapsed = (clockT.last - clockT.first) / 1000;
      phase = 'over';
      duo.end();
      lock = true;
      cursorOn = false;
      hud.hint('');
      showScore();
      say('');
      for (const p of P) {
        p.look = null;
        p.lean = 0;
        p.kid.danceLoop = false;
      }
      fx.burst(new THREE.Vector3(0, TOP + 0.8, 0), ['#ffd166', '#ff8fb1', '#7fd3a7', '#ffffff', '#6fb8ff'], 110);
      K.sfx.cheer(sound, 0.06, 1.6);
      for (const c of cards) c.bounce = 1;
      const [s0, s1] = [P[0].score, P[1].score];
      const winner = s0 > s1 ? P[0] : s1 > s0 ? P[1] : null;
      if (mode === 'solo' || !winner) {
        P[0].kid.emote('dance');
        P[1].kid.emote('dance');
      } else {
        winner.kid.emote('dance');
        P[1 - winner.i].kid.emote(winner.id === 'roji' ? 'heart' : 'cheer');
      }
      setTimeout(() => {
        if (!alive) return;
        if (mode === 'solo') {
          const isBest = !best || moves < best.moves || (moves === best.moves && elapsed < best.time);
          if (isBest) {
            best = { moves, time: Math.round(elapsed) };
            ctx.save(bestKey, best);
          }
          ctx.finish({ win: true, title: 'All pairs found!', text: `${moves} moves in ${fmt(elapsed)}. ${isBest ? 'New best!' : `Best: ${best.moves} moves in ${fmt(best.time)}.`}` });
          return;
        }
        const text = `${P[0].name} ${s0} ${s0 === 1 ? 'pair' : 'pairs'}, ${P[1].name} ${s1} ${s1 === 1 ? 'pair' : 'pairs'}. ${moves} moves in ${fmt(elapsed)}.`;
        if (!winner) ctx.finish({ win: null, title: "It's a tie", text });
        else ctx.finish({ win: mode === 'duo' ? true : winner.i === 0, title: `${duo.winner(winner.name, winner.i === 1)} wins!`, text });
      }, 1500);
    }

    // ---------------------------------------------------------------- intro and deal
    async function intro() {
      say('');
      const pa = looks[ids[1]].name;
      const pick = await hud.choose({
        title: 'Memory Match',
        text: `Flip two cards. Same picture? Keep them. ${pairs} pairs to find.${best ? ` Best solo: ${best.moves} moves.` : ''}`,
        options: [
          ...(duo.can ? [duo.option()] : []),
          { id: 'solo', label: 'Just me', sub: `${pa} cheers you on` },
          { id: 'cpu', label: `Play with ${pa}`, sub: 'The computer picks for them' },
          { id: 'duo', label: 'Two players', sub: 'Take turns on this device' },
        ],
      });
      if (!alive) return;
      mode = pick || mode;
      if (mode !== 'online') ctx.save('mode', mode);
      const games = ctx.load('games', 0);
      ctx.save('games', games + 1);
      turn = mode === 'solo' ? 0 : games % 2;
      if (mode === 'online') {
        say(`${dot(P[1])}Waiting for ${P[1].name}...`);
        const r = await duo.link('online', {
          hello: { n: cards.length },
          // The host deals: who goes first and the deck, as picture numbers in table order
          start: (hi) => (hi.n === cards.length ? { f: P[turn].id, deck: cards.map((c) => c.pic) } : { no: true }),
        });
        if (!alive) return;
        const deck = r.ok && Array.isArray(r.go.deck) && r.go.deck.length === cards.length && r.go.deck.every((v) => PICS[v]) ? r.go.deck : null;
        if (deck) {
          turn = r.go.f === ctx.me ? 0 : 1;
          deck.forEach((pic, i) => {
            cards[i].pic = pic;
            cards[i].card.geometry = cardGeometry(pic);
          });
          say('');
        } else {
          mode = 'cpu';
          sayHold(duo.why(r), 3600);
        }
      } else duo.link(mode);
      placeKids();
      fitCamera(true);
      phase = 'deal';
      // Deal from the pile in the middle, one card after another
      const n = cards.length;
      const from = cards.map((c) => c.holder.position.clone());
      const total = 0.42 + 0.06 * (n - 1);
      let sounded = -1;
      await clock.tween(total, (e) => {
        const T = e * total;
        for (let k = 0; k < n; k++) {
          const c = cards[n - 1 - k];
          const q = clamp((T - k * 0.06) / 0.42, 0, 1);
          if (q <= 0) continue;
          if (k > sounded && k % 2 === 0) {
            sounded = k;
            K.sfx.flip(sound);
          }
          c.holder.position.lerpVectors(from[n - 1 - k], c.home, easeOutCubic(q));
          c.holder.position.y += Math.sin(q * Math.PI) * 0.35;
          c.holder.rotation.y = (1 - q) * (k % 2 ? 0.6 : -0.6);
        }
      });
      if (!alive) return;
      await clock.sleep(0.3);
      if (!alive) return;
      for (const c of cards) c.dealt = true;
      phase = 'play';
      lock = false;
      hud.hint(touch() ? '' : 'Click a card, or use the arrows and E to flip');
      if (mode !== 'solo') hud.message(`${P[turn].name} goes first`, 1200);
      showScore();
      turnText();
      if (isCpuTurn()) cpuMove();
    }

    // ---------------------------------------------------------------- camera
    // Fit the table and the kids on screen, below the top bar.
    const camDir = new THREE.Vector3(0, Math.sin(0.74), Math.cos(0.74));
    const look = new THREE.Vector3(0, TOP, -0.2);
    const camWant = new THREE.Vector3();
    const lookWant = new THREE.Vector3();
    const probe = new THREE.PerspectiveCamera();
    let fitAspect = 0;
    function fitCamera(force) {
      if (!force && Math.abs(fitAspect - camera.aspect) < 1e-3) return;
      fitAspect = camera.aspect;
      probe.fov = camera.fov;
      probe.aspect = camera.aspect;
      probe.near = 0.1;
      probe.far = 200;
      probe.updateProjectionMatrix();
      const H = window.innerHeight;
      const yTop = 1 - (2 * 74) / H;
      const yBot = -1 + (2 * (touch() ? 46 : 54)) / H;
      const pts = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push(new THREE.Vector3((sx * tableW) / 2, TOP, (sz * tableD) / 2 + (sz > 0 ? 0.12 : 0)));
      for (const p of P) for (const dx of [-0.4, 0.4]) for (const y of [0.05, 1.62]) pts.push(p.home.clone().add(new THREE.Vector3(dx, y, 0)));
      const v = new THREE.Vector3();
      const target = new THREE.Vector3(0, TOP, -0.2);
      let d = 6;
      for (let it = 0; it < 3; it++) {
        let lo = 2;
        let hi = 30;
        let ys = [0, 0];
        for (let k = 0; k < 22; k++) {
          d = (lo + hi) / 2;
          probe.position.copy(target).addScaledVector(camDir, d);
          probe.lookAt(target);
          probe.updateMatrixWorld();
          let ok = true;
          let y0 = 9;
          let y1 = -9;
          for (const p of pts) {
            v.copy(p).project(probe);
            if (Math.abs(v.x) > 0.95) ok = false;
            y0 = Math.min(y0, v.y);
            y1 = Math.max(y1, v.y);
          }
          if (y1 - y0 > yTop - yBot) ok = false;
          ys = [y0, y1];
          if (ok) hi = d;
          else lo = d;
        }
        d = hi * 1.06;
        // Centre the content between the bars
        const mid = (ys[0] + ys[1]) / 2;
        const want = (yTop + yBot) / 2;
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(probe.quaternion);
        target.addScaledVector(up, ((mid - want) * Math.tan((probe.fov * Math.PI) / 360) * d) / 1.0);
      }
      lookWant.copy(target);
      camWant.copy(target).addScaledVector(camDir, d);
    }
    fitCamera(true);
    const camPos = camWant.clone().add(new THREE.Vector3(0, 2.5, 3));
    look.copy(lookWant);

    // ---------------------------------------------------------------- frame
    const tmp = new THREE.Vector3();
    const dbg = {
      fast: 1,
      auto: false,
      seen: new Map(),
      cards,
      P,
      flip: (i) => flip(i),
      get phase() {
        return phase;
      },
      status: () => ({ phase, mode, moves, found, scores: P.map((p) => p.score), turn }),
      // Both devices see the same: whose turn, the pairs by kid, which cards are found, the deck
      state: () => ({ phase: phase === 'play' && !lock ? 'play' : phase === 'play' ? 'busy' : phase, mode, who: P[turn].id, key: `${P.map((p) => `${p.id[0]}${p.score}`).sort().join(',')}|${cards.map((c) => (c.state === 'done' ? 1 : 0)).join('')}`, deck: cards.map((c) => c.pic).join(','), flips, first, open: cards.filter((c) => c.state === 'up').map((c) => c.i) }),
    };
    window.__memory = dbg;

    // Test helper: a player who remembers every card they have seen
    function autoPlay() {
      if (phase !== 'play' || lock || isCpuTurn() || isRemoteTurn() || dbg.busy) return;
      const closed = cards.filter((c) => c.state === 'down');
      const seen = closed.filter((c) => dbg.seen.has(c.i));
      const unseen = closed.filter((c) => !dbg.seen.has(c.i));
      const any = (l) => l[Math.floor(Math.random() * l.length)];
      let next;
      if (first >= 0) next = seen.find((c) => c.pic === cards[first].pic) || any(unseen) || any(closed);
      else next = seen.find((c) => seen.some((o) => o !== c && o.pic === c.pic)) || any(unseen) || any(closed);
      if (!next) return;
      dbg.busy = true;
      clock.sleep(0.35).then(() => {
        dbg.busy = false;
        cur = next.i;
        flip(next.i);
      });
    }

    // ---------------------------------------------------------------- played together
    const inbox = []; // their flips: { i: card, n: cards turned before it }
    duo.on('flip', (d) => inbox.push(d));
    function pump() {
      while (inbox.length && mode === 'online' && phase === 'play' && !lock && isRemoteTurn()) {
        const d = inbox[0];
        if (d?.n > flips) return; // ours have not all landed here yet
        if (cards.some((c) => c.anim && c.anim.t < 0.4)) return; // two flips that came together still turn one after the other
        inbox.shift();
        if (!d || d.n !== flips || !cards[d.i] || isOpen(d.i)) {
          console.warn('Memory Match: a flip that does not fit the table', d, flips);
          continue;
        }
        cur = d.i;
        cursorOn = true;
        flip(d.i, d.t);
        return;
      }
    }
    duo.onGone(() => {
      if (mode !== 'online' || phase === 'over') return;
      mode = 'cpu';
      inbox.length = 0;
      sayHold(`${dot(P[1])}${P[1].name} left, so the computer plays for ${duo.him}`, 3600);
      if (phase === 'play' && turn === 1 && !lock) cpuMove();
    });
    let shared = '';
    function syncCursor() {
      if (mode !== 'online') return;
      duo.tick();
      pump();
      if (phase !== 'play') return;
      if (turn === 0 && cursorOn && `${cur}|${flips}` !== shared) {
        shared = `${cur}|${flips}`;
        duo.share({ c: cur, n: flips });
      }
      // Their highlight moves here as they aim
      const ps = isRemoteTurn() && !lock ? duo.state() : null;
      if (ps && ps.n === flips && cards[ps.c] && ps.c !== cur) {
        cur = ps.c;
        cursorOn = true;
        if (!isOpen(cur)) lookAt(P[1], cur); // their kid leans toward the card they aim at
      }
    }

    function handleInput() {
      if (phase !== 'play') return;
      if (dbg.auto) return autoPlay();
      const human = !isCpuTurn() && !isRemoteTurn();
      const mv = [
        [['arrowleft', 'a'], -1, 0],
        [['arrowright', 'd'], 1, 0],
        [['arrowup', 'w'], 0, -1],
        [['arrowdown', 's'], 0, 1],
      ];
      if (human) {
        for (const [keys, dx, dy] of mv) {
          if (keys.some((k) => input.pressed(k))) {
            const c = cur % cols;
            const r = Math.floor(cur / cols);
            const nc = clamp(c + dx, 0, cols - 1);
            const nr = clamp(r + dy, 0, rows - 1);
            if (cursorOn) cur = nr * cols + nc;
            cursorOn = true;
            sound.ui('tick');
          }
        }
        if (input.pressed('action') || input.pressed('jump')) {
          if (!cursorOn) cursorOn = true;
          else flip(cur);
        }
        if (input.taps().length) {
          const h = input.pick(hitList)[0];
          if (h) {
            cur = h.object.userData.i;
            if (touch()) cursorOn = false;
            flip(cur);
          }
        }
      }
      // Mouse hover lifts a card and moves the highlight there
      hovered = -1;
      if (human && !touch() && !lock) {
        const h = input.pick(hitList, input.pointer.ndc)[0];
        if (h) {
          hovered = h.object.userData.i;
          if (input.pointer.ndc.x !== lastNdc.x || input.pointer.ndc.y !== lastNdc.y) {
            cur = hovered;
            cursorOn = true;
          }
        }
        lastNdc.copy(input.pointer.ndc);
      }
    }
    let hovered = -1;
    const lastNdc = new THREE.Vector2(9, 9);
    const black0 = new THREE.Color();
    const gold = new THREE.Color('#ffd166');

    function stepCards(dt, t) {
      let haloDirty = false;
      for (const c of cards) {
        if (c.anim) {
          c.anim.t += dt / FLIP;
          const k = Math.min(1, c.anim.t);
          c.flip = c.anim.from + (c.anim.to - c.anim.from) * easeOutBack(k);
          c.lift = Math.sin(k * Math.PI) * 0.26;
          if (k >= 1) {
            c.flip = c.anim.to;
            c.anim = null;
            c.lift = 0;
          }
        }
        if (!c.dealt) continue;
        c.hover = damp(c.hover, hovered === c.i && c.state === 'down' ? 1 : 0, 14, dt);
        c.bounce = Math.max(0, c.bounce - dt * 1.6);
        c.shake = Math.max(0, c.shake - dt);
        const hop = c.bounce > 0 ? Math.abs(Math.sin((1 - c.bounce) * Math.PI * 3)) * 0.16 * c.bounce : 0;
        c.holder.position.set(c.home.x, c.home.y + c.lift + hop + c.hover * 0.05, c.home.z);
        c.holder.rotation.set(c.hover * -0.08, 0, c.flip * Math.PI + (c.shake > 0 ? Math.sin(c.shake * 40) * 0.08 * c.shake : 0));
        const s = 1 + (c.bounce > 0 ? Math.sin((1 - c.bounce) * Math.PI) * 0.08 : 0);
        c.holder.scale.setScalar(s);
        // Only cards in the air need a shadow (saves a draw call per card)
        c.card.castShadow = !!c.anim || c.bounce > 0 || c.hover > 0.05 || !c.dealt;
        // Found pairs glow, brightest just after the match
        if (c.state === 'done') {
          c.glow = Math.max(0.25, c.glow - dt * 0.8);
          c.mat.emissiveIntensity = 0.05 + c.glow * 0.25 + Math.sin(t * 3 + c.i) * 0.03;
          halo.setColorAt(c.i, black0.copy(gold).multiplyScalar(Math.min(1, c.glow * 0.9 + 0.15)));
          haloDirty = true;
        } else if (c.mat.emissiveIntensity) {
          c.mat.emissiveIntensity = 0;
          halo.setColorAt(c.i, black);
          haloDirty = true;
        }
      }
      if (haloDirty) halo.instanceColor.needsUpdate = true;
      const target = cards[cur].home;
      cursor.position.x = damp(cursor.position.x, target.x, 18, dt);
      cursor.position.z = damp(cursor.position.z, target.z, 18, dt);
      cursor.position.y = TOP + 0.004;
      const show = cursorOn && phase === 'play';
      cursorMat.color.set(isCpuTurn() || isRemoteTurn() ? P[1].color : '#ffd166');
      cursorMat.opacity = damp(cursorMat.opacity, show ? 0.75 + Math.sin(t * 6) * 0.2 : 0, 12, dt);
      cursor.scale.setScalar(1 + Math.sin(t * 6) * 0.025);
    }

    function stepKids(dt, t) {
      for (const p of P) {
        const k = p.kid;
        const want = p.look ? Math.atan2(p.look.x - p.pos.x, p.look.z - p.pos.z) : p.homeYaw;
        p.yaw = dampAngle(p.yaw, want, 8, dt);
        p.pos.z = damp(p.pos.z, p.home.z + (p.look ? clamp((p.look.z - p.home.z) * 0.35, -0.45, 0.45) : 0), 5, dt);
        p.pos.x = p.home.x;
        k.root.position.copy(p.pos);
        k.root.rotation.y = p.yaw;
        // Take back last frame's lean before the kid animates, so it never piles up
        k.body.rotation.x -= p.added || 0;
        p.added = 0;
        const n = Math.max(1, Math.ceil(dt / 0.04));
        for (let s = 0; s < n; s++) k.update(dt / n, t, 0, 0, 0);
        p.leanK = damp(p.leanK || 0, p.lean, 8, dt);
        if (p.leanK > 0.01 && !k.emoteType) {
          p.added = 0.06 * p.leanK;
          k.body.rotation.x += p.added;
          const a = k.arms[1];
          a.rotation.set(-1.35 * p.leanK, 0, -0.18 + 0.1 * p.leanK);
        }
        p.shake = Math.max(0, p.shake - dt);
        if (p.shake > 0) k.head.rotation.y += Math.sin(p.shake * 26) * 0.35 * Math.min(1, p.shake * 3);
        p.smile = Math.max(0, p.smile - dt);
        p.frown = Math.max(0, p.frown - dt * 0.9);
        const m = k.mouth;
        if (p.frown > 0.1) {
          m.rotation.z = 0;
          m.scale.set(0.8, 0.8, 1);
        } else {
          m.rotation.z = Math.PI;
          const big = 1 + Math.min(1, p.smile) * 0.5;
          m.scale.set(big, big, 1);
        }
      }
      const a = P[turn];
      ring.position.set(a.pos.x, 0.09, a.pos.z);
      ringMat.color.set(a.color);
      ringMat.opacity = damp(ringMat.opacity, phase === 'play' && mode !== 'solo' ? 0.55 + Math.sin(t * 5) * 0.2 : 0, 8, dt);
    }

    intro();

    return {
      update(rdt, t) {
        const dt = rdt * clamp(dbg.fast, 1, 40);
        if (phase === 'play' && started) elapsed += dt;
        if (Math.floor(elapsed * 2) !== Math.floor((elapsed - dt) * 2)) showScore();
        handleInput();
        syncCursor();
        clock.update(dt);
        stepCards(dt, t);
        stepKids(dt, t);
        park.update(dt, t);
        fitCamera(false);
        camPos.lerp(camWant, 1 - Math.exp(-3 * rdt));
        look.lerp(lookWant, 1 - Math.exp(-3.5 * rdt));
        camera.position.copy(camPos);
        camera.position.x += Math.sin(t * 0.25) * 0.05;
        camera.lookAt(look);
        env.follow(tmp.set(0, 0, -0.5));
        floats.update(rdt, camera);
      },
      dispose() {
        alive = false;
        duo.dispose();
        clearTimeout(holdTimer);
        clock.clear();
        ui.remove();
        hud.hint('');
        disposeCards();
        if (window.__memory === dbg) delete window.__memory;
      },
    };
  },
};
