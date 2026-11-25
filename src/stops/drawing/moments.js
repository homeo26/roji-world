import { ICONS } from '../../icons.js';
import * as M from './models.js';
import * as PT from './paint.js';

// What happens inside The Little Art Studio: the art teacher, the gallery of saved drawings, and the
// activities (the Drawing Pad, painting each other, a still-life lesson, the mural, a paint fight and
// washing up, the reading nook, peeking behind the canvases, Homama's portrait of Roji).

const { THREE, cyl, sph, at, mat } = M;
const P = Math.PI;
const GALLERY_KEY = 'roji-game-drawpad-gallery';

Object.assign(ICONS, {
  'd-brush': 'M14.5 4.5l5 5-7 7-5-5z M7.5 11.5c-2 .5-3 2-3 4.5 0 1.5-1 2.5-1.5 3 2.5 0 6-.5 7.5-2.5',
  'd-drop': 'M12 3.5c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 2.5-6.3 6-10.5z',
  'd-frame': 'M4 5h16v14H4z M7 16l3.5-4 2.5 3 2-2 2 3 M15.5 9h.01',
});

// The drawings saved in the drawing game, newest first
export function loadDrawings() {
  try {
    const list = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
    return (Array.isArray(list) ? list : []).map((d) => (typeof d === 'string' ? d : d?.src)).filter(Boolean).reverse();
  } catch {
    return [];
  }
}

const pick = (list, not) => {
  const options = list.filter((x) => x !== not);
  return options[Math.floor(Math.random() * options.length)];
};

