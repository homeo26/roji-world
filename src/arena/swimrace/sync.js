import * as THREE from 'three';
import { clamp, damp, mat, canvasTexture, roundRect, FONT } from '../../util.js';
import * as K from '../riding/kit.js';
import { WY, DECK, HZ } from './pool.js';
import { MOVE_ICON } from './ui.js';

// Synchronised Swim: the partner shows a short routine on the beat (star, lean left, lean right, dip),
// then it is your turn to copy it on the beat. Get it right and you both move together.
// Four phrases, each longer and faster; the last two are from memory. Then the big finish
// and three judges hold up their scores.

const PI = Math.PI;
const MOVES = ['up', 'left', 'right', 'down'];
const NAME = { up: 'Star', left: 'Lean left', right: 'Lean right', down: 'Dip' };
const JUDGES = [
  { id: 'j1', name: 'Judge', gender: 'girl', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'bob', outfit: 'tee-pants', top: '#ffffff', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ff7fa3' },
  { id: 'j2', name: 'Judge', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'sidepart', outfit: 'tee-pants', top: '#ffffff', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166', mustache: true },
  { id: 'j3', name: 'Judge', gender: 'girl', skin: '#fbe6d8', hair: '#e3c07a', hairstyle: 'buns', outfit: 'tee-pants', top: '#ffffff', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#5cc9c0' },
];

// Arms and body for one move. u: 0..1 through the move, k: its strength
function poseMove(kid, m, u, dt) {
  const k = Math.sin(Math.min(1, u) * PI);
  const B = kid.body;
  const [aL, aR] = kid.arms;
  if (m === 'up') {
    aL.rotation.set(0, 0, 0.3 + 2.6 * k);
    aR.rotation.set(0, 0, -0.3 - 2.6 * k);
    B.position.y += 0.24 * k;
  } else if (m === 'left' || m === 'right') {
    const s = m === 'left' ? 1 : -1; // facing the camera, the kid's right is the screen's left
    B.rotation.z += 0.42 * k * s;
    aR.rotation.set(-0.2 * k, 0, -0.3 - (s > 0 ? 1.6 : 2.5) * k);
    aL.rotation.set(-0.2 * k, 0, 0.3 + (s > 0 ? 2.5 : 1.6) * k);
    B.position.y += 0.08 * k;
  } else if (m === 'down') {
    B.position.y -= 0.7 * k;
    aL.rotation.set(0, 0, 0.3 + 2.75 * k);
    aR.rotation.set(0, 0, -0.3 - 2.75 * k);
  } else if (m === 'spin') {
    B.rotation.y += Math.min(1, u) * PI * 2;
    aL.rotation.set(0, 0, 0.3 + 1.4 * k);
    aR.rotation.set(0, 0, -0.3 - 1.4 * k);
    B.position.y += 0.15 * k;
  } else if (m === 'heart') {
    const h = Math.min(1, u * 3);
    aL.rotation.set(-0.35 * h, 0, 0.18 + 2.45 * h);
    aR.rotation.set(-0.35 * h, 0, -0.18 - 2.45 * h);
    B.position.y += 0.12 * h;
  }
}

export async function runSync(G, cfg) {
  const { ctx, pool, ui, sfx, me, pal, npcs } = G;
  const { hud, fx } = ctx;
  const L = G.level;

  for (const s of npcs) s.visible = false;
  me.visible = pal.visible = true;
  const Z = 1.8;
  me.place('tread', -0.72, WY, Z, 0);
  pal.place('tread', 0.72, WY, Z, 0);
  const act = new Map([
    [me, null],
    [pal, null],
  ]);
  for (const s of [me, pal]) {
    s.autoRate = 0;
    s.speed = 0;
    s.pose2 = (kid, dt) => {
      const a = act.get(s);
      if (!a) return;
      a.u += dt / a.dur;
      poseMove(kid, a.m, a.u, dt);
      if (a.m === 'down' && !a.popped && a.u > 0.8) {
        a.popped = true;
        pool.splash(s.cen.x, s.cen.z, 0.9);
      }
      if (a.m === 'up' && !a.sp && a.u > 0.45) {
        a.sp = true;
        pool.spray(s.cen.x, WY + 0.4, s.cen.z, 6, 0.4);
      }
      if (a.u >= 1 && a.m !== 'heart') act.set(s, null);
    };
  }
  const perform = (s, m, dur = 0.5) => {
    act.set(s, { m, u: 0, dur });
    if (m === 'down') {
      pool.bubble(s.cen.x, WY - 0.3, s.cen.z, 6, 0.25);
      pool.ripple(s.cen.x, s.cen.z, 0.8);
    } else pool.ripple(s.cen.x, s.cen.z, 0.5);
  };

  // ---------------------------------------------------------------- judges at their table
  const deck = new THREE.Group();
  ctx.scene.add(deck);
  const JZ = -HZ - 1.7;
  const table = new THREE.Group();
  table.add(K.at(K.rbox(4.8, 0.08, 0.7, '#fff6ea', 0.03), 0, DECK + 0.72, 0));
  table.add(K.at(K.box(4.8, 0.6, 0.04, '#ff9eb5'), 0, DECK + 0.4, 0.33));
  const sign = K.painted(1.6, 0.36, 96, K.bannerDraw('Judges', { bg: '#5cc9c0' }));
  sign.position.set(0, DECK + 0.42, 0.36);
  table.add(sign);
  table.position.set(0, 0, JZ + 0.55);
  deck.add(table);
  const judges = JUDGES.map((look, i) => {
    const jx = (i - 1) * 1.55;
    const kid = ctx.makeKid(look);
    kid.pose = 'sit';
    kid.update(0.016, 0, 0, 0, 0);
    kid.root.position.set(jx, DECK + 0.46, JZ);
    K.bakeKid(kid, 0.5);
    deck.add(kid.root);
    deck.add(K.at(K.rbox(0.5, 0.08, 0.46, '#5cc9c0', 0.03), jx, DECK + 0.42, JZ - 0.02));
    deck.add(K.at(K.box(0.4, 0.38, 0.36, '#4fbdb4'), jx, DECK + 0.2, JZ - 0.02));
    // the score paddle rises from behind the table
    const paddle = new THREE.Group();
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.y = 0.42;
    const stick = K.cyl(0.018, 0.018, 0.36, '#b97a4a', 6);
    stick.position.y = 0.1;
    stick.castShadow = false;
    paddle.add(stick, face);
    paddle.position.set(jx + 0.18, DECK + 0.2, JZ + 0.42);
    deck.add(paddle);
    const draw = (txt) => {
      const c = cv.getContext('2d');
      c.fillStyle = '#ffffff';
      roundRect(c, 0, 0, 128, 128, 22);
      c.fill();
      c.lineWidth = 8;
      c.strokeStyle = ['#ff7fa3', '#ffd166', '#5cc9c0'][i];
      roundRect(c, 6, 6, 116, 116, 18);
      c.stroke();
      c.fillStyle = '#3b2b3f';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${txt.length > 2 ? 48 : 64}px ${FONT}`;
      c.fillText(txt, 64, 68);
      tex.needsUpdate = true;
    };
    draw('?');
    return { draw, raise: 0, paddle, y0: DECK + 0.2 };
  });
  K.bakeVC(deck, judges.map((j) => j.paddle).concat([sign]), { emissive: 'keep' });

  // ---------------------------------------------------------------- the routine
  const phrases = [3, 4, 5, 6].map((n, pi) => {
    const list = [];
    for (let i = 0; i < n; i++) {
      let m;
      do m = MOVES[Math.floor(Math.random() * 4)];
      while (list.length >= 2 && m === list[list.length - 1] && m === list[list.length - 2]);
      list.push(m);
    }
    return { list, beat: [0.78, 0.7, 0.64, 0.58][pi] - L * 0.03, memory: pi >= 2 };
  });
  let score = 0;
  let maxScore = 0;
  let perfects = 0;
  let beatN = 0;
  let nextBeat = Infinity;
  let beatLen = 0.7;
  let phase = 'intro';
  let ph = null;
  let expect = []; // [{ t, m, done, res }]
  let demoIdx = -1;
  let respStart = 0;

  hud.title(G.title, cfg.sub);
  hud.buttons({ action: null, jump: null, stick: false });
  hud.hint('Arrow keys (or WASD) to copy the moves on the beat');
  ui.lane(false);
  ui.pads(['m-left', 'm-down', 'm-up', 'm-right']);
  pool.drawBoard('Synchronised Swim', [{ left: '', name: `${G.names.me} and ${G.names.pal}`, right: '', hi: true }], 'Watch, then copy on the beat');
  pool.ropes.visible = false; // no lane ropes for synchronised swimming
  G.cam.cut(0, 2.0, Z + 5.7, 0, 0.45, Z - 0.6);

  const v = new THREE.Vector3();
  const screen = (obj, y) => {
    v.set(obj.cen.x, obj.cen.y + y, obj.cen.z).project(ctx.camera);
    return [(v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight];
  };

  function strip() {
    if (!ph || phase === 'finale' || phase === 'scores') return ui.moves(false);
    const states = ph.list.map((m, i) => {
      if (phase === 'demo') return i < demoIdx ? 'seen' : i === demoIdx ? 'show' : 'hide';
      if (phase === 'resp' || phase === 'after') {
        const e = expect[i];
        const base = ph.memory && !e?.res ? 'hide' : 'seen';
        if (e?.res) return e.res === 'bad' || e.res === 'miss' ? 'bad' : 'good';
        return base + (expect.findIndex((x) => !x.res) === i ? ' now' : '');
      }
      return 'hide';
    });
    ui.moves(true, ph.list, states);
  }

  function readMoves() {
    const I = ctx.input;
    const pads = ui.drain();
    const out = [];
    if (I.pressed('arrowup') || I.pressed('w') || pads.includes('m-up')) out.push('up');
    if (I.pressed('arrowleft') || I.pressed('a') || pads.includes('m-left')) out.push('left');
    if (I.pressed('arrowright') || I.pressed('d') || pads.includes('m-right')) out.push('right');
    if (I.pressed('arrowdown') || I.pressed('s') || pads.includes('m-down')) out.push('down');
    if (G.auto && phase === 'resp') {
      const e = expect.find((x) => !x.res);
      if (e && G.now >= e.t - 0.02) out.push(e.m);
    }
    return out;
  }

  function judge(m) {
    const e = expect.find((x) => !x.res);
    if (!e) return;
    const d = G.now - e.t;
    if (d < -0.55 * beatLen) {
      ui.pop('Wait for the beat', '#ffffff', 500);
      return;
    }
    if (m !== e.m) {
      e.res = 'bad';
      perform(me, m, beatLen * 0.8);
      perform(pal, e.m, beatLen * 0.8);
      ui.pop(`Oops, that was ${NAME[e.m]}`, '#ffb3c0', 700);
      sfx.oops();
      return;
    }
    const a = Math.abs(d);
    const pts = a <= 0.14 ? 3 : a <= 0.28 ? 2 : 1;
    e.res = pts === 3 ? 'perfect' : 'good';
    score += pts;
    if (pts === 3) perfects++;
    perform(me, m, beatLen * 0.8);
    perform(pal, m, beatLen * 0.8);
    sfx.move(m);
    if (pts === 3) sfx.perfect(perfects % 6);
    ui.pop(pts === 3 ? 'In sync!' : pts === 2 ? 'Good' : 'A bit off the beat', pts === 3 ? '#ffd166' : '#ffffff', 520);
    pool.crowd.cheer(pts === 3 ? 0.5 : 0.25);
  }

  G.evState = () => {
    const e = expect.find((x) => !x.res);
    return { kind: 'sync', phase, now: +G.now.toFixed(3), score, maxScore, beatN, phrase: ph ? phrases.indexOf(ph) : -1, next: phase === 'resp' && e ? { m: e.m, in: +(e.t - G.now).toFixed(3) } : null, res: expect.map((x) => x.res) };
  };

  G.tick = (dt, t) => {
    const now = G.now;
    // the beat
    if (now >= nextBeat) {
      nextBeat += beatLen;
      sfx.beat(beatN++, true);
      }
    if (phase === 'resp') {
      for (const m of readMoves()) judge(m);
      for (const e of expect) {
        if (!e.res && now > e.t + 0.55 * beatLen) {
          e.res = 'miss';
          perform(pal, e.m, beatLen * 0.8);
          ui.pop('Missed one', '#ffb3c0', 500);
        }
      }
    } else ui.drain();
    for (const s of [me, pal]) {
      s.cen.y = WY;
      s.update(dt, t);
    }
    for (const [i, j] of judges.entries()) {
      j.raise = damp(j.raise, phase === 'scores' ? 1 : 0, 5 - i, dt);
      j.paddle.position.y = j.y0 + j.raise * 1.0 + Math.sin(t * 5 + i) * 0.03 * j.raise;
      j.paddle.rotation.z = Math.sin(t * 3 + i * 2) * 0.08 * j.raise;
    }
    G.foam = [
      { x: me.cen.x, z: me.cen.z, speed: 0.3, dir: [1, 0], on: true },
      { x: pal.cen.x, z: pal.cen.z, speed: 0.3, dir: [1, 0], on: true },
    ];
    G.clockT = now;
    // bubbles over the partner while showing, and a prompt over me
    if (phase === 'demo' && demoIdx >= 0 && ph) {
      const [x, y] = screen(pal, 1.45);
      ui.say(true, x, y, `${MOVE_ICON(ph.list[demoIdx], 22)} ${NAME[ph.list[demoIdx]]}`);
    } else if (phase === 'resp') {
      const [x, y] = screen(me, 1.45);
      const e = expect.find((x2) => !x2.res);
      ui.say(true, x, y, e && !ph.memory ? `${MOVE_ICON(e.m, 22)} ${NAME[e.m]}` : 'Your turn');
    } else ui.say(false);
    strip();
    hud.score(`Score ${score}`);
    if (phase !== 'scores') G.cam.goal(0, 2.0, Z + 5.7, 0, 0.45, Z - 0.6, 2);
  };

  const waitBeats = (n) => G.wait(n * beatLen);
  ui.big(`<div class="e">${cfg.eyebrow}</div><div class="n">${cfg.title}</div><div class="s">${cfg.tip}</div>`, 2600);
  G.line(G.palIsHomama ? `${G.names.pal}: Follow me, ${G.names.me}. We will be perfect together.` : `${G.names.pal}: Copy me, ${G.names.me}. Ready?`, 2800);
  await G.wait(2.8);
  if (!G.alive()) return null;
  for (let p = 0; p < phrases.length; p++) {
    ph = phrases[p];
    beatLen = ph.beat;
    nextBeat = G.now;
    phase = 'lead';
    ui.pop(p === 0 ? `Watch ${G.names.pal}` : ph.memory ? 'From memory this time!' : 'A bit longer now', '#ffffff', 1100);
    await waitBeats(2);
    if (!G.alive()) return null;
    phase = 'demo';
    for (let i = 0; i < ph.list.length; i++) {
      demoIdx = i;
      perform(pal, ph.list[i], beatLen * 0.8);
      sfx.move(ph.list[i]);
      await waitBeats(1);
      if (!G.alive()) return null;
    }
    demoIdx = -1;
    phase = 'gap';
    ui.pop('Your turn!', '#ffd166', 900);
    await waitBeats(2);
    if (!G.alive()) return null;
    respStart = G.now;
    expect = ph.list.map((m, i) => ({ t: respStart + i * beatLen, m, res: null }));
    maxScore += expect.length * 3;
    phase = 'resp';
    await G.until(() => expect.every((e) => e.res) || G.now > respStart + (ph.list.length + 0.6) * beatLen);
    if (!G.alive()) return null;
    for (const e of expect) if (!e.res) e.res = 'miss';
    phase = 'after';
    const good = expect.filter((e) => e.res === 'perfect' || e.res === 'good').length;
    ui.pop(good === expect.length ? 'Perfect routine!' : good >= expect.length - 1 ? 'So close!' : 'Keep going!', good === expect.length ? '#ffd166' : '#ffffff', 1000);
    if (good === expect.length) {
      sfx.cheer(0.05, 1.2);
      pool.crowd.cheer(0.8);
    }
    await waitBeats(1.5);
    if (!G.alive()) return null;
  }
  // big finish: a spin together, then a heart with their arms
  phase = 'finale';
  nextBeat = Infinity;
  ui.moves(false);
  ui.pads([]);
  ui.pop('Big finish!', '#ffd166', 1000);
  perform(me, 'spin', 0.9);
  perform(pal, 'spin', 0.9);
  await G.wait(0.95);
  if (!G.alive()) return null;
  act.set(me, { m: 'heart', u: 0, dur: 1 });
  act.set(pal, { m: 'heart', u: 0, dur: 1 });
  me.yaw = 0.35;
  pal.yaw = -0.35;
  fx.heartsAt(new THREE.Vector3(0, 1.3, Z), 8);
  pool.spray(0, WY + 0.2, Z + 0.2, 28, 1.5);
  pool.splash(0, Z + 0.3, 2);
  sfx.splash(1.4);
  sfx.cheer(0.08, 2.2);
  pool.crowd.cheer(1);
  await G.wait(1.2);
  if (!G.alive()) return null;
  // judges
  const ratio = maxScore ? score / maxScore : 0;
  const base = 6 + ratio * 4;
  const marks = [0, 1, 2].map((i) => clamp(Math.round((base + (Math.random() - 0.5) * 1.1 + (i === 1 ? 0.2 : 0)) * 2) / 2, 5, 10));
  judges.forEach((j, i) => j.draw(marks[i] % 1 ? marks[i].toFixed(1) : String(marks[i])));
  phase = 'scores';
  G.cam.goal(0, 2.4, Z + 4, 0, 0.9, JZ, 1.6);
  sfx.beep(true);
  ui.pop(`${marks.join('  ')}`, '#ffd166', 1800);
  pool.drawBoard('Synchronised Swim', [{ left: '', name: `${G.names.me} and ${G.names.pal}`, right: `${score} pts`, hi: true }, { left: '', name: 'Judges', right: marks.join(' / ') }], ratio >= 0.75 ? 'In perfect sync!' : 'Beautiful together');
  await G.wait(2.4);
  if (!G.alive()) return null;
  act.set(me, null);
  act.set(pal, null);
  ui.say(false);
  me.yaw = pal.yaw = 0;
  pool.ropes.visible = true;
  deck.removeFromParent();
  deck.traverse((o) => o.geometry?.dispose());
  const stars = ratio >= 0.75 ? 3 : ratio >= 0.5 ? 2 : 1;
  return { stars, text: `${score} of ${maxScore} points, judges ${marks.join(' / ')}`, short: `${score} pts, ${marks.join(' / ')}`, score };
}
