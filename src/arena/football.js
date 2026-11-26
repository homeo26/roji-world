// Football: a 3D match in the Sunny Kicks stadium. Team up with your partner against the Sunny Stars,
// or play one vs one against your partner, each with a goalkeeper. Two short halves, first to 3 goals.
// Stick to run, hold the action button to charge a shot and let go to shoot, action without the ball
// to tackle, jump to pass to your teammate (or to call for the ball, or to chip in one vs one).
// Online (both in a room and both play): Roji and Homama are one team against the Sunny Stars, each
// running their own kid. The device that started the game (the host) runs the ball, the computer
// players, the goals and the clock; the other device runs its own kid and sends its kicks and tackles.
import * as THREE from 'three';
import { damp, dampAngle, clamp, lerp } from '../util.js';
import * as K from './riding/kit.js';
import { buildStadium, A } from '../places/football/stadium.js';
import { PAL, makeBall, blobShadow, sfx as FS } from '../places/football/models.js';
import { Link, lerpA } from './duels/link.js';

const { L, W, GW, GH, GD, BX, BZ } = A;
const R = 0.24; // ball radius
const G = 18;
const HALF = 60; // seconds per half
const TO_WIN = 3;
const TEAL = PAL.teal;

const LOOKS = {
  pip: { id: 'pip', name: 'Pip', gender: 'boy', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'spiky', outfit: 'tee-pants', top: '#ffd166', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' },
  nova: { id: 'nova', name: 'Nova', gender: 'girl', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'buns', outfit: 'tee-pants', top: '#c7a6ff', bottom: '#3b2b3f', shoes: '#ffffff', accent: '#ff9eb5' },
  lulu: { id: 'lulu', name: 'Lulu', gender: 'girl', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'ponytail', outfit: 'tee-shorts', top: TEAL, bottom: '#fffaf4', shoes: '#3b2b3f', accent: '#ffd166' },
  teo: { id: 'teo', name: 'Teo', gender: 'boy', skin: '#9c6a4a', hair: '#141010', hairstyle: 'curly', outfit: 'tee-shorts', top: TEAL, bottom: '#fffaf4', shoes: '#ffffff', accent: '#ffd166' },
  ref: { id: 'ref', name: 'Ref', gender: 'boy', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'sidepart', outfit: 'tee-shorts', top: '#3b2b3f', bottom: '#3b2b3f', shoes: '#ffffff', accent: '#ffd166' },
};

const CSS = `${K.BASE_CSS}
.fb-power { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 54px); left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; background: rgba(255,250,244,.92); border-radius: 999px; padding: 5px 12px; box-shadow: 0 6px 18px rgba(60,30,40,.15); font-weight: 700; font-size: .8rem; opacity: 0; transition: opacity .12s; }
.fb-power.on { opacity: 1; }
.fb-power i { display: block; width: clamp(90px, 18vw, 170px); height: 10px; border-radius: 99px; background: #f0e2d8; overflow: hidden; }
.fb-power b { display: block; height: 100%; width: 100%; border-radius: 99px; background: linear-gradient(90deg, #7fd3a7, #ffd166, #ef5b6f); transform-origin: left; }
.fb-tag { position: absolute; transform: translate(-50%, -100%); color: #fff; border-radius: 999px; padding: 1px 8px; font-weight: 700; font-size: .72rem; box-shadow: 0 3px 8px rgba(60,30,40,.2); white-space: nowrap; display: none; }
body.touch .fb-tag { font-size: .62rem; padding: 0 6px; }
.fb-score small { font-weight: 600; color: #7a6470; margin-left: 6px; }
@media (max-height: 430px) { .fb-power { top: calc(max(8px, env(safe-area-inset-top)) + 46px); } }
`;

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const V = () => new THREE.Vector3();

export default {
  id: 'football',
  title: 'Football',
  tagline: 'First to 3 goals, two short halves',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    const env = ctx.env.outdoor({ fog: [70, 230], shadow: 24 });
    const meId = ctx.me;
    const themId = ctx.partner;
    const meName = looks[meId].name;
    const themName = looks[themId].name;

    // ---------------------------------------------------------------- state shared by setup and the loop
    let disposed = false;
    let mode = null; // 'team' | 'duel'
    let phase = 'choose'; // choose | intro | play | goal | reset | half | full | done
    let phaseT = 0;
    let half = 1;
    let clock = 0;
    let firstKick = 0;
    let kickTeam = 0;
    const score = [0, 0];
    let colors = [PAL.pink, TEAL];
    let teamNames = ['', ''];
    let S = null;
    let ui = null;
    let pop = null;
    const players = [];
    let me = null;
    let mate = null;
    let ref = null;
    let scorer = null;
    let scoringTeam = -1;
    let lastBoardSec = -1;
    const later = [];
    const after = (sec, fn) => later.push({ t: sec, fn });
    const camT = new THREE.Vector3(0, 0, 0);
    const tmp = V();
    const tmp2 = V();
    const dbg = { auto: false, stats: { shots: [0, 0], saves: [0, 0], tackles: [0, 0], passes: [0, 0] } };
    window.__football = dbg;
    // ---------------------------------------------------------------- online
    const link = new Link(ctx.online);
    let net = false; // the two of us play this match together right now
    let played = false; // the match started together (it keeps real time to the end)
    let goAt = 0;
    const now = () => link.now();
    const auth = () => !net || link.host; // runs the ball, the computer players and the score
    const r2 = (v) => Math.round(v * 100);
    const r1 = (v) => Math.round(v * 10);

    // Build the stadium before the choice so it shows behind the card
    S = buildStadium(ctx, { colors });
    scene.add(S.group);
    const ballM = makeBall(R);
    scene.add(ballM);
    const ballShadow = blobShadow(R * 1.15);
    scene.add(ballShadow);
    const ball = { p: ballM.position, v: V(), owner: null, last: null, prev: V(), shot: false };
    ball.p.set(0, R, 0);
    const rollAxis = V();
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.5 }));
    marker.rotation.x = Math.PI;
    marker.visible = false;
    scene.add(marker);
    hud.buttons({ action: null, jump: null, stick: false });
    hud.title('Football', 'Sunny Kicks Cup');
    camera.position.set(0, 14, 26);
    camera.lookAt(0, 0, 0);

    const askMode = () =>
      hud
        .choose({
          title: 'How do you want to play?',
          text: 'Two short halves. First to 3 goals wins.',
          options: [
            { id: 'team', label: 'Team up', sub: `${meName} and ${themName} vs the Sunny Stars` },
            { id: 'duel', label: 'One vs one', sub: `${meName} vs ${themName}, a keeper each` },
          ],
        })
        .then((id) => {
          if (disposed) return;
          if (!id) {
            ctx.end({ quit: true });
            return;
          }
          setup(id);
        });
    // In a room: wait for the other player, then team up, each running their own kid
    if (!link.inRoom) askMode();
    else
      link.begin({ title: `Waiting for ${themName}`, text: `${themName} is invited to team up with you against the Sunny Stars.`, solo: 'Play without them', exit: () => ctx.end({ quit: true }) }).then((yes) => {
        if (disposed) return;
        if (!yes) return askMode();
        net = played = true;
        setup('team');
        phase = 'sync';
        phaseT = 0;
        if (link.host) {
          goAt = now() + 1200;
          link.send('go', { at: goAt });
        }
      });

    // ---------------------------------------------------------------- people
    function gloves(kid, color) {
      for (const arm of kid.arms) {
        const gl = K.ball(0.072, color, { rough: 0.5 }, 10);
        gl.position.set(0, -0.29, 0.01);
        gl.scale.set(1, 1.1, 0.9);
        arm.add(gl);
      }
    }
    function makePlayer({ look, name, team, role, isMe = false, speed }) {
      const kid = ctx.makeKid(look);
      if (role === 'keeper') gloves(kid, team === 0 ? '#fffaf4' : '#ffd166');
      kid.onEmoteFx = (type) => type === 'heart' && fx.heartsAt(kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 4);
      if (typeof look !== 'string') K.lowpoly(kid.root, 0.6);
      K.bakeLiveKid(kid);
      scene.add(kid.root);
      const ring = new THREE.Mesh(new THREE.RingGeometry(isMe ? 0.42 : 0.4, isMe ? 0.56 : 0.5, 28), new THREE.MeshBasicMaterial({ color: colors[team], transparent: true, opacity: isMe ? 0.95 : 0.7, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 1;
      scene.add(ring);
      const pl = {
        name,
        team,
        role,
        isMe,
        human: isMe, // a person runs this kid (online: both Roji and Homama)
        remote: false, // host: run from the other device
        kid,
        ring,
        p: V(),
        v: V(),
        want: V(),
        yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2,
        turn: 0,
        y: 0,
        vy: 0,
        speed,
        cd: 0,
        stun: 0,
        kickT: -1,
        dash: 0,
        dashDir: V(),
        tackleCd: 0,
        think: Math.random() * 0.2,
        own: 0,
        hold: 0,
        holdBall: 0,
        receiving: 0,
        callFor: 0,
        dive: null,
        react: 0,
        zc: 0,
        spot: V(),
        tag: null,
      };
      players.push(pl);
      return pl;
    }

    function setup(id) {
      mode = id;
      const team = mode === 'team';
      if (team) colors = [PAL.pink, TEAL];
      else {
        const a = looks[meId].top || PAL.pink;
        let b = looks[themId].top || PAL.blue;
        const ca = new THREE.Color(a);
        const cb = new THREE.Color(b);
        if (Math.abs(ca.r - cb.r) + Math.abs(ca.g - cb.g) + Math.abs(ca.b - cb.b) < 0.25) b = TEAL;
        colors = [a, b];
      }
      teamNames = team ? [`${meName} and ${themName}`, 'Sunny Stars'] : [meName, themName];
      // online the host's kid comes first on both devices, so both share one list of players
      if (net && !link.host) mate = makePlayer({ look: themId, name: themName, team: 0, role: 'field', speed: 5.4 });
      me = makePlayer({ look: meId, name: meName, team: 0, role: 'field', isMe: true, speed: 5.4 });
      if (net) {
        if (link.host) mate = makePlayer({ look: themId, name: themName, team: 0, role: 'field', speed: 5.4 });
        mate.human = true;
        mate.remote = link.host;
        makePlayer({ look: LOOKS.lulu, name: 'Lulu', team: 1, role: 'field', speed: 4.75 });
        makePlayer({ look: LOOKS.teo, name: 'Teo', team: 1, role: 'field', speed: 4.65 });
      } else if (team) {
        mate = makePlayer({ look: themId, name: themName, team: 0, role: 'field', speed: 5.0 });
        makePlayer({ look: LOOKS.lulu, name: 'Lulu', team: 1, role: 'field', speed: 4.75 });
        makePlayer({ look: LOOKS.teo, name: 'Teo', team: 1, role: 'field', speed: 4.65 });
      } else {
        makePlayer({ look: themId, name: themName, team: 1, role: 'field', speed: 5.05 });
      }
      makePlayer({ look: LOOKS.pip, name: 'Pip', team: 0, role: 'keeper', speed: 3.9 });
      makePlayer({ look: LOOKS.nova, name: 'Nova', team: 1, role: 'keeper', speed: 3.9 });
      for (const pl of players) pl.ring.material.color.set(colors[pl.team]);
      marker.material.color.set(colors[0]);
      marker.material.emissive.set(colors[0]);
      marker.visible = true;

      // Referee with a whistle
      const rk = ctx.makeKid(LOOKS.ref);
      const whistle = K.cyl(0.022, 0.022, 0.07, '#ffd166', 8, { metal: 0.4, rough: 0.3 });
      whistle.rotation.x = Math.PI / 2;
      whistle.position.set(0.05, 0.6, 0.2);
      rk.body.add(whistle);
      const cord = K.cyl(0.006, 0.006, 0.3, '#ef5b6f', 4);
      cord.position.set(0.02, 0.7, 0.16);
      cord.rotation.z = 0.4;
      rk.body.add(cord);
      K.lowpoly(rk.root, 0.6);
      K.bakeLiveKid(rk);
      scene.add(rk.root);
      ref = { kid: rk, p: new THREE.Vector3(0, 0, -W + 1.2), v: V(), yaw: 0, turn: 0, blow: 0 };

      // HUD
      ui = K.overlay(CSS, `<div class="rr-pop"></div><div class="rr-chip"></div><div class="fb-power"><span>Power</span><i><b></b></i></div>${players.filter((p) => !p.isMe).map(() => '<div class="fb-tag"></div>').join('')}`);
      pop = K.popper(ui.$('.rr-pop'));
      const tags = [...ui.el.querySelectorAll('.fb-tag')];
      players.filter((p) => !p.isMe).forEach((p, i) => {
        p.tag = tags[i];
        p.tag.textContent = p.name;
        p.tag.style.background = colors[p.team];
      });
      hud.title('Football', team ? `${meName} and ${themName} vs Sunny Stars` : `${meName} vs ${themName}`);
      hud.buttons({ action: 'Shoot', jump: team ? 'Pass' : 'Chip' });
      hud.hint(team ? 'WASD or arrows to run, hold E to shoot, E to tackle, Space to pass' : 'WASD or arrows to run, hold E to shoot, E to tackle, Space to chip');
      firstKick = 0;
      kickTeam = 0;
      placeKickoff(true);
      updateHud();
      phase = 'intro';
      phaseT = 0;
    }

    // ---------------------------------------------------------------- helpers
    const field = (team) => players.filter((p) => p.team === team && p.role === 'field');
    const keeperOf = (team) => players.find((p) => p.team === team && p.role === 'keeper');
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const sgn = (team) => (team === 0 ? 1 : -1); // the direction a team attacks
    const actionBtn = () => document.querySelector('#arena .a-btn[data-b="action"]');
    let actionLabel = '';
    function setActionLabel(t) {
      if (t === actionLabel) return;
      actionLabel = t;
      const b = actionBtn();
      if (b) b.textContent = t;
    }

    function updateHud() {
      const left = Math.max(0, HALF - clock);
      hud.score(`<span class="fb-score"><b style="color:${colors[0]}">${score[0]}</b> : <b style="color:${colors[1]}">${score[1]}</b><small>${half === 1 ? '1st' : '2nd'} ${fmt(left)}</small></span>`);
      const sec = Math.ceil(left);
      if (sec !== lastBoardSec) {
        lastBoardSec = sec;
        S.board.set({ a: score[0], b: score[1], nameA: mode === 'team' ? 'Us' : teamNames[0], nameB: mode === 'team' ? 'Stars' : teamNames[1], colorA: colors[0], colorB: colors[1], top: 'SUNNY KICKS CUP', sub: `${half === 1 ? '1st half' : '2nd half'}   ${fmt(left)}` });
      }
    }

    function kickoffSpots(kTeam) {
      for (const team of [0, 1]) {
        const s = -sgn(team); // own half side
        const fp = field(team);
        const kicks = team === kTeam;
        fp.forEach((p, i) => {
          if (i === 0) p.spot.set(kicks ? s * 0.55 : s * 3.4, 0, kicks ? 0 : 1.3);
          else p.spot.set(s * (kicks ? 4.6 : 5.6), 0, kicks ? -3.0 : -2.6);
        });
        keeperOf(team).spot.set(s * (L - 0.5), 0, 0);
      }
    }
    function placeKickoff(snap) {
      kickoffSpots(kickTeam);
      for (const p of players) {
        if (snap) {
          p.p.copy(p.spot);
          p.v.set(0, 0, 0);
        }
        p.yaw = p.team === 0 ? Math.PI / 2 : -Math.PI / 2;
        p.hold = p.holdBall = p.receiving = p.callFor = p.dash = p.stun = 0;
        p.dive = null;
        p.react = 0;
        p.kid.danceLoop = false;
      }
      if (snap) {
        ball.p.set(0, R, 0);
        ball.v.set(0, 0, 0);
        ball.owner = field(kickTeam)[0];
        ball.last = ball.owner;
        if (ref) ref.p.set(0, 0, -W + 1.4);
      }
    }

    // A word at the top of the screen; the host also sends the other player theirs.
    // lines: { [player index]: text, '*': text for everyone else }
    function popFor(lines, color, ms) {
      const pick = (pl) => (pl && players.indexOf(pl) in lines ? lines[players.indexOf(pl)] : lines['*']);
      const mine = pick(me);
      if (mine) pop(mine, color, ms);
      if (net && link.host && mate?.remote) {
        const v = pick(mate);
        if (v) link.add(['p', v, color, ms]);
      }
    }
    const popAll = (text, color, ms) => popFor({ '*': text }, color, ms);

    function blow(kind = 'short') {
      FS.whistle(sound, kind);
      if (ref) ref.blow = kind === 'short' ? 0.7 : 1.4;
    }

    // ---------------------------------------------------------------- kicks
    function release(pl) {
      ball.owner = null;
      ball.last = pl;
      pl.cd = 0.32;
      pl.kickT = 0;
      pl.own = 0;
      pl.hold = 0;
    }
    function shoot(pl, k, aimZ = null) {
      const s = sgn(pl.team);
      const gx = s * L;
      const fx0 = Math.sin(pl.yaw);
      const fz0 = Math.cos(pl.yaw);
      const tz = aimZ ?? (Math.abs(ball.p.z) > 0.7 ? -Math.sign(ball.p.z) : Math.random() < 0.5 ? -1 : 1) * (GW - 0.32);
      const tx = gx - ball.p.x;
      const tzz = tz - ball.p.z;
      const d = Math.hypot(tx, tzz) || 1;
      const facing = (fx0 * tx + fz0 * tzz) / d > 0.35 && s * tx > 0;
      let dx = fx0;
      let dz = fz0;
      if (facing && d < 24) {
        dx = lerp(fx0, tx / d, 0.85);
        dz = lerp(fz0, tzz / d, 0.85);
      }
      if (!pl.human) {
        const err = (Math.random() - 0.5) * 0.14;
        const c = Math.cos(err);
        const sn = Math.sin(err);
        [dx, dz] = [dx * c - dz * sn, dx * sn + dz * c];
      }
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const speed = 8 + 11 * k;
      let vy;
      if (facing) {
        const tt = d / speed;
        const h = 0.3 + 0.6 * k * k;
        vy = clamp((h - R + 0.5 * G * tt * tt) / tt, 0.4, 7);
      } else vy = 1.5 + 3 * k;
      release(pl);
      ball.v.set(dx * speed, vy, dz * speed);
      ball.p.y = R + 0.02;
      ball.shot = facing;
      if (facing) dbg.stats.shots[pl.team]++;
      pl.yaw = Math.atan2(dx, dz);
      FS.kick(sound, k);
      if (k > 0.8) popAll('Power shot!', colors[pl.team], 700);
    }
    function pass(from, to, throwIt = false) {
      const lead = tmp.copy(to.p).addScaledVector(to.v, 0.45);
      lead.x = clamp(lead.x, -L + 0.8, L - 0.8);
      lead.z = clamp(lead.z, -W + 0.5, W - 0.5);
      const dx = lead.x - ball.p.x;
      const dz = lead.z - ball.p.z;
      const d = Math.hypot(dx, dz) || 1;
      const speed = throwIt ? clamp(6 + d * 0.6, 8, 12) : clamp(5.5 + d * 0.85, 7, 15);
      const vy = throwIt ? 2.8 : d > 9 ? 2.4 + d * 0.12 : 0.5;
      release(from);
      ball.v.set((dx / d) * speed, vy, (dz / d) * speed);
      ball.p.y = throwIt ? 0.9 : R + 0.02;
      ball.shot = false;
      from.yaw = Math.atan2(dx, dz);
      to.receiving = 1.3;
      dbg.stats.passes[from.team]++;
      FS.kick(sound, 0.4);
    }
    function chip(pl) {
      const s = sgn(pl.team);
      const tx = s * L - ball.p.x;
      const tz = -ball.p.z * 0.7;
      const d = Math.hypot(tx, tz) || 1;
      const T = clamp(d / 9, 0.55, 1.5);
      release(pl);
      ball.v.set((tx / d) * (d / T) * 0.92, 0.5 * G * T, (tz / d) * (d / T) * 0.92);
      ball.p.y = R + 0.02;
      ball.shot = true;
      pl.yaw = Math.atan2(tx, tz);
      FS.kick(sound, 0.6);
      popAll('Chip!', colors[pl.team], 600);
    }
    function tackle(pl) {
      if (pl.tackleCd > 0 || pl.dash > 0 || pl.stun > 0) return;
      const target = ball.owner && ball.owner.team !== pl.team ? ball.owner.p : ball.p;
      pl.dashDir.set(target.x - pl.p.x, 0, target.z - pl.p.z);
      if (pl.dashDir.lengthSq() < 0.01 || dist(pl.p, target) > 3.5) pl.dashDir.set(Math.sin(pl.yaw), 0, Math.cos(pl.yaw));
      pl.dashDir.normalize();
      pl.dash = 0.3;
      pl.tackleCd = pl.human ? 0.7 : 1.5;
      pl.yaw = Math.atan2(pl.dashDir.x, pl.dashDir.z);
      sound.ui('swoosh');
    }
    function steal(pl, victim) {
      const success = pl.human ? 0.85 : victim.human ? 0.42 : 0.6;
      pl.dash = 0;
      if (Math.random() > success) {
        popAll('Missed!', '#ffffff', 500);
        return;
      }
      dbg.stats.tackles[pl.team]++;
      victim.stun = 0.75;
      victim.kid.squash = 0.72;
      victim.hold = 0;
      if (victim.remote) link.send('stun', {}); // their kid is theirs to slow down
      ball.owner = pl;
      ball.last = pl;
      pl.own = 0;
      FS.kick(sound, 0.5);
      sound.ui('pop');
      popFor({ [players.indexOf(pl)]: 'Got it!', '*': `${pl.name} steals it!` }, colors[pl.team], 800);
    }

    // ---------------------------------------------------------------- AI
    function nearestOpp(pl) {
      let best = null;
      let bd = Infinity;
      for (const o of players) {
        if (o.team === pl.team || o.role !== 'field') continue;
        const d = dist(o.p, pl.p);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      return [best, bd];
    }
    function openness(pl) {
      return nearestOpp(pl)[1];
    }
    function goTo(pl, x, z, spd) {
      const dx = x - pl.p.x;
      const dz = z - pl.p.z;
      const d = Math.hypot(dx, dz);
      const k = clamp(d / 1.1, 0, 1);
      if (d < 0.05) pl.want.set(0, 0, 0);
      else pl.want.set((dx / d) * spd * k, 0, (dz / d) * spd * k);
    }
    function fieldAI(pl, dt) {
      const s = sgn(pl.team);
      const atkX = s * L;
      const ownX = -s * L;
      const mates = field(pl.team).filter((q) => q !== pl);
      const mt = mates[0] || null;
      pl.think -= dt;
      if (ball.owner === pl) {
        pl.own += dt;
        let tz = clamp(-pl.p.z * 0.3, -1.2, 1.2);
        const [opp, od] = nearestOpp(pl);
        if (opp && od < 2.6 && (opp.p.x - pl.p.x) * s > -0.4) tz = clamp(pl.p.z + (pl.p.z > opp.p.z ? 3 : -3), -W + 1, W - 1);
        goTo(pl, atkX - s * 0.6, tz, pl.speed * 0.88);
        if (pl.think <= 0) {
          pl.think = 0.16 + Math.random() * 0.14;
          const dGoal = Math.hypot(atkX - pl.p.x, pl.p.z);
          const pressured = opp && od < 1.4;
          const wantsIt = mt && mt.human && mt.callFor > 0;
          if (wantsIt && pl.own > 0.1) pass(pl, mt);
          else if (pl.own > 0.45 && dGoal < 8.5 && Math.random() < 0.5) shoot(pl, 0.6 + Math.random() * 0.35);
          else if (mt && pl.own > 0.4 && ((pressured && Math.random() < 0.45) || ((mt.p.x - pl.p.x) * s > 3 && openness(mt) > 2.5 && Math.random() < (mt.human ? 0.35 : 0.2)))) pass(pl, mt);
          else if (pl.own > 3.2 && dGoal < 15) shoot(pl, 0.9);
        }
        return;
      }
      if (ball.owner && ball.owner.team === pl.team) {
        const c = ball.owner;
        const wide = c.p.z > 0 ? c.p.z - 4.2 : c.p.z + 4.2;
        goTo(pl, clamp(c.p.x + s * 4.5, -L + 2, L - 1.8), clamp(wide, -W + 1.2, W - 1.2), pl.speed * 0.85);
        return;
      }
      // Loose ball, or the other team has it: the closest of the team chases, the other covers
      const team = field(pl.team);
      let chaser = team[0];
      let cd = Infinity;
      for (const q of team) {
        const d = dist(q.p, ball.p) - (q.human ? 0.6 : 0);
        if (d < cd) {
          cd = d;
          chaser = q;
        }
      }
      if (chaser === pl || pl.receiving > 0) {
        const lead = ball.owner ? 0.15 : 0.3;
        goTo(pl, ball.p.x + ball.v.x * lead, ball.p.z + ball.v.z * lead, pl.speed);
      } else if (ball.owner) goTo(pl, lerp(ball.p.x, ownX, 0.45), ball.p.z * 0.5, pl.speed * 0.9);
      else goTo(pl, clamp(ball.p.x + s * 3, -L + 2, L - 2), ball.p.z > 0 ? ball.p.z - 3.5 : ball.p.z + 3.5, pl.speed * 0.8);
      const o = ball.owner;
      if (o && o.team !== pl.team && o.role === 'field' && pl.tackleCd <= 0 && dist(pl.p, o.p) < 1.3 && Math.random() < dt * (o.human ? 1.3 : 2.2)) tackle(pl);
    }

    function keeperAI(kp, dt) {
      const s = sgn(kp.team);
      const goalX = -s * L;
      const lineX = goalX + s * 0.38;
      if (ball.owner === kp) {
        kp.want.set(0, 0, 0);
        if (kp.dive) {
          // land and get up with the ball
          kp.dive.t = Math.max(kp.dive.t, 0.42) + dt;
          if (kp.dive.t > 1.45) kp.dive = null;
          return;
        }
        kp.yaw = dampAngle(kp.yaw, s > 0 ? Math.PI / 2 : -Math.PI / 2, 8, dt);
        kp.holdBall += dt;
        if (kp.holdBall > 1.1) {
          const opts = field(kp.team);
          let best = opts[0];
          let bo = -1;
          for (const q of opts) {
            const o = openness(q);
            if (o > bo) {
              bo = o;
              best = q;
            }
          }
          if (best) pass(kp, best, true);
          kp.cd = 0.7;
          kp.holdBall = 0;
        }
        return;
      }
      if (kp.dive) {
        const d = kp.dive;
        d.t += dt;
        if (d.t < 0.42) kp.want.set(0, 0, d.dir * 4.2);
        else kp.want.set(0, 0, 0);
        kp.p.z = clamp(kp.p.z, -GW - 0.3, GW + 0.3);
        if (d.t > 1.45) kp.dive = null;
        return;
      }
      const bs = Math.hypot(ball.v.x, ball.v.z);
      let tx = lineX + s * clamp((10 - Math.abs(ball.p.x - goalX)) * 0.04, 0, 0.3);
      let tz = clamp(ball.p.z * 0.4, -(GW - 0.4), GW - 0.4);
      const inBox = Math.abs(ball.p.x - goalX) < 3.3 && Math.abs(ball.p.z) < 4.1;
      if (!ball.owner && inBox && bs < 5) {
        const [, od] = nearestOpp({ team: kp.team, p: ball.p });
        if (dist(kp.p, ball.p) < od + 0.3) {
          tx = ball.p.x;
          tz = ball.p.z;
        }
      }
      // A shot coming: react after a short moment and dive if it is wide
      if (!ball.owner && s * ball.v.x < -3) {
        const tc = (kp.p.x - ball.p.x) / ball.v.x;
        if (tc > 0 && tc < 1.3) {
          const zc = ball.p.z + ball.v.z * tc;
          if (Math.abs(zc) < GW + 0.5 && kp.react <= 0 && !kp.reacted) {
            kp.react = 0.12 + Math.random() * 0.24 + (bs > 14 ? 0.05 : 0);
            kp.reacted = true;
          }
          kp.zc = zc;
        }
      } else kp.reacted = false;
      if (kp.react > 0) {
        kp.react -= dt;
        if (kp.react <= 0 && Math.abs(kp.zc - kp.p.z) > 0.45) {
          kp.dive = { dir: Math.sign(kp.zc - kp.p.z), t: 0 };
          sound.ui('swoosh');
          return;
        }
      }
      goTo(kp, tx, tz, kp.speed);
    }

    function humanControl(dt) {
      const ax = input.axis();
      const mag = Math.min(1, Math.hypot(ax.x, ax.y));
      let spd = me.speed * (input.held('run') ? 1.15 : 1) * (ball.owner === me ? 0.95 : 1);
      if (me.hold > 0) spd *= 0.75;
      if (mag > 0.08) me.want.set((ax.x / mag) * spd * mag, 0, (-ax.y / mag) * spd * mag);
      else me.want.set(0, 0, 0);
      const owns = ball.owner === me;
      setActionLabel(owns ? 'Shoot' : 'Tackle');
      if (input.pressed('action')) {
        if (owns) me.hold = 0.001;
        else {
          tackle(me);
          if (net && !link.host && me.dash > 0) link.send('tackle', { x: r2(me.dashDir.x), z: r2(me.dashDir.z) });
        }
      }
      if (me.hold > 0) {
        if (!owns) me.hold = 0;
        else if (input.held('action') && me.hold < 1.05) me.hold += dt;
        else {
          const k = clamp(me.hold / 0.9, 0.25, 1);
          // up or down on the stick picks the far or near corner
          const aim = Math.abs(ax.y) > 0.4 ? (ax.y > 0 ? -1 : 1) * (GW - 0.32) : null;
          if (net && !link.host) guestKick('kick', { k: +k.toFixed(2), aim });
          else shoot(me, k, aim);
        }
      }
      if (input.pressed('jump')) {
        if (mode === 'team') {
          if (owns && net && !link.host) guestKick('pass', {});
          else if (owns) pass(me, mate);
          else if (ball.owner === mate) {
            mate.callFor = 0;
            me.callFor = 0.9;
            chipText('Pass!', me);
            if (net) link.send('call', {});
          } else hop(me);
        } else if (owns) chip(me);
        else hop(me);
      }
    }
    // Joiner: the host kicks the ball for us; our kid swings its leg at once
    function guestKick(type, d) {
      link.send(type, { ...d, yw: r2(me.yaw) / 100 });
      me.kickT = 0;
      me.hold = 0;
      me.cd = 0.32;
      me.kickedAt = now();
      FS.kick(sound, d.k ?? 0.4);
    }
    function hop(pl) {
      if (pl.y > 0.01) return;
      pl.vy = 6.2;
      pl.kid.squash = 1.2;
      sound.jump();
    }
    let chipT = 0;
    let chipFor = null;
    function chipText(text, pl) {
      const el = ui.$('.rr-chip');
      el.textContent = text;
      el.classList.add('on');
      chipT = 0.9;
      chipFor = pl;
    }

    // ---------------------------------------------------------------- movement
    function movePlayer(pl, dt, t) {
      pl.cd -= dt;
      pl.stun -= dt;
      pl.tackleCd -= dt;
      pl.receiving -= dt;
      pl.callFor -= dt;
      if (pl.stun > 0) pl.want.multiplyScalar(0.2);
      if (pl.dash > 0) {
        pl.dash -= dt;
        pl.want.copy(pl.dashDir).multiplyScalar(8.4);
        const o = ball.owner;
        if (!auth()) {
          // the host decides what our tackle wins
        } else if (o && o.team !== pl.team && o.role === 'field' && dist(o.p, pl.p) < 0.85) steal(pl, o);
        else if (!o && dist(ball.p, pl.p) < 0.75 && ball.p.y < 0.6) {
          ball.owner = pl;
          ball.last = pl;
          pl.dash = 0;
        }
      }
      const acc = pl.dash > 0 ? 20 : pl.role === 'keeper' ? 12 : 10;
      pl.v.x = damp(pl.v.x, pl.want.x, acc, dt);
      pl.v.z = damp(pl.v.z, pl.want.z, acc, dt);
      pl.p.x += pl.v.x * dt;
      pl.p.z += pl.v.z * dt;
      // stay on the pitch; field players stay out of the goals
      pl.p.z = clamp(pl.p.z, -BZ + 0.4, BZ - 0.4);
      pl.p.x = clamp(pl.p.x, -BX + 0.4, BX - 0.4);
      if (Math.abs(pl.p.x) > L - 0.05 && Math.abs(pl.p.z) < GW + 0.35) {
        if (pl.role === 'keeper') pl.p.x = Math.sign(pl.p.x) * Math.min(Math.abs(pl.p.x), L + 0.25);
        else if (Math.abs(pl.p.x) < L + GD + 0.35) {
          const inX = Math.abs(pl.p.x) - (L - 0.05);
          const inZ = GW + 0.35 - Math.abs(pl.p.z);
          if (inX < inZ) pl.p.x = Math.sign(pl.p.x) * (L - 0.05);
          else pl.p.z = Math.sign(pl.p.z || 1) * (GW + 0.35);
        }
      }
      pl.vy -= G * dt;
      pl.y = Math.max(0, pl.y + pl.vy * dt);
      if (pl.y === 0) pl.vy = 0;
      const sp = Math.hypot(pl.v.x, pl.v.z);
      const prevYaw = pl.yaw;
      if (sp > 0.35 && !(pl.role === 'keeper' && pl.dive)) pl.yaw = dampAngle(pl.yaw, Math.atan2(pl.v.x, pl.v.z), 12, dt);
      else if (pl.faceCam) {
        // keep facing the camera
      } else if (pl.role === 'field' && ball.owner !== pl) pl.yaw = dampAngle(pl.yaw, Math.atan2(ball.p.x - pl.p.x, ball.p.z - pl.p.z), 5, dt);
      else if (pl.role === 'keeper' && !pl.dive) pl.yaw = dampAngle(pl.yaw, Math.atan2(ball.p.x - pl.p.x, ball.p.z - pl.p.z), 6, dt);
      let tr = pl.yaw - prevYaw;
      if (tr > Math.PI) tr -= Math.PI * 2;
      if (tr < -Math.PI) tr += Math.PI * 2;
      pl.turn = tr / Math.max(dt, 1e-3);
    }
    function separate() {
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const a = players[i];
          const b = players[j];
          const dx = b.p.x - a.p.x;
          const dz = b.p.z - a.p.z;
          const d = Math.hypot(dx, dz);
          const min = 0.62;
          if (d < min && d > 1e-4) {
            const k = (min - d) / 2;
            a.p.x -= (dx / d) * k;
            a.p.z -= (dz / d) * k;
            b.p.x += (dx / d) * k;
            b.p.z += (dz / d) * k;
          }
        }
      }
    }

    // ---------------------------------------------------------------- the ball
    const inGoalBox = (p, s) => s * p.x > L && s * p.x < L + GD && Math.abs(p.z) < GW && p.y < GH;
    function ballStep(dt) {
      const o = ball.owner;
      const start = tmp2.copy(ball.p);
      if (o) {
        const f = o.role === 'keeper' ? 0.34 : 0.5;
        const tx = o.p.x + Math.sin(o.yaw) * f;
        const tz = o.p.z + Math.cos(o.yaw) * f;
        ball.p.x = damp(ball.p.x, tx, 22, dt);
        ball.p.z = damp(ball.p.z, tz, 22, dt);
        ball.p.y = damp(ball.p.y, o.role === 'keeper' ? (o.dive ? 0.42 : 0.72) + o.y : R, 18, dt);
        ball.v.set(o.v.x, 0, o.v.z);
        ball.shot = false;
      } else {
        const sp = Math.hypot(ball.v.x, ball.v.z) + Math.abs(ball.v.y);
        const n = Math.min(10, Math.max(1, Math.ceil((sp * dt) / 0.12)));
        for (let i = 0; i < n; i++) sub(dt / n);
        const fr = Math.exp(-(ball.p.y <= R + 0.01 ? 0.75 : 0.08) * dt);
        ball.v.x *= fr;
        ball.v.z *= fr;
      }
      const dx = ball.p.x - start.x;
      const dz = ball.p.z - start.z;
      const ds = Math.hypot(dx, dz);
      if (ds > 1e-4 && ball.p.y < 0.6) ballM.rotateOnWorldAxis(rollAxis.set(dz, 0, -dx).normalize(), ds / R);
      else if (ds > 1e-4) ballM.rotateOnWorldAxis(rollAxis.set(dz, 0, -dx).normalize(), (ds / R) * 0.4);
    }
    let bounceCd = 0;
    function sub(dt) {
      const p = ball.p;
      const v = ball.v;
      ball.prev.copy(p);
      const prev = ball.prev;
      v.y -= G * dt;
      p.addScaledVector(v, dt);
      if (p.y < R) {
        p.y = R;
        if (v.y < -1.6) {
          if (bounceCd <= 0) FS.bounce(sound, Math.min(1, -v.y / 7));
          bounceCd = 0.1;
          v.y *= -0.5;
        } else v.y = 0;
      }
      // boards
      if (Math.abs(p.z) > BZ - 0.06 - R) {
        p.z = Math.sign(p.z) * (BZ - 0.06 - R);
        v.z = -v.z * 0.65;
        if (bounceCd <= 0) FS.bounce(sound, 0.6);
        bounceCd = 0.1;
      }
      if (Math.abs(p.x) > BX - 0.06 - R) {
        p.x = Math.sign(p.x) * (BX - 0.06 - R);
        v.x = -v.x * 0.65;
        if (bounceCd <= 0) FS.bounce(sound, 0.6);
        bounceCd = 0.1;
      }
      for (const s of [-1, 1]) {
        // posts
        if (p.y < GH + R) {
          for (const zs of [-1, 1]) {
            const dx = p.x - s * L;
            const dz = p.z - zs * GW;
            const d = Math.hypot(dx, dz);
            const min = R + 0.065;
            if (d < min && d > 1e-5) {
              p.x = s * L + (dx / d) * min;
              p.z = zs * GW + (dz / d) * min;
              const into = v.x * (dx / d) + v.z * (dz / d);
              if (into < 0) {
                v.x -= (dx / d) * into * 1.6;
                v.z -= (dz / d) * into * 1.6;
                FS.post(sound);
                if (phase === 'play') popAll('Off the post!', '#ffffff', 800);
              }
            }
          }
        }
        // crossbar
        if (Math.abs(p.z) < GW && Math.abs(s * p.x - L) < R + 0.065 && Math.abs(p.y - GH) < R + 0.065) {
          const ex = p.x - s * L;
          const ey = p.y - GH;
          const el = Math.hypot(ex, ey) || 1;
          p.x = s * L + (ex / el) * (R + 0.065);
          p.y = GH + (ey / el) * (R + 0.065);
          const into = v.x * (ex / el) + v.y * (ey / el);
          if (into < 0) {
            v.x -= (ex / el) * into * 1.6;
            v.y -= (ey / el) * into * 1.6;
            FS.post(sound);
            if (phase === 'play') popAll('Off the bar!', '#ffffff', 800);
          }
        }
        // the net: keeps a ball that went in, blocks one coming from the side, the back or the top
        const was = inGoalBox(prev, s);
        const now = inGoalBox(p, s);
        if (was) {
          const xMax = L + GD - R * 0.8;
          if (s * p.x > xMax) {
            p.x = s * xMax;
            v.x = -v.x * 0.05;
          }
          if (Math.abs(p.z) > GW - R * 0.8) {
            p.z = Math.sign(p.z) * (GW - R * 0.8);
            v.z = -v.z * 0.15;
          }
          if (p.y > GH - R) {
            p.y = GH - R;
            v.y = -Math.abs(v.y) * 0.3;
          }
          v.x *= 0.92;
          v.z *= 0.92;
        } else if (now) {
          const viaMouth = s * prev.x <= L + 0.02 && Math.abs(prev.z) < GW && prev.y < GH;
          if (!viaMouth) {
            if (Math.abs(prev.z) >= GW) {
              p.z = prev.z;
              v.z = -v.z * 0.3;
            } else if (s * prev.x >= L + GD) {
              p.x = prev.x;
              v.x = -v.x * 0.3;
            } else {
              p.y = GH + R;
              v.y = Math.abs(v.y) * 0.25;
            }
          }
        }
        if (phase === 'play' && Math.abs(p.z) < GW && p.y < GH && s * p.x > L + R * 0.5 && s * prev.x <= L + R * 0.5) goal(s > 0 ? 0 : 1, s);
      }
    }

    function touches() {
      if (ball.owner) return;
      for (const pl of players) {
        if (pl.stun > 0 || pl.cd > 0) continue;
        const keeper = pl.role === 'keeper';
        let cx = pl.p.x;
        let cz = pl.p.z;
        let reach = keeper ? 0.52 : 0.5;
        if (keeper && pl.dive) {
          const e = clamp(pl.dive.t / 0.3, 0, 1) * (pl.dive.t < 1.1 ? 1 : 0);
          cz += pl.dive.dir * 0.5 * e;
          reach += 0.15 * e;
        }
        const d = Math.hypot(ball.p.x - cx, ball.p.z - cz);
        const top = keeper ? (pl.dive ? 1.35 : 1.8) : 0.7;
        if (d > reach + R || ball.p.y > top) continue;
        if (keeper) {
          // only near its own goal
          if (Math.abs(pl.p.x + sgn(pl.team) * L) > 4.5) continue;
          const bs = Math.hypot(ball.v.x, ball.v.z);
          const s = sgn(pl.team);
          if (bs > 12 && Math.random() < 0.55) {
            ball.v.set(s * (3.5 + Math.random() * 2), 2.6, (Math.sign(ball.p.z) || 1) * (2 + Math.random() * 2.5));
            ball.last = pl;
            pl.cd = 0.5;
            FS.kick(sound, 0.5);
            popAll(`${pl.name} saves!`, colors[pl.team], 900);
            dbg.stats.saves[pl.team]++;
            S.crowd.cheer(0.5);
          } else {
            const wasShot = ball.shot && bs > 6;
            ball.owner = pl;
            ball.last = pl;
            pl.holdBall = 0;
            sound.ui('pop');
            if (wasShot) {
              dbg.stats.saves[pl.team]++;
              popAll(`${pl.name} catches it!`, colors[pl.team], 900);
              S.crowd.cheer(0.4);
            }
          }
          continue;
        }
        const rvx = ball.v.x - pl.v.x;
        const rvz = ball.v.z - pl.v.z;
        if (Math.hypot(rvx, rvz) > 13 && pl.receiving <= 0) {
          // a hard shot bounces off the shins
          const nx = (ball.p.x - pl.p.x) / (d || 1);
          const nz = (ball.p.z - pl.p.z) / (d || 1);
          const into = ball.v.x * nx + ball.v.z * nz;
          if (into < 0) {
            ball.v.x -= nx * into * 1.35;
            ball.v.z -= nz * into * 1.35;
          }
          ball.last = pl;
          pl.cd = 0.25;
          FS.kick(sound, 0.35);
          continue;
        }
        ball.owner = pl;
        ball.last = pl;
        pl.own = 0;
        pl.receiving = 0;
        FS.kick(sound, 0.2);
        break;
      }
    }

    // ---------------------------------------------------------------- goals and match flow
    function goal(team, side) {
      score[team]++;
      const last = ball.last;
      const sc = last && last.team === team && last.role === 'field' ? last : field(team)[0];
      const own = !!(last && last.team !== team);
      if (net && link.host) link.send('ph', { k: 'goal', team, side, s: [...score], sc: players.indexOf(sc), own: own ? 1 : 0, bz: r2(ball.p.z), by: r2(ball.p.y), bv: r2(Math.hypot(ball.v.x, ball.v.z)) });
      goalFx(team, side, sc, own, ball.p.z, ball.p.y, Math.hypot(ball.v.x, ball.v.z));
    }
    // The goal itself: the net, the crowd, the dance (both devices)
    function goalFx(team, side, sc, own, bz, by, bv) {
      scoringTeam = team;
      scorer = sc;
      phase = 'goal';
      phaseT = 0;
      const gl = S.goals.find((q) => q.side === side);
      gl.bulge(side * bz, by, Math.min(1, bv / 12));
      FS.net(sound);
      FS.cheer(sound, 1);
      S.crowd.cheer(1);
      blow('short');
      fx.burst(new THREE.Vector3(side * (L + 0.4), 1.2, bz), [colors[team], '#ffffff', PAL.yellow, PAL.rose], 150);
      hud.message('GOAL!', 1600);
      const who = own ? 'A lucky goal!' : `${scorer.name} scores!`;
      after(0.5, () => pop(who, colors[team], 1600));
      updateHud();
      lastBoardSec = -1;
      after(0.6, () => {
        scorer.kid.emote('cheer');
      });
      after(1.6, () => {
        for (const p of field(team)) {
          p.kid.danceLoop = true;
          p.kid.emote('dance');
        }
      });
      if (mode === 'team' && team === 0 && scorer === me) after(1.4, () => chipText(meId === 'roji' ? 'Homama: That is my Roji!' : 'Roji: Brilliant, Homama!', mate));
      if (mode === 'team' && team === 0 && scorer === mate) after(1.4, () => chipText('What a goal!', me));
    }
    function startReset(kTeam) {
      if (net && link.host) link.send('ph', { k: 'reset', kt: kTeam, hf: half });
      kickTeam = kTeam;
      kickoffSpots(kickTeam);
      phase = 'reset';
      phaseT = 0;
      for (const p of players) {
        p.kid.danceLoop = false;
        p.kid.cancelEmote();
        p.dive = null;
        p.dash = 0;
      }
      if (ball.p.distanceTo(new THREE.Vector3(0, R, 0)) > 0.5) fx.poof(ball.p.clone());
      ball.owner = null;
      ball.v.set(0, 0, 0);
      ball.p.set(0, R, 0);
    }
    function finishMatch() {
      if (net && link.host) link.send('ph', { k: 'full', s: [...score] });
      phase = 'full';
      phaseT = 0;
      blow('end');
      hud.message('Full time!', 1800);
      S.crowd.cheer(1);
      FS.cheer(sound, 0.8);
      const win = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
      for (const p of players) {
        p.want.set(0, 0, 0);
        p.dash = 0;
      }
      ball.owner = null;
      after(1.0, () => {
        if (win < 0) for (const p of [me, mate].filter(Boolean)) p.kid.emote('heart');
        else for (const p of players.filter((q) => q.team === win)) {
          p.kid.danceLoop = true;
          p.kid.emote('dance');
        }
        if (win >= 0) fx.burst(new THREE.Vector3(camT.x, 2, camT.z), [colors[win], '#ffffff', PAL.yellow], 160);
      });
    }
    function resultCard() {
      const [a, b] = score;
      const win = a > b ? true : a < b ? false : null;
      const sc = `${a} - ${b}`;
      let title;
      let text;
      if (mode === 'team') {
        const voice = meId === 'roji' ? 'Homama' : 'Roji';
        if (win) {
          title = 'You win!';
          text = `${meName} and ${themName} beat the Sunny Stars ${sc}. <b>${voice}:</b> ${meId === 'roji' ? 'You were magic out there, Roji.' : 'What a team we are, Homama.'}`;
        } else if (win === false) {
          title = 'So close!';
          text = `The Sunny Stars won ${b} - ${a}. <b>${voice}:</b> We will get them next time.`;
        } else {
          title = 'What a match!';
          text = `A ${sc} draw. ${meName} and ${themName} share a big high five.`;
        }
      } else {
        const rojiWon = (win && meId === 'roji') || (win === false && themId === 'roji');
        if (win === null) {
          title = 'A draw!';
          text = `${sc}. Roji and Homama call it a tie and go for ice cream.`;
        } else if (rojiWon) {
          title = win ? 'You win!' : 'Roji wins!';
          text = `Roji wins ${Math.max(a, b)} - ${Math.min(a, b)}. <b>Homama:</b> She is unstoppable. I am so proud of her.`;
        } else {
          title = win ? 'You win!' : 'Homama wins!';
          text = `Homama wins ${Math.max(a, b)} - ${Math.min(a, b)}. <b>Roji:</b> Lucky shot. Rematch, please!`;
        }
      }
      if (win) ctx.save('wins', (ctx.load('wins', 0) || 0) + 1);
      // Played together both are on one team, so the shared card shows one team result
      ctx.finish({ win, title, text, score: a, opp: b, ...(mate?.human && ctx.online.inRoom ? { team: true } : {}) });
    }

    // ---------------------------------------------------------------- poses on top of Kid.update
    const eul = new THREE.Euler(0, 0, 0, 'YXZ');
    function poses(pl, dt, t) {
      const k = pl.kid;
      if (pl.kickT >= 0) {
        pl.kickT += dt;
        const q = pl.kickT;
        const a = q < 0.08 ? 0.6 * (q / 0.08) : q < 0.16 ? 0.6 - 2.0 * ((q - 0.08) / 0.08) : -1.4 * Math.max(0, 1 - (q - 0.16) / 0.22);
        k.legs[1].rotation.x = a;
        k.arms[0].rotation.x = a * 0.5;
        k.arms[1].rotation.x = -a * 0.3;
        if (q > 0.4) pl.kickT = -1;
      }
      if (pl.human && pl.hold > 0) {
        const c = clamp(pl.hold / 0.9, 0, 1);
        k.legs[1].rotation.x = 0.25 + c * 0.6;
        k.body.rotation.x = -0.08 * c;
      }
      if (pl.stun > 0) k.body.rotation.z = Math.sin(t * 20) * 0.15 * Math.min(1, pl.stun * 2);
      if (pl.dash > 0) {
        k.body.rotation.x = 0.35;
        k.legs[1].rotation.x = -1.1;
        k.legs[0].rotation.x = 0.5;
      }
      if (pl.role !== 'keeper') return;
      const [aL, aR] = k.arms;
      if (pl.dive) {
        const d = pl.dive;
        const e = Math.min(1, d.t / 0.3) * (d.t < 1.05 ? 1 : Math.max(0, 1 - (d.t - 1.05) / 0.4));
        const up = Math.sin(Math.min(1, d.t / 0.34) * Math.PI) * 0.35 * (d.t < 1.05 ? 1 : 0);
        // roll toward the dive side (the keeper's facing decides the sign)
        const fz = Math.sin(pl.yaw);
        eul.set(0, pl.yaw, d.dir * fz * 1.3 * e);
        k.root.quaternion.setFromEuler(eul);
        k.root.position.y = pl.y + up + 0.1 * e;
        aL.rotation.set(-0.2, 0, 0.2 + 2.6 * e);
        aR.rotation.set(-0.2, 0, -0.2 - 2.6 * e);
      } else if (ball.owner === pl) {
        aL.rotation.set(-1.25, 0, -0.32);
        aR.rotation.set(-1.25, 0, 0.32);
      } else if (!k.emoteType) {
        aL.rotation.set(-0.5, 0, 0.75);
        aR.rotation.set(-0.5, 0, -0.75);
      }
    }

    function syncKid(pl, dt, t) {
      const k = pl.kid;
      k.root.position.set(pl.p.x, pl.y, pl.p.z);
      k.root.rotation.set(0, pl.yaw, 0);
      k.update(dt, t, Math.hypot(pl.v.x, pl.v.z), pl.y, pl.turn);
      poses(pl, dt, t);
      pl.ring.position.set(pl.p.x, 0.025, pl.p.z);
    }

    // ---------------------------------------------------------------- the camera and labels
    function camera3(dt, t) {
      if (phase === 'choose') {
        const a = Math.sin(t * 0.18) * 0.55;
        camera.position.set(Math.sin(a) * 27, 13 + Math.sin(t * 0.3), Math.cos(a) * 27);
        camera.lookAt(0, 0.5, -2);
        env.follow(new THREE.Vector3(0, 0, 0));
        return;
      }
      let fx0 = lerp(ball.p.x, me.p.x, 0.3) + clamp(ball.v.x * 0.22, -2.5, 2.5);
      let fz0 = lerp(ball.p.z, me.p.z, 0.3);
      let zoom = 1;
      if (((phase === 'goal' || phase === 'goalEnd') && phaseT > 0.4) || ((phase === 'full' || phase === 'done') && phaseT > 0.6)) {
        const fp = phase === 'goal' || phase === 'goalEnd' ? scorer : me;
        fx0 = fp.p.x;
        fz0 = fp.p.z;
        zoom = 0.62;
      }
      if (phase === 'intro') zoom = 1.15 - Math.min(1, phaseT / 2.6) * 0.15;
      fx0 = clamp(fx0, -L + 3.2, L - 3.2);
      fz0 = clamp(fz0, -W + 2.6, W - 1.6);
      camT.x = damp(camT.x, fx0, 3.2, dt);
      camT.z = damp(camT.z, fz0, 3.2, dt);
      const asp = camera.aspect;
      const z = zoom * (window.innerHeight < 520 ? 0.8 : asp > 1.9 ? 0.92 : asp < 1.3 ? 1.3 : 1);
      camera.userData.z = damp(camera.userData.z ?? z, z, 2.5, dt);
      const zz = camera.userData.z;
      camera.position.set(camT.x, 12.2 * zz + 0.4, camT.z + 11.2 * zz + 0.5);
      camera.lookAt(camT.x, 0.3, camT.z - 0.7);
      env.follow(camT);
    }
    const proj = V();
    function labels() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (const p of players) {
        if (!p.tag) continue;
        proj.set(p.p.x, p.y + 1.85, p.p.z).project(camera);
        const vis = proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05 && phase !== 'done';
        p.tag.style.display = vis ? 'block' : 'none';
        if (vis) {
          p.tag.style.left = `${(proj.x * 0.5 + 0.5) * w}px`;
          p.tag.style.top = `${(-proj.y * 0.5 + 0.5) * h}px`;
        }
      }
      const chip = ui.$('.rr-chip');
      if (chipT > 0 && chipFor && phase !== 'done') {
        proj.set(chipFor.p.x, chipFor.y + 2.3, chipFor.p.z).project(camera);
        chip.style.left = `${(proj.x * 0.5 + 0.5) * w}px`;
        chip.style.top = `${(-proj.y * 0.5 + 0.5) * h}px`;
      } else chip.classList.remove('on');
      const pw = ui.$('.fb-power');
      const on = me.hold > 0;
      pw.classList.toggle('on', on);
      if (on) ui.$('.fb-power b').style.transform = `scaleX(${clamp(me.hold / 0.9, 0.25, 1)})`;
    }

    // ---------------------------------------------------------------- the loop
    function step(dt, t) {
      for (let i = later.length - 1; i >= 0; i--) {
        later[i].t -= dt;
        if (later[i].t <= 0) {
          const f = later[i].fn;
          later.splice(i, 1);
          f();
        }
      }
      phaseT += dt;
      bounceCd -= dt;
      chipT -= dt;
      S.update(dt, t);
      if (phase === 'choose') return;
      if (phase === 'sync' && goAt && now() >= goAt) {
        phase = 'intro';
        phaseT = 0;
      }
      if (phase === 'intro') {
        for (const [at, txt] of [[0.5, '3'], [1.3, '2'], [2.1, '1']]) if (phaseT - dt < at && phaseT >= at) {
          hud.message(txt, 700);
          sound.ui('tick');
        }
        if (phaseT >= 2.9) {
          hud.message('Kick off!', 900);
          blow('short');
          phase = 'play';
          phaseT = 0;
        }
      }
      if (net && !link.host) return stepGuest(dt, t);
      const playing = phase === 'play';
      if (playing) {
        clock += dt;
        if (clock >= HALF) {
          clock = HALF;
          if (half === 1) {
            if (net) link.send('ph', { k: 'half' });
            phase = 'half';
            phaseT = 0;
            blow('long');
            hud.message('Half time', 2000);
            for (const p of players) p.want.set(0, 0, 0);
            ball.owner = null;
          } else finishMatch();
        }
      }
      // decide
      for (const p of players) {
        p.faceCam = false;
        if (p.remote) continue; // the other player runs their kid
        if (phase === 'play') {
          if (p.isMe && !dbg.auto) humanControl(dt);
          else if (p.role === 'keeper') keeperAI(p, dt);
          else fieldAI(p, dt);
        } else if (phase === 'reset' || phase === 'intro' || phase === 'sync') goTo(p, p.spot.x, p.spot.z, p.speed);
        else {
          p.want.set(0, 0, 0);
          // celebrate facing the camera
          const party = ((phase === 'goal' || phase === 'goalEnd') && p.team === scoringTeam) || (phase === 'full' || phase === 'done');
          p.faceCam = party && p.role === 'field' && phaseT > 0.3;
          if (p.faceCam) p.yaw = dampAngle(p.yaw, 0, 5, dt);
        }
      }
      if (!playing) setActionLabel('Shoot');
      for (const p of players) (p.remote ? remotePlayer(p, dt) : movePlayer(p, dt, t));
      separate();
      if (playing) touches();
      ballStep(dt);
      if (phase === 'goal' && phaseT > 3.3) startReset(1 - scoringTeam);
      if (phase === 'goal' && phaseT > 0.2 && (score[0] >= TO_WIN || score[1] >= TO_WIN) && !later.some((l) => l.end)) {
        later.push({ t: 2.6, fn: finishMatch, end: true });
        phase = 'goalEnd';
      }
      if (phase === 'half' && phaseT > 2.6) {
        half = 2;
        clock = 0;
        lastBoardSec = -1;
        startReset(1 - firstKick);
      }
      if (phase === 'reset') {
        const ready = players.every((p) => dist(p.p, p.spot) < 0.3);
        if (ready || phaseT > 2.6) {
          if (net) link.send('ph', { k: 'play', hf: half });
          placeKickoff(true);
          blow('short');
          hud.message(half === 2 && clock === 0 ? 'Second half!' : 'Play!', 800);
          phase = 'play';
          phaseT = 0;
        }
      }
      if (phase === 'full' && phaseT > 3.6) {
        phase = 'done';
        resultCard();
      }
      updateHud();
    }

    // ---------------------------------------------------------------- online: the host
    // The other player's kid, where their device ran it (about 100 ms behind). Its tackle can still win
    // the ball here, where the ball is.
    function remotePlayer(pl, dt) {
      pl.cd -= dt;
      pl.stun -= dt;
      pl.tackleCd -= dt;
      pl.receiving -= dt;
      pl.callFor -= dt;
      const sm = link.sample();
      if (sm) {
        const { a, b, k } = sm;
        const Lp = (q) => (a[q] ?? 0) + ((b[q] ?? 0) - (a[q] ?? 0)) * k;
        const prev = pl.yaw;
        pl.p.set(Lp('x'), 0, Lp('z'));
        pl.v.set(Lp('vx'), 0, Lp('vz'));
        pl.y = Math.max(0, Lp('y'));
        pl.yaw = lerpA(a.yw || 0, b.yw || 0, k);
        pl.hold = b.h || 0;
        let tr = pl.yaw - prev;
        tr = Math.atan2(Math.sin(tr), Math.cos(tr));
        pl.turn = tr / Math.max(dt, 1e-3);
      }
      if (pl.dash > 0) {
        pl.dash -= dt;
        const o = ball.owner;
        if (o && o.team !== pl.team && o.role === 'field' && dist(o.p, pl.p) < 0.95) steal(pl, o);
        else if (!o && dist(ball.p, pl.p) < 0.8 && ball.p.y < 0.6) {
          ball.owner = pl;
          ball.last = pl;
          pl.dash = 0;
        }
      }
    }

    // Every player, the ball and the clock, for the other device
    function shareHost() {
      link.share({
        ph: phase,
        cl: Math.round(clock * 10) / 10,
        hf: half,
        p: players.map((p) => [r2(p.p.x), r2(p.p.z), r2(p.y), r2(p.yaw), r1(p.v.x), r1(p.v.z), (p.stun > 0 ? 1 : 0) | (p.dash > 0 ? 2 : 0) | (p.kickT >= 0 ? 4 : 0) | (p.faceCam ? 8 : 0), p.dive ? p.dive.dir : 0, p.dive ? r2(p.dive.t) : 0, r2(Math.max(0, p.hold))]),
        b: [r2(ball.p.x), r2(ball.p.y), r2(ball.p.z), r1(ball.v.x), r1(ball.v.y), r1(ball.v.z), ball.owner ? players.indexOf(ball.owner) : -1],
      });
    }

    // The other player had to go: the computer runs their kid
    function partnerLeftHost() {
      net = false;
      if (mate) {
        mate.remote = false;
        mate.human = false;
        mate.speed = 5.0;
        mate.dash = 0;
      }
      pop(`${themName} had to go. The computer plays for ${themName}.`, '#ffffff', 2600);
    }

    // ---------------------------------------------------------------- online: the joiner
    function applySnap(dt) {
      const sm = link.sample();
      if (!sm) return;
      const { a, b, k } = sm;
      if (!Array.isArray(a.p) || !Array.isArray(b.p) || !Array.isArray(b.b)) return;
      const Ln = (x, y) => x + (y - x) * k;
      players.forEach((pl, i) => {
        if (pl === me) return;
        const A = a.p[i];
        const B = b.p[i];
        if (!A || !B) return;
        const prev = pl.yaw;
        pl.p.set(Ln(A[0], B[0]) / 100, 0, Ln(A[1], B[1]) / 100);
        pl.y = Math.max(0, Ln(A[2], B[2]) / 100);
        pl.yaw = lerpA(A[3] / 100, B[3] / 100, k);
        pl.v.set(B[4] / 10, 0, B[5] / 10);
        let tr = pl.yaw - prev;
        tr = Math.atan2(Math.sin(tr), Math.cos(tr));
        pl.turn = tr / Math.max(dt, 1e-3);
        const bits = B[6];
        pl.stun = bits & 1 ? 0.3 : 0;
        pl.dash = bits & 2 ? 0.1 : 0;
        if (bits & 4 && !pl.kickOn) pl.kickT = 0;
        pl.kickOn = !!(bits & 4);
        pl.faceCam = !!(bits & 8);
        pl.dive = B[7] ? { dir: B[7], t: B[8] / 100 } : null;
        pl.hold = B[9] / 100;
      });
      const A = a.b || b.b;
      const B = b.b;
      const owner = B[6] >= 0 ? players[B[6]] || null : null;
      ball.owner = owner;
      ball.v.set(B[3] / 10, B[4] / 10, B[5] / 10);
      const start = tmp2.copy(ball.p);
      if (owner === me && !(now() - (me.kickedAt || 0) < 700)) {
        // our own ball sits at our own feet, where we are now
        ball.p.x = damp(ball.p.x, me.p.x + Math.sin(me.yaw) * 0.5, 22, dt);
        ball.p.z = damp(ball.p.z, me.p.z + Math.cos(me.yaw) * 0.5, 22, dt);
        ball.p.y = damp(ball.p.y, R, 18, dt);
      } else ball.p.set(Ln(A[0], B[0]) / 100, Math.max(R, Ln(A[1], B[1]) / 100), Ln(A[2], B[2]) / 100);
      const dx = ball.p.x - start.x;
      const dz = ball.p.z - start.z;
      const ds = Math.hypot(dx, dz);
      if (ds > 1e-4 && ds < 3) ballM.rotateOnWorldAxis(rollAxis.set(dz, 0, -dx).normalize(), (ds / R) * (ball.p.y < 0.6 ? 1 : 0.4));
      if (Number.isFinite(b.cl)) clock = b.cl;
      if (b.hf === 1 || b.hf === 2) half = b.hf;
    }

    // Our own kid runs here; the host sends everyone else, the ball, the clock and the goals
    function stepGuest(dt, t) {
      const playing = phase === 'play';
      me.faceCam = false;
      if (playing) {
        if (dbg.auto) {
          const tx = ball.owner === me ? L : ball.p.x;
          goTo(me, tx, ball.owner === me ? 0 : ball.p.z, me.speed);
        } else humanControl(dt);
      } else if (phase === 'reset' || phase === 'intro' || phase === 'sync') goTo(me, me.spot.x, me.spot.z, me.speed);
      else {
        me.want.set(0, 0, 0);
        const party = ((phase === 'goal' || phase === 'goalEnd') && me.team === scoringTeam) || phase === 'full' || phase === 'done';
        me.faceCam = party && phaseT > 0.3;
        if (me.faceCam) me.yaw = dampAngle(me.yaw, 0, 5, dt);
      }
      if (!playing) setActionLabel('Shoot');
      movePlayer(me, dt, t);
      // keep our kid out of the others (they are where their devices put them)
      for (const o of players) {
        if (o === me) continue;
        const dx = me.p.x - o.p.x;
        const dz = me.p.z - o.p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.62 && d > 1e-4) {
          me.p.x = o.p.x + (dx / d) * 0.62;
          me.p.z = o.p.z + (dz / d) * 0.62;
        }
      }
      if (phase === 'full' && phaseT > 3.6) {
        phase = 'done';
        resultCard();
      }
      updateHud();
      link.share({ x: r2(me.p.x) / 100, z: r2(me.p.z) / 100, y: r2(me.y) / 100, yw: r2(me.yaw) / 100, vx: r2(me.v.x) / 100, vz: r2(me.v.z) / 100, h: r2(Math.max(0, me.hold)) / 100 });
    }

    // The host's goals, kick-offs and whistles
    link.listen('go', (d) => !link.host && Number.isFinite(d?.at) && (goAt = d.at));
    link.listen('ph', (d) => {
      if (link.host || !d || !me) return;
      if (Array.isArray(d.s)) [score[0], score[1]] = [d.s[0] | 0, d.s[1] | 0];
      if (d.k === 'goal') {
        const sc = players[d.sc | 0] || field(d.team ? 1 : 0)[0];
        goalFx(d.team ? 1 : 0, d.side < 0 ? -1 : 1, sc, !!d.own, (d.bz || 0) / 100, (d.by || 30) / 100, (d.bv || 0) / 100);
      } else if (d.k === 'reset') {
        if (d.hf === 2 && half === 1) {
          half = 2;
          clock = 0;
          lastBoardSec = -1;
        }
        startReset(d.kt ? 1 : 0);
      } else if (d.k === 'play') {
        kickoffSpots(kickTeam);
        me.p.copy(me.spot);
        me.v.set(0, 0, 0);
        me.yaw = Math.PI / 2;
        me.hold = me.dash = me.stun = 0;
        blow('short');
        hud.message(half === 2 && clock < 1 ? 'Second half!' : 'Play!', 800);
        phase = 'play';
        phaseT = 0;
      } else if (d.k === 'half') {
        phase = 'half';
        phaseT = 0;
        blow('long');
        hud.message('Half time', 2000);
      } else if (d.k === 'full') finishMatch();
      updateHud();
      lastBoardSec = -1;
    });
    link.listen('stun', () => {
      if (link.host || !me) return;
      me.stun = 0.75;
      me.kid.squash = 0.72;
      me.hold = 0;
    });
    link.listen('ev', (d) => !link.host && Array.isArray(d?.e) && d.e.forEach((e) => Array.isArray(e) && e[0] === 'p' && pop(String(e[1]).slice(0, 60), String(e[2] || '#fff').slice(0, 9), +e[3] || 800)));
    // The joiner's kicks, passes, calls and tackles (host)
    const theirBall = () => link.host && mate?.remote && phase === 'play' && ball.owner === mate;
    link.listen('kick', (d) => {
      if (!theirBall() || !d) return;
      mate.yaw = Number.isFinite(d.yw) ? d.yw : mate.yaw;
      shoot(mate, clamp(+d.k || 0.5, 0.25, 1), Number.isFinite(d.aim) ? clamp(d.aim, -GW, GW) : null);
    });
    link.listen('pass', (d) => {
      if (!theirBall()) return;
      if (Number.isFinite(d?.yw)) mate.yaw = d.yw;
      pass(mate, me);
    });
    link.listen('call', () => {
      if (!link.host || !mate?.remote || ball.owner !== me) return;
      mate.callFor = 0.9;
      chipText('Pass!', mate);
    });
    link.listen('tackle', (d) => {
      if (!link.host || !mate?.remote || phase !== 'play') return;
      mate.dash = 0.45; // a little longer than theirs: their kid shows here a moment later
      mate.dashDir.set(+d?.x / 100 || 0, 0, +d?.z / 100 || 0);
      mate.tackleCd = 0.7;
    });

    // The host had to go: this device runs the match from here, the computer runs their kid
    function takeOver() {
      net = false;
      if (mate) {
        mate.human = false;
        mate.speed = 5.0;
      }
      for (const p of players) {
        p.dash = 0;
        p.kickOn = false;
      }
      pop(`${themName} had to go. The computer plays for ${themName}.`, '#ffffff', 2600);
      if (!me) return askMode();
      if (phase === 'sync') {
        phase = 'intro';
        phaseT = 0;
      }
    }

    function refStep(dt, t) {
      if (!ref) return;
      const tx = clamp(ball.p.x * 0.85, -L + 1, L - 1);
      const tz = clamp(ball.p.z - 4.6, -W + 0.4, W - 2);
      const dx = tx - ref.p.x;
      const dz = tz - ref.p.z;
      const d = Math.hypot(dx, dz);
      const spd = d > 0.4 ? Math.min(4.2, d * 1.6) : 0;
      ref.v.x = damp(ref.v.x, d > 0.01 ? (dx / d) * spd : 0, 6, dt);
      ref.v.z = damp(ref.v.z, d > 0.01 ? (dz / d) * spd : 0, 6, dt);
      ref.p.x += ref.v.x * dt;
      ref.p.z += ref.v.z * dt;
      const sp = Math.hypot(ref.v.x, ref.v.z);
      const prev = ref.yaw;
      ref.yaw = dampAngle(ref.yaw, sp > 0.5 ? Math.atan2(ref.v.x, ref.v.z) : Math.atan2(ball.p.x - ref.p.x, ball.p.z - ref.p.z), 6, dt);
      ref.turn = (ref.yaw - prev) / Math.max(dt, 1e-3);
      const k = ref.kid;
      k.root.position.set(ref.p.x, 0, ref.p.z);
      k.root.rotation.set(0, ref.yaw, 0);
      k.update(dt, t, sp, 0, ref.turn);
      ref.blow -= dt;
      if (ref.blow > 0) {
        k.arms[1].rotation.set(-0.3, 0, -2.6);
        k.arms[0].rotation.set(-1.3, 0, -0.5);
        k.head.rotation.x = -0.25;
      }
    }

    function update(dt0, t) {
      if (disposed) return;
      // a match that started together keeps real time (in steps of at most 34 ms), whatever the frame rate
      const rdt = link.dt();
      if (link.check()) (link.host ? partnerLeftHost : takeOver)();
      const n = played ? Math.max(1, Math.ceil(rdt / 0.034)) : 1;
      const dt = played ? rdt / n : dt0;
      if (phase !== 'choose' && me) {
        if (net && !link.host) applySnap(dt * n);
        for (let i = 0; i < n; i++) step(dt, t);
        if (net && link.host) shareHost();
        link.flush();
        for (const p of players) syncKid(p, dt * n, t);
        refStep(dt * n, t);
        marker.position.set(me.p.x, me.y + 1.95 + Math.sin(t * 5) * 0.06, me.p.z);
        marker.rotation.y = t * 2;
        labels();
      } else S.update(dt, t);
      const hgt = Math.max(0, ball.p.y - R);
      ballShadow.position.set(ball.p.x, 0.03, ball.p.z);
      ballShadow.scale.setScalar(1 - Math.min(0.55, hgt * 0.3));
      ballShadow.material.opacity = 0.28 * (1 - Math.min(0.7, hgt * 0.35));
      camera3(dt, t);
    }

    // Run the match without drawing it (for quick checks): dbg.sim(seconds)
    dbg.sim = (sec, dt = 1 / 30) => {
      for (let i = 0; i < sec / dt; i++) {
        dbg.t = (dbg.t || 0) + dt;
        update(dt, dbg.t);
        if (phase === 'done') break;
      }
      return dbg.state;
    };
    Object.defineProperty(dbg, 'state', { get: () => ({ phase, half, clock: +clock.toFixed(1), score: [...score], owner: ball.owner?.name || null, ball: [+ball.p.x.toFixed(1), +ball.p.y.toFixed(2), +ball.p.z.toFixed(1)] }) });
    dbg.skip = (sec) => (clock = sec);
    dbg.ball = ball;
    dbg.players = players;
    dbg.give = (x, z) => {
      me.p.set(x, 0, z);
      me.yaw = Math.PI / 2;
      ball.owner = me;
      ball.p.set(x + 0.5, R, z);
    };
    // Online test hooks
    dbg.net = () => ({ net, host: link.host, phase, score: [...score], half, clock: +clock.toFixed(1), owner: ball.owner?.name || null, me: me && [+me.p.x.toFixed(2), +me.p.z.toFixed(2)], mate: mate && [+mate.p.x.toFixed(2), +mate.p.z.toFixed(2)], names: players.map((p) => p.name), human: players.filter((p) => p.human).map((p) => p.name) });
    dbg.kick = (k = 1) => {
      if (ball.owner !== me) return false;
      if (net && !link.host) guestKick('kick', { k, aim: null });
      else shoot(me, k, null);
      return true;
    };
    dbg.goal = (team = 0) => {
      if (!auth() || phase !== 'play') return false;
      goal(team, team === 0 ? 1 : -1);
      return true;
    };
    dbg.choose = (id) => {
      const el = document.querySelector('.choose [data-c="' + id + '"]');
      if (el) el.click();
    };

    return {
      update,
      dispose() {
        disposed = true;
        link.dispose();
        ui?.remove();
        if (window.__football === dbg) delete window.__football;
      },
    };
  },
};
