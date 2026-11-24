import { THREE } from '../../places/school/kit.js';
import { Bubble } from './bubbles.js';
import { kernelGeo, KERNEL_COLORS } from './models.js';

// Roji and Homama at the movies. While a film plays, the one the player is NOT playing does the
// little moves toward the other, timed to the film's cues: Homama leans in, shares the popcorn,
// whispers sweet things, tries to kiss Roji at the big moment, hugs her (or hides) at the scares,
// cracks silly jokes, grips the armrest and cheers. Played as Homama, Roji does the same toward him.
// Kid emotes only run while standing, so the seated versions are layered on top of the sitting pose
// here, after the kids update each frame.

const LINES = {
  love: {
    homama: ['You look prettier than the movie.', 'Best seat in the house: next to you.', 'Psst. I love you.', "You're my favourite part of every film.", 'Dr. Roji, my heart is racing. Is that normal?', "Same seats next weekend? It's a date."],
    roji: ["I'm so happy it's you next to me.", 'Psst. I love you more.', "Doctor's orders: hold my hand.", 'You always pick the best movies.', 'My favourite person in my favourite seat.'],
  },
  brave: { homama: "I'm not scared. You can hold my hand though.", roji: "If I get scared, I'm holding your hand." },
  reveal: { homama: 'A kitty! I knew it all along.', roji: 'A kitty! Can we keep her?' },
  joke: {
    egg: { homama: 'He cracks eggs exactly like I do.', roji: "That's exactly how you make eggs." },
    ceiling: { homama: 'Five stars from the ceiling.', roji: "Breakfast is on the ceiling, love." },
    smoke: { homama: 'The smoke alarm is his biggest fan.', roji: 'Smells like your toast, honestly.' },
    toast: { homama: "Tonight I'm cooking for you. Wait...", roji: "Let's order pizza tonight." },
    slide: { homama: 'She chases yarn like I chase the last fry.', roji: "That's you running for the last fry." },
    tangle: { homama: "That's me with phone chargers.", roji: "That's you and the phone charger." },
  },
  cheer: {
    liftoff: { homama: 'Go, little rocket!', roji: 'Fly, fly, fly!' },
    rocks: { homama: 'Woo! Through the rocks!', roji: 'Yes! Nobody flies like that!' },
    chute: { homama: 'Parachute! What a hero!', roji: 'Hooray, it made it home!' },
  },
  line: { us: { homama: "That's us! Look how cute you are.", roji: "That's us! Look at your little face." } },
  hug: { homama: ["I've got you.", "Nothing can get you. I promise.", "I'm right here."], roji: ["Don't let go.", 'Is it gone?', 'Hold me tighter.'] },
  comfort: { homama: ["I'm right here.", 'You can look now.'], roji: ['My brave Homama.', 'There, there.'] },
};

const PARAMS = ['lean', 'headTilt', 'headTurn', 'headDown', 'turn', 'shift', 'low', 'reach', 'around', 'hug', 'kiss', 'cheer', 'grip', 'laugh', 'push', 'feed', 'chew', 'jolt', 'hide', 'offer', 'proud', 'tremble'];
const zero = () => Object.fromEntries(PARAMS.map((p) => [p, 0]));
const pick = (list, n) => (Array.isArray(list) ? list[((n % list.length) + list.length) % list.length] : list);

