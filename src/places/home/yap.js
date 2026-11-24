import { THREE } from './kit.js';

// Yap time: Roji tells Homama about her day. She picks a topic, talks with little drawn bubbles, and
// Homama listens, nods, says short things that fit, and reacts in his own way to each topic. Several
// variations per topic, so it never plays quite the same twice.

const P = Math.PI;

export const TOPICS = [
  { id: 'hard', label: 'A hard day at the hospital', sub: 'I need a hug' },
  { id: 'funny', label: 'Something funny happened', sub: 'You will laugh' },
  { id: 'worry', label: "I'm worried about something", sub: 'Can I tell you?' },
  { id: 'news', label: 'Exciting news!', sub: 'Guess what!' },
  { id: 'gossip', label: 'Gossip about my friend', sub: 'Do not tell anyone' },
  { id: 'talk', label: 'I just want to talk', sub: 'About anything' },
];

const SCRIPTS = {
  hard: {
    icons: ['cross', 'bandage', 'cloud'],
    listen: ['Oh, Roji...', 'Mm-hm.', 'That sounds hard.'],
    lines: [
      ['We had so many patients today. I did not even have time for lunch.', 'A little girl was so scared of her shot. I held her hand the whole time.'],
      ['Three emergencies, one after another. My feet are so tired.', 'But everyone went home okay in the end.'],
      ['A grandpa kept calling me by the wrong name all day.', 'And then he cried when he had to say goodbye. I almost cried too.'],
    ],
    react: ['Come here. You did amazing today.', "I'm so proud of you, Dr. Roji. You make people better.", "Let me hold you for a bit. You're home now."],
  },
  funny: {
    icons: ['laugh', 'scribble', 'star'],
    listen: ['Wait, what?', 'Haha, go on!', 'No way!'],
    lines: [
      ['A patient asked me if my stethoscope can hear what he is thinking.', 'So I listened and told him he was thinking about pizza. He was!'],
      ['I walked into the wrong room and started my talk to... the supply cupboard.', 'A nurse opened the door and just slowly closed it again.'],
      ['A little boy said his tummy hurt, then he sneezed out a jelly bean.', 'Mystery solved. Doctor Roji, jelly bean expert.'],
    ],
    react: ['Haha! Stop, my tummy hurts now!', "That's the best thing I've heard all week!", 'Jelly bean expert! I am putting that on a mug.'],
  },
  worry: {
    icons: ['cloud', 'question', 'dots'],
    listen: ['Hey... I am here.', 'Tell me.', 'Take your time.'],
    lines: [
      ['I keep thinking about my exam next month.', 'What if I forget everything when I sit down?'],
      ['I am scared I am not doing enough for my patients.', 'There is always one more thing I could have checked.'],
      ['My mum sounded tired on the phone today.', 'I just want everyone I love to be okay.'],
    ],
    react: ["Whatever happens, we'll figure it out together.", 'You are more ready than you think. I believe in you.', "Breathe with me. One, two... see? We've got this."],
  },
  news: {
    icons: ['star', 'excl', 'hearts'],
    listen: ['What?!', 'Tell me, tell me!', 'Really?!'],
    lines: [
      ['My patient from last month came back just to say thank you!', 'And she brought me flowers. Real flowers!'],
      ['They picked me to help with a big surgery next week!', 'Me! The new doctor!'],
      ['They put my photo on the Doctor of the Month board!', 'Everybody clapped when I walked in.'],
    ],
    react: ['YES! I knew it! That is my Roji!', 'We are celebrating with pecan cake tonight!', 'I am telling everyone on the island!'],
  },
  gossip: {
    icons: ['eyes', 'excl', 'scribble'],
    listen: ['No...', 'And then?!', 'Wait, who?'],
    lines: [
      ['So guess who came to work with a brand new haircut...', '...and a brand new boyfriend!'],
      ['My friend says she is moving to Paris.', 'Paris! And she only told me today!'],
      ['Two nurses wore the exact same dress today.', 'Nobody said a word. But everybody saw.'],
    ],
    react: ['Wait, wait. Start from the beginning.', 'I am not leaving this spot until I hear the rest.', 'Gasp! Tell me everything.'],
  },
  talk: {
    icons: ['hearts', 'sun', 'scribble'],
    listen: ['I love listening to you.', 'Mm-hm.', 'Tell me more.'],
    lines: [
      ['I do not have news. I just like talking to you at the end of the day.', 'You make the day feel finished.'],
      ['The sky was really pink on the way home.', 'It made me think of you.'],
      ['I was thinking about our first weekend together.', 'I was so nervous. And you were so sweet.'],
    ],
    react: ['I could listen to you all day.', 'Tell me about the pink sky again.', 'Every day with you is my favourite.'],
  },
};

