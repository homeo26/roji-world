// What happens for each choice on a person's card. Every action is a short scene in game time:
// S is the People manager (src/life/npcs.js), rec the person, s the session (s.live() is false once
// the player walks off, a game opens or the room changes, so each step stops cleanly).
import { EMOTES } from '../../kid.js';
import { LINES, linesFor } from './people.js';
import { cameraFlash, polaroid } from './fx.js';

const DANCE_PICKS = ['dance', 'hop', 'jazz', 'shimmy', 'robot', 'twirl', 'moonwalk'];

export const ACTIONS = {
  async talk(S, rec, s) {
    const lines = linesFor(rec.prof.talk?.lines || LINES.talk, S.me);
    rec.puppet.play('happy', 1.2);
    S.say(rec, S.pick(rec, 'talk', lines), 3400);
    await S.wait(1.1);
    if (!s.live()) return;
    S.player.kid.emote('nod');
    await S.wait(2.2);
  },

  async wave(S, rec, s) {
    S.player.kid.emote('wave');
    rec.puppet.play('wave', 1.8);
    await S.wait(0.4);
    S.say(rec, S.pick(rec, 'wave', LINES.wave));
    S.sparkles.burst(rec.head(0.1), ['#ffd166', '#ffffff'], 6, 1);
    await S.wait(1.8);
  },

  async highfive(S, rec, s) {
    await S.approach(rec, rec.puppet.seated ? 0.85 : 0.78);
    if (!s.live()) return;
    S.faceTo(rec);
    S.player.kid.emote('highfive');
    rec.puppet.play('highfive', 1.3);
    await S.wait(0.45);
    if (!s.live()) return;
    const mid = S.player.kid.handWorld(1, S.v1).add(rec.head(-0.15)).multiplyScalar(0.5);
    S.sparkles.burst(mid, ['#ffd166', '#ffffff', '#ff8fb1', '#7fd3ff'], 12, 2);
    S.sounds.clap();
    await S.wait(0.25);
    S.say(rec, S.pick(rec, 'highfive', linesFor(rec.prof.highfive || LINES.highfive, S.me)));
    await S.wait(1.4);
  },

  async handshake(S, rec, s) {
    await S.approach(rec, 0.8);
    if (!s.live()) return;
    S.faceTo(rec);
    S.player.kid.emote('handshake');
    rec.puppet.play('handshake', 1.6);
    await S.wait(0.6);
    S.say(rec, S.pick(rec, 'handshake', LINES.handshake));
    S.sparkles.burst(rec.head(-0.35), ['#ffd166', '#ffffff'], 6, 1);
    await S.wait(1.6);
  },

  async selfie(S, rec, s) {
    // Stand next to them, both facing the camera
    const P = S.player;
    const side = S.sideSpot(rec, 0.72);
    if (side) await S.walkTo(side);
    if (!s.live()) return;
    S.faceYaw(0);
    s.faceFixed = true;
    rec.puppet.face(rec.head(0).add(S.v2.set(0, 0, 6)));
    const phone = S.models.phone();
    P.kid.arms[1].add(phone);
    P.kid.emote('selfie');
    S.say(rec, S.pick(rec, 'selfie', LINES.selfie), 2000);
    const C = S.partner;
    const withPartner = C && C.pos.distanceTo(rec.pos) < 3.6 && !C.seated;
    if (withPartner && C.kid.pose === 'stand' && C.speed < 0.3) C.kid.emote('heart');
    await S.wait(1.05);
    if (s.live()) {
      cameraFlash();
      S.sounds.shutter();
      S.sparkles.burst(phone.getWorldPosition(S.v1), ['#ffffff', '#fff3c4'], 8, 1.4);
      await S.wait(0.3);
      const people = withPartner ? [S.game.looks[S.me], S.npcLook(rec), S.game.looks[C.id]] : [S.game.looks[S.me], S.npcLook(rec)];
      const names = [S.game.looks[S.me].name, ...(withPartner ? [S.game.looks[C.id].name] : []), S.title(rec.name)];
      const caption = names.length === 3 ? `${names[0]}, ${names[1]} and ${names[2]}` : `${names[0]} and ${names[1]}`;
      polaroid(people, caption, S.album(rec));
      await S.wait(1.1);
    }
    phone.removeFromParent();
  },

  async flower(S, rec, s) {
    const P = S.player;
    await S.approach(rec, 0.85);
    if (!s.live()) return;
    S.faceTo(rec);
    const bunch = await S.models.flowers();
    if (!s.live()) return;
    // Hands already full (a lunch box, a rose): the bouquet goes straight over. Swapping it in and out
    // would make the owner of that thing think it was put down.
    const free = !P.kid.carried;
    if (free) P.kid.carry(bunch);
    await S.wait(free ? 0.8 : 0.3);
    if (free && P.kid.carried === bunch) P.kid.carry(null);
    if (!s.live()) return bunch.removeFromParent();
    S.give(bunch, rec, 3.6);
    await S.wait(0.5);
    rec.puppet.play('happy', 1.2);
    S.game.fx.heartsAt(rec.head(0), 5);
    S.say(rec, S.pick(rec, 'flower', linesFor(rec.prof.flower || LINES.flower, S.me)));
    S.game.sound.ui?.('good');
    if (P.kid.pose === 'stand') P.kid.emote('heart');
    await S.wait(2);
  },

  async dance(S, rec, s) {
    const P = S.player;
    const type = S.pick(rec, 'dance-move', DANCE_PICKS);
    const D = EMOTES[type].duration;
    S.faceTo(rec);
    P.kid.emote(type);
    rec.puppet.play(type, D);
    const C = S.partner;
    if (C && !S.game.partnerBusy && !C.seated && C.pos.distanceTo(P.pos) < 4) S.after(0.3, () => C.speed < 0.3 && C.kid.emote(type));
    S.sounds.jingle();
    S.say(rec, S.pick(rec, 'dance', LINES.dance), 2400);
    for (let t = 0; t < D; t += 0.5) {
      S.sparkles.notes(rec.head(0.2));
      if (t % 1 === 0) S.sparkles.notes(P.kid.handWorld(1, S.v1).setY(P.y + 1.7));
      await S.wait(0.5);
      if (!s.live()) return;
    }
  },

  async hug(S, rec, s) {
    await S.approach(rec, 0.56);
    if (!s.live()) return;
    S.faceTo(rec);
    S.player.kid.emote('hug');
    rec.puppet.play('hug', 2.4);
    await S.wait(0.6);
    S.game.fx.heartsAt(S.v1.copy(S.player.pos).add(rec.pos).multiplyScalar(0.5).setY(rec.head(0).y), 6);
    S.say(rec, S.pick(rec, 'hug', linesFor(rec.prof.hug || LINES.hug, S.me)));
    await S.wait(1.9);
  },

  async play(S, rec, s) {
    S.faceTo(rec);
    S.player.kid.emote('hop');
    rec.puppet.play('hop', 2.8);
    S.say(rec, S.pick(rec, 'play', rec.prof.play || ['Again! Again!']));
    for (let i = 0; i < 4; i++) {
      await S.wait(0.7);
      if (!s.live()) return;
      S.game.fx.puff(rec.pos);
    }
    S.say(rec, S.pick(rec, 'play', rec.prof.play || ['Again! Again!']));
    await S.wait(1);
  },

  // Roji the doctor checks on a patient
  async checkup(S, rec, s) {
    const P = S.player;
    await S.approach(rec, 0.8);
    if (!s.live()) return;
    S.faceTo(rec);
    const steth = S.models.stethoscope();
    P.kid.arms[1].add(steth);
    const hands = P.kid.hands;
    P.kid.hands = 'hold';
    S.sounds.heartbeat();
    await S.wait(0.6);
    S.game.fx.heartsAt(rec.head(-0.45), 2);
    await S.wait(1.1);
    P.kid.hands = hands === 'hold' ? null : hands;
    steth.removeFromParent();
    if (!s.live()) return;
    P.kid.emote('nod');
    rec.puppet.play('happy', 1.2);
    S.sparkles.burst(rec.head(-0.3), ['#7be0b4', '#ffffff', '#7fd3ff'], 10, 1.4);
    S.say(rec, S.pick(rec, 'checkup', rec.prof.checkup || LINES.talk), 3000);
    await S.wait(2.4);
  },

  // Homama does something silly to cheer a patient up
  async cheer(S, rec, s) {
    const type = S.pick(rec, 'cheer-move', ['jazz', 'robot', 'hop', 'moonwalk']);
    S.faceTo(rec);
    S.player.kid.emote(type);
    await S.wait(EMOTES[type].duration * 0.6);
    if (!s.live()) return;
    rec.puppet.play('hop', 1.6);
    S.say(rec, S.pick(rec, 'cheer', rec.prof.cheer || LINES.dance), 3000);
    S.game.fx.heartsAt(rec.head(0), 3);
    await S.wait(2);
  },

  // Homama the engineer helps a coworker with a bug
  async bug(S, rec, s) {
    const P = S.player;
    await S.approach(rec, 0.8);
    if (!s.live()) return;
    S.faceTo(rec);
    const hands = P.kid.hands;
    P.kid.hands = 'type';
    S.say(rec, S.pick(rec, 'bug-ask', ['Can you look at this?', 'It worked yesterday, I promise.', 'Why is it red?']), 1800);
    for (let i = 0; i < 4; i++) {
      await S.wait(0.45);
      S.sparkles.burst(rec.head(-0.5), ['#7fd3ff', '#7be0b4', '#b9a6ff'], 3, 0.8);
      S.sounds.beep(i);
    }
    P.kid.hands = hands === 'type' ? null : hands;
    if (!s.live()) return;
    S.game.sound.ui?.('good');
    rec.puppet.play('cheer', 1.4);
    if (P.kid.pose === 'stand') P.kid.emote('cheer');
    S.say(rec, S.pick(rec, 'bug', rec.prof.bug || LINES.highfive), 3000);
    await S.wait(2.2);
  },

  // Roji brings a coworker a coffee
  async coffee(S, rec, s) {
    const P = S.player;
    const cup = await S.models.latte();
    if (!s.live()) return;
    const free = !P.kid.carried;
    if (free) P.kid.carry(cup);
    await S.approach(rec, 0.85);
    if (free && P.kid.carried === cup) P.kid.carry(null);
    if (!s.live()) return cup.removeFromParent();
    S.faceTo(rec);
    S.give(cup, rec, 3.2);
    await S.wait(0.5);
    rec.puppet.play('happy', 1.2);
    S.say(rec, S.pick(rec, 'coffee', rec.prof.coffee || LINES.flower), 3000);
    S.game.fx.heartsAt(rec.head(0), 2);
    await S.wait(2);
  },

  // Order a drink: it is made, handed over, and Roji or Homama holds it for a while
  async latte(S, rec, s) {
    const P = S.player;
    rec.puppet.play('happy', 1.2);
    S.say(rec, S.pick(rec, 'latte', rec.prof.latte || ['Coming right up!']), 2600);
    await S.wait(1.4);
    if (!s.live()) return;
    const cup = await S.models.latte();
    const prev = P.kid.carry(cup); // only offered with free hands (see interact)
    S.sparkles.burst(cup.getWorldPosition(S.v1).setY(P.y + 1.0), ['#c8875a', '#fff3c4', '#ffffff'], 6, 0.9);
    S.game.sound.ui?.('coin');
    await S.wait(3.5);
    if (P.kid.carried === cup) P.kid.carry(prev || null);
    S.game.fx.heartsAt(S.v1.copy(P.pos).setY(P.y + 1.4), 2);
  },
};