export function createDate({ api, parent, score, focusMovie, focusKiss, onToss }) {
  const player = api.playerId; // 'roji' | 'homama'
  const actorId = player === 'roji' ? 'homama' : 'roji';
  const actors = { roji: api.roji, homama: api.homama };
  // Roji sits on the left of the love seat, Homama on the right: in each kid's own frame (both face
  // the screen, yaw PI) the partner is on local -X for Roji and +X for Homama.
  const side = { roji: -1, homama: 1 };
  const P = { roji: zero(), homama: zero() };
  const T = { roji: zero(), homama: zero() };
  const bubbles = { roji: new Bubble(parent), homama: new Bubble(parent) };
  const count = (k) => {
    const n = api.load(k, 0);
    api.save(k, n + 1);
    return n;
  };
  let act = null; // { keys, t, i, end }
  let bucket = null;
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  // A popcorn kernel that flies from the bucket into someone's mouth
  const kernel = new THREE.Mesh(kernelGeo(0.05, 6), new THREE.MeshStandardMaterial({ color: KERNEL_COLORS.butter, roughness: 0.8 }));
  kernel.visible = false;
  kernel.renderOrder = 19;
  parent.add(kernel);
  const toss = { t: -1, from: new THREE.Vector3(), to: null };
  let scares = api.load('scareN', 0);

  const who = (k) => (k === 'a' ? actorId : k === 'b' ? player : k === 'r' ? 'roji' : k === 'h' ? 'homama' : k);
  const line = (group, key) => {
    const L = LINES[group];
    if (!L) return '';
    const set = key ? L[key] : L;
    return set ? set[actorId] : '';
  };
  const mid = () => api.local(actors.roji.kid.head.localToWorld(v.set(0, 0.35, 0)).add(actors.homama.kid.head.localToWorld(w.set(0, 0.35, 0))).multiplyScalar(0.5));
  const headTop = (id) => api.local(actors[id].kid.head.localToWorld(v.set(0, 0.62, 0)));
  const mouth = (id) => actors[id].kid.head.localToWorld(new THREE.Vector3(0, 0.2, 0.3));

  // ---------------------------------------------------------------- the moves
  // Each act is a list of keys: [time, target, params] or [time, 'say', who, text, kind, dur],
  // [time, 'hearts', who | 'mid', n], [time, 'toss', toWho], [time, 'sfx', name], [time, 'zoom', on].
  const ACTS = {
    lean: () => {
      const back = Math.random() < 0.6;
      return [
        [0, 'a', { lean: 0.8, headTilt: 1, shift: 0.3 }],
        ...(back ? [[0.9, 'b', { headTilt: 0.6, lean: 0.25 }], [1.6, 'hearts', 'mid', 2]] : [[1.2, 'say', 'a', '', 'heart', 1.6]]),
        [5.2, 'a', { lean: 0, headTilt: 0, shift: 0 }],
        [5.4, 'b', { headTilt: 0, lean: 0 }],
        [6, 'end'],
      ];
    },
    love: () => [
      [0, 'a', { headTurn: 1, lean: 0.4, shift: 0.5 }],
      [0.4, 'say', 'a', pick(LINES.love[actorId], count('loveN')), 'whisper', 3.6],
      [1.0, 'b', { headTurn: 0.5 }],
      [2.4, 'b', { headTilt: 0.5 }],
      [3.0, 'hearts', 'b', 2],
      [4.4, 'a', { headTurn: 0, lean: 0, shift: 0 }],
      [4.6, 'b', { headTurn: 0, headTilt: 0 }],
      [5, 'end'],
    ],
    line: (key) => [
      [0, 'a', { headTurn: 0.9, lean: 0.3 }],
      [0.3, 'say', 'a', line('line', key), 'whisper', 3.2],
      [1.4, 'b', { laugh: 0.6, headTurn: 0.4 }],
      [3.2, 'both', { laugh: 0, headTurn: 0, lean: 0 }],
      [3.6, 'end'],
    ],
    brave: () => [
      [0, 'a', { headTurn: 0.9, lean: 0.3, proud: 0.6 }],
      [0.3, 'say', 'a', line('brave'), 'whisper', 3.4],
      [1.6, 'b', { headTurn: 0.5 }],
      [3.8, 'both', { headTurn: 0, lean: 0, proud: 0 }],
      [4.2, 'end'],
    ],
    reveal: () => [
      [0, 'say', 'a', line('reveal'), 'say', 2.8],
      [0.2, 'both', { laugh: 1, headTurn: 0.4 }],
      [2.2, 'both', { laugh: 0, headTurn: 0 }],
      [2.8, 'end'],
    ],
    joke: (key) => [
      [0, 'a', { headTurn: 0.9, lean: 0.35, shift: 0.4 }],
      [0.3, 'say', 'a', line('joke', key), 'whisper', 3],
      [1.7, 'b', { laugh: 1, headTurn: 0.4 }],
      [2.0, 'a', { laugh: 1, headTurn: 0.4, lean: 0, shift: 0 }],
      [3.8, 'both', { laugh: 0, headTurn: 0 }],
      [4.2, 'end'],
    ],
    laugh: () => [
      [0, 'both', { laugh: 1 }],
      [0.5, 'a', { headTurn: 0.5 }],
      [2.0, 'both', { laugh: 0, headTurn: 0 }],
      [2.4, 'end'],
    ],
    grip: (dur = 3) => [
      [0, 'a', { grip: 1, low: 0.3 }],
      [0.4, 'b', { grip: 0.7 }],
      [dur, 'both', { grip: 0, low: 0 }],
      [dur + 0.2, 'end'],
    ],
    cheer: (key) => [
      [0, 'both', { grip: 0, low: 0 }],
      [0, 'a', { cheer: 1, jolt: 0.4 }],
      [0.18, 'a', { jolt: 0 }],
      [0.2, 'say', 'a', line('cheer', key), 'say', 1.9],
      [0.45, 'b', { cheer: 1 }],
      [1.9, 'both', { cheer: 0 }],
      [2.3, 'end'],
    ],
    rest: () => [
      [0, 'r', { lean: 0.9, headTilt: 1, shift: 0.6 }],
      [0.8, 'h', { headTilt: 0.45, lean: 0.1 }],
      [1.4, 'hearts', 'mid', 3],
      [9999, 'end'],
    ],
    share: () =>
      actorId === 'homama'
        ? [
            [0, 'h', { offer: 1, headTurn: 0.6 }],
            [0.6, 'r', { reach: 1, headTurn: 0.5 }],
            [1.4, 'toss', 'r'],
            [1.5, 'r', { reach: 0, chew: 1 }],
            [2.2, 'h', { offer: 0, headTurn: 0 }],
            [2.4, 'say', 'r', '', 'heart', 1.4],
            [3.4, 'r', { chew: 0, headTurn: 0 }],
            [3.8, 'end'],
          ]
        : [
            // Roji sneaks a handful while Homama watches the film
            [0, 'r', { reach: 1, headTurn: 0.2, low: 0.4 }],
            [0.9, 'toss', 'r'],
            [1.0, 'r', { reach: 0, chew: 1, low: 0 }],
            [1.3, 'h', { headTurn: 1 }],
            [1.4, 'say', 'h', pick(['Hey! That was my favourite piece.', 'Caught you, popcorn thief.', 'A very cute thief.'], count('stealN')), 'say', 2.4],
            [2.2, 'r', { laugh: 1, headTurn: 0.6 }],
            [3.4, 'say', 'r', 'Sharing is caring.', 'whisper', 2.2],
            [3.6, 'h', { offer: 1, headTurn: 0.5 }],
            [4.4, 'r', { laugh: 0, chew: 0 }],
            [5.2, 'h', { offer: 0, headTurn: 0 }],
            [5.4, 'r', { headTurn: 0 }],
            [5.8, 'end'],
          ],
    kiss: () => {
      const n = count('kissN');
      if (actorId === 'homama') {
        const lean = [[0, 'h', { turn: 0.6, headTurn: 0.8 }], [0.3, 'zoom', true], [0.9, 'h', { kiss: 1, lean: 0.3 }]];
        const variant = n % 3;
        if (variant === 0)
          // She kisses back
          return [
            ...lean,
            [1.3, 'r', { headTurn: 0.9, turn: 0.4 }],
            [1.7, 'r', { kiss: 1 }],
            [2.0, 'sfx', 'kiss'],
            [2.0, 'hearts', 'mid', 7],
            [3.6, 'both', { kiss: 0, turn: 0, headTurn: 0, lean: 0 }],
            [3.9, 'r', { lean: 0.7, headTilt: 0.9, shift: 0.4 }],
            [4.6, 'zoom', false],
            [6.8, 'r', { lean: 0, headTilt: 0, shift: 0 }],
            [7.2, 'end'],
          ];
        if (variant === 1)
          // She laughs and pushes his face back to the screen
          return [
            ...lean,
            [1.5, 'r', { push: 1, headTurn: 0.6, turn: 0.2 }],
            [1.7, 'h', { kiss: 0, headTurn: -0.5, turn: 0, jolt: 0.3 }],
            [1.8, 'say', 'r', pick(['Shh! Watch the movie, silly.', 'Eyes on the screen, mister.'], n), 'say', 2.6],
            [1.9, 'r', { laugh: 1 }],
            [2.0, 'h', { jolt: 0 }],
            [2.7, 'r', { push: 0 }],
            [3.0, 'h', { headTurn: 0 }],
            [3.4, 'r', { laugh: 0, headTurn: 0, turn: 0 }],
            [4.3, 'say', 'h', 'Worth a try.', 'whisper', 2.2],
            [5.0, 'zoom', false],
            [5.4, 'r', { headTilt: 0.6, lean: 0.4 }],
            [7.6, 'r', { headTilt: 0, lean: 0 }],
            [8, 'end'],
          ];
        // She pops a piece of popcorn in his mouth first, then a kiss on the cheek
        return [
          ...lean,
          [1.3, 'r', { reach: 1, headTurn: 0.5 }],
          [1.8, 'r', { reach: 0, feed: 1, headTurn: 0.8 }],
          [2.0, 'toss', 'h'],
          [2.2, 'h', { kiss: 0, chew: 1 }],
          [2.3, 'say', 'r', 'Popcorn first.', 'say', 2.2],
          [3.4, 'r', { feed: 0, kiss: 1, turn: 0.4 }],
          [3.7, 'sfx', 'kiss'],
          [3.7, 'hearts', 'h', 5],
          [4.6, 'r', { kiss: 0, turn: 0, headTurn: 0 }],
          [4.8, 'h', { chew: 0, headTurn: 0, turn: 0, lean: 0 }],
          [5.4, 'zoom', false],
          [6, 'end'],
        ];
      }
      const lean = [[0, 'r', { turn: 0.6, headTurn: 0.85 }], [0.3, 'zoom', true]];
      const variant = n % 3;
      if (variant === 0)
        // He kisses back
        return [
          ...lean,
          [0.9, 'r', { kiss: 1, lean: 0.3 }],
          [1.3, 'h', { headTurn: 0.9, turn: 0.4 }],
          [1.7, 'h', { kiss: 1 }],
          [2.0, 'sfx', 'kiss'],
          [2.0, 'hearts', 'mid', 7],
          [3.6, 'both', { kiss: 0, turn: 0, headTurn: 0, lean: 0 }],
          [3.9, 'r', { lean: 0.7, headTilt: 0.9, shift: 0.4 }],
          [4.6, 'zoom', false],
          [6.8, 'r', { lean: 0, headTilt: 0, shift: 0 }],
          [7.2, 'end'],
        ];
      if (variant === 1)
        // He is glued to the screen, so she turns his face to her
        return [
          ...lean,
          [0.6, 'say', 'r', 'Hey. Over here.', 'whisper', 2],
          [1.4, 'r', { push: 1 }],
          [1.6, 'h', { headTurn: 1, turn: 0.4 }],
          [2.0, 'r', { push: 0 }],
          [2.2, 'both', { kiss: 1 }],
          [2.5, 'sfx', 'kiss'],
          [2.5, 'hearts', 'mid', 7],
          [3.9, 'both', { kiss: 0, turn: 0, headTurn: 0 }],
          [4.6, 'zoom', false],
          [5.2, 'end'],
        ];
      // A quick kiss on his cheek and he blushes
      return [
        ...lean,
        [0.7, 'r', { kiss: 1, shift: 0.6 }],
        [0.9, 'sfx', 'kiss'],
        [0.9, 'hearts', 'h', 5],
        [1.1, 'h', { jolt: 0.7 }],
        [1.5, 'h', { jolt: 0, headTurn: 0.8 }],
        [1.8, 'say', 'h', pick(['Again, please?', 'Best movie ever.'], n), 'say', 2.4],
        [1.8, 'r', { kiss: 0, laugh: 1, shift: 0 }],
        [3.4, 'r', { laugh: 0, turn: 0, headTurn: 0 }],
        [3.6, 'h', { headTurn: 0 }],
        [4.2, 'zoom', false],
        [4.6, 'end'],
      ];
    },
    scare: () => {
      const n = scares++;
      api.save('scareN', scares);
      const jump = [[0, 'both', { jolt: 1 }], [0.22, 'both', { jolt: 0 }]];
      if (actorId === 'homama') {
        if (n % 2 === 0)
          return [
            ...jump,
            [0.2, 'h', { hug: 1, headTurn: 0.6, tremble: 1 }],
            [0.3, 'r', { lean: 0.5, headTilt: 0.6, tremble: 0.6 }],
            [0.7, 'say', 'h', pick(LINES.hug.homama, n >> 1), 'whisper', 2.2],
            [2.6, 'both', { tremble: 0 }],
            [3.3, 'h', { hug: 0, headTurn: 0 }],
            [3.3, 'r', { lean: 0, headTilt: 0 }],
            [3.7, 'end'],
          ];
        // He hides behind her shoulder, then pretends he was protecting her
        return [
          ...jump,
          [0.2, 'h', { hide: 1, headDown: 1, headTurn: 0.4, tremble: 1 }],
          [0.7, 'r', { headTurn: 0.8 }],
          [0.9, 'say', 'r', 'Homama?', 'say', 1.4],
          [2.2, 'h', { hide: 0, headDown: 0, tremble: 0, proud: 1, around: 1, headTurn: 0.3 }],
          [2.4, 'say', 'h', 'I was protecting you. Obviously.', 'say', 2.8],
          [3.2, 'r', { laugh: 1 }],
          [4.6, 'r', { laugh: 0, headTurn: 0 }],
          [5.0, 'h', { proud: 0, around: 0, headTurn: 0 }],
          [5.4, 'end'],
        ];
      }
      if (n % 2 === 0)
        return [
          ...jump,
          [0.2, 'r', { hug: 1, headTilt: 0.8, tremble: 1 }],
          [0.3, 'h', { around: 1, headTurn: 0.4 }],
          [0.7, 'say', 'r', pick(LINES.hug.roji, n >> 1), 'whisper', 2.0],
          [1.9, 'say', 'h', pick(LINES.comfort.homama, n >> 1), 'whisper', 1.8],
          [2.8, 'both', { tremble: 0 }],
          [3.4, 'r', { hug: 0, headTilt: 0 }],
          [3.6, 'h', { around: 0, headTurn: 0 }],
          [4, 'end'],
        ];
      return [
        ...jump,
        [0.2, 'r', { hide: 1, headDown: 0.6, headTilt: 1, tremble: 1 }],
        [0.4, 'h', { around: 1, headTurn: 0.5 }],
        [0.8, 'say', 'r', "Tell me when it's over.", 'whisper', 2.2],
        [2.8, 'say', 'h', 'You can look now.', 'whisper', 1.8],
        [3.2, 'r', { hide: 0, headDown: 0, tremble: 0, headTilt: 0.5 }],
        [4.2, 'r', { headTilt: 0 }],
        [4.2, 'h', { around: 0, headTurn: 0 }],
        [4.6, 'end'],
      ];
    },
  };

  function set(target, params) {
    const ids = target === 'both' ? ['roji', 'homama'] : [who(target)];
    for (const id of ids) Object.assign(T[id], params);
  }

  // Moments tied to something on screen (a scare, the kiss, a cheer) start at once; the gentle ones wait
  // for the current moment to finish so nothing is cut short
  const URGENT = new Set(['scare', 'kiss', 'cheer', 'grip']);
  let pending = null;
  function run(key) {
    const [kind, arg] = key;
    const make = ACTS[kind];
    if (!make) return;
    if (act && !URGENT.has(kind) && act.kind !== 'rest') {
      pending = key;
      return;
    }
    if (act) reset(true);
    act = { kind, keys: make(arg), t: 0, i: 0 };
  }

  function reset(keep = false) {
    for (const id of ['roji', 'homama']) Object.assign(T[id], zero());
    if (act?.zoomed) api.focus(focusMovie);
    act = null;
    if (!keep && pending) {
      const next = pending;
      pending = null;
      run(next);
    }
  }

  function fire(k) {
    const [, what, ...rest] = k;
    if (what === 'end') return reset();
    if (what === 'say') {
      const [w0, text, kind, dur] = rest;
      const id = who(w0);
      if (kind === 'heart' || text) bubbles[id].say(text, { kind, dur, side: -side[id] });
      return;
    }
    if (what === 'hearts') {
      const [w0, n] = rest;
      const p = w0 === 'mid' ? mid() : headTop(who(w0));
      api.fx.heartsAt(api.world(p.x, p.z, p.y), n);
      return;
    }
    if (what === 'toss') {
      if (!bucket) return;
      bucket.getWorldPosition(toss.from).y += 0.18;
      toss.to = who(rest[0]);
      toss.t = 0;
      kernel.visible = true;
      onToss?.();
      return;
    }
    if (what === 'sfx') {
      const ctx = api.sound?.ctx;
      if (ctx && score?.bus) score.sfx(rest[0], ctx.currentTime);
      return;
    }
    if (what === 'zoom') {
      if (!act) return;
      act.zoomed = rest[0];
      api.focus(rest[0] ? focusKiss : focusMovie);
      return;
    }
    set(what, rest[0]);
  }

  // ---------------------------------------------------------------- pose layer
  function apply(id, t) {
    const kid = actors[id].kid;
    const p = P[id];
    const s = side[id];
    const B = kid.body;
    const Hd = kid.head;
    const [aL, aR] = kid.arms;
    const near = s > 0 ? aL : aR;
    const far = s > 0 ? aR : aL;
    const shake = p.laugh * Math.sin(t * 19);
    B.rotation.z += -s * (p.lean * 0.13 + p.hug * 0.14 + p.kiss * 0.08 + p.hide * 0.24 + p.around * 0.04) + shake * 0.05 + p.tremble * Math.sin(t * 43) * 0.025 + p.grip * Math.sin(t * 31) * 0.012;
    B.rotation.y += s * (p.turn * 0.42 + p.kiss * 0.45 + p.hug * 0.35 + p.offer * 0.5 + p.push * 0.2 + p.feed * 0.3 + p.reach * 0.2);
    B.rotation.x += p.kiss * 0.1 + p.hide * 0.2 + p.low * 0.12 - p.grip * 0.08 - p.proud * 0.1 + p.laugh * Math.abs(Math.sin(t * 19)) * 0.05 + p.reach * 0.08;
    B.position.x += s * (p.shift * 0.05 + p.hug * 0.06 + p.kiss * 0.05 + p.hide * 0.09);
    B.position.y += p.jolt * 0.16 - p.hide * 0.1 - p.low * 0.05 + p.laugh * Math.abs(Math.sin(t * 19)) * 0.03 + p.cheer * Math.abs(Math.sin(t * 9)) * 0.05;
    Hd.rotation.z += -s * p.headTilt * 0.34;
    Hd.rotation.y += s * (p.headTurn * 0.75 + p.kiss * 0.25);
    Hd.rotation.x += p.headDown * 0.32 - p.cheer * 0.15 + p.chew * Math.sin(t * 14) * 0.03 + p.kiss * 0.08;
    const blend = (arm, x, z, k) => {
      if (k <= 0.002) return;
      arm.rotation.x += (x - arm.rotation.x) * k;
      arm.rotation.y += (0 - arm.rotation.y) * k;
      arm.rotation.z += (z - arm.rotation.z) * k;
    };
    if (id === 'homama' && bucket) {
      const hold = 1 - Math.min(1, Math.max(p.hug, p.around, p.cheer, p.grip, p.push, p.feed, p.reach, p.hide));
      blend(near, -0.95 - p.offer * 0.35, s * (0.5 + p.offer * 0.15), hold);
    }
    blend(near, -1.1, s * 0.85, p.reach);
    blend(near, -1.75, s * 0.5, p.feed);
    blend(near, -1.5, s * 0.75, p.push);
    blend(near, -0.4, s * 2.35, p.around);
    blend(near, -1.0, s * 1.5, p.hug);
    blend(far, -1.4, s * 0.95, p.hug);
    const wav = Math.sin(t * 12) * 0.25;
    blend(aL, -0.1, 2.6 + wav, p.cheer);
    blend(aR, -0.1, -2.6 - wav, p.cheer);
    blend(aL, -0.12, 0.62, p.grip);
    blend(aR, -0.12, -0.62, p.grip);
    if (kid.mouth) kid.mouth.scale.set(1 - 0.45 * p.kiss, 1 + p.chew * 0.7 * Math.abs(Math.sin(t * 13)) + p.laugh * 0.5, 1);
  }

  return {
    get bucket() {
      return bucket;
    },
    set bucket(b) {
      bucket = b;
    },
    cue(key) {
      run(key);
    },
    // filmT: seconds into the film (negative during the leader)
    update(dt, t) {
      if (act) {
        act.t += dt;
        while (act && act.i < act.keys.length && act.keys[act.i][0] <= act.t) fire(act.keys[act.i++]);
      }
      for (const id of ['roji', 'homama']) {
        const p = P[id];
        const tg = T[id];
        for (const k of PARAMS) {
          const rate = k === 'jolt' ? 16 : k === 'laugh' || k === 'tremble' ? 9 : 6;
          p[k] += (tg[k] - p[k]) * (1 - Math.exp(-rate * dt));
        }
        apply(id, t);
        const k = actors[id].kid;
        const top = k.head.localToWorld(v.set(0, 0.7, 0));
        k.root.localToWorld(w.set(-side[id] * 0.32, 0, 0)).sub(k.root.position);
        bubbles[id].update(dt, api.local(top.add(w)));
      }
      // Homama holds the bucket up between them where it shows over the seat back, lifts it toward Roji
      // to offer it, and rests it on the seat while his hands are busy
      if (bucket) {
        const h = P.homama;
        const busy = Math.min(1, Math.max(h.hug, h.around, h.cheer, h.grip, h.push, h.feed, h.reach, h.hide));
        const root = actors.homama.kid.root;
        root.localToWorld(w.set(0.34 + h.offer * 0.12, 0.6 + h.offer * 0.12 - busy * 0.3, 0.2 + h.offer * 0.04));
        bucket.position.copy(api.local(w));
        bucket.rotation.set(0, root.rotation.y, -h.offer * 0.3);
      }
      if (toss.t >= 0) {
        toss.t += dt / 0.45;
        const to = mouth(toss.to);
        const k = Math.min(1, toss.t);
        const p = v.lerpVectors(toss.from, to, k);
        p.y += Math.sin(k * Math.PI) * 0.35;
        kernel.position.copy(api.local(p));
        kernel.rotation.set(k * 6, k * 4, 0);
        if (toss.t >= 1) {
          toss.t = -1;
          kernel.visible = false;
        }
      }
    },
    dispose() {
      pending = null;
      reset();
      for (const id of ['roji', 'homama']) {
        Object.assign(P[id], zero());
        const m = actors[id].kid.mouth;
        if (m) m.scale.set(1, 1, 1);
        bubbles[id].dispose();
      }
      kernel.removeFromParent();
      kernel.geometry.dispose();
      kernel.material.dispose();
    },
  };
}