// place: { sit: { roji: { x, z, y, yaw }, homama: {...} }, stand: { roji: { x, z, yaw }, homama: {...} },
//          focus: { x, z, y, zoom }, exit: { x, z } } in the room builder's coordinates.
export function makeYap(R, place) {
  const st = { t: 0, steps: [], last: {} };
  const name = (id) => (id === 'roji' ? 'Roji' : 'Homama');

  async function begin(a) {
    let topic;
    if (a.playerId === 'roji') {
      topic = await a.choose({ title: 'Tell Homama about your day', text: 'What do you want to talk about?', options: TOPICS.map((t) => ({ id: t.id, label: t.label, sub: t.sub })) });
      if (!topic) return;
    } else {
      // Homama asks; Roji picks what is on her mind (a hard day is more likely when she is tired)
      const tired = R.tired?.(a);
      const pool = tired ? ['hard', 'hard', 'talk', 'funny'] : TOPICS.map((t) => t.id);
      topic = pool[Math.floor(Math.random() * pool.length)];
    }
    run(a, topic);
  }

  function run(a, topic) {
    const S = SCRIPTS[topic];
    let v = Math.floor(Math.random() * S.lines.length);
    if (v === st.last[topic]) v = (v + 1) % S.lines.length;
    st.last[topic] = v;
    const [l1, l2] = S.lines[v];
    const react = S.react[v % S.react.length];
    const listen = [...S.listen].sort(() => Math.random() - 0.5);
    const roji = a.roji;
    const homama = a.homama;
    const steps = [];
    const at = (t, fn) => steps.push({ t, fn, done: false });
    const sit = place.sit;
    const stand = place.stand;
    let mode = 'sit';

    at(0.0, () => {
      R.talk.say(roji, S.icons[0], { dur: 2.2 });
      a.toast(a.playerId === 'homama' ? `<b>Homama:</b> How was your day, my love?<br><b>Roji:</b> ${l1}` : `<b>Roji:</b> ${l1}`, 4200);
    });
    at(1.6, () => {
      nod();
      R.talk.say(homama, 'text', { text: listen[0], dur: 1.8 });
    });
    at(2.6, () => R.talk.say(roji, 'scribble', { dur: 2.0 }));
    at(3.6, () => nod());
    at(4.4, () => {
      R.talk.say(roji, S.icons[1], { dur: 2.2 });
      a.toast(`<b>Roji:</b> ${l2}`, 3800);
    });
    at(5.9, () => R.talk.say(homama, 'text', { text: listen[1], dur: 1.6 }));
    at(6.6, () => R.talk.say(roji, S.icons[2], { dur: 1.8 }));

    // Homama's reaction, a different one for each topic
    const R0 = 8.2;
    if (topic === 'hard') {
      at(R0, () => standUp(a));
      at(R0 + 0.4, () => {
        a.emote('roji', 'hug');
        a.emote('homama', 'hug');
        a.toast(`<b>Homama:</b> ${react}`, 3800);
      });
      at(R0 + 2.6, () => {
        a.emote('roji', 'hug');
        a.emote('homama', 'hug');
        a.fx.heartsAt(R.headPos(homama), 5);
        R.talk.say(roji, 'hearts', { dur: 2.0 });
      });
      at(R0 + 5.0, () => a.emote('homama', 'kiss'));
    } else if (topic === 'funny') {
      at(R0, () => {
        st.laugh = 2.8;
        R.talk.say(homama, 'text', { text: 'Haha!', dur: 2.2 });
        R.talk.say(roji, 'laugh', { dur: 2.2 });
        a.toast(`<b>Homama:</b> ${react}`, 3600);
        R.sound((s, t0) => [0, 0.16, 0.32, 0.5].forEach((d, i) => s.tone(520 + i * 40, t0 + d, 0.1, { type: 'triangle', gain: 0.04, slideTo: 420 })));
      });
      at(R0 + 2.4, () => R.talk.say(homama, 'text', { text: 'Hahaha!', dur: 1.6 }));
    } else if (topic === 'worry') {
      at(R0, () => standUp(a));
      at(R0 + 0.5, () => {
        a.emote('homama', 'kiss');
        a.toast(`<b>Homama:</b> ${react}`, 3800);
      });
      at(R0 + 1.4, () => {
        a.fx.heartsAt(R.headPos(roji), 4);
        R.talk.say(roji, 'heart', { dur: 2.0 });
      });
      at(R0 + 2.4, () => {
        a.emote('roji', 'hug');
        a.emote('homama', 'hug');
      });
    } else if (topic === 'news') {
      at(R0, () => {
        standUp(a);
        st.jump = { who: homama, t: 0 };
        a.emote('homama', 'cheer');
        R.talk.say(homama, 'text', { text: 'YES!', dur: 2.0 });
        a.toast(`<b>Homama:</b> ${react}`, 3600);
        a.fx.burst(R.headPos(homama), ['#ef5b6f', '#ffd166', '#ffffff', '#7fd3ff', '#c7a6ff'], 60);
        a.sound.ui('win');
      });
      at(R0 + 1.2, () => a.emote('roji', 'cheer'));
      at(R0 + 2.6, () => {
        a.emote('roji', 'hug');
        a.emote('homama', 'hug');
      });
    } else if (topic === 'gossip') {
      at(R0, () => {
        st.lean = 1;
        R.talk.say(homama, 'text', { text: 'No way!', dur: 2.0 });
        a.toast(`<b>Homama:</b> ${react}`, 3600);
        R.sound((s, t0) => s.tone(380, t0, 0.25, { type: 'sine', gain: 0.05, slideTo: 760 }));
      });
      at(R0 + 2.0, () => R.talk.say(roji, 'eyes', { dur: 2.0 }));
      at(R0 + 3.6, () => R.talk.say(homama, 'excl', { dur: 1.6 }));
    } else {
      at(R0, () => {
        st.cuddle = 1;
        a.toast(`<b>Homama:</b> ${react}`, 3800);
        R.talk.say(homama, 'hearts', { dur: 2.2 });
      });
      at(R0 + 1.5, () => a.fx.heartsAt(R.headPos(roji), 4));
    }
    at(R0 + 6.2, () => {
      a.fx.heartsAt(a.world(place.focus.x, place.focus.z, 1.7), 3);
      a.toast(a.playerId === 'roji' ? '<b>Roji:</b> Thank you for listening.<br><b>Homama:</b> Always.' : '<b>Roji:</b> Thank you for asking.<br><b>Homama:</b> Always, my love.', 3000);
    });
    at(R0 + 8.6, () => R.is('yap') && a.endActivity());

    // Seated kids cannot play the nod emote, so the head nods by hand
    function nod() {
      if (homama.kid.pose === 'stand') a.emote('homama', 'nod');
      else st.nod = 1.3;
    }
    function standUp(aa) {
      if (mode === 'stand') return;
      mode = 'stand';
      R.place(aa.roji, stand.roji.x, stand.roji.z, { yaw: stand.roji.yaw, y: 0 });
      R.place(aa.homama, stand.homama.x, stand.homama.z, { yaw: stand.homama.yaw, y: 0 });
      aa.roji.kid.pose = 'stand';
      aa.homama.kid.pose = 'stand';
      aa.roji.kid.hands = null;
      aa.homama.kid.hands = null;
    }

    st.t = 0;
    st.steps = steps;
    st.laugh = 0;
    st.jump = null;
    st.lean = 0;
    st.cuddle = 0;
    st.nod = 0;
    const spec = R.start('yap', {
      label: 'Stop talking',
      seats: [
        { who: 'roji', ...sit.roji, pose: 'sit' },
        { who: 'homama', ...sit.homama, pose: 'sit' },
      ],
      focus: place.focus,
      music: 0.4,
      exit: place.exit,
      update(dt) {
        st.t += dt;
        for (const s of st.steps) {
          if (!s.done && st.t >= s.t) {
            s.done = true;
            s.fn();
          }
        }
        // Little animations on top of the poses
        if (st.nod > 0) {
          st.nod -= dt;
          homama.kid.head.rotation.x += Math.max(0, Math.sin((1.3 - st.nod) * 9)) * 0.3 * Math.min(1, st.nod * 4);
        }
        if (st.laugh > 0) {
          st.laugh -= dt;
          if (Math.floor(st.laugh * 6) !== Math.floor((st.laugh + dt) * 6)) {
            roji.kid.squash = 1.12;
            homama.kid.squash = 1.16;
          }
        }
        if (st.jump) {
          st.jump.t += dt;
          const k = st.jump.t / 0.6;
          const hop = k < 2 ? Math.abs(Math.sin(k * P)) * 0.5 : 0;
          const s = place.stand.homama;
          R.place(homama, s.x, s.z, { yaw: s.yaw, y: hop });
          if (k >= 2) st.jump = null;
        }
        if (st.lean > 0) {
          homama.kid.body.rotation.x += 0.28;
          homama.kid.head.rotation.x -= 0.15;
        }
        if (st.cuddle > 0) {
          // Lean in toward each other on the seat
          for (const [k, o] of [[roji, sit.roji], [homama, sit.homama]]) {
            if (k.kid.pose !== 'sit') continue;
            k.kid.body.rotation.x += o.leanX ?? 0;
            k.kid.body.rotation.z += o.leanZ ?? 0;
          }
        }
      },
      onEnd() {
        st.steps = [];
        st.jump = null;
        R.talk.clear();
      },
    });
    if (spec) a.sound.ui('tap');
  }

  return { begin, run, label: (a) => (a.playerId === 'roji' ? 'Tell Homama about your day' : 'Ask Roji about her day') };
}

export { THREE };
