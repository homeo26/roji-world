import { brainBump, brainTag, brainBall, backOff } from './sim.js';

// The five rounds of a night at the bumper cars. Each round sets up its cars, decides who its
// computer drivers chase, scores the bumps its own way, and turns the result into 0 to 3 stars.
// G is the running game (see bumpercars.js): G.me, G.partner, G.byId, G.cars, G.pop, G.toast, G.love ...
// Words over the floor go through G.tell({ [carId]: text, '*': text for everyone else }, at, color, big)
// (a line may be [text, color, big]), so played online each driver gets the words about their own car.
// c.human marks the cars people drive (only G.me alone; both Roji and Homama when played together).

const ring = (n, rx, rz, a0 = Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const z = Math.sin(a) * rz;
    return { x, z, yaw: Math.atan2(-x, -z) };
  });

const starsBy = (v, [a, b, c]) => (v >= c ? 3 : v >= b ? 2 : v >= a ? 1 : 0);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Rival rounds: everybody chases everybody, a little less often the player early on, and
// Homama only now and then goes after Roji (he prefers to watch her drive).
function rivalWeight(G, c, o) {
  let w = 1;
  if (o.human) w *= G.playerBias;
  if (c.id === 'homama' && o.id === 'roji') w *= 0.45;
  if (c.id === 'roji' && o.id === 'homama') w *= 0.8;
  return w;
}

