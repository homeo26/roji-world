// Fencing Duel: a 3D bout on the piste. Advance and retreat, lunge to touch, parry the
// partner's attack when the blade flashes, then riposte. First to five touches.
import * as THREE from 'three';
import { damp, dampAngle, clamp, easeInOut } from '../util.js';
import * as K from './riding/kit.js';
import { buildHall, PISTE_HALF } from './riding/hall.js';
import { whites, dressFencer, POSES, lerpPose, applyPose, setWrist } from './riding/fencer.js';

const GUARD = 1.75; // en garde lines at -GUARD and +GUARD
const HALF = PISTE_HALF - 0.4;
const MIN_GAP = 0.9;
const REACH = 1.85; // body-to-body distance a lunge can touch
const SPEED = 1.7;
const EXT = 0.17; // lunge extension
const HOLD = 0.12;
const REC = 0.34;
const RIP_EXT = 0.1;
const PARRY_ON = 0.4;
const PARRY_CD = 0.34;
const PARRIED = 0.6;
const RIPOSTE_WIN = 0.8;
const TOUCHES = 5;
const POINT_DUR = 1.9;
const READY_DUR = 1.1;

const CSS = `${K.BASE_CSS}
.rr-float { position: absolute; transform: translate(-50%, -100%); font-weight: 700; font-size: clamp(.95rem, 2.6vw, 1.35rem); color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.18), 0 6px 14px rgba(0,0,0,.25); white-space: nowrap; opacity: 0; }
.rr-warn { position: absolute; transform: translate(-50%, -100%); width: 34px; height: 34px; border-radius: 50%; background: #ffd166; color: #3b2b3f; font-weight: 700; font-size: 1.3rem; display: grid; place-items: center; box-shadow: 0 0 0 4px rgba(255,209,102,.4), 0 6px 14px rgba(60,30,40,.25); opacity: 0; transition: opacity .1s; }
.rr-warn.on { opacity: 1; animation: rr-bob .3s ease-in-out infinite alternate; }
@keyframes rr-bob { to { margin-top: -6px; } }
.rr-say { position: absolute; left: 50%; bottom: max(54px, calc(env(safe-area-inset-bottom) + 50px)); transform: translateX(-50%); background: rgba(255,250,244,.92); border-radius: 999px; padding: 5px 14px; font-weight: 600; font-size: .9rem; box-shadow: 0 6px 18px rgba(60,30,40,.12); white-space: nowrap; }
.rr-say:empty { display: none; }
body.touch .rr-say { bottom: max(16px, env(safe-area-inset-bottom)); max-width: calc(100vw - 360px); overflow: hidden; text-overflow: ellipsis; }
`;

