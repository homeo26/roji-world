import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildAlley, BOOTHS, COUNTER_Z, PRIZES, prizeModel } from './parkgames/scene.js';
import { GAMES } from './parkgames/games.js';
import { skinify } from '../places/zoo/rig.js';
import { freeze } from '../places/school/kit.js';

// Roji Land's games alley in 3D: pick a booth (Ring Toss, Hook a Duck, Balloon Darts or Whack-a-Mole)
// and play a short round. Score enough and you win a prize for your other half: Homama wins Roji a
// plush, or the giant teddy, or the other way round. Every prize goes on the prize shelf (saved), and
// each booth gets harder as you win: faster aim, moving bottles, drifting balloons, quicker moles.

const TIER_LIST = [
  ['sticker', 'keyring', 'duckie'],
  ['mimi', 'bobo', 'balloon'],
  ['teddy'],
];
const BLURB = { ring: 'Ring a bottle, gold is 3', ducks: 'Hook the ducks, gold is 5', darts: 'Pop the balloons', moles: 'Whack the moles, not Mimi' };

export default {
  id: 'parkgames',
  title: 'Games Alley',
  tagline: 'Win a prize for your sweetheart',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx } = ctx;
    const env3 = ctx.env.outdoor({ sky: '#a6dde2', fog: [40, 140], shadow: 16 });
    const alley = buildAlley(scene);
    const levels = ctx.load('levels', {});
    const best = ctx.load('best', {});
    const shelf = ctx.load('shelf', []);
    const me = ctx.me;
    const other = ctx.partner;
    const Name = (id) => (id === 'roji' ? 'Roji' : 'Homama');

    // Roji and Homama, and Huda who runs the booths
    const kid = ctx.makeKid(me);
    const partner = ctx.makeKid(other);
    scene.add(kid.root, partner.root);
    const huda = ctx.makeKid({ id: 'huda', name: 'Huda', gender: 'girl', skin: '#c98f68', hair: '#141010', hairstyle: 'long', outfit: 'skirt', top: '#7fd8bf', bottom: '#3f4a7a', shoes: '#3b2b3f', accent: '#ff9eb5' });
    huda.root.scale.setScalar(1.16);
    freeze(huda, { pose: 'stand' });
    huda.root.updateMatrixWorld(true);
    skinify(huda.root, { rough: 0.62 });
    scene.add(huda.root);

    // The prize shelf: everything won so far
    const shelfSlots = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) shelfSlots.push(new THREE.Vector3(-0.9 + c * 0.6, [0.74, 1.59, 2.44, 3.29][r], 0.05));
    const shown = [];
    const fillShelf = () => {
      for (const s of shown) s.removeFromParent();
      shown.length = 0;
      let slot = 0;
      shelf.slice(-24).forEach((p) => {
        const m = prizeModel(p.id);
        if (p.id === 'teddy') {
          m.position.set(-2.0 + (shown.filter((x) => x.userData.teddy).length % 3) * -0.9, 0, 0.6);
          m.userData.teddy = true;
        } else {
          if (slot >= shelfSlots.length) return;
          m.position.copy(shelfSlots[slot++]);
          m.scale.setScalar(0.85);
        }
        alley.shelf.add(m);
        shown.push(m);
      });
    };
    fillShelf();

    const look = new THREE.Vector3(0, 1.6, 0);
    const camPos = new THREE.Vector3(0, 5.2, 12);
    camera.position.copy(camPos);
    camera.lookAt(look);
    const view = { pos: camPos.clone(), look: look.clone() };
    const stand = (k2, x, z, yaw) => {
      k2.pose = 'stand';
      k2.root.position.set(x, 0, z);
      k2.root.rotation.set(0, yaw, 0);
    };
    stand(kid, 0, 4.2, Math.PI);
    stand(partner, 0.9, 4.4, Math.PI);
    stand(huda, BOOTHS[1].x + 1.2, 0.18, 0);
    let game = null;
    let booth = null;
    let phase = 'pick';
    let celebrate = null;
    let disposed = false;
    const cheer = (n) => {
      if (n % 3 === 0) partner.emote('cheer');
      else if (n % 5 === 1 && n > 1) partner.emote('heart');
    };

    hud.buttons({ action: null, jump: null, stick: false });
    hud.hint('');
    let level = 1;
    const flow = (async () => {
    const pick = await hud.choose({
      title: 'Games Alley',
      text: `Win a prize for ${Name(other)}! Pick a booth.`,
      options: BOOTHS.map((b) => {
        const lv = levels[b.id] || 1;
        return { id: b.id, label: b.name, sub: `${BLURB[b.id]}${lv > 1 || best[b.id] ? ` · level ${lv}, best ${best[b.id] || 0}` : ''}` };
      }),
    });
    if (disposed) return;
    booth = BOOTHS.find((b) => b.id === pick) || BOOTHS[0];
    level = Math.min(3, levels[booth.id] || 1);
    hud.title('Games Alley', `${booth.name}, level ${level}`);
    // Walk up to the booth
    stand(kid, booth.x - 1.15, COUNTER_Z + 0.75, Math.PI);
    stand(partner, booth.x + 1.4, COUNTER_Z + 1.15, Math.PI + 0.45);
    stand(huda, booth.x + 1.6, 0.5, 0.35);
    huda.root.position.y = 0.18;
    view.pos.set(booth.x, 3.3, 6.4);
    view.look.set(booth.x, 1.3, -1.0);
    const boothGroup = new THREE.Group();
    boothGroup.position.set(booth.x, 0, 0);
    scene.add(boothGroup);
    game = GAMES[booth.id]({
      booth: boothGroup,
      bx: booth.x,
      level,
      input,
      hud,
      sound,
      fx,
      camera,
      kid,
      partner,
      cheer,
      merge: (list) => mergeGeometries(list, false),
    });
    hud.hint(game.hint);
    hud.score(game.hud());
    phase = 'walk';
    await new Promise((r) => setTimeout(r, 500));
    if (disposed) return;
    await hud.countdown(3);
    if (disposed) return;
    hud.buttons(game.buttons);
    phase = 'play';
    })();
    void flow;

    // After the round: the prize goes to the other one, who hugs it and spins round
    const award = () => {
      const s = game.score;
      const [t1, t2, t3] = game.tiers;
      const tier = s >= t3 ? 2 : s >= t2 ? 1 : s >= t1 ? 0 : -1;
      best[booth.id] = Math.max(best[booth.id] || 0, s);
      ctx.save('best', best);
      hud.buttons({ action: null, jump: null, stick: false });
      if (tier < 0) {
        phase = 'over';
        partner.emote('hug');
        setTimeout(() => !disposed && ctx.finish({ win: false, title: 'So close!', text: `${s} points. ${t1} wins a prize at this booth.<br>${Name(other)} says it was a lovely try anyway.` }), 900);
        return;
      }
      const list = TIER_LIST[tier];
      const id = list[Math.floor(Math.random() * list.length)];
      shelf.push({ id, for: other });
      ctx.save('shelf', shelf.slice(-40));
      let levelUp = false;
      if (tier >= 1 && level < 3) {
        levels[booth.id] = level + 1;
        ctx.save('levels', levels);
        levelUp = true;
      }
      const m = prizeModel(id);
      scene.add(m);
      m.position.set(booth.x, 1.3, COUNTER_Z);
      celebrate = { t: 0, m, id, tier, s, levelUp, given: false };
      phase = 'prize';
      huda.emote('wave');
      sound.ui('win');
      fx.burst(new THREE.Vector3(booth.x, 1.8, COUNTER_Z), ['#ef5b6f', '#ffd166', '#8fd3ff', '#c7a6ff', '#ffffff'], 60);
      hud.message(tier === 2 ? 'The giant teddy!' : 'A prize!', 1600);
    };

    const finishPrize = () => {
      const c = celebrate;
      const nm = PRIZES[c.id].name;
      const giver = Name(me);
      const taker = Name(other);
      const line =
        c.id === 'teddy'
          ? me === 'homama'
            ? 'Homama wins Roji the giant teddy. She has not let go of it since.'
            : 'Roji wins Homama the giant teddy. He pretends it is for her, but he hugs it all the way home.'
          : `${giver} wins ${taker} ${nm}.${c.tier === 1 ? ` ${taker} gives ${me === 'homama' ? 'him' : 'her'} a big hug for it.` : ''}`;
      ctx.finish({
        win: true,
        title: c.tier === 2 ? 'Giant teddy!' : c.tier === 1 ? 'A big prize!' : 'A prize!',
        text: `${c.s} points at ${booth.name}. ${line}${c.levelUp ? `<br>${booth.name} is harder now: level ${level + 1}.` : ''}<br>It is on the prize shelf.`,
      });
    };

    const tmp = new THREE.Vector3();
    return {
      update(dt, t) {
        kid.update(dt, t, 0, 0, 0);
        partner.update(dt, t, 0, 0, 0);
        huda.update(dt, t, 0, 0, 0);
        if (phase === 'play') {
          kid.hands = booth.id === 'ducks' ? 'hold' : null;
          const over = game.update(dt, t);
          hud.score(game.hud());
          if (over) {
            phase = 'over';
            award();
          }
        } else if (phase === 'prize') {
          const c = celebrate;
          c.t += dt;
          // the prize floats over to the other one
          const from = new THREE.Vector3(booth.x, 1.6, COUNTER_Z);
          const to = partner.root.position.clone().add(tmp.set(0, 1.0, 0));
          const u = Math.min(1, c.t / 1.2);
          if (!c.given) {
            c.m.position.lerpVectors(from, to, u);
            c.m.position.y += Math.sin(u * Math.PI) * 0.8;
            c.m.rotation.y = u * 6;
            if (u >= 1) {
              c.given = true;
              c.m.removeFromParent();
              c.m.position.set(0, c.id === 'teddy' ? -0.35 : -0.1, 0);
              c.m.rotation.set(0, 0, 0);
              if (c.id === 'teddy') c.m.scale.setScalar(0.55);
              partner.carry(c.m);
              partner.emote('spin');
              kid.emote('cheer');
              fx.heartsAt(partner.root.position.clone().setY(1.6), 6);
              // the other one turns to face the player for a moment
              partner.root.rotation.y = Math.atan2(kid.root.position.x - partner.root.position.x, kid.root.position.z - partner.root.position.z);
            }
          }
          if (c.t > 3.4 && !c.done) {
            c.done = true;
            fillShelf();
            finishPrize();
          }
        }
        // the camera eases toward the booth
        camPos.lerp(view.pos, 1 - Math.exp(-3 * dt));
        look.lerp(view.look, 1 - Math.exp(-3 * dt));
        camera.position.copy(camPos);
        camera.lookAt(look);
        env3.follow(look);
      },
      dispose() {
        disposed = true;
      },
    };
  },
};