export const ROUNDS = [
  {
    id: 'party',
    name: 'Bump Party',
    time: 40,
    cars: ['roji', 'homama', 'mimi', 'bobo', 'nina', 'sam'],
    tokens: true,
    goal: (G) => `Bump the other cars with your front. Side and back bumps count; a car facing you blocks it. Grab a horn or a boost.<br><b>${G.need.join(' / ')}</b> bumps for 1, 2 or 3 stars.`,
    need: [4, 9, 14],
    start: (G) => ring(6, 6.4, 3.9),
    brain: (c, G, dt) => brainBump(c, G, dt),
    weight: rivalWeight,
    onBump(G, ev) {
      if (ev.kind !== 'bump' && ev.kind !== 'mega') return;
      const pts = ev.kind === 'mega' ? 2 : 1;
      ev.a.score += pts;
      G.tell({ [ev.a.id]: [pts === 2 ? 'Mega bump! +2' : 'Bump! +1', ev.kind === 'mega' ? '#ffd166' : '#ffffff', true], [ev.b.id]: [`${ev.a.name} got you!`, '#ffd1dc'], '*': pts === 2 ? 'Mega!' : 'Bonk!' }, ev);
    },
    onHorn(G, c, hit) {
      const n = Math.min(3, hit.length);
      c.score += n;
      if (n) G.tell({ [c.id]: [`Honk! +${n}`, '#ffd166', true] }, c);
    },
    hud: (G) => `Bumps <b>${G.me.score}</b>`,
    board: (G) => G.active.map((c) => ({ c, score: c.score })),
    result(G) {
      const n = G.me.score;
      const stars = starsBy(n, G.need);
      const top = [...G.active].sort((a, b) => b.score - a.score)[0];
      return { stars, text: `${plural(n, 'bump', 'bumps')}. ${top.score === 0 ? 'A very gentle round.' : n >= top.score ? 'The most of anybody!' : `${top.name} got the most with ${top.score}.`}` };
    },
  },
  {
    id: 'tag',
    name: 'Bumper Tag',
    time: 40,
    cars: ['roji', 'homama', 'mimi', 'bobo', 'nina', 'sam'],
    tokens: true,
    goal: (G) => `The glowing car is it. Bump any car to pass it on, and keep away while someone else glows. A car that was just tagged can not tag straight back.<br>Glow for under <b>${G.need[2]} s</b> in all for 3 stars, <b>${G.need[1]} s</b> for 2, <b>${G.need[0]} s</b> for 1.`,
    need: [17, 11, 6],
    start: (G) => ring(6, 6.4, 3.9),
    setup(G) {
      for (const c of G.active) c.itTime = 0;
      const first = G.byId.bobo;
      first.it = true;
      G.pop('Bobo is it!', first, '#ffd166', true);
    },
    brain: (c, G, dt) => brainTag(c, G, dt),
    weight(G, c, o) {
      let w = 1;
      if (o.human) w *= 0.6 + G.playerBias * 0.6;
      if (c.id === 'homama' && o.id === 'roji') w *= 0.3;
      return w;
    },
    onContact(G, ev) {
      // any real contact with the glowing car passes it on
      const it = ev.a.it ? ev.a : ev.b.it ? ev.b : null;
      if (!it || ev.power < 0.9) return;
      const other = it === ev.a ? ev.b : ev.a;
      if (other.immune > 0 || it.tagCool > 0) return;
      it.it = false;
      it.immune = 2.2;
      other.it = true;
      other.tagCool = 0.6;
      other.dizzy = Math.max(other.dizzy, 0.7);
      G.sfx.tag();
      G.flashCar(other, '#ffd166');
      G.tell({ [other.id]: ["You're it!", '#ffd166', true], [it.id]: ['Tagged! Run!', '#ffffff', true], '*': [`${other.name} is it`, '#ffe7a8'] }, other);
      if (it.id === 'homama' && other.id === 'roji') G.love('sorry');
      backOff(it, other, 0.9);
    },
    update(G, dt) {
      for (const c of G.active) {
        c.tagCool = Math.max(0, (c.tagCool || 0) - dt);
        if (c.it) c.itTime += dt;
      }
    },
    hud: (G) => (G.me.it ? `<span style="color:#e0a400">You're it!</span> <b>${G.me.itTime.toFixed(1)}</b>s` : `It for <b>${G.me.itTime.toFixed(1)}</b>s`),
    board: (G) => G.active.map((c) => ({ c, score: `${Math.round(c.itTime)}s`, glow: c.it })),
    result(G) {
      const s = G.me.itTime;
      const stars = s <= G.need[2] ? 3 : s <= G.need[1] ? 2 : s <= G.need[0] ? 1 : 0;
      const most = [...G.active].sort((a, b) => b.itTime - a.itTime)[0];
      return { stars, text: `You were it for ${s.toFixed(1)} seconds. ${s >= most.itTime ? 'You glowed the longest!' : `${most.name} glowed the longest.`}` };
    },
  },
  {
    id: 'balls',
    name: 'Beach Ball Goals',
    time: 45,
    cars: ['roji', 'homama', 'mimi', 'bobo', 'nina', 'sam'],
    tokens: true,
    balls: 3,
    goal: (G) => `Push the beach balls into a goal at either end. The last car to touch a ball scores it. A golden ball rolls in near the end and is worth 3. A horn blast pushes balls too.<br><b>${G.need.join(' / ')}</b> goals for 1, 2 or 3 stars.`,
    need: [1, 3, 5],
    start: () => [
      { x: 0, z: 4.4, yaw: Math.PI },
      { x: -2.4, z: 4.4, yaw: Math.PI },
      { x: -5.5, z: -3.4, yaw: 0.6 },
      { x: 5.5, z: -3.4, yaw: -0.6 },
      { x: 2.4, z: 4.4, yaw: Math.PI },
      { x: 0, z: -4.6, yaw: 0 },
    ],
    brain: (c, G, dt) => brainBall(c, G, dt),
    weight: rivalWeight,
    onGoal(G, ball, by) {
      const pts = ball.gold ? 3 : 1;
      if (!by) return;
      by.score += pts;
      G.tell({ [by.id]: [ball.gold ? 'Golden goal! +3' : 'Goal! +1', '#ffd166', true], '*': `${by.name} scores${ball.gold ? ' 3' : ''}!` }, ball);
    },
    update(G) {
      if (!G.goldDone && G.time <= 20) {
        G.goldDone = true;
        G.addBall(true);
        G.pop('A golden ball!', { x: 0, z: 0 }, '#ffd166', true);
      }
    },
    hud: (G) => `Goals <b>${G.me.score}</b>`,
    board: (G) => G.active.map((c) => ({ c, score: c.score })),
    result(G) {
      const n = G.me.score;
      const top = [...G.active].sort((a, b) => b.score - a.score)[0];
      return { stars: starsBy(n, G.need), text: `${plural(n, 'goal', 'goals')}. ${top.score === 0 ? 'The balls won this one.' : n >= top.score ? 'Top scorer!' : `${top.name} scored the most with ${top.score}.`}` };
    },
  },
  {
    id: 'last',
    name: 'Last Car Moving',
    time: 70,
    cars: ['roji', 'homama', 'mimi', 'bobo', 'nina', 'sam'],
    tokens: true,
    goal: () => `Every car has three lights. Each bump on your side or back puts one out, and with no lights left your car stops. Face the others to block. Later the outer tiles lose power and slow you down.<br>Last car moving for 3 stars, last two for 2, last three for 1.`,
    start: (G) => ring(6, 6.6, 4.1),
    setup(G) {
      G.outOrder = [];
      for (const c of G.active) c.lights = 3;
    },
    brain: (c, G, dt) => {
      // Homama keeps Roji company once her car is out
      if (c.keepCompany) {
        const r = G.byId.roji;
        const tx = r.x + Math.cos(r.yaw) * 1.85;
        const tz = r.z - Math.sin(r.yaw) * 1.85;
        const d = Math.hypot(tx - c.x, tz - c.z);
        return d > 0.4 ? { dx: (tx - c.x) / d, dz: (tz - c.z) / d, thr: Math.min(0.8, d * 0.5) } : { dx: 0, dz: 0, thr: 0 };
      }
      return brainBump(c, G, dt);
    },
    weight(G, c, o) {
      let w = rivalWeight(G, c, o);
      if (o.lights === 1) w *= 1.3; // finish off a car that is almost out
      return w;
    },
    margin: (G) => 1.1 + G.S.floorFx.darkAt,
    onBump(G, ev) {
      // a gentle nudge does not count, a real bump on the side or back puts a light out
      if ((ev.kind !== 'bump' && ev.kind !== 'mega') || ev.power < 2.2) return;
      G.hitLight(ev.b, ev.a, ev);
    },
    onHorn(G, c, hit) {
      for (const o of hit) G.hitLight(o, c, o);
    },
    update(G, dt) {
      const el = G.elapsed;
      const want = el < 16 ? 0 : Math.min(3.2, ((el - 16) / 24) * 3.2);
      if (want > 0 && G.S.floorFx.darkAt === 0) G.pop('The outer tiles are losing power!', { x: 0, z: 0 }, '#c7b8ff', true);
      G.S.floorFx.darkAt = want;
    },
    over(G) {
      const alive = G.active.filter((c) => c.alive);
      if (alive.length <= 1) return true;
      // the round ends a moment after every car people drive is out
      if ((G.humans || [G.me]).every((c) => !c.alive)) {
        G.meOutT = (G.meOutT || 0) + G.dt;
        return G.meOutT > 3.4;
      }
      return false;
    },
    hud: (G) => `${G.me.alive ? `Lights <b style="letter-spacing:2px">${'&#9679;'.repeat(G.me.lights)}${'&#9675;'.repeat(3 - G.me.lights)}</b>` : 'Out'} &middot; ${G.active.filter((c) => c.alive).length} moving`,
    board: (G) => G.active.map((c) => ({ c, score: c.alive ? '&#9679;'.repeat(c.lights) : 'out', out: !c.alive })),
    result(G) {
      const alive = G.active.filter((c) => c.alive);
      // rank: still moving first (more lights first), then the cars that went out last
      const order = [...alive.sort((a, b) => b.lights - a.lights), ...[...G.outOrder].reverse()];
      const place = order.indexOf(G.me) + 1;
      const stars = place === 1 ? 3 : place === 2 ? 2 : place === 3 ? 1 : 0;
      const n = order.length;
      return { stars, text: place === 1 ? (alive.length === 1 ? 'The last car moving!' : 'Still going strong when the time ran out!') : `You came ${place === 2 ? 'second' : place === 3 ? 'third' : `${place}th`} of ${n}. ${order[0].name} was the last car moving.` };
    },
  },
  {
    id: 'team',
    name: 'Team Bump',
    time: 45,
    cars: ['roji', 'homama', 'mimi', 'bobo'],
    tokens: true,
    team: true,
    goal: (G) => `Roji and Homama are a team against Mimi and Bobo. Bump the mascots for your team. Both of you bumping the same car close together is a double bump, worth an extra point.<br>Win for 2 stars, win by <b>${G.need[2]}</b> for 3.`,
    need: [0, 1, 4],
    start: () => [
      { x: -5.5, z: 1.6, yaw: Math.PI / 2 },
      { x: -5.5, z: -1.6, yaw: Math.PI / 2 },
      { x: 5.5, z: 1.6, yaw: -Math.PI / 2 },
      { x: 5.5, z: -1.6, yaw: -Math.PI / 2 },
    ],
    setup(G) {
      G.teamScore = [0, 0];
      for (const c of G.active) c.team = c.id === 'roji' || c.id === 'homama' ? 0 : 1;
    },
    friend: (c, o) => c.team === o.team,
    brain(c, G, dt) {
      return brainBump(c, G, dt);
    },
    weight(G, c, o) {
      if (c.team === o.team) return 0;
      let w = 1;
      if (o.human) w *= 0.55 + G.playerBias * 0.45;
      return w;
    },
    onBump(G, ev) {
      if (ev.kind !== 'bump' && ev.kind !== 'mega') return;
      const { a, b } = ev;
      if (a.team === b.team) {
        G.love('tap', ev);
        return;
      }
      const pts = ev.kind === 'mega' ? 2 : 1;
      G.teamScore[a.team] += pts;
      a.score += pts;
      let dbl = false;
      if (b.lastBy && b.lastBy !== a && b.lastBy.team === a.team && G.now - b.lastByT < 2) {
        G.teamScore[a.team] += 1;
        dbl = true;
      }
      const word = dbl ? 'Double bump! +2' : `Bump! +${pts}`;
      const col = dbl ? '#ffd166' : '#ffffff';
      if (a.team === 0) G.tell({ [a.id]: [word, col, true], '*': [word, col, dbl] }, ev);
      else G.tell({ '*': [`${a.name} scores`, '#ffd1dc'] }, ev);
      // a mascot bumped Roji or Homama: the other one goes after it
      if (b.team === 0) {
        const mate = b === G.me && !G.partner.human ? G.partner : null;
        if (mate) {
          mate.ai.revenge = a;
          mate.ai.timer = 3;
          if (b.id === 'roji' && !G.rescued) {
            G.rescued = true;
            G.love('rescue', a);
          }
        }
      }
      if (dbl) G.fxHearts(b);
    },
    onHorn(G, c, hit) {
      const n = hit.filter((o) => o.team !== c.team).length;
      G.teamScore[c.team] += n;
      if (n) G.tell({ [c.id]: [`Honk! +${n}`, '#ffd166', true] }, c);
    },
    hud: (G) => `<span style="color:#ef5b6f">Us <b>${G.teamScore[0]}</b></span> : <b>${G.teamScore[1]}</b> Mimi and Bobo`,
    board: (G) => G.active.map((c) => ({ c, score: c.score })),
    result(G) {
      const [us, them] = G.teamScore;
      const d = us - them;
      const stars = d >= G.need[2] ? 3 : d >= G.need[1] ? 2 : d >= G.need[0] && us > 0 ? 1 : 0;
      return { stars, text: d > 0 ? `You won ${us} to ${them}! Mimi and Bobo bow to the champions.` : d === 0 ? `A draw, ${us} all. Mimi and Bobo want a rematch.` : `Mimi and Bobo won ${them} to ${us}. They do a little victory dance.` };
    },
  },
];