export default {
  id: 'fencing',
  title: 'Fencing Duel',
  tagline: 'First to 5 touches',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    ctx.env.indoor({ color: '#f3d6c4', warm: 1.05 });
    const meId = ctx.me;
    const themId = ctx.partner;
    const meLook = looks[meId];
    const themLook = looks[themId];
    const colors = [meId === 'roji' ? '#ef5b6f' : '#3f7bf0', themId === 'roji' ? '#ef5b6f' : '#3f7bf0'];
    const hall = buildHall(ctx, { guard: GUARD, names: [meLook.name, themLook.name], colors });

    // ---------------------------------------------------------------- fencers
    function makeFencer(id, look, color, x, dir) {
      const kid = ctx.makeKid(whites(look));
      kid.onEmoteFx = (type) => type === 'heart' && fx.heartsAt(kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 5);
      const gear = dressFencer(kid, color);
      K.bakeLiveKid(kid, [gear.mask, gear.wrist]);
      scene.add(kid.root);
      kid.root.position.set(x, 0.05, 0);
      kid.root.rotation.y = (dir * Math.PI) / 2;
      return {
        id,
        look,
        name: look.name,
        color,
        kid,
        gear,
        x,
        dir,
        state: 'idle',
        t: 0,
        ext: EXT,
        checked: true,
        parryCd: 0,
        riposte: 0,
        move: 0,
        stepPh: 0,
        score: 0,
        pose: { ...POSES.stand },
        queue: null,
        queueT: 0,
        wind: 0,
        windExt: EXT,
        windRip: false,
        isRiposte: false,
        dodge: 0,
        salute: null,
        stance: 'stand', // stand | guard
        sweep: 0,
      };
    }
    const me = makeFencer(meId, meLook, colors[0], -GUARD, 1);
    const them = makeFencer(themId, themLook, colors[1], GUARD, -1);
    const other = (f) => (f === me ? them : me);

    // Referee
    const ref = ctx.makeKid({ id: 'ref', name: 'Referee', gender: 'boy', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'sidepart', outfit: 'tee-pants', top: '#2c3e66', bottom: '#3b2b3f', shoes: '#3b2b3f', accent: '#ffd166' });
    const tie = new THREE.Group();
    for (const s of [1, -1]) {
      const w = K.ball(0.045, '#ef5b6f', {}, 8);
      w.scale.set(1.3, 0.8, 0.5);
      w.position.x = 0.045 * s;
      tie.add(w);
    }
    tie.add(K.ball(0.025, '#c94f5f', {}, 8));
    tie.position.set(0, 0.74, 0.14);
    ref.body.add(tie);
    const whistle = K.cyl(0.02, 0.02, 0.06, '#ffd166', 8, { metal: 0.4, rough: 0.3 });
    whistle.rotation.x = Math.PI / 2;
    whistle.position.set(0.05, 0.6, 0.2);
    ref.body.add(whistle);
    K.bakeLiveKid(ref);
    ref.root.position.set(0, 0, -1.7);
    scene.add(ref.root);
    let refArm = null; // { side: -1 | 1 | 0 (both), t }

    // ---------------------------------------------------------------- HUD
    const ui = K.overlay(
      CSS,
      `<div class="rr-pop"></div>
       <div class="rr-warn">!</div>
       <div class="rr-say"></div>
       <div class="rr-float"></div><div class="rr-float"></div><div class="rr-float"></div>`,
    );
    const pop = K.popper(ui.$('.rr-pop'));
    const warnEl = ui.$('.rr-warn');
    const sayEl = ui.$('.rr-say');
    const floats = [...ui.el.querySelectorAll('.rr-float')].map((el) => ({ el, t: 9, pos: new THREE.Vector3() }));
    let floatNext = 0;
    const say = (text) => (sayEl.textContent = text);
    function float(text, color, f) {
      // A new word over the same fencer replaces the old one instead of overlapping it
      for (const o of floats) if (o.f === f) o.t = 9;
      const q = floats[floatNext++ % floats.length];
      q.f = f;
      q.el.textContent = text;
      q.el.style.color = color;
      q.t = 0;
      q.pos.copy(f.kid.root.position).add(new THREE.Vector3(0, 2.0, 0));
    }
    hud.buttons({ action: 'Lunge', jump: 'Parry' });
    hud.hint('A and D or arrows to move, E to lunge, Space to parry');
    const updateScore = () => {
      hud.score(`<b style="color:${me.color}">${me.score}</b> : <b style="color:${them.color}">${them.score}</b>`);
      hall.setScore(me.score, them.score);
    };
    updateScore();

    // ---------------------------------------------------------------- state
    let phase = 'intro'; // intro | ready | play | point | over
    let phaseT = 0;
    let clock = 0;
    let scorer = null;
    let finished = false;
    const ai = { want: 3, think: 0.4, cd: 1.6, plan: null };
    const wins = ctx.load('wins', 0);
    const dbg = { fast: 1, me, them, get phase() { return phase; }, auto: false };
    window.__riding = dbg;
    const tmp = new THREE.Vector3();

    function resetPositions() {
      for (const f of [me, them]) {
        f.x = f === me ? -GUARD : GUARD;
        f.state = 'idle';
        f.t = 0;
        f.checked = true;
        f.parryCd = 0;
        f.riposte = 0;
        f.move = 0;
        f.queue = null;
        f.dodge = 0;
        f.stance = 'guard';
      }
      ai.plan = null;
      ai.cd = 1.2 + Math.random() * 0.9;
      ai.think = 0.3;
      scorer = null;
      phase = 'ready';
      phaseT = 0;
      hud.message('En garde!', 900);
      refArm = { side: 0, t: 0 };
      say(`First to ${TOUCHES} touches`);
    }

    // ---------------------------------------------------------------- actions
    function startLunge(f, ext, rip) {
      f.state = 'lunge';
      f.t = 0;
      f.ext = ext;
      f.checked = false;
      f.isRiposte = rip;
      f.riposte = 0;
      f.move = 0;
      sound.ui('swoosh');
      if (f === me) aiOnPlayerLunge();
    }
    function startParry(f) {
      f.state = 'parry';
      f.t = 0;
      f.parryCd = PARRY_ON + PARRY_CD;
      f.move = 0;
    }
    function startWindup(f, wind, ext, rip) {
      f.state = 'windup';
      f.t = 0;
      f.wind = wind;
      f.windExt = ext;
      f.windRip = rip;
      f.move = 0;
      K.sfx.stomp(sound);
    }
    const canLunge = (f) => f.state === 'idle' || (f.state === 'parry' && f.riposte > 0);
    function lungeInput() {
      if (phase !== 'play') return;
      if (canLunge(me)) startLunge(me, me.riposte > 0 ? RIP_EXT : EXT, me.riposte > 0);
      else {
        me.queue = 'lunge';
        me.queueT = 0.2;
      }
    }
    function parryInput() {
      if (phase !== 'play') return;
      if (me.state === 'idle' && me.parryCd <= 0) startParry(me);
      else if (me.state !== 'parry') {
        me.queue = 'parry';
        me.queueT = 0.15;
      }
    }

    function resolve(att, def) {
      att.checked = true;
      const dist = Math.abs(att.x - def.x);
      if (dist > REACH + 0.12) {
        float('Too far', '#fff6c8', att);
        if (att === me) {
          say(`Too far. Step in closer first.`);
          aiOnPlayerMiss();
        } else say(`${them.name} fell short. Counter now!`);
        return;
      }
      if (def.state === 'parry' && def.t <= PARRY_ON + 0.02) {
        att.state = 'parried';
        att.t = 0;
        def.t = Math.min(def.t, PARRY_ON * 0.5);
        def.riposte = RIPOSTE_WIN;
        def.parryCd = 0;
        def.sweep = 1;
        clash(att);
        float('Parry!', '#ffe08a', def);
        if (def === me) say('Parry! Riposte now!');
        else {
          say(`${them.name} parries!`);
          aiOnParry();
        }
        return;
      }
      if (def.state === 'lunge' && !def.checked && def.ext - def.t <= 0.07) {
        def.checked = true;
        doubleTouch();
        return;
      }
      touchScored(att, def);
    }

    function clash(att) {
      att.gear.tip.getWorldPosition(tmp);
      fx.burst(tmp, ['#ffd166', '#ffffff'], 18);
      K.sfx.clash(sound);
    }

    function touchScored(att, def) {
      att.score++;
      def.state = 'hit';
      def.t = 0;
      phase = 'point';
      phaseT = 0;
      scorer = att;
      hall.light(att === me ? 0 : 1);
      att.gear.tip.getWorldPosition(tmp);
      fx.burst(tmp, [att.color, '#ffffff', '#ffd166'], 20);
      K.sfx.buzzer(sound, att === me);
      hall.crowd.cheer(1);
      K.sfx.cheer(sound, 0.05, 1.2);
      updateScore();
      float(att.isRiposte ? 'Riposte!' : 'Touch!', '#ffffff', att);
      pop(`${att.name} scores`, att.color, 1300);
      say(`${att.name} scores${att.isRiposte ? ' with a riposte' : ''}`);
      refArm = { side: att === me ? -1 : 1, t: 0 };
      sound.ui(att === me ? 'good' : 'bad');
    }

    function doubleTouch() {
      phase = 'point';
      phaseT = 0;
      scorer = null;
      hall.light('both');
      K.sfx.buzzer(sound, true);
      pop('Double touch', '#fff6c8', 1200);
      say('Both hit at once. No point.');
      refArm = { side: 0, t: 0 };
    }

    // ---------------------------------------------------------------- computer
    const parryChance = () => (them.score - me.score >= 2 ? 0.22 : me.score - them.score >= 2 ? 0.42 : 0.32);
    const windDur = () => (me.score + them.score >= 4 ? 0.48 : 0.56);
    function aiOnPlayerLunge() {
      const dist = them.x - me.x;
      if (dist > REACH + 0.2) return;
      if (them.state === 'windup') {
        if (Math.random() < 0.5) ai.plan = { kind: 'parry', at: clock + 0.03 };
        return;
      }
      if (them.state !== 'idle') return;
      const r = Math.random();
      if (r < parryChance()) ai.plan = { kind: 'parry', at: clock + 0.02 + Math.random() * 0.07 };
      else if (r < parryChance() + 0.14) ai.plan = { kind: 'dodge', at: clock + 0.02 };
    }
    function aiOnPlayerMiss() {
      if (them.state === 'idle' && Math.random() < 0.5) ai.plan = { kind: 'attack', at: clock + 0.06 + Math.random() * 0.12, wind: 0.32, ext: EXT, rip: false };
    }
    function aiOnParry() {
      if (Math.random() < 0.55) ai.plan = { kind: 'attack', at: clock + 0.1 + Math.random() * 0.28, wind: 0.16, ext: RIP_EXT, rip: true };
    }
    function updateAI(dt) {
      const dist = them.x - me.x;
      if (ai.plan && clock >= ai.plan.at) {
        const pl = ai.plan;
        ai.plan = null;
        if (pl.kind === 'parry' && (them.state === 'idle' || them.state === 'windup')) startParry(them);
        else if (pl.kind === 'dodge' && them.state === 'idle') them.dodge = 0.35;
        else if (pl.kind === 'attack' && (them.state === 'idle' || (them.state === 'parry' && them.riposte > 0)) && me.state !== 'hit') startWindup(them, pl.wind, pl.ext, pl.rip);
      }
      if (them.state !== 'idle') return;
      if (them.dodge > 0) {
        them.dodge -= dt;
        them.move = -1.4;
        return;
      }
      ai.think -= dt;
      if (ai.think <= 0) {
        ai.think = 0.45 + Math.random() * 0.9;
        ai.want = Math.random() < 0.15 ? 3.6 : 1.8 + Math.random() * 1.4;
        if (them.x > HALF - 1.2) ai.want = Math.min(ai.want, 2.1);
      }
      them.move = dist > ai.want + 0.15 ? 1 : dist < ai.want - 0.15 ? -1 : 0;
      ai.cd -= dt;
      if (ai.cd <= 0 && !ai.plan && me.state !== 'hit') {
        const inRange = dist <= REACH + 0.05;
        const sloppy = dist <= REACH + 0.8 && Math.random() < 0.22;
        if (inRange || sloppy) {
          startWindup(them, windDur(), EXT, false);
          ai.cd = 1.1 + Math.random() * 1.5;
        } else ai.cd = 0.2;
      }
    }

    // Test helper: a simple player brain
    function autoPlayer() {
      const dist = them.x - me.x;
      if (them.state === 'windup' && them.t > them.wind - 0.2 && me.state === 'idle' && me.parryCd <= 0) parryInput();
      else if (me.riposte > 0 && them.state === 'parried') lungeInput();
      else if (me.state === 'idle' && dist < REACH - 0.1 && Math.random() < 0.05) lungeInput();
      return dist > 1.7 ? 1 : dist < 1.3 ? -1 : 0;
    }

    // ---------------------------------------------------------------- update
    function stepFencer(f, dt, live) {
      f.t += dt;
      f.parryCd -= dt;
      f.riposte = Math.max(0, f.riposte - dt);
      f.sweep = Math.max(0, f.sweep - dt * 4);
      if (f.queue) {
        f.queueT -= dt;
        if (f.queueT <= 0) f.queue = null;
      }
      if (f.state === 'idle' && live && f.move) {
        f.x += f.move * f.dir * SPEED * dt;
        f.stepPh += dt * 2.6 * Math.sign(f.move);
      }
      if (f.state === 'windup') {
        if (live && Math.abs(f.x - other(f).x) > REACH - 0.3) f.x += f.dir * 1.4 * dt;
        if (f.t >= f.wind) startLunge(f, f.windExt, f.windRip);
      } else if (f.state === 'lunge') {
        if (live && !f.checked && f.t >= f.ext) resolve(f, other(f));
        if (f.state === 'lunge' && f.t >= f.ext + HOLD + REC) {
          f.state = 'idle';
          f.t = 0;
        }
      } else if (f.state === 'parry') {
        if (f.t >= PARRY_ON) {
          f.state = 'idle';
          f.t = 0;
        }
      } else if (f.state === 'parried') {
        if (f.t >= PARRIED) {
          f.state = 'idle';
          f.t = 0;
        }
      }
      if (live && f === me && f.queue && f.state === 'idle') {
        const q = f.queue;
        f.queue = null;
        if (q === 'lunge') startLunge(me, me.riposte > 0 ? RIP_EXT : EXT, me.riposte > 0);
        else if (q === 'parry' && me.parryCd <= 0) startParry(me);
      }
      if (live && f === me && f.queue === 'lunge' && f.state === 'parry' && f.riposte > 0) {
        f.queue = null;
        startLunge(me, RIP_EXT, true);
      }
    }

    function keepApart() {
      me.x = clamp(me.x, -HALF, HALF);
      them.x = clamp(them.x, -HALF, HALF);
      const overlap = me.x - (them.x - MIN_GAP);
      if (overlap > 0) {
        me.x -= overlap / 2;
        them.x += overlap / 2;
        if (them.x > HALF) {
          me.x -= them.x - HALF;
          them.x = HALF;
        }
        if (me.x < -HALF) {
          them.x += -HALF - me.x;
          me.x = -HALF;
        }
      }
    }

    function targetPose(f) {
      if (f.stance === 'stand') return POSES.stand;
      const ease = (k) => k * k * (3 - 2 * k);
      switch (f.state) {
        case 'windup':
          return lerpPose(POSES.idle, POSES.windup, ease(clamp(f.t / (f.wind * 0.6), 0, 1)));
        case 'lunge':
          if (f.t < f.ext) return lerpPose(POSES.idle, POSES.lunge, 1 - Math.pow(1 - f.t / f.ext, 2));
          if (f.t < f.ext + HOLD) return POSES.lunge;
          return lerpPose(POSES.lunge, POSES.idle, ease(clamp((f.t - f.ext - HOLD) / REC, 0, 1)));
        case 'parry':
          return POSES.parry;
        case 'parried':
          return f.t < 0.25 ? POSES.parried : lerpPose(POSES.parried, POSES.idle, ease(clamp((f.t - 0.25) / (PARRIED - 0.25), 0, 1)));
        case 'hit':
          return POSES.hit;
        default:
          return POSES.idle;
      }
    }

    // Intro and ending, timed in game seconds so they follow the frame rate
    let cues = new Set();
    let cuePhase = '';
    const cue = (key, at) => {
      if (cuePhase !== phase) {
        cues = new Set();
        cuePhase = phase;
      }
      if (phaseT < at || cues.has(key)) return false;
      cues.add(key);
      return true;
    };
    function salute() {
      for (const f of [me, them]) f.salute = 0;
    }
    function stepScript() {
      if (phase === 'intro') {
        if (cue('salute', 0.5)) {
          salute();
          say('Salute your opponent');
        }
        if (cue('bow', 1.35)) for (const f of [me, them]) f.kid.emote('bow');
        if (cue('mask', 2.4)) {
          for (const f of [me, them]) {
            f.salute = null;
            f.gear.setMask(true);
            fx.poof(f.kid.head.getWorldPosition(tmp));
          }
          sound.ui('pop');
        }
        if (cue('go', 2.9)) resetPositions();
      } else if (phase === 'ready' && phaseT >= READY_DUR) {
        phase = 'play';
        phaseT = 0;
        hud.message('Allez!', 700);
        K.sfx.whistle(sound);
        refArm = null;
      } else if (phase === 'point' && phaseT >= POINT_DUR) {
        if (me.score >= TOUCHES || them.score >= TOUCHES) {
          phase = 'over';
          phaseT = 0;
        } else resetPositions();
      } else if (phase === 'over') {
        if (cue('masks', 0.05)) {
          for (const f of [me, them]) {
            f.stance = 'stand';
            f.state = 'idle';
            f.gear.setMask(false);
            fx.poof(f.kid.head.getWorldPosition(tmp));
          }
          sound.ui('pop');
          say('Masks off. Salute!');
        }
        if (cue('salute', 0.5)) salute();
        if (cue('bow', 1.35)) for (const f of [me, them]) f.kid.emote('bow');
        if (cue('cheer', 2.3)) {
          const win = me.score >= TOUCHES ? me : them;
          const lose = other(win);
          for (const f of [me, them]) {
            f.salute = null;
            f.faceCam = true;
          }
          win.kid.emote('cheer');
          lose.kid.emote('heart');
          fx.burst(win.kid.head.getWorldPosition(new THREE.Vector3()).setY(2.2), [win.color, '#ffd166', '#ffffff', '#ff9eb5'], 70);
          hall.crowd.cheer(1);
          K.sfx.cheer(sound, 0.08, 2);
          say(win === me ? `${me.name} wins the duel!` : `${them.name} wins the duel`);
        }
        if (cue('end', 4.2) && !finished) endDuel();
      }
    }

    function endDuel() {
      finished = true;
      const win = me.score >= TOUCHES;
      let n = wins;
      if (win) {
        n = wins + 1;
        ctx.save('wins', n);
      }
      ctx.finish({
        win,
        score: me.score,
        opp: them.score,
        title: win ? `${me.name} wins the duel!` : `${them.name} wins the duel`,
        text: win
          ? `Final score ${me.score} to ${them.score}. Duels won: ${n}. ${them.name} sends a big heart.`
          : `Final score ${me.score} to ${them.score}. Parry when ${them.name}'s blade flashes, then riposte.`,
      });
    }

    function step(dt) {
      clock += dt;
      phaseT += dt;
      const live = phase === 'play';
      if (live) {
        const ax = input.axis();
        let mv = Math.abs(ax.x) > 0.3 ? Math.sign(ax.x) : 0;
        if (input.pressed('action')) lungeInput();
        if (input.pressed('jump')) parryInput();
        if (dbg.auto) mv = autoPlayer();
        me.move = me.state === 'idle' ? mv : 0;
        updateAI(dt);
      } else {
        me.move = 0;
        them.move = 0;
      }
      stepFencer(me, dt, live);
      stepFencer(them, dt, live);
      if (phase === 'over') {
        // Walk back to the en garde lines for the closing salute
        for (const f of [me, them]) {
          const home = f === me ? -GUARD : GUARD;
          const before = f.x;
          f.x = damp(f.x, home, 2.2, dt);
          f.walk = Math.min(1, Math.abs(f.x - before) / dt / 1.2);
        }
      }
      keepApart();
      stepScript();
      for (const f of [me, them]) if (f.salute !== null) f.salute += dt;
      if (refArm) refArm.t += dt;
    }

    // ---------------------------------------------------------------- visuals
    const camPos = new THREE.Vector3(0, 3.4, 11.5);
    const camLook = new THREE.Vector3(0, 1.1, 0);
    function poseAll(dt, t) {
      for (const f of [me, them]) {
        const tp = targetPose(f);
        const rate = f.state === 'lunge' && f.t < f.ext + HOLD ? 45 : 16;
        const a = 1 - Math.exp(-dt * rate);
        for (const key in tp) f.pose[key] += (tp[key] - f.pose[key]) * a;
        const k = f.kid;
        k.update(dt, t, 0, 0, 0);
        const emoting = k.emoteType === 'cheer' || k.emoteType === 'heart';
        let step = f.move && f.state === 'idle' && phase === 'play' ? Math.sin(f.stepPh * Math.PI * 2) : 0;
        if (phase === 'over' && f.walk > 0.05) step = Math.sin(t * 9) * f.walk;
        if (!emoting) applyPose(k, f.pose, f.dir, { step, salute: f.salute, twist: f.stance === 'stand' ? 0.35 : 0.45 });
        if (k.emoteType === 'bow') k.body.rotation.x += 0.45 * Math.sin(Math.min(1, k.emoteTime / 1.4) * Math.PI);
        const sweep = f.state === 'parry' ? Math.sin(Math.min(1, f.t / 0.12) * Math.PI) * 0.5 : 0;
        setWrist(f.gear, f.pose, sweep + f.sweep * 0.3);
        const shift = Math.min(f.pose.shift, Math.max(0, Math.abs(f.x - other(f).x) - 0.75));
        k.root.position.set(f.x + shift * f.dir, 0.05, 0);
        k.root.rotation.y = f.faceCam ? dampAngle(k.root.rotation.y, -f.dir * 0.25, 5, dt) : (f.dir * Math.PI) / 2;
        // The tip glows while winding up: the tell to parry
        const tell = f.state === 'windup' ? 0.6 + Math.sin(t * 30) * 0.4 : f.riposte > 0 ? 0.5 : 0;
        f.gear.tipMat.emissiveIntensity = damp(f.gear.tipMat.emissiveIntensity, tell * 2.2, 20, dt);
        f.gear.tip.scale.setScalar(1 + tell * 1.4);
      }
      // Referee
      ref.update(dt, t, 0, 0, 0);
      const [rL, rR] = ref.arms;
      if (refArm) {
        const k = Math.min(1, refArm.t * 5);
        if (refArm.side === 0) {
          rL.rotation.set(-0.2, 0, 0.18 + 1.3 * k);
          rR.rotation.set(-0.2, 0, -0.18 - 1.3 * k);
        } else if (refArm.side > 0) rL.rotation.set(-0.3, 0, 0.18 + 2.3 * k);
        else rR.rotation.set(-0.3, 0, -0.18 - 2.3 * k);
      }
      ref.head.rotation.y = damp(ref.head.rotation.y, clamp((me.x + them.x) * 0.15, -0.6, 0.6), 4, dt);
    }

    function updateCamera(dt) {
      const vt = Math.tan((camera.fov * Math.PI) / 360);
      const tanH = vt * camera.aspect;
      const sep = Math.abs(them.x - me.x);
      let mid = clamp((me.x + them.x) / 2, -HALF + 1.2, HALF - 1.2);
      // Wide phone screens: step back a little and look level so the wall scoreboard stays in frame
      const wide = camera.aspect > 1.8;
      let dist = clamp(Math.max((sep + 3.2) / 2 / tanH, 2.4 / 2 / vt), wide ? 4.5 : 4.0, 9);
      if (phase === 'point' && scorer) {
        mid = damp(mid, scorer.x, 1, Math.min(phaseT, 0.8));
        dist *= wide ? 0.94 : 0.86;
      }
      if (phase === 'over') dist = clamp((sep + 3.6) / 2 / tanH, 4.6, 9);
      const want = new THREE.Vector3(mid, 1.3, dist);
      const look = new THREE.Vector3(mid, wide ? 1.2 : 0.88, 0);
      if (phase === 'intro') {
        const k = easeInOut(clamp(phaseT / 2.8, 0, 1));
        want.lerpVectors(new THREE.Vector3(0, 2.8, 9.5), want, k);
        look.lerpVectors(new THREE.Vector3(0, 1.1, -0.6), look, k);
      }
      camPos.lerp(want, 1 - Math.exp(-4 * dt));
      camLook.lerp(look, 1 - Math.exp(-5 * dt));
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      camera.updateMatrixWorld();
    }

    function updateHud(dt) {
      const warn = phase === 'play' && them.state === 'windup';
      K.hotButton('jump', warn);
      K.hotButton('action', phase === 'play' && me.riposte > 0 && them.state === 'parried');
      warnEl.classList.toggle('on', warn);
      const v = new THREE.Vector3();
      if (warn) {
        them.kid.head.getWorldPosition(v).add(new THREE.Vector3(0, 0.75, 0)).project(camera);
        warnEl.style.left = `${((v.x + 1) / 2) * 100}%`;
        warnEl.style.top = `${((1 - v.y) / 2) * 100}%`;
      }
      for (const q of floats) {
        q.t += dt;
        const k = q.t / 1.1;
        if (k > 1) {
          q.el.style.opacity = '0';
          continue;
        }
        v.copy(q.pos).add(new THREE.Vector3(0, k * 0.5, 0)).project(camera);
        q.el.style.left = `${((v.x + 1) / 2) * 100}%`;
        q.el.style.top = `${Math.max(16, ((1 - v.y) / 2) * 100)}%`; // stay below the top bar on short screens
        q.el.style.opacity = String(Math.min(1, (1 - k) * 3));
      }
    }

    // Fake a press for the dev harness tests
    dbg.press = (what) => (what === 'lunge' ? lungeInput() : parryInput());

    return {
      update(dt, t) {
        const n = clamp(Math.round(dbg.fast) || 1, 1, 24);
        for (let k = 0; k < n; k++) step(dt);
        poseAll(dt * n, t);
        hall.update(dt, t);
        updateCamera(dt);
        updateHud(dt);
      },
      dispose() {
        ui.remove();
        if (window.__riding === dbg) delete window.__riding;
      },
    };
  },
};
