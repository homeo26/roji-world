import * as THREE from 'three';
import { kit } from '../places/school/kit.js';
import { Fireworks } from '../places/park/fireworks.js';
import { bakeLiveKid } from './riding/kit.js';
import { SONGS, buildChart } from './parade/songs.js';
import { Band } from './parade/band.js';
import { buildFloat, DECK_Y, KID_Z } from './parade/float.js';
import { Street } from './parade/street.js';
import { Highway, HIT_Z, laneX } from './parade/lanes.js';
import { Dancer } from './parade/dance.js';
import { makeUI } from './parade/ui.js';

// Roji Land Parade: a rhythm dance game on the parade float with Mimi and Bobo. Arrows slide down the
// dance carpet to the beat of an original song; hit them as they reach the pads (arrow keys or
// A S W D, or tap the lanes on a phone) and the dancer in front does that move. Combos light up the
// float, fire the confetti and get the crowd clapping along. Each song has a duet (the partner dances
// a phrase, then you copy it), a part where Roji and Homama dance together, and a finale with
// confetti and fireworks. Three songs, each faster, with hold notes, two arrows at once and golden
// notes; stars and a best score per song, and the next song opens with a star on the one before.

const WIN = { perfect: 0.055, great: 0.1, good: 0.15 };
const PTS = { perfect: 100, great: 70, good: 40 };
const WEIGHT = { perfect: 1, great: 0.8, good: 0.5 };
const WORD = { perfect: 'Perfect!', great: 'Great!', good: 'Good', miss: 'Miss' };
const KEYS = { arrowleft: 0, a: 0, arrowdown: 1, s: 1, arrowup: 2, w: 2, arrowright: 3, d: 3 };
const SPEED = 1.1; // the float rolls along at this many metres a second
const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const LINES = {
  homama: {
    start: ['Ready, Roji?', 'Let\u2019s dance, Roji!'],
    cheer: ['Go, Roji!', 'That\u2019s my Roji!', 'Best dancer in Roji Land!', 'Look at her go!'],
    oops: ['You\u2019ve got this!', 'Keep going, love!'],
    call: ['Copy me, Roji!', 'Watch this one!'],
    twirl: ['May I have this twirl?', 'One more spin!'],
  },
  roji: {
    start: ['Ready, Homama?', 'Let\u2019s dance!'],
    cheer: ['Go, Homama!', 'Nice moves!', 'You\u2019re amazing!', 'Look at him go!'],
    oops: ['You\u2019ve got this!', 'Keep going, habibi!'],
    call: ['Copy me, Homama!', 'Watch this one!'],
    twirl: ['Twirl me, Homama!', 'Again!'],
  },
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default {
  id: 'parade',
  title: 'Roji Land Parade',
  tagline: 'Dance to the beat with Mimi and Bobo',

  async start(ctx) {
    const { scene, camera, renderer, hud, sound, fx, looks } = ctx;
    const k = kit();
    const flow = { disposed: false, game: null };
    const listeners = [];
    const on = (el, ev, fn, o) => {
      el.addEventListener(ev, fn, o);
      listeners.push(() => el.removeEventListener(ev, fn, o));
    };
    const dbg = { auto: false, speed: 1 };
    window.__parade = dbg;
    const ui = makeUI();
    const prog = ctx.load('progress', {});
    let lead = ctx.load('lead', ctx.me);
    if (lead !== 'roji' && lead !== 'homama') lead = ctx.me;
    const other = (w) => (w === 'roji' ? 'homama' : 'roji');
    const nameOf = (w) => looks[w]?.name || (w === 'roji' ? 'Roji' : 'Homama');
    hud.buttons({ action: null, jump: null, stick: false });
    hud.hint('');

    // ------------------------------------------------ the world: lights, the street, the float, the kids
    const rig = new THREE.Group();
    scene.add(rig);
    let world = null;
    const kids = { roji: ctx.makeKid('roji'), homama: ctx.makeKid('homama') };
    for (const kd of Object.values(kids)) {
      bakeLiveKid(kd);
      kd.onEmoteFx = (type, who) => type === 'heart' && fx.heartsAt(who.head.localToWorld(new THREE.Vector3(0, 0.6, 0)), 4);
      rig.add(kd.root);
    }
    const dancers = { roji: new Dancer(kids.roji), homama: new Dancer(kids.homama) };
    dbg.kids = kids;
    dbg.dancers = dancers;
    const flt = buildFloat(k);
    rig.add(flt.group);
    const lanes = new Highway();
    rig.add(lanes.group);
    // where each kid stands (smoothed toward a target), by role
    const spot = { roji: { x: 0, z: KID_Z, yaw: 0, tx: 0, tz: KID_Z, tyaw: 0 }, homama: { x: 0, z: KID_Z, yaw: 0, tx: 0, tz: KID_Z, tyaw: 0 } };
    const placeRoles = (snap = false) => {
      const L = spot[lead];
      const P = spot[other(lead)];
      L.tx = -0.52;
      L.tz = KID_Z + 0.18;
      P.tx = 0.62;
      P.tz = KID_Z - 0.1;
      L.tyaw = P.tyaw = 0;
      if (snap) for (const s of [L, P]) Object.assign(s, { x: s.tx, z: s.tz, yaw: s.tyaw });
    };
    placeRoles(true);

    const buildWorld = (time) => {
      const night = time === 'night';
      const sunset = time === 'sunset';
      const sky = night ? '#1e2350' : sunset ? '#f4b493' : '#bfe6f0';
      const env = ctx.env.outdoor({ sky, fog: [34, 118], sun: sunset ? [-24, 14, 18] : [-11, 22, 12], shadow: 12, intensity: night ? 0.62 : sunset ? 0.92 : 1 });
      if (night) {
        env.hemi.color.set('#8a96e0');
        env.hemi.groundColor.set('#26244a');
        env.hemi.intensity *= 0.85;
        env.sun.color.set('#aab8ff');
      } else if (sunset) {
        env.sun.color.set('#ffb27a');
        env.hemi.color.set('#ffd6c0');
      }
      const street = new Street(ctx, { time });
      scene.add(street.group);
      // a warm light from the float's own bulbs, strong after dark
      const glow = night || sunset ? new THREE.PointLight('#ffd2a8', night ? 26 : 8, 16, 1.4) : new THREE.Group();
      glow.position.set(0, 3.4, 0.6);
      rig.add(glow);
      lanes.setNight(night ? 1 : sunset ? 0.3 : 0);
      return {
        time,
        night: night ? 1 : sunset ? 0.35 : 0,
        env,
        street,
        remove() {
          for (const o of [street.group, env.hemi, env.sun, env.sun.target, glow]) o.removeFromParent();
          street.group.traverse((o) => {
            o.geometry?.dispose?.();
            for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
              for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
              m.dispose?.();
            }
          });
          env.sun.dispose?.();
        },
      };
    };
    world = buildWorld('day');

    // the camera sits in front of the float on a little truck, looking back at the dancers
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const frame = { push: 0, kick: 0 };
    const aimCamera = (dt, t, extra = 0) => {
      const aspect = innerWidth / innerHeight;
      // narrower screens step back so the four lanes fit
      const back = aspect < 1.55 ? 1 + (1.55 - aspect) * 0.8 : 1;
      const p = frame.push;
      const e = extra * extra * (3 - 2 * extra);
      // the finale drops the camera low to look up at the float, the balloons and the fireworks
      tmp.set(Math.sin(t * 0.23) * 0.25 + p * 0.3, (4.7 * back) * (1 - e) + 2.3 * e, (HIT_Z + 7.7 * back) * (1 - e) + (HIT_Z + 5.6) * e);
      if (dt <= 0) camPos.copy(tmp);
      else camPos.set(damp(camPos.x, tmp.x, 3, dt), damp(camPos.y, tmp.y, 3, dt), damp(camPos.z, tmp.z, 3, dt));
      tmp.set(p * 0.15, 1.05 * (1 - e) + 3.4 * e, -1.0 * (1 - e) - 3.5 * e);
      if (dt <= 0) camLook.copy(tmp);
      else camLook.set(damp(camLook.x, tmp.x, 3, dt), damp(camLook.y, tmp.y, 3, dt), damp(camLook.z, tmp.z, 3, dt));
      camera.fov = 35 - frame.kick;
      camera.updateProjectionMatrix();
      camera.position.copy(camPos).add(rig.position);
      camera.lookAt(tmp.copy(camLook).add(rig.position));
    };

    const poseKids = (dt, t, beat, energy) => {
      for (const who of ['roji', 'homama']) {
        const s = spot[who];
        s.x = damp(s.x, s.tx, 6, dt);
        s.z = damp(s.z, s.tz, 6, dt);
        s.yaw = damp(s.yaw, s.tyaw, 6, dt);
        const kd = kids[who];
        kd.root.position.set(s.x, DECK_Y, s.z);
        kd.root.rotation.y = s.yaw;
        kd.update(dt, t, 0, 0, 0);
        dancers[who].update(dt, t, beat, energy);
      }
    };

    // a gentle idle while the song is being picked
    let previewT = 0;
    flow.preview = (dt, t) => {
      previewT += dt;
      const beat = previewT * 1.6;
      rig.position.z += dt * SPEED * 0.5;
      world.street.update(dt, t, rig.position.z, beat, 0.3, camera.position.z);
      flt.update(dt, t, beat, 0.25, world.night, 0);
      lanes.update(dt, t, [], previewT, 1.6, [], beat % 1, 0);
      dancers[lead].mode = 'dance';
      dancers[other(lead)].mode = 'dance';
      poseKids(dt, t, beat, 0.2);
      aimCamera(dt, t);
      world.env.follow(tmp.set(0, 0, rig.position.z - 2));
    };
    aimCamera(0, 0);

    // ------------------------------------------------ pick a song (and who leads)
    const open = (i) => i === 0 || (prog[SONGS[i - 1].id]?.stars || 0) >= 1;
    const starsText = (n) => (n === 1 ? '1 star' : `${n} stars`);
    const choose = async () => {
      for (;;) {
        const L = nameOf(lead);
        const P = nameOf(other(lead));
        const id = await hud.choose({
          title: 'Roji Land Parade',
          text: `${L} dances in front and ${P} dances along. Pick a song.`,
          options: [
            ...SONGS.map((s, i) => {
              const p = prog[s.id];
              return { id: s.id, label: open(i) ? s.name : `${s.name} (locked)`, sub: open(i) ? (p ? `${starsText(p.stars)} of 3, best ${p.best}` : s.sub) : `Get a star on ${SONGS[i - 1].name} to open it` };
            }),
            { id: 'swap', label: `Let ${P} lead`, sub: `${L} dances along` },
          ],
        });
        if (flow.disposed) return -1;
        if (!id) {
          ctx.end({ quit: true });
          return -1;
        }
        if (id === 'swap') {
          lead = other(lead);
          ctx.save('lead', lead);
          placeRoles();
          sound?.ui?.('swoosh');
          continue;
        }
        let i = Math.max(0, SONGS.findIndex((s) => s.id === id));
        if (!open(i)) {
          hud.message('Locked for now', 1200);
          while (i > 0 && !open(i)) i--;
        }
        return i;
      }
    };
    dbg.choose = (id) => document.querySelector(`.choose [data-c="${id}"]`)?.click();
    dbg.unlock = () => {
      for (const s of SONGS) prog[s.id] = prog[s.id] || { best: 0, stars: 1 };
    };

    choose().then((i) => {
      if (i < 0 || flow.disposed) return;
      const song = SONGS[i];
      if (song.time !== world.time) {
        world.remove();
        world = buildWorld(song.time);
      }
      flow.preview = null;
      flow.game = play(song, i);
    });

    // ------------------------------------------------ one song
    function play(song, si) {
      const chart = buildChart(song);
      const notes = chart.notes;
      const partner = other(lead);
      const band = new Band(sound, { me: lead, partner });
      band.load(chart.music);
      if (song.time === 'night') for (const n of notes) if (n.special) n.gold = true;
      const mine = notes.filter((n) => n.owner !== 'partner');
      const total = mine.length + mine.filter((n) => n.end).length;
      const st = { t: -(chart.countIn + 0.8), phase: 'count', score: 0, combo: 0, maxCombo: 0, acc: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 }, holds: 0, missRow: 0, head: 0, sec: -1, bar: -1, endT: 0, lastBubble: -99, twirl: 0, clapI: 0, milestone: 0, hitsAt: new Map() };
      dbg.st = st;
      dbg.notes = notes;
      dbg.chart = chart;
      hud.title('Roji Land Parade', song.name);
      hud.hint('Arrow keys or A S W D in time with the music');
      ui.show(true);
      ui.marks(chart.sections.filter((s) => s.kind === 'duet' || s.kind === 'together').map((s) => [s.t0 / chart.end, s.t1 / chart.end]));
      ui.combo(0, 1);
      if (typeof sound?.setMusicLevel === 'function') sound.setMusicLevel(0);
      const fireworks = new Fireworks(rig, { area: { x: 0, z: -18, w: 28, h0: 7.5, h1: 12.5, depth: 6, ground: 2 }, size: song.time === 'night' ? 0.75 : 0.6, sound, listener: () => 0.75 });
      const leadD = dancers[lead];
      const partD = dancers[partner];
      leadD.mode = 'dance';
      partD.mode = 'dance';
      partD.groove = 0.45;
      const say = (kind) => {
        if (st.t - st.lastBubble < 4) return;
        st.lastBubble = st.t;
        ui.bubble(pick(LINES[partner][kind]), 1.9);
      };

      // beats from the song clock (each section has its own tempo)
      const secs = chart.sections;
      const lastOf = secs.map((_, i) => mine.filter((n) => n.sec === i).pop() || null);
      let b0 = 0;
      for (const s of secs) {
        s.beat0 = b0;
        b0 += (s.t1 - s.t0) / (s.step * 2);
      }
      const beatAt = (time) => {
        if (time < 0) return time / (secs[0].step * 2);
        let s = secs[0];
        for (const x of secs) if (time >= x.t0) s = x;
        return s.beat0 + (time - s.t0) / (s.step * 2);
      };
      const secAt = (time) => {
        let i = 0;
        for (let j = 0; j < secs.length; j++) if (time >= secs[j].t0) i = j;
        return i;
      };

      // ---------------------------------------- input: keys and taps, each with its own time stamp
      const queue = [];
      const kb = [false, false, false, false];
      const touches = new Map();
      const held = [false, false, false, false];
      const padX = [0, 0, 0, 0];
      const padY = [0, 0, 0, 0];
      dbg.pads = { x: padX, y: padY };
      on(window, 'keydown', (e) => {
        const l = KEYS[e.key.toLowerCase()];
        if (l === undefined || document.body.classList.contains('choosing')) return;
        if (e.key.startsWith('Arrow')) e.preventDefault();
        if (e.repeat) return;
        kb[l] = true;
        queue.push({ lane: l, down: true, time: e.timeStamp });
      });
      on(window, 'keyup', (e) => {
        const l = KEYS[e.key.toLowerCase()];
        if (l === undefined) return;
        kb[l] = false;
        queue.push({ lane: l, down: false, time: e.timeStamp });
      });
      const dom = renderer.domElement;
      const laneAt = (x) => {
        let best = 0;
        for (let l = 1; l < 4; l++) if (Math.abs(padX[l] - x) < Math.abs(padX[best] - x)) best = l;
        return best;
      };
      on(dom, 'pointerdown', (e) => {
        if (st.phase !== 'play' && st.phase !== 'count') return;
        const l = laneAt(e.clientX);
        touches.set(e.pointerId, l);
        queue.push({ lane: l, down: true, time: e.timeStamp });
      });
      const up = (e) => {
        if (!touches.has(e.pointerId)) return;
        const l = touches.get(e.pointerId);
        touches.delete(e.pointerId);
        queue.push({ lane: l, down: false, time: e.timeStamp });
      };
      on(dom, 'pointerup', up);
      on(dom, 'pointercancel', up);
      on(window, 'blur', () => {
        kb.fill(false);
        touches.clear();
      });

      // ---------------------------------------- scoring
      const mult = () => 1 + Math.min(3, Math.floor(st.combo / 10));
      const showScore = () => hud.score(`${st.score.toLocaleString('en')} <span style="font-weight:400;font-size:.8em">points</span>`);
      showScore();
      const level = () => Math.min(1, st.combo / 30);
      const wp = new THREE.Vector3();
      const screenOf = (x, y, z) => {
        wp.set(x, y, z);
        rig.localToWorld(wp);
        wp.project(camera);
        return { x: (wp.x * 0.5 + 0.5) * innerWidth, y: (-wp.y * 0.5 + 0.5) * innerHeight };
      };
      const worldOf = (x, y, z) => rig.localToWorld(new THREE.Vector3(x, y, z));

      const milestone = () => {
        // confetti from both sides of the float, a spin from Mimi and Bobo, and a big cheer
        for (const s of [-1, 1]) fx.burst(worldOf(s * 2.3, 1.6, -1.6), ['#ff6f9a', '#ffd166', '#5fb4ff', '#7fd8bf', '#c7a6ff', '#ffffff'], 36);
        flt.mimi.spinT = flt.bobo.spinT = 1.1;
        world.street.cheer(1.8);
        band.cheer(1);
        ui.flash();
        frame.kick = 1;
        sound?.ui?.('coin');
      };

      const hit = (n, grade, at) => {
        n.done = true;
        n.grade = grade;
        st.counts[grade]++;
        st.combo++;
        st.maxCombo = Math.max(st.maxCombo, st.combo);
        st.missRow = 0;
        st.acc += WEIGHT[grade];
        const pts = PTS[grade] * (n.special ? 2 : 1) * mult();
        st.score += pts;
        band.setLead(true);
        band.hit(n.lane, grade);
        lanes.hitFx(n.lane, grade, n.special ? (n.gold ? '#ffd166' : '#ff4d7a') : null);
        flt.flashTile(n.lane);
        const p = screenOf(laneX(n.lane), 0.95, HIT_Z);
        ui.judge(p.x, p.y, grade, WORD[grade]);
        ui.combo(st.combo, mult());
        showScore();
        // the dance move: two arrows at once make a bigger move
        const pair = n.double ? notes.find((o) => o !== n && o.double && Math.abs(o.t - n.t) < 0.001) : null;
        let mv = n.lane;
        if (pair?.done && Math.abs((st.hitsAt.get(pair.id) ?? -9) - at) < 0.15) mv = (n.lane === 0 || n.lane === 3) && (pair.lane === 0 || pair.lane === 3) ? 'wide' : 'star';
        st.hitsAt.set(n.id, at);
        leadD.move(mv);
        if (n.owner === 'both') partD.move(typeof mv === 'number' ? 3 - mv : mv);
        if (n.end) {
          n.holding = true;
          n.holdLane = n.lane;
          if (secs[n.sec].kind === 'together') startTwirl();
          else leadD.spinning = true;
        }
        if (n.special) {
          const m = n.lane < 2 ? flt.mimi : flt.bobo;
          m.throwT = 0.6;
          fx.heartsAt(worldOf(m.x, 3.4, -3.8), 3);
          if (n.gold) fireworks.launch(Math.random() < 0.5 ? 'peony' : 'ring', { x: (Math.random() - 0.5) * 18, z: -18, y: 8 + Math.random() * 4 }, ['#ffd166', '#fff3c4']);
        }
        const ms = Math.floor(st.combo / 25);
        if (ms > st.milestone) {
          st.milestone = ms;
          milestone();
          ui.banner(`${st.combo} in a row!`, 1300);
          if (Math.random() < 0.6) say('cheer');
        }
        if (st.combo === 12) say('cheer');
      };
      const miss = (n) => {
        n.missed = true;
        st.counts.miss++;
        if (st.combo >= 10) band.aww();
        st.combo = 0;
        st.missRow++;
        ui.combo(0, 1);
        band.setLead(false);
        band.miss();
        leadD.move('miss');
        const p = screenOf(laneX(n.lane), 0.95, HIT_Z);
        ui.judge(p.x, p.y, 'miss', WORD.miss);
        if (st.missRow === 3) {
          say('oops');
          flt.mimi.wobT = flt.bobo.wobT = 0.6;
        }
      };
      const endHold = (n, ok) => {
        n.holding = false;
        if (ok) {
          st.acc += 1;
          st.holds++;
          st.score += 50 * mult();
          showScore();
          lanes.hitFx(n.lane, 'perfect');
          const p = screenOf(laneX(n.lane), 0.95, HIT_Z);
          ui.judge(p.x, p.y, 'hold', 'Held!');
          band.hit(n.lane, 'perfect');
        } else n.broken = true;
        leadD.spinning = false;
        if (st.twirl > 0 && secs[n.sec].kind === 'together') stopTwirl(ok);
      };

      // ---------------------------------------- moments: the twirl, and the end of the song
      const roji = dancers.roji;
      const homama = dancers.homama;
      const startTwirl = () => {
        st.twirl = 1;
        roji.spinning = true;
        homama.reach = spot.roji.x < spot.homama.x ? -1 : 1;
        say('twirl');
      };
      const stopTwirl = (ok = true) => {
        st.twirl = 0;
        roji.spinning = false;
        homama.reach = 0;
        if (ok) fx.heartsAt(worldOf((spot.roji.x + spot.homama.x) / 2, DECK_Y + 1.7, KID_Z), 5);
      };
      let twirlTimer = 0;
      const finale = () => {
        st.phase = 'finale';
        st.endT = 0;
        world.street.cheer(3);
        band.cheer(1.3);
        for (const s of [-1, 1]) fx.burst(worldOf(s * 2.3, 1.6, -1.6), ['#ff6f9a', '#ffd166', '#5fb4ff', '#7fd8bf', '#c7a6ff', '#ffffff'], 60);
        fireworks.show(true);
        flt.release = true;
        ui.show(false);
        hud.hint('');
      };
      const results = () => {
        const acc = total ? st.acc / total : 0;
        const stars = acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.5 ? 1 : 0;
        const old = prog[song.id] || { best: 0, stars: 0 };
        const rec = { best: Math.max(old.best, st.score), stars: Math.max(old.stars, stars) };
        prog[song.id] = rec;
        ctx.save('progress', prog);
        const newBest = st.score > old.best && old.best > 0;
        const next = stars >= 1 && old.stars < 1 && si < SONGS.length - 1 ? `<br><b>${SONGS[si + 1].name}</b> is open now.` : '';
        const L = nameOf(lead);
        const line = stars === 3 ? 'Mimi and Bobo want Roji and Homama in every parade now.' : stars === 2 ? 'The whole street danced along.' : stars === 1 ? 'Roji is still smiling. Homama is still holding her hand.' : `${L} will get it next time. One more go?`;
        const c = st.counts;
        ctx.finish({
          win: stars > 0,
          title: stars ? `${stars === 1 ? 'One star' : stars === 2 ? 'Two stars' : 'Three stars'}!` : 'What a parade!',
          text: `${st.score.toLocaleString('en')} points${newBest ? ' (a new best!)' : ''}, best ${rec.best.toLocaleString('en')}.<br>Perfect ${c.perfect}, great ${c.great}, good ${c.good}, missed ${c.miss}. Longest combo ${st.maxCombo}.<br>${line}${next}`,
        });
      };
      // the end of the song: Roji and Homama turn to each other for a hug or a kiss
      const endMoment = (dt) => {
        st.endT += dt;
        const T = st.endT;
        if (T > 0.5 && !st.faced) {
          st.faced = true;
          spot.roji.tx = spot.roji.x < spot.homama.x ? -0.3 : 0.3;
          spot.homama.tx = -spot.roji.tx;
          spot.roji.tz = spot.homama.tz = KID_Z + 0.1;
          spot.roji.tyaw = spot.roji.tx < 0 ? 1.2 : -1.2;
          spot.homama.tyaw = -spot.roji.tyaw;
          leadD.mode = partD.mode = 'still';
        }
        if (T > 1.3 && !st.hugged) {
          st.hugged = true;
          const kind = song.id === 'candy' ? 'kiss' : 'hug';
          kids.homama.emote(kind);
          if (kind === 'hug') kids.roji.emote('hug');
          fx.heartsAt(worldOf(0, DECK_Y + 1.8, KID_Z + 0.1), 6);
          sound?.ui?.('pop');
        }
        if (T > 3.4 && !st.carded) {
          st.carded = true;
          st.phase = 'done';
          results();
        }
      };

      // ---------------------------------------- the frame clock for stamping inputs
      const clock = { perf: performance.now(), song: st.t };
      const countWords = ['3', '2', '1', 'Dance!'];
      let countShown = -1;
      say('start');
      const tip = document.body.classList.contains('touch') ? 'Tap a lane as its arrow reaches the pad' : 'Press each arrow key as its arrow reaches the pad';

      const auto = () => dbg.auto === true;
      return {
        update(dt, t) {
          const sp = Math.max(0.1, dbg.speed || 1);
          const sdt = dt * sp;
          const prevT = st.t;
          st.t += sdt; // (after the last note it keeps the dancers on the beat)
          if (st.phase === 'count') {
            // the count-in clicks: 3, 2, 1, dance
            const ci = Math.floor((st.t + chart.countIn) / (chart.countIn / 4));
            if (ci >= 0 && ci < 4 && ci !== countShown) {
              countShown = ci;
              hud.message(countWords[ci], 500);
            }
            if (st.t >= -0.05) st.phase = 'play';
          }
          const now = performance.now();
          // stamp each input with the song time it happened at
          const span = Math.max(1, now - clock.perf);
          for (const ev of queue) {
            const f = clamp((ev.time - clock.perf) / span, 0, 1);
            ev.songT = clock.song + (st.t - clock.song) * f;
          }
          clock.perf = now;
          clock.song = st.t;
          // a press judges the first arrow in reach in that lane (holds read the held lanes below)
          for (const ev of queue) {
            const l = ev.lane;
            if (ev.down) {
              lanes.press[l] = 1;
              if (st.phase !== 'play') continue;
              let best = null;
              for (let i = st.head; i < notes.length; i++) {
                const n = notes[i];
                if (n.t > ev.songT + WIN.good) break;
                if (n.done || n.missed || n.owner === 'partner' || n.lane !== l) continue;
                if (Math.abs(n.t - ev.songT) <= WIN.good) {
                  best = n;
                  break;
                }
              }
              if (best) {
                const d = Math.abs(best.t - ev.songT);
                hit(best, d <= WIN.perfect ? 'perfect' : d <= WIN.great ? 'great' : 'good', ev.songT);
              }
            }
          }
          queue.length = 0;
          for (let l = 0; l < 4; l++) {
            let h = kb[l];
            for (const v of touches.values()) if (v === l) h = true;
            held[l] = h;
          }
          if (st.phase === 'play') {
            // the test hook plays by itself
            if (auto()) {
              for (let i = st.head; i < notes.length; i++) {
                const n = notes[i];
                if (n.t > st.t) break;
                if (!n.done && !n.missed && n.owner !== 'partner') {
                  lanes.press[n.lane] = 1;
                  hit(n, 'perfect', n.t);
                }
              }
            }
            for (let i = st.head; i < notes.length; i++) {
              const n = notes[i];
              if (n.t > st.t) break;
              // the partner's turn in the duet: they dance it on time
              if (n.owner === 'partner' && !n.done) {
                n.done = true;
                partD.move(n.lane);
                lanes.hitFx(n.lane, 'great', '#c7a6ff');
                lanes.press[n.lane] = 1;
                continue;
              }
              if (!n.done && !n.missed && n.t + WIN.good < st.t) miss(n);
              // holds: keep the lane held to the end of the ribbon
              if (n.holding) {
                const keep = held[n.holdLane] || auto();
                if (st.t >= n.end) endHold(n, true);
                else if (!keep && st.t < n.end - 0.12) endHold(n, false);
                else if (!keep) endHold(n, true);
                else if (Math.floor(st.t * 10) !== Math.floor(prevT * 10)) {
                  st.score += 5 * mult();
                  showScore();
                }
              }
            }
            while (st.head < notes.length && (notes[st.head].done || notes[st.head].missed) && !notes[st.head].holding) st.head++;
            // the parts of the song: a banner, and the duet's turns
            const si2 = secAt(st.t + 0.4);
            if (si2 !== st.sec) {
              st.sec = si2;
              const S = secs[si2];
              let text = S.label;
              if (S.kind === 'intro' && si === 0) text = tip;
              if (S.kind === 'duet') text = `Duet! ${nameOf(partner)} dances first, then you copy`;
              if (S.kind === 'together') text = `Together! ${nameOf(lead)} and ${nameOf(partner)}`;
              ui.banner(text, S.kind === 'intro' && si === 0 ? 3600 : 2200);
              if (S.kind === 'chorus' || S.kind === 'finale') flt.mimi.waveT = flt.bobo.waveT = 1.6;
              if (S.kind === 'chorus') say('cheer');
            }
            const S = secs[secAt(st.t)];
            const barI = Math.floor((st.t - S.t0) / (S.step * 8));
            const owner = S.owners[clamp(barI, 0, S.owners.length - 1)] || 'me';
            // in the duet the partner steps forward for their turn, and claps along for yours
            const L = spot[lead];
            const P = spot[partner];
            if (S.kind === 'duet' && st.t >= S.t0) {
              if (owner === 'partner') {
                P.tz = KID_Z + 0.3;
                L.tz = KID_Z - 0.05;
                partD.mode = 'dance';
                leadD.mode = 'clap';
                partD.groove = 0.7;
              } else {
                P.tz = KID_Z - 0.1;
                L.tz = KID_Z + 0.25;
                partD.mode = 'clap';
                leadD.mode = 'dance';
              }
              const key = `${st.sec}:${Math.floor(barI / 2)}`;
              if (key !== st.turnKey) {
                st.turnKey = key;
                // (the duet's own banner already says who goes first)
                if (barI > 0) ui.banner(owner === 'partner' ? `${nameOf(partner)}\u2019s turn` : 'Your turn: copy it!', 1500);
                if (owner === 'partner' && barI === 0) say('call');
              }
            } else if (S.kind === 'together') {
              L.tz = P.tz = KID_Z + 0.15;
              L.tx = -0.45;
              P.tx = 0.45;
              partD.mode = leadD.mode = 'dance';
              partD.groove = 0.6;
            } else if (!st.twirl) {
              placeRoles();
              leadD.mode = 'dance';
              partD.mode = st.combo >= 8 ? 'dance' : 'clap';
              partD.groove = 0.45;
            }
            // song 1 has no holds: Homama twirls Roji in the rest after the last note of "together"
            if (S.kind === 'together' && !st.twirl && !st.twirled) {
              const lastN = lastOf[secs.indexOf(S)];
              if (lastN && !lastN.end && st.t > lastN.t + 0.05) {
                st.twirled = true;
                startTwirl();
                twirlTimer = Math.max(0.5, S.t1 - st.t - 0.05);
              }
              if (lastN?.end && lastN.holding) st.twirled = true;
            }
            if (twirlTimer > 0) {
              twirlTimer -= sdt;
              if (twirlTimer <= 0) stopTwirl(true);
            }
            if (st.twirl && S.kind !== 'together' && twirlTimer <= 0) stopTwirl(true);
            if (st.t > chart.end + 0.15) finale();
          }
          if (st.phase === 'finale') endMoment(sdt);
          band.update(st.t, sp);
          // the crowd claps along on two and four when the combo is high
          while (st.clapI < chart.beats.length && chart.beats[st.clapI].t < st.t + 0.3 * sp) {
            const b = chart.beats[st.clapI];
            if (level() > 0.6 && st.clapI % 2 === 1 && st.phase === 'play') band.claps(st.t, [b.t], sp);
            st.clapI++;
          }

          // ---------------------------------------- everything moves
          const beat = beatAt(st.t);
          const bph = ((beat % 1) + 1) % 1;
          const lv = st.phase === 'finale' || st.phase === 'done' ? 1 : level();
          rig.position.z += dt * SPEED;
          world.street.update(dt, t, rig.position.z, beat, lv * 0.8 + 0.2, camera.position.z);
          flt.update(dt, t, beat, lv, world.night, st.phase === 'finale' ? Math.max(0, 1 - st.endT) : 0);
          lanes.update(dt, t, notes, st.t, song.approach, chart.beats, bph, st.head);
          for (let l = 0; l < 4; l++) lanes.held[l] = held[l];
          poseKids(dt, t, beat, lv);
          fireworks.update(dt);
          frame.kick = Math.max(0, frame.kick - dt * 2.5);
          frame.push = damp(frame.push, secs[secAt(st.t)]?.kind === 'duet' && st.phase === 'play' ? 1 : 0, 1.5, dt);
          aimCamera(dt, t, st.phase === 'finale' || st.phase === 'done' ? Math.min(1, st.endT * 0.6) : 0);
          world.env.follow(tmp.set(0, 0, rig.position.z - 2));
          // where the pads are on screen (for taps), and the bubble over the partner
          for (let l = 0; l < 4; l++) {
            const p = screenOf(laneX(l), 0.2, HIT_Z);
            padX[l] = p.x;
            padY[l] = p.y;
          }
          const pk = spot[partner];
          ui.update(dt, screenOf(pk.x, DECK_Y + 1.75, pk.z));
          ui.progress(st.t / chart.end);
        },
        dispose() {
          band.stop();
        },
      };
    }

    // test hook: dbg.skip(sec) jumps the song clock forward (notes on the way count as missed, or
    // as perfect while auto is on)
    dbg.skip = (sec) => {
      const g = flow.game;
      if (!g || !dbg.st) return;
      dbg.st.t = Math.max(dbg.st.t, sec);
    };
    Object.defineProperty(dbg, 'state', {
      get: () => (dbg.st ? { phase: dbg.st.phase, t: +dbg.st.t.toFixed(2), score: dbg.st.score, combo: dbg.st.combo, counts: { ...dbg.st.counts }, holds: dbg.st.holds, lead } : { phase: 'choose', lead }),
    });

    return {
      update(dt, t) {
        if (flow.game) flow.game.update(dt, t);
        else flow.preview?.(dt, t);
      },
      dispose() {
        flow.disposed = true;
        flow.game?.dispose();
        for (const off of listeners) off();
        ui.remove();
        camera.fov = 45;
        camera.updateProjectionMatrix();
        if (typeof sound?.setMusicLevel === 'function') sound.setMusicLevel(0.25);
        if (window.__parade === dbg) delete window.__parade;
      },
    };
  },
};