export function addMoments(R) {
  const { api, L, add, dyn, ctx, looks } = R;
  const v = new THREE.Vector3();
  const tone = (f, d, o) => {
    const s = api.sound;
    if (s?.ctx) s.tone(f, s.ctx.currentTime, d, o);
  };
  const chime = () => {
    tone(880, 0.14, { gain: 0.04 });
    tone(1320, 0.2, { gain: 0.03, attack: 0.03 });
  };
  const headWorld = (a) => a.kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0));
  const toLocalVec = (w) => api.local(w);

  // ---------------------------------------------------------------- a little timeline (cleared when an activity ends)
  let clock = 0;
  let queue = [];
  const after = (s, fn) => queue.push({ at: clock + s, fn });
  const clearQueue = () => (queue = []);
  R.upd((dt) => {
    clock += dt;
    if (!queue.length) return;
    const due = queue.filter((q) => q.at <= clock);
    queue = queue.filter((q) => q.at > clock);
    for (const q of due) q.fn();
  });

  // ---------------------------------------------------------------- the art teacher
  const teacher = ctx.makeKid({ id: 'art-teacher', name: 'Art teacher', gender: 'girl', skin: '#e9b48f', hair: '#b5773d', hairstyle: 'bob', outfit: 'overalls', top: '#fff7ea', bottom: '#7fd8bf', shoes: '#3b2b3f', accent: '#ef5b6f' });
  const pencil = new THREE.Group();
  pencil.add(at(cyl(0.018, 0.018, 0.26, '#ffcf3f', 6), 0, 0, 0));
  pencil.add(at(cyl(0.0, 0.018, 0.05, '#f3d2a2', 6), 0, 0.155, 0));
  pencil.add(at(cyl(0.019, 0.019, 0.04, '#ff9ab5', 6), 0, -0.15, 0));
  pencil.position.set(0.24, 0.52, -0.08);
  pencil.rotation.set(0.3, 0, 1.1);
  teacher.head.add(pencil);
  [[M.COL.rose, -0.07, 0.55], [M.COL.navy, 0.08, 0.47], [M.COL.sun, 0.02, 0.36], [M.COL.purple, -0.1, 0.4]].forEach(([c, x, y]) => teacher.body.add(at(sph(0.022, c, undefined, 6), x, y, 0.22)));
  const tBrush = new THREE.Group();
  tBrush.add(at(cyl(0.01, 0.01, 0.26, M.COL.woodDark, 5), 0, 0, 0.1));
  tBrush.children[0].rotation.x = P / 2;
  tBrush.add(at(sph(0.02, M.COL.teal, undefined, 6), 0, 0, 0.24));
  tBrush.position.set(0, -0.3, 0.02);
  teacher.arms[1].add(tBrush);
  teacher.batch();
  teacher.root.scale.setScalar(1.17);
  add(dyn(teacher.root));
  const spots = {
    T: { x: L.TABLE.x, z: L.TABLE.z - L.TABLE.d / 2 - 0.45, yaw: 0, hands: 'stir' },
    M: { x: L.MURAL.x - 0.6, z: L.ZB + 2.3, yaw: P, hands: null },
    SL: { x: 8.75, z: -3.95, yaw: Math.atan2(L.STILL.x - 8.75, L.STILL.z + 3.95), hands: 'hold' },
    LS: { x: 11.3, z: -3.75, yaw: Math.atan2(9.9 - 11.3, -1.8 + 3.75), hands: 'hold' },
    PW: { x: 6.55, z: 0.25, yaw: 0, hands: null },
    MW: { x: 2.8, z: -3.4, yaw: -2.2, hands: null },
  };
  const HUB = [3.6, -1.0];
  const S1 = [7.0, -1.1];
  const S2 = [7.0, -3.7];
  const routes = {
    T: [],
    M: [[0.4, -2.0]],
    SL: [HUB, S1, S2],
    LS: [HUB, S1, S2, [9.6, -3.62]],
    PW: [HUB],
    MW: [],
  };
  const tp = new THREE.Vector3(spots.T.x, 0, spots.T.z);
  let tyaw = 0;
  let here = 'T';
  let path = [];
  let goal = null;
  let arrive = null;
  let dwell = 4;
  let tSpeed = 0;
  let led = false; // an activity is using her
  const loop = ['SL', 'M', 'T'];
  let loopI = 0;
  const teacherGo = (to, then) => {
    // finish the stretch she is walking first, so she never cuts through furniture
    const pre = path.length ? path.slice() : [];
    if (path.length) here = goal;
    let back = routes[here].slice().reverse();
    let forward = routes[to];
    // routes that start with the same hub meet there instead of going back to the table
    let shared = 0;
    while (shared < routes[here].length && shared < forward.length && routes[here][shared] === forward[shared]) shared++;
    const viaT = here !== 'T' && to !== 'T' && shared === 0;
    if (shared) {
      back = routes[here].slice(shared).reverse();
      forward = forward.slice(shared - 1);
    }
    path = [...back, ...(viaT ? [[spots.T.x, spots.T.z]] : []), ...forward, [spots[to].x, spots[to].z]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    if (here === 'T' && to === 'T') path = [new THREE.Vector3(spots.T.x, 0, spots.T.z)];
    path = [...pre, ...path];
    goal = to;
    arrive = then || null;
    teacher.hands = null;
  };
  const bubble = M.sprite(null, { opacity: 1, scale: 1 });
  bubble.scale.set(1.7, 0.53, 1);
  bubble.visible = false;
  bubble.renderOrder = 6;
  add(dyn(bubble));
  let bubbleT = 0;
  const say = (text, s = 2.8) => {
    bubble.material.map?.dispose();
    bubble.material.map = M.bubbleTex(text, { w: 512, h: 160 });
    bubble.material.needsUpdate = true;
    bubble.visible = true;
    bubbleT = s;
  };
  R.upd((dt, t) => {
    if (path.length) {
      const nx = path[0];
      const dx = nx.x - tp.x;
      const dz = nx.z - tp.z;
      const d = Math.hypot(dx, dz);
      const pace = led ? 1.8 : 1.15;
      const step = Math.min(d, dt * pace);
      if (d < 0.03) path.shift();
      else {
        tp.x += (dx / d) * step;
        tp.z += (dz / d) * step;
        tyaw = M.THREE.MathUtils.lerp(tyaw, tyaw + Math.atan2(Math.sin(Math.atan2(dx, dz) - tyaw), Math.cos(Math.atan2(dx, dz) - tyaw)), 1 - Math.exp(-8 * dt));
      }
      tSpeed = led ? 1.8 : 1.15;
      if (!path.length) {
        here = goal;
        teacher.hands = spots[here].hands;
        dwell = 6 + Math.random() * 5;
        const fn = arrive;
        arrive = null;
        fn?.();
      }
    } else {
      tSpeed = 0;
      const want = spots[here].yaw;
      tyaw += Math.atan2(Math.sin(want - tyaw), Math.cos(want - tyaw)) * (1 - Math.exp(-5 * dt));
      if (!led) {
        dwell -= dt;
        if (dwell <= 0) {
          const next = loop[loopI++ % loop.length];
          teacherGo(next, () => {
            if (next === 'SL') {
              teacher.emote('nod');
              say('A little to the left...', 2.2);
            } else if (next === 'M') teacher.emote('nod');
          });
        }
      }
    }
    teacher.root.position.set(tp.x, 0, tp.z);
    teacher.root.rotation.y = tyaw;
    teacher.update(dt, t, tSpeed, 0, 0);
    if (bubble.visible) {
      bubbleT -= dt;
      teacher.head.getWorldPosition(v);
      bubble.position.copy(toLocalVec(v)).add(new THREE.Vector3(0, 1.05, 0));
      bubble.material.opacity = Math.min(1, bubbleT * 3);
      if (bubbleT <= 0) bubble.visible = false;
    }
  });
  const lead = (to, then) => {
    led = true;
    teacherGo(to, then);
  };
  const release = () => {
    led = false;
    dwell = 3;
    if (here !== 'T') teacherGo('T');
  };

  // ---------------------------------------------------------------- the gallery wall
  const gal = R.gallery;
  let galList = [];
  R.refreshGallery = () => {
    const list = loadDrawings().slice(0, 12);
    const sig = list.map((s) => s.length + s.slice(-24)).join('|');
    galList = list;
    if (sig === gal.sig) return list;
    gal.sig = sig;
    const c = gal.canvas.getContext('2d');
    const cw = 256;
    const ch = 192;
    for (let k = 0; k < 12; k++) {
      const x = (k % 6) * cw;
      const y = Math.floor(k / 6) * ch;
      c.save();
      c.translate(x, y);
      PT.paper(c, cw, ch, '#fbf6ee');
      c.strokeStyle = '#e3d6c6';
      c.lineWidth = 5;
      c.setLineDash([12, 10]);
      M.roundRect(c, 16, 16, cw - 32, ch - 32, 14);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#b39a86';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `500 25px ${M.FONT}`;
      c.fillText('Your next', cw / 2, ch / 2 - 14);
      c.fillText('drawing', cw / 2, ch / 2 + 16);
      c.restore();
      if (!list[k]) continue;
      const img = new Image();
      img.onload = () => {
        if (gal.sig !== sig) return;
        c.drawImage(img, x, y, cw, ch);
        gal.tex.needsUpdate = true;
      };
      img.src = list[k];
    }
    gal.tex.needsUpdate = true;
    return list;
  };
  R.onEnter(() => R.refreshGallery());

  // ---------------------------------------------------------------- the mural (saved: the last one painted)
  R.showMural = () => {
    const last = api.load('mural', -1);
    if (last >= 0) R.mural.set((c, w, h) => PT.mural(c, w, h, PT.MURALS[last % PT.MURALS.length].id, looks), { done: true });
    else R.mural.set((c, w, h) => PT.mural(c, w, h, PT.MURALS[0].id, looks), { ghost: 0.22, blank: '#fff6e8' });
  };

  // ---------------------------------------------------------------- the portraits (saved: the last pair painted)
  const portraitOf = (painter, subject, kind, seed) => (c, w, h) => PT.portrait(c, w, h, PT.lookOf(looks, subject), kind, { hearts: painter === 'homama' ? 9 : 0, seed });
  R.showPortraits = () => {
    const saved = api.load('portraits', null);
    for (const who of ['roji', 'homama']) {
      const p = R.portrait[who];
      const subject = who === 'roji' ? 'homama' : 'roji';
      if (saved?.[who]) p.rv.set(portraitOf(who, subject, saved[who], 3), { done: true });
      else p.rv.set(portraitOf(who, subject, 'plain', 3), { ghost: 0.18 });
    }
  };

  // ---------------------------------------------------------------- shared helpers for activities
  const easelTurns = [];
  R.upd((dt) => {
    for (let i = easelTurns.length - 1; i >= 0; i--) {
      const e = easelTurns[i];
      e.k = Math.min(1, e.k + dt / e.dur);
      const s = e.k * e.k * (3 - 2 * e.k);
      e.obj.rotation.y = e.from + (e.to - e.from) * s;
      if (e.k >= 1) easelTurns.splice(i, 1);
    }
  });
  const turn = (obj, to, dur = 0.8) => {
    for (let i = easelTurns.length - 1; i >= 0; i--) if (easelTurns[i].obj === obj) easelTurns.splice(i, 1);
    easelTurns.push({ obj, from: obj.rotation.y, to, k: 0, dur });
  };
  const reveals = new Set();
  R.upd((dt) => {
    for (const rv of reveals) if (!rv.update(dt) && rv.done) reveals.delete(rv);
  });
  const paintNow = (rv, s) => {
    rv.play(s);
    reveals.add(rv);
  };
  const heartsOver = (who, n = 4) => api.fx.heartsAt(headWorld(typeof who === 'string' ? api.actor(who) || api[who] : who), n);
  let running = null; // the id of our activity that is running

  // ---------------------------------------------------------------- 1. the Drawing Pad
  R.hot({
    x: L.PAD.x,
    z: L.PAD.z + 1.15,
    r: 1.3,
    label: 'Draw at the easel',
    icon: 'palette',
    act: async (a) => {
      if (!a.hasArena('drawpad')) return a.toast('The drawing pad is being tidied. Come back soon.');
      const before = loadDrawings()[0];
      await a.playArena('drawpad');
      const list = R.refreshGallery();
      if (list.length && list[0] !== before) a.toast(`Your new drawing is up in the gallery. ${list.length} of 12 frames filled.`, 3000);
    },
  });

  // ---------------------------------------------------------------- 2. paint each other's portrait
  R.hot({
    x: (L.PORT.roji.x + L.PORT.homama.x) / 2,
    z: L.PORT.roji.z + 1.15,
    r: 1.5,
    label: 'Paint each other',
    icon: 'd-brush',
    act: (a) => {
      const saved = api.load('portraits', {}) || {};
      const kinds = PT.PORTRAITS.map((p) => p.id);
      const kind = { roji: pick(kinds, saved.roji), homama: pick(kinds, saved.homama) };
      const pr = L.PORT.roji;
      const ph = L.PORT.homama;
      running = 'portrait';
      a.activity({
        label: 'Stand up',
        seats: [
          { who: 'roji', x: pr.x, z: pr.z, y: 0.28, yaw: P / 2, pose: 'sit', hands: 'stir' },
          { who: 'homama', x: ph.x, z: ph.z, y: 0.28, yaw: -P / 2, pose: 'sit', hands: 'stir' },
        ],
        focus: { x: (pr.x + ph.x) / 2, z: pr.z - 0.2, y: 1.2, zoom: 0.5 },
        music: 0.6,
        exit: { x: (pr.x + ph.x) / 2 - 0.4, z: pr.z + 1.2 },
        onEnd: () => {
          running = null;
          clearQueue();
          for (const who of ['roji', 'homama']) {
            const p = R.portrait[who];
            if (!p.rv.done) p.rv.finish();
            turn(p.easel, 0, 0.6);
          }
          release();
        },
      });
      for (const who of ['roji', 'homama']) {
        const p = R.portrait[who];
        const subject = who === 'roji' ? 'homama' : 'roji';
        turn(p.easel, p.faceIn, 0.7);
        p.rv.set(portraitOf(who, subject, kind[who], Math.random() * 6), { ghost: 0.08 });
        after(0.8, () => paintNow(p.rv, 7));
      }
      lead('PW', () => say('Look closely at each other!', 2.4));
      after(3.2, () => a.emote('roji', 'nod'));
      after(4.6, () => {
        a.emote('homama', 'heart');
        tone(660, 0.12, { gain: 0.03 });
      });
      after(8.2, () => {
        for (const who of ['roji', 'homama']) turn(R.portrait[who].easel, 0, 0.9);
        api.sound.ui('swoosh');
        a.focus({ x: (pr.x + ph.x) / 2, z: pr.z, y: 1.3, zoom: 0.48 });
      });
      after(9.3, () => {
        api.save('portraits', kind);
        const wr = PT.PORTRAITS.find((p) => p.id === kind.roji).what;
        const wh = PT.PORTRAITS.find((p) => p.id === kind.homama).what;
        a.toast(`Roji painted Homama ${wr}. Homama painted Roji ${wh}, with hearts all round.`, 4200);
        a.emote('roji', 'cheer');
        setTimeout(() => a.emote('homama', 'cheer'), 250);
        teacher.emote('cheer');
        say('Masterpieces!', 2.2);
        api.sound.ui('win');
        R.portrait.homama.easel.getWorldPosition(v);
        api.fx.heartsAt(v.add(new THREE.Vector3(0, 1.4, 0.2)), 6);
      });
    },
  });

  // ---------------------------------------------------------------- 3. the still-life lesson
  R.hot({
    x: (L.SEASELS[0].x + L.SEASELS[1].x) / 2,
    z: L.SEASELS[0].z + 1.6,
    r: 1.5,
    label: 'Still-life lesson',
    icon: 'star',
    act: (a) => {
      const [e0, e1] = L.SEASELS;
      running = 'still';
      const lessons = api.load('lessons', 0);
      a.activity({
        label: 'Stand up',
        seats: [
          { who: 'roji', x: e0.x + 0.5, z: e0.z + 0.75, y: 0.28, yaw: P, pose: 'sit', hands: 'stir' },
          { who: 'homama', x: e1.x + 0.5, z: e1.z + 0.75, y: 0.28, yaw: P, pose: 'sit', hands: 'stir' },
        ],
        focus: { x: L.STILL.x, z: -2.9, y: 1.25, zoom: 0.52 },
        music: 0.55,
        exit: { x: L.STILL.x - 0.6, z: e0.z + 1.7 },
        onEnd: () => {
          running = null;
          clearQueue();
          for (const s of R.stillCanvas) if (!s.rv.done) s.rv.finish();
          release();
        },
      });
      R.stillCanvas.forEach((s, i) => {
        s.star.visible = false;
        const style = i ? 'hearts' : 'neat';
        s.rv.set((c, w, h) => PT.stillLife(c, w, h, style, 0), { ghost: 0 });
        after(1.2, () => paintNow(s.rv, 3.2));
        after(4.8, () => {
          s.rv.paintOver((c, w, h) => PT.stillLife(c, w, h, style, 1), 3.4);
          reveals.add(s.rv);
        });
        after(8.6, () => {
          s.rv.paintOver((c, w, h) => PT.stillLife(c, w, h, style, 2), 2.6);
          reveals.add(s.rv);
        });
      });
      lead('LS', () => {
        say('Big shapes first!', 2.6);
        a.toast('Start with big shapes: a round bowl, a tall vase.', 3000);
      });
      after(4.9, () => {
        say('Now the colours', 2.6);
        a.toast('Now the colours. Look at the shadows under the fruit.', 3000);
      });
      after(8.7, () => {
        say('A dab of light', 2.4);
        a.toast('A dab of white where the light lands.', 2600);
      });
      after(11.8, () => {
        for (const s of R.stillCanvas) s.star.visible = true;
        api.save('lessons', lessons + 1);
        teacher.emote('cheer');
        say('Gold stars!', 2.4);
        api.sound.ui('win');
        a.toast(lessons ? `Gold stars again. Lesson ${lessons + 1} done. Homama painted every apple as a heart.` : 'Gold stars for both of you. Homama painted every apple as a heart.', 4200);
        heartsOver('roji', 4);
        setTimeout(() => a.emote('roji', 'heart'), 400);
      });
    },
  });

  if (api.load('lessons', 0) > 0) {
    for (const st of R.stillCanvas) {
      st.rv.finish();
      st.star.visible = true;
    }
  }

  // ---------------------------------------------------------------- 4. paint the mural together
  R.hot({
    x: L.MURAL.x,
    z: L.ZB + 1.7,
    r: 1.6,
    label: 'Paint the mural',
    icon: 'palette',
    act: (a) => {
      const last = api.load('mural', -1);
      const next = (last + 1) % PT.MURALS.length;
      const mu = PT.MURALS[next];
      const MU = L.MURAL;
      const z = L.ZB + 0.85;
      running = 'mural';
      const A = { roji: { from: MU.x - 2.6, to: MU.x - 0.5 }, homama: { from: MU.x + 0.3, to: MU.x + 1.9 } };
      a.activity({
        label: 'Put the brushes down',
        seats: [
          { who: 'roji', x: A.roji.from, z, yaw: P, pose: 'stand', hands: 'stir' },
          { who: 'homama', x: A.homama.from, z, yaw: P, pose: 'stand', hands: 'stir' },
        ],
        focus: { x: MU.x, z: L.ZB + 2.6, y: 1.8, zoom: 0.62 },
        music: 0.7,
        exit: { x: MU.x - 0.4, z: L.ZB + 1.9 },
        update: (dt) => {
          const k = R.mural.progress / R.mural.total;
          for (const who of ['roji', 'homama']) {
            const ac = api.actor(who);
            const lp = api.localPos(ac);
            const tx = A[who].from + (A[who].to - A[who].from) * (0.5 - 0.5 * Math.cos(k * P * 3));
            const nx = lp.x + Math.sign(tx - lp.x) * Math.min(Math.abs(tx - lp.x), dt * 0.9);
            ac.speed = Math.abs(tx - lp.x) > 0.02 ? 0.9 : 0;
            ac.pos.copy(api.world(nx, z));
            ac.yaw = P;
          }
        },
        onEnd: () => {
          running = null;
          clearQueue();
          if (!R.mural.done) R.mural.finish();
          for (const who of ['roji', 'homama']) api.actor(who).speed = 0;
          release();
        },
      });
      R.mural.set((c, w, h) => PT.mural(c, w, h, mu.id, looks), { ghost: 0.25, blank: '#fff6e8' });
      paintNow(R.mural, 7);
      lead('MW', () => say('Lovely colours!', 2.2));
      after(7.4, () => {
        api.save('mural', next);
        a.toast(`Roji and Homama painted ${mu.name} on the wall together.`, 3600);
        api.sound.ui('win');
        a.emote('roji', 'cheer');
        setTimeout(() => a.emote('homama', 'cheer'), 200);
        teacher.emote('cheer');
        v.set(0, 0, 0);
        api.fx.burst(api.world(MU.x, L.ZB + 0.6, 2.2), ['#ef5b6f', '#ffd166', '#7fd36b', '#6fb8ff', '#c7a6ff'], 40);
      });
    },
  });

  // ---------------------------------------------------------------- 5. paint fight, then wash up at the sink
  const spotGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const splats = []; // { mesh, kid }
  const HEAD_SPOTS = [[0, 0.55, 0.83], [-0.6, -0.25, 0.76], [0.6, -0.25, 0.76], [0.25, 0.9, 0.3], [-0.35, 0.85, -0.2], [0.1, 0.95, -0.1], [-0.8, 0.4, 0.1], [0.8, 0.45, -0.3], [0.1, 0.6, -0.8]];
  const addSplat = (actor, color, at2 = null) => {
    const kid = actor.kid;
    const m = new THREE.Mesh(spotGeo, mat(color, { rough: 0.35 }));
    m.castShadow = false;
    const onHead = at2 === 'nose' || (at2 === null && Math.random() < 0.5);
    if (onHead) {
      const d = at2 === 'nose' ? [0, -0.05, 1] : HEAD_SPOTS[Math.floor(Math.random() * HEAD_SPOTS.length)];
      const n = new THREE.Vector3(...d).normalize();
      m.position.set(0, 0.29, 0).addScaledVector(n, n.y > 0.5 || n.z < 0 ? 0.34 : 0.3);
      m.lookAt(m.position.clone().add(n));
      m.scale.set(at2 === 'nose' ? 0.6 : 1.1 + Math.random() * 0.6, at2 === 'nose' ? 0.6 : 1.0 + Math.random() * 0.5, 0.35);
      m.userData.keep = at2 === 'nose';
      kid.head.add(m);
    } else {
      const a2 = Math.random() * P * 2;
      const y = 0.42 + Math.random() * 0.24;
      const dress = kid.look.outfit === 'dress';
      const rr = (dress ? 0.19 + (0.62 - y) * 0.5 : 0.2) + 0.01;
      const n = new THREE.Vector3(Math.sin(a2), 0, Math.cos(a2));
      m.position.set(n.x * rr, y, n.z * rr);
      m.lookAt(m.position.clone().add(n));
      m.scale.set(1.2 + Math.random() * 0.7, 1.1 + Math.random() * 0.6, 0.35);
      kid.body.add(m);
    }
    m.userData.s = m.scale.clone();
    splats.push({ mesh: m, kid });
    return m;
  };
  const clearSplats = () => {
    for (const s of splats) s.mesh.removeFromParent();
    splats.length = 0;
  };
  R.onExit(() => clearSplats());
  const balls = [];
  const ballGeo = new THREE.SphereGeometry(0.07, 10, 8);
  R.upd((dt) => {
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      b.k += dt / b.dur;
      const k = Math.min(1, b.k);
      b.mesh.position.lerpVectors(b.from, b.to, k);
      b.mesh.position.y += Math.sin(k * P) * 0.8;
      if (k >= 1) {
        b.mesh.removeFromParent();
        balls.splice(i, 1);
        b.hit();
      }
    }
  });
  const COLORS = ['#ef5b6f', '#ffd166', '#3f7bf0', '#3fbf9f', '#8b5cf6', '#ff9a3c', '#ff8fb1'];
  const throwPaint = (from, to) => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const f = api.localPos(from).add(new THREE.Vector3(0, 1.0, 0));
    const tt = api.localPos(to).add(new THREE.Vector3(0, 0.95, 0));
    const m = new THREE.Mesh(ballGeo, mat(color, { rough: 0.3 }));
    m.position.copy(f);
    R.g.add(m);
    from.kid.hands = 'hold';
    setTimeout(() => {
      if (from.kid.hands === 'hold' && running === 'fight') from.kid.hands = null;
    }, 280);
    api.sound.ui('swoosh');
    balls.push({
      mesh: m,
      from: f,
      to: tt,
      k: 0,
      dur: 0.5,
      hit: () => {
        if (running !== 'fight') return;
        addSplat(to, color);
        to.kid.squash = 0.82;
        setTimeout(() => (to.kid.squash = 1), 120);
        api.fx.burst(api.world(tt.x, tt.z, tt.y), [color, '#ffffff'], 10);
        api.sound.ui('pop');
      },
    });
  };
  const SK = L.SINK;
  const sinkSpots = { roji: { x: SK.x - 0.7, z: SK.z - 0.42 }, homama: { x: SK.x - 0.7, z: SK.z + 0.42 } };
  let walkers = null; // { id: [points] } while walking to the sink
  let walkersDone = null;
  let washing = 0;
  const bubbles = R.sinkBubbles;
  R.upd((dt, t) => {
    if (walkers) {
      let all = true;
      for (const [id, pts] of Object.entries(walkers)) {
        const ac = api.actor(id);
        if (!pts.length) {
          ac.speed = 0;
          const want = P / 2;
          ac.yaw += Math.atan2(Math.sin(want - ac.yaw), Math.cos(want - ac.yaw)) * Math.min(1, dt * 8);
          continue;
        }
        all = false;
        const lp = api.localPos(ac);
        const dx = pts[0][0] - lp.x;
        const dz = pts[0][1] - lp.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.05) {
          pts.shift();
          continue;
        }
        const s = Math.min(d, dt * 1.9);
        ac.pos.copy(api.world(lp.x + (dx / d) * s, lp.z + (dz / d) * s));
        const want = Math.atan2(dx, dz);
        ac.yaw += Math.atan2(Math.sin(want - ac.yaw), Math.cos(want - ac.yaw)) * Math.min(1, dt * 10);
        ac.speed = 1.9;
      }
      if (all) {
        walkers = null;
        const fn = walkersDone;
        walkersDone = null;
        fn?.();
      }
    }
    // soap bubbles and spots fading while washing
    for (const [i, b] of bubbles.entries()) {
      if (washing > 0) {
        const q = (t * 0.6 + i / bubbles.length) % 1;
        b.position.set(SK.x - 0.05 + Math.sin(i * 2.3 + t) * 0.18, 0.95 + q * 0.8, SK.z + Math.cos(i * 1.7) * 0.32);
        b.scale.setScalar(0.06 + q * 0.12);
        b.material.opacity = 0.8 * Math.sin(q * P);
      } else b.material.opacity = Math.max(0, b.material.opacity - dt * 2);
    }
    if (washing > 0) {
      washing = Math.max(0, washing - dt);
      const k = Math.min(1, washing / 2.2);
      for (const s of splats) if (!s.mesh.userData.keep) s.mesh.scale.copy(s.mesh.userData.s).multiplyScalar(Math.max(0.01, k));
      if (washing === 0) {
        for (const s of splats) if (!s.mesh.userData.keep) s.mesh.removeFromParent();
        splats.splice(0, splats.length, ...splats.filter((s) => s.mesh.userData.keep));
      }
    }
  });
  const washUp = (a, { fromFight }) => {
    running = 'wash';
    const hadPaint = splats.length > 0;
    a.activity({
      label: 'Done',
      seats: [
        { who: 'roji', ...sinkSpots.roji, yaw: P / 2, pose: 'stand', hands: 'stir' },
        { who: 'homama', ...sinkSpots.homama, yaw: P / 2, pose: 'stand', hands: 'stir' },
      ],
      focus: { x: SK.x - 0.8, z: SK.z + 0.4, y: 1.1, zoom: 0.45 },
      exit: { x: SK.x - 1.6, z: SK.z + 0.4 },
      onEnd: () => {
        running = null;
        clearQueue();
        washing = 0;
        clearSplats();
      },
    });
    washing = 2.6;
    tone(520, 0.3, { gain: 0.025, type: 'triangle', slideTo: 380 });
    if (fromFight || hadPaint) {
      // Homama finds one last spot of paint on Roji's nose
      addSplat(api.roji, '#ff8fb1', 'nose');
      after(2.8, () => {
        a.emote('homama', 'nod');
        a.toast('All clean. Homama finds one last spot of paint on Roji\u2019s nose and wipes it off.', 3800);
        heartsOver('homama', 3);
      });
      after(3.3, () => {
        clearSplats();
        a.emote('roji', 'heart');
        chime();
      });
      after(5.5, () => a.endActivity());
    } else {
      after(2.8, () => {
        a.toast('Brushes washed and standing in their jars, ready for next time.', 3000);
        chime();
      });
      after(4.2, () => a.endActivity());
    }
  };
  R.hot({
    x: L.CART.x,
    z: L.CART.z - 0.75,
    r: 1.25,
    label: 'Paint fight!',
    icon: 'd-brush',
    act: (a) => {
      const zf = 3.55;
      running = 'fight';
      clearSplats();
      a.activity({
        label: 'Stop',
        seats: [
          { who: 'roji', x: 4.9, z: zf, yaw: P / 2, pose: 'stand' },
          { who: 'homama', x: 7.9, z: zf, yaw: -P / 2, pose: 'stand' },
        ],
        focus: { x: 6.4, z: zf - 0.3, y: 1.1, zoom: 0.55 },
        music: 0.8,
        onEnd: () => {
          if (running === 'fight') running = null;
          clearQueue();
          walkers = null;
          walkersDone = null;
          for (const id of ['roji', 'homama']) api.actor(id).speed = 0;
          for (const b of balls) b.mesh.removeFromParent();
          balls.length = 0;
        },
      });
      a.toast('Paint fight! Roji and Homama grab a pot each.', 2200);
      let n = 0;
      const volley = () => {
        if (running !== 'fight') return;
        const r2 = api.roji;
        const h2 = api.homama;
        if (n % 2 === 0) throwPaint(r2, h2);
        else throwPaint(h2, r2);
        n++;
        if (n === 4) a.emote('homama', 'spin');
        if (n === 7) a.emote('roji', 'cheer');
        if (n < 10) after(n === 5 ? 0.9 : 0.55, volley);
        else after(1.0, () => {
          if (running !== 'fight') return;
          a.toast('Paint everywhere! Time to wash up.', 2200);
          a.focus({ x: 9.4, z: 1.6, y: 1.0, zoom: 0.62 });
          walkers = {
            roji: [[9.3, 3.0], [sinkSpots.roji.x, sinkSpots.roji.z]],
            homama: [[9.8, 2.4], [sinkSpots.homama.x, sinkSpots.homama.z]],
          };
          walkersDone = () => {
            if (running === 'fight') washUp(a, { fromFight: true });
          };
        });
      };
      after(0.8, volley);
    },
  });
  R.hot({
    x: SK.x - 0.95,
    z: SK.z,
    r: 1.2,
    label: () => (splats.length ? 'Wash up at the sink' : 'Wash the brushes'),
    icon: 'd-drop',
    act: (a) => washUp(a, { fromFight: false }),
  });

  // ---------------------------------------------------------------- 6. visit the gallery
  R.hot({
    x: L.BENCH.x,
    z: L.BENCH.z + 0.9,
    r: 1.5,
    label: 'Visit the gallery',
    icon: 'd-frame',
    act: (a) => {
      const list = R.refreshGallery();
      const B = L.BENCH;
      a.activity({
        label: 'Get up',
        seats: [
          { who: 'player', x: B.x - 0.45, z: B.z, y: 0.3, yaw: P, pose: 'sit' },
          { who: 'partner', x: B.x + 0.45, z: B.z, y: 0.3, yaw: P, pose: 'sit' },
        ],
        focus: { x: L.FRAMES.x, z: L.ZB + 1.6, y: 1.8, zoom: 0.55 },
        music: 0.5,
        exit: { x: B.x - 0.4, z: B.z + 1.0 },
      });
      if (!list.length) {
        a.toast('Twelve frames, all waiting. Draw at the easel in the studio and your drawings hang here.', 3800);
        return;
      }
      a.toast(list.length === 1 ? 'Your first drawing hangs in the gallery, in its gold frame.' : `${list.length} drawings in the gallery. The newest one is top left.`, 3400);
      setTimeout(() => {
        a.emote('partner', 'heart');
        a.fx.heartsAt(api.world(L.FRAMES.x - 2.5 * (L.FRAMES.fw + L.FRAMES.gap), L.ZB + 0.3, L.FRAMES.rows[1] + 0.3), 5);
        chime();
      }, 600);
    },
  });

  // ---------------------------------------------------------------- 7. read art books in the nook
  const book = (cover) => {
    const b = new THREE.Group();
    for (const s of [-1, 1]) {
      const page = at(M.box(0.13, 0.17, 0.012, '#fffaf1'), s * 0.066, 0, 0);
      page.rotation.y = -s * 0.25;
      b.add(page);
      const cv = at(M.box(0.14, 0.18, 0.008, cover), s * 0.07, 0, -0.01);
      cv.rotation.y = -s * 0.25;
      b.add(cv);
    }
    b.rotation.x = -0.7;
    b.position.set(0, 0.12, 0.02);
    return b;
  };
  R.hot({
    x: L.SOFA.x,
    z: L.SOFA.z + 1.05,
    r: 1.5,
    label: 'Read art books',
    icon: 'book',
    act: (a) => {
      const S = L.SOFA;
      a.activity({
        label: 'Get up',
        seats: [
          { who: 'roji', x: S.x - 0.45, z: S.z + 0.08, y: 0.34, yaw: 0, pose: 'sit' },
          { who: 'homama', x: S.x + 0.45, z: S.z + 0.08, y: 0.34, yaw: 0, pose: 'sit' },
        ],
        focus: { x: S.x, z: S.z + 0.6, y: 1.0, zoom: 0.45 },
        music: 0.4,
        exit: { x: S.x - 0.4, z: S.z + 1.2 },
        update: (dt) => {
          readT -= dt;
          if (readT <= 0) {
            readT = 5;
            const lines = ['Roji reads about painting light.', 'Homama shows Roji a page of sunflowers.', 'They find a painting of two people holding hands.', 'Homama reads Roji the funny bits out loud.'];
            a.toast(lines[readI++ % lines.length], 2600);
            if (readI % 2 === 0) heartsOver(readI % 4 === 0 ? 'roji' : 'homama', 3);
          }
        },
        onEnd: () => {
          a.carry('roji', null);
          a.carry('homama', null);
        },
      });
      let readT = 0.6;
      let readI = 0;
      a.carry('roji', book('#ef5b6f'));
      a.carry('homama', book('#3f7bf0'));
      api.roji.kid.hands = 'read';
      api.homama.kid.hands = 'read';
      api.sound.ui('pop');
    },
  });

  // ---------------------------------------------------------------- 8. peek behind the canvases (an easter egg)
  const ST = R.stack;
  let peek = 0;
  let peekWant = 0;
  R.upd((dt) => {
    peek += (peekWant - peek) * (1 - Math.exp(-5 * dt));
    ST.fronts.forEach((f, i) => {
      f.g.position.set(f.base.x + peek * (0.55 + i * 0.22), f.base.y, f.base.z + peek * (0.25 + i * 0.12));
      f.g.rotation.set(-0.18 + peek * 0.12, peek * (0.35 + i * 0.12), 0);
    });
    // the tiny painting comes out and stands on its little stand in front of the stack, turned to the room
    const k = Math.min(1, peek * 1.1);
    ST.tiny.position.set(0.05 - k * 0.25, 0.0, -0.05 + k * 0.62);
    ST.tiny.rotation.set(-0.2 + k * 0.08, -L.STACK.yaw * k * 0.7, 0);
    ST.tiny.scale.setScalar(1 + k * 0.4);
  });
  const SN = new THREE.Vector3(Math.sin(L.STACK.yaw), 0, Math.cos(L.STACK.yaw)); // the way the stack faces
  R.hot({
    x: L.STACK.x + SN.x * 1.1,
    z: L.STACK.z + SN.z * 1.1,
    r: 1.1,
    label: 'Peek behind the canvases',
    icon: 'heart',
    act: (a) => {
      peekWant = 1;
      const S = L.STACK;
      const px = S.x - 1.45;
      const pz = S.z + 1.05;
      a.activity({
        label: 'Put them back',
        seats: [
          { who: 'player', x: px, z: pz, yaw: Math.atan2(S.x - px, S.z - pz), pose: 'stand' },
          { who: 'partner', x: S.x - 1.55, z: S.z - 0.15, yaw: Math.atan2(1.55, 0.15), pose: 'stand' },
        ],
        focus: { x: S.x - 0.6, z: S.z + 0.55, y: 0.75, zoom: 0.42 },
        exit: { x: px - 0.3, z: pz + 0.4 },
        onEnd: () => {
          peekWant = 0;
        },
      });
      setTimeout(() => {
        a.toast('Behind the canvases: a tiny painting of Roji and Homama, signed "us".', 3600);
        a.emote('partner', 'heart');
        chime();
        ST.tiny.getWorldPosition(v);
        a.fx.heartsAt(v.add(new THREE.Vector3(0, 0.4, 0)), 5);
      }, 700);
    },
  });

  // ---------------------------------------------------------------- 9. Homama's portrait of Roji
  R.hot({
    x: L.SHOW.x + 0.2,
    z: L.SHOW.z + 1.0,
    r: 1.2,
    label: 'Admire the portrait',
    icon: 'heart',
    act: (a) => {
      const S = L.SHOW;
      a.activity({
        label: 'Done',
        seats: [
          { who: 'roji', x: S.x - 0.85, z: S.z + 0.75, yaw: 2.3, pose: 'stand' },
          { who: 'homama', x: S.x + 0.95, z: S.z + 0.85, yaw: -2.5, pose: 'stand' },
        ],
        focus: { x: S.x, z: S.z + 0.6, y: 1.2, zoom: 0.42 },
        exit: { x: S.x + 0.3, z: S.z + 1.5 },
      });
      a.toast('Homama painted Roji from memory. It is a little lopsided, and every heart is real.', 3800);
      setTimeout(() => {
        a.emote('roji', 'heart');
        heartsOver('roji', 4);
      }, 900);
      setTimeout(() => a.emote('homama', 'nod'), 1800);
    },
  });

  R.onExit(() => {
    clearQueue();
    peekWant = 0;
    walkers = null;
    walkersDone = null;
    washing = 0;
  });
}
