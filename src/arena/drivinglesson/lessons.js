// Abu Sanad's course: eight short lessons, each a list of tasks with its own twist.
// A task: { label, say, wps: [[x, z, 'r'?]], reach?, hold?(G), beacon?: [x, z, y], fan?: [x, z], cones?: [[x, z]],
//           begin?(G), step(G, dt), auto?(G) -> { brake, intent, gear }, needBrake?(G) }
// G is the game API (see drivinglesson.js): car state, the world, people, say / pop / oops / done.
import { COURSE_TITLES } from '../../places/driving/kit.js';
import { RC, R_OUT, R_LANE, GATE_Z, STOP_Z, LIGHT_Z, ZEBRA, BAY, SCHOOL, HILL, BRIDGE, MARKET } from './world.js';

const PI = Math.PI;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ringPt = (th) => [RC.x + Math.cos(th) * R_LANE, RC.z + Math.sin(th) * R_LANE];

const GATE_CONES = [[-2.5, GATE_Z - 1], [-2.5, GATE_Z], [-2.5, GATE_Z + 1], [2.5, GATE_Z - 1], [2.5, GATE_Z], [2.5, GATE_Z + 1]];
const SLALOM_CONES = [[0.95, 33.6], [-0.95, 28.6]];
const STOP_CONES = [[-2.6, STOP_Z - 1.2], [2.6, STOP_Z - 2.2], [-2.6, 18], [2.6, 18]];
const LOT_CONES = [[20.7, 27.0], [24.3, 27.0], [16.3, 14], [21.7, 14], [16.3, 18], [21.7, 18]];

// ------------------------------------------------------------------ tasks
function warmUp() {
  return {
    label: 'Follow the arrows round the corner',
    say: 'Let us warm up. Follow the arrows past the shops and round the corner.',
    wps: [[18, 46], [8.6, 46.1], [2.8, 43.4], [0, 37.4]],
    fan: [27.4, 49.6],
    step(G) {
      if (G.p.z < 37.2 && Math.abs(G.p.x) < 2.6) G.done('Lovely steering!');
    },
    auto: (G) => ({ intent: G.p.x < 12 && G.p.z > 38 ? 0.6 : 0.9 }),
  };
}

function slalom() {
  let hits0 = 0;
  return {
    label: 'Weave through the slalom',
    say: 'Weave round the cones, left and right, nice and gentle.',
    cones: SLALOM_CONES,
    wps: [[-0.75, 33.6], [0.75, 28.6], [0, 23.6]],
    reach: 1.7,
    fan: [-4.6, 33.4],
    begin(G) {
      hits0 = G.coneHits;
    },
    step(G) {
      if (G.p.z < 26.8) {
        const clean = G.coneHits === hits0;
        G.done(clean ? 'Lovely weaving!' : 'Slalom done', clean);
      }
    },
    auto: () => ({ intent: 0.55 }),
  };
}

function gate() {
  return {
    label: 'Drive through the cone gate',
    say: 'Follow the arrow and drive through the cone gate.',
    cones: GATE_CONES,
    wps: [[0, GATE_Z - 1]],
    beacon: [0, GATE_Z, 5.0],
    fan: [-4.6, 21.8],
    step(G) {
      const p = G.p;
      if (p.z < GATE_Z && p.z > GATE_Z - 3 && Math.abs(p.x) < 2.3) G.done('Through the gate!');
    },
  };
}

function stopLine(wet = false) {
  let said = false;
  const deep = wet ? 3.8 : 3.1;
  return {
    label: 'Stop at the stop line',
    say: wet ? 'Wet road! Brake early and stop at the white line.' : 'Hold the brake and stop right at the white line.',
    cones: STOP_CONES,
    wps: [[0, STOP_Z - 0.5]],
    beacon: [0, STOP_Z + 0.6, 2.6],
    fan: [-4.4, 10.6],
    begin(G) {
      G.zone(-2.15, STOP_Z + 0.1, 2.15, STOP_Z + deep);
    },
    step(G) {
      const f = G.front();
      if (f.z < STOP_Z - 0.7) {
        G.oops(1, `Just past the line. Brake a tiny bit sooner next time${wet ? ', it is slippery' : ''}!`, 'Stopped past the stop line');
        G.done('A little past the line', false);
      } else if (f.z < STOP_Z + deep && G.sp < 0.2) G.done('Perfect stop!');
      else if (!said && f.z < STOP_Z + 6 && G.sp > 3) {
        said = true;
        G.say('Brake now! Hold the brake button.', 'Abu Sanad', 2000);
      }
    },
    auto: (G) => ({ brake: G.front().z < STOP_Z + (wet ? 3.9 : 2.9) + G.sp * (wet ? 0.35 : 0) }),
    needBrake: (G) => G.front().z < STOP_Z + 6 && G.front().z > STOP_Z - 1,
  };
}

function light() {
  let wait = 0;
  let t = 0;
  return {
    label: 'Wait for the green light',
    say: 'The light is red. Stop at the line and wait for green.',
    wps: [[0, LIGHT_Z - 0.5], [0, -4]],
    hold: (G) => G.light !== 'green',
    beacon: [3.1, LIGHT_Z + 0.2, 4.2],
    fan: [-4.8, 3.6],
    begin(G) {
      G.setLight('red');
      G.zone(-2.15, LIGHT_Z + 0.1, 2.15, LIGHT_Z + 3.6);
    },
    step(G, dt) {
      const f = G.front();
      if (G.light !== 'green') {
        if (f.z < LIGHT_Z - 0.4) {
          G.oops(1, 'Oh! That light was red. I nearly dropped my clipboard!', 'Drove through a red light');
          G.setLight('green');
        } else if (f.z < LIGHT_Z + 3.7 && G.sp < 0.25) {
          wait += dt;
          if (wait > 1.4 && G.light === 'red') {
            G.setLight('redamber');
            t = 0;
            G.say('Good waiting. Get ready...', 'Abu Sanad', 0);
          }
        }
        if (G.light === 'redamber') {
          t += dt;
          if (t > 0.9) {
            G.setLight('green');
            G.pop('Green!', '#c9ffd9');
            G.chime();
            G.say('Green light! Off we go.', 'Abu Sanad', 0);
          }
        }
      } else if (f.z < LIGHT_Z - 0.5) G.done('Nice and patient!', wait > 0.5);
    },
    auto: (G) => ({ brake: G.front().z < LIGHT_Z + 3.4 && G.light !== 'green' }),
    needBrake: (G) => G.light !== 'green' && G.front().z < LIGHT_Z + 7,
  };
}

// Lesson 1 ends at the give way line, a peek at the roundabout
function giveWayStop() {
  return {
    label: 'Stop at the roundabout line',
    say: 'See the give way line by the roundabout? Stop just before it.',
    wps: [[2.3, -7.6], [7.4, -10]],
    beacon: [RC.x - R_OUT - 0.3, -10, 2.6],
    fan: [5.4, -14.4],
    begin(G) {
      G.zone(6.6, -12.1, RC.x - R_OUT - 0.1, -7.9);
    },
    step(G) {
      const f = G.front();
      if (f.x > RC.x - R_OUT + 0.6) {
        G.oops(0.5, 'Nearly onto the roundabout! Next lesson we go round, I promise.', 'Crossed the give way line');
        G.done('Over the line', false);
      } else if (f.x > 6.4 && Math.abs(f.z + 10) < 2.3 && G.sp < 0.2) G.done('Perfect! Next time we go round.');
    },
    auto: (G) => ({ brake: G.front().x > RC.x - R_OUT - 1.5 }),
    needBrake: (G) => G.front().x > 4,
  };
}

function ringEnter() {
  let waited = false;
  return {
    label: 'Give way, then join the roundabout',
    say: 'Cars already going round go first. Wait for a gap, then go.',
    wps: [[2.3, -7.6], [8.6, -10], ringPt(PI - 0.5)],
    beacon: [RC.x - R_OUT - 0.3, -10, 2.6],
    fan: [5.4, -14.4],
    begin(G) {
      G.zone(6.4, -12.1, RC.x - R_OUT - 0.1, -7.9);
    },
    step(G) {
      const f = G.front();
      const d = Math.hypot(f.x - RC.x, f.z - RC.z);
      if (G.sp < 0.2 && d < R_OUT + 3.5) waited = true;
      if (d < R_OUT - 0.4) {
        if (G.traffic.danger(0.95)) {
          G.oops(1, 'Wait! That car was already going round. Always give way.', 'Did not give way at the roundabout');
          G.done('Joined the roundabout', false);
        } else G.done(waited ? 'Nice gap!' : 'All clear, well judged!');
      }
    },
    auto: (G) => {
      const f = G.front();
      const d = Math.hypot(f.x - RC.x, f.z - RC.z);
      return { brake: d < R_OUT + 2.4 && d > R_OUT - 0.6 && G.traffic.danger(1.7) };
    },
    needBrake: (G) => {
      const f = G.front();
      const d = Math.hypot(f.x - RC.x, f.z - RC.z);
      return d < R_OUT + 5 && d > R_OUT - 0.4 && G.traffic.danger(1.6);
    },
  };
}

// turn: how far round in radians. exit: 'south' (the duck road) or 'east' (School Street). from: entry angle
function ringRound(turn, exit, from = PI) {
  let acc = 0;
  let prev = null;
  let wrongSaid = false;
  let leftEarly = false;
  const n = Math.max(1, Math.ceil((turn - 0.2) / (PI / 4)));
  const wps = Array.from({ length: n }, (_, i) => ringPt(from - Math.min(turn, (i + 1) * (PI / 4))));
  if (from !== PI) wps.unshift([19, RC.z + R_OUT + 0.6]);
  wps.push(exit === 'east' ? [RC.x + R_OUT + 1.2, -10] : [19, RC.z + R_OUT + 1.2]);
  const where = exit === 'east' ? 'to School Street' : 'by the ducks';
  const label = turn > PI * 1.8 ? 'Go round once, then exit by the ducks' : turn > PI * 0.8 ? 'Take the second exit' : 'Take the first exit';
  return {
    label,
    say: turn > PI * 1.8 ? 'Follow the arrows all the way round, then take the exit by the ducks.' : `Follow the arrows and take the exit ${where}.`,
    wps,
    beacon: null,
    fan: exit === 'east' ? [31.4, -16.2] : [23.6, 4.4],
    step(G) {
      const p = G.p;
      const dx = p.x - RC.x;
      const dz = p.z - RC.z;
      const d = Math.hypot(dx, dz);
      if (d < R_OUT + 1.2 && d > 3.6) {
        const th = Math.atan2(dz, dx);
        if (prev !== null) acc -= wrap(th - prev);
        prev = th;
        if (acc < -1.0) {
          acc = 0;
          if (!wrongSaid) {
            wrongSaid = true;
            G.oops(0.5, 'Other way round! Follow the white arrows.', 'Went the wrong way round');
          }
        }
        const want = Math.min(n - 1, Math.max(0, Math.floor((acc + 0.4) / (PI / 4)))) + (from !== PI ? 1 : 0);
        if (want > G.wpI) G.wpI = want;
        if (acc > turn - 0.3) G.done(turn > PI * 1.8 ? 'All the way round!' : turn > PI * 0.8 ? 'Second exit, well done!' : 'First exit, lovely!');
      } else if (prev !== null && d > R_OUT + 3) {
        prev = null;
        if (acc > 0.4 && !leftEarly) {
          leftEarly = true;
          G.say('We left a bit early! Back to the roundabout and follow the arrows.', 'Abu Sanad', 3000);
        }
      }
    },
    auto: () => ({ intent: 0.6 }),
  };
}

function ducks() {
  let waitSaid = false;
  let scared = false;
  return {
    label: 'Let the ducks cross',
    say: 'Duck crossing! Stop before the stripes and let them cross.',
    wps: [[19, 1.2], [19, ZEBRA.z0 - 0.8], [19, ZEBRA.z1 + 3]],
    hold: (G) => !G.ducks.clear,
    beacon: [19, 8.1, 2.6],
    fan: [23.6, 4.4],
    begin(G) {
      G.zone(16.85, ZEBRA.z0 - 2.6, 21.15, ZEBRA.z0 - 0.15);
      if (G.ducks.state === 'home') G.ducks.walk();
    },
    step(G) {
      const f = G.front();
      const D = G.ducks;
      const inBand = f.z > ZEBRA.z0 - 0.3 && f.z < ZEBRA.z1 + 0.5 && G.sp > 0.3;
      if (inBand && D.onRoad && D.state === 'walking') {
        D.scare();
        scared = true;
        G.quack(4);
        G.oops(1, 'Eek! Ducks first! They are fine, just ruffled.', 'Did not stop for the ducks');
      }
      if (!waitSaid && G.sp < 0.2 && f.z > ZEBRA.z0 - 3 && D.onRoad) {
        waitSaid = true;
        G.say('Lovely waiting. Look at the little ones!', 'Abu Sanad', 0);
      }
      if (D.clear) {
        G.hideZone();
        G.done(scared ? 'The ducks made it!' : 'The ducks say thank you!', !scared);
      }
    },
    auto: (G) => ({ brake: G.front().z > ZEBRA.z0 - 2.4 && G.front().z < ZEBRA.z1 && !G.ducks.clear }),
    needBrake: (G) => !G.ducks.clear && G.front().z > ZEBRA.z0 - 7 && G.front().z < ZEBRA.z0,
  };
}

function park({ night = false } = {}) {
  let t = 0;
  let cd = 0;
  return {
    label: night ? 'Park in the bay with the lights' : 'Park in the bay',
    say: night ? 'Last one! Park in the bay with the little heart lights.' : 'Last one! Park in the glowing bay, nice and straight.',
    cones: night ? [] : LOT_CONES.slice(0, 2),
    wps: [[19.5, 22.5], [BAY.x, 25.4], [BAY.x, BAY.z]],
    beacon: [BAY.x, BAY.z, 2.6],
    fan: [28.0, 24.0],
    zoom: 0.9,
    begin(G) {
      G.bay(BAY.x, BAY.z, 3.0, 4.8);
    },
    step(G, dt) {
      const p = G.p;
      const inBay = Math.abs(p.x - BAY.x) < 0.75 && Math.abs(p.z - BAY.z) < 1.05;
      const straight = Math.abs(Math.sin(G.yaw)) < 0.42;
      cd -= dt;
      if (inBay && straight && G.sp < 0.25) {
        t += dt;
        if (t > 0.5) G.done(Math.abs(p.x - BAY.x) < 0.3 && Math.abs(Math.sin(G.yaw)) < 0.15 ? 'Parked, perfectly straight!' : 'Parked!');
      } else {
        t = 0;
        if (inBay && !straight && G.sp < 0.3 && cd <= 0) {
          cd = 4;
          G.say('Nearly! Straighten up a little, then brake.', 'Abu Sanad', 2600);
        }
      }
    },
    auto: (G) => {
      const d = Math.hypot(BAY.x - G.p.x, BAY.z - G.p.z);
      return { intent: Math.min(1, Math.max(0.25, d / 5)), brake: d < 0.6 };
    },
    needBrake: (G) => Math.hypot(G.p.x - BAY.x, G.p.z - BAY.z) < 2,
  };
}

function schoolSlow() {
  return {
    label: 'Slow down for the school zone',
    say: 'School zone ahead. Under 20 here, and watch for little ones.',
    wps: [[SCHOOL.x0 + 1.5, -10]],
    beacon: [31.4, -13.6, 2.9],
    fan: [36.4, -4.4],
    begin(G) {
      G.setLimit(4.0);
    },
    step(G) {
      if (G.p.x > SCHOOL.x0 + 0.4) {
        if (G.sp > 4.6) {
          G.oops(0.5, 'Too fast for a school zone! Ease off the gas.', 'Too fast in the school zone');
          G.done('Into the school zone', false);
        } else G.done('Nice and slow!');
      }
    },
    auto: (G) => ({ intent: G.p.x > SCHOOL.x0 - 9 ? 0.5 : 1 }),
    needBrake: (G) => G.sp > 4.4 && G.p.x > SCHOOL.x0 - 6,
  };
}

function bump(i) {
  const x = SCHOOL.bumps[i];
  let rough = false;
  let prevX = null;
  return {
    label: 'Gently over the speed bump',
    say: 'Speed bump! Slow right down, or I drop my clipboard.',
    wps: [[x + 2.2, -10]],
    beacon: [x, -10, 1.6],
    fan: i ? [48.4, -4.4] : [36.4, -4.4],
    step(G) {
      const px = G.p.x;
      if (prevX !== null && prevX < x && px >= x && G.sp > 3.3) {
        rough = true;
        G.oops(0.5, 'Boing! Slower over the bumps, please.', 'Too fast over a speed bump');
      }
      prevX = px;
      if (px > x + 1.6) G.done(rough ? 'Over the bump' : 'Smooth over the bump!', !rough);
    },
    auto: (G) => ({ intent: Math.abs(G.p.x - x) < 5 ? 0.3 : 0.5 }),
    needBrake: (G) => G.sp > 3.0 && G.p.x > x - 6 && G.p.x < x,
  };
}

function crossing() {
  const [z0, z1] = SCHOOL.zeb;
  let started = false;
  let violated = false;
  let goSaid = false;
  return {
    label: 'Stop for the crossing guard',
    say: 'The crossing guard will step out. Stop before the stripes and wait.',
    wps: [[z0 - 1.9, -10], [z1 + 3.0, -10]],
    hold: (G) => !G.crossing.clear,
    beacon: [(z0 + z1) / 2, -10, 2.8],
    fan: [36.4, -4.4],
    begin(G) {
      G.crossing.ready();
      G.zone(z0 - 3.0, -12.1, z0 - 0.15, -7.9);
    },
    step(G) {
      const X = G.crossing;
      const f = G.front();
      if (!started && G.p.x > z0 - 18) {
        started = true;
        X.start();
        G.say('Here she comes with her lollipop. We stop and wait.', 'Abu Sanad', 0);
      }
      if (!violated && X.onRoad && f.x > z0 - 0.25 && f.x < z1 + 0.6 && G.sp > 0.2) {
        violated = true;
        X.squeal();
        G.oops(1, 'Stop! The children are crossing!', 'Drove onto a busy crossing');
      }
      if (X.state === 'done' && !goSaid) {
        goSaid = true;
        G.hideZone();
        G.say('She waves us on. Off you go, slowly.', 'Abu Sanad', 0);
      }
      if (G.p.x > z1 + 1.6 && X.clear) G.done(violated ? 'Past the crossing' : 'Thank you for waiting!', !violated);
    },
    auto: (G) => {
      const f = G.front();
      const X = G.crossing;
      return { intent: 0.45, brake: !X.clear && f.x > z0 - 2.9 && f.x < z1 };
    },
    needBrake: (G) => !G.crossing.clear && G.front().x > z0 - 8 && G.front().x < z0,
  };
}

function ball() {
  let violated = false;
  let started = false;
  return {
    label: 'Keep your eyes open',
    say: 'Lovely. Keep your eyes open near a school, anything can happen.',
    wps: [[SCHOOL.ballX + 3.4, -10]],
    hold: (G) => G.crossing.ballOnRoad,
    fan: [48.4, -4.4],
    step(G) {
      const X = G.crossing;
      const f = G.front();
      if (!started && G.p.x > SCHOOL.ballX - 7.6) {
        started = true;
        X.ballGo();
        G.pop('A ball!', '#ffe1e6');
        G.say('A ball! Brake, there may be a child after it!', 'Abu Sanad', 2600);
      }
      if (!violated && X.ballOnRoad && Math.hypot(f.x - X.ball.position.x, f.z - X.ball.position.z) < 2.4 && G.sp > 0.5) {
        violated = true;
        G.oops(1, 'Whoa! Always expect a child after a ball.', 'Did not stop for the ball');
      }
      if (started && !X.ballOnRoad && G.p.x > SCHOOL.ballX + 1.8) {
        X.fetchBall();
        G.done(violated ? 'Past the ball' : 'Great reaction!', !violated);
      }
    },
    auto: (G) => ({ intent: 0.45, brake: G.crossing.ballOnRoad && G.front().x > SCHOOL.ballX - 4 && G.front().x < SCHOOL.ballX + 1 }),
    needBrake: (G) => G.crossing.ballOnRoad,
  };
}

// A box the car stops in. axis: travel direction, so going past the far edge counts as over.
function finish(box, axis, label = 'Stop in the finish box') {
  const [x0, z0, x1, z1] = box;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return {
    label,
    say: 'Nearly done. Stop with the whole car inside the finish box.',
    wps: [[cx, cz]],
    beacon: [cx, cz, 2.4],
    fan: axis === 'x+' ? [x1 + 1.5, -5.6] : [x0 - 2.6, cz],
    begin(G) {
      G.zone(x0, z0, x1, z1);
    },
    step(G) {
      const p = G.p;
      const inside = p.x > x0 + 0.5 && p.x < x1 - 0.5 && p.z > z0 + 0.5 && p.z < z1 - 0.5;
      const over = axis === 'x+' ? p.x > x1 + 0.2 : p.z > z1 + 0.2;
      if (inside && G.sp < 0.2) G.done('Finished!');
      else if (over) {
        G.oops(0.5, 'Just past the box. Close enough!', 'Overshot the finish box');
        G.done('Finished', false);
      }
    },
    auto: (G) => {
      const d = axis === 'x+' ? cx - G.p.x : cz - G.p.z;
      return { intent: Math.min(1, Math.max(0.3, d / 6)), brake: d < 0.5 };
    },
    needBrake: (G) => Math.hypot(G.p.x - cx, G.p.z - cz) < 3,
  };
}

const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function parallel() {
  let ap = 'pass';
  let t = 0;
  let cd = 4;
  let tipT = 0;
  const X = MARKET.gapX;
  const Z = MARKET.laneZ;
  return {
    label: 'Parallel park in the gap',
    say: 'See the gap between the cars? Drive past it, stop, press Reverse and back in.',
    wps: [[X - 3.9, 45.4], [X + 0.6, 43.3, 'r'], [X - 0.3, 42.75, 'r'], [X - 0.8, 42.75]],
    reach: 0.7,
    beacon: [X, Z, 2.5],
    fan: [X + 5.0, 40.4],
    zoom: 0.8,
    begin(G) {
      G.bay(X, Z, 5.9, 1.9);
    },
    step(G, dt) {
      const p = G.p;
      const inside = Math.abs(p.x - X) < 1.2 && Math.abs(p.z - Z) < 0.55;
      const aligned = Math.abs(Math.sin(G.yaw)) > 0.94;
      cd -= dt;
      tipT += dt;
      if (tipT > 32) {
        tipT = 0;
        G.say('Tip: stop beside the car in front, then reverse. Point the stick where the back should go.', 'Abu Sanad', 4200);
      }
      if (inside && aligned && G.sp < 0.2) {
        t += dt;
        if (t > 0.6) G.done(Math.abs(p.x - X) < 0.6 && Math.abs(Math.sin(G.yaw)) > 0.985 ? 'Parked like a pro!' : 'Parked!');
      } else {
        t = 0;
        if (Math.abs(p.x - X) < 1.6 && Math.abs(p.z - Z) < 1.1 && G.sp < 0.2 && cd <= 0) {
          if (!aligned) {
            cd = 4.5;
            G.say('Nearly! Straighten up a little: forward a bit, then back.', 'Abu Sanad', 2600);
          } else if (!inside) {
            cd = 4.5;
            G.say('Nearly! A little closer to the kerb, please.', 'Abu Sanad', 2600);
          }
        }
      }
    },
    // The autopilot (tests only): pass the gap, reverse in with an S, then centre up
    auto: (G) => {
      const p = G.p;
      if (ap === 'pass') {
        if (p.x < X - 3.6) {
          if (G.sp < 0.05) ap = 'revA';
          return { brake: true };
        }
        return { want: Math.atan2(X - 3.9 - p.x, 45.5 - p.z), intent: 0.5, gear: 'D' };
      }
      if (ap === 'revA') {
        if (p.z < Z + 1.05) ap = 'revB';
        return { want: Math.atan2(1, -1.05), intent: 0.35, gear: 'R' };
      }
      if (ap === 'revB') {
        if (Math.abs(wrapA(G.yaw + PI / 2)) < 0.06 || p.z < Z + 0.1) ap = 'fix';
        return { want: PI / 2, intent: 0.35, gear: 'R' };
      }
      if (p.x > X + 0.45) return { want: -PI / 2, intent: 0.3, gear: 'D' };
      if (p.x < X - 0.45) return { want: PI / 2, intent: 0.3, gear: 'R' };
      return { brake: true };
    },
    needBrake: (G) => Math.abs(G.p.x - X) < 1.2 && Math.abs(G.p.z - Z) < 0.6,
  };
}

function reverseBay() {
  let ap = 'back';
  let t = 0;
  let cd = 0;
  const X = MARKET.target;
  const Z = MARKET.bayZ;
  return {
    label: 'Reverse into the heart bay',
    say: 'Now the bay with the heart. Reverse in, so the nose points out to the street.',
    wps: [[MARKET.gapX - 3.6, 44.6], [X - 3.4, 46.0], [X - 0.2, 47.6, 'r'], [X, Z, 'r']],
    reach: 0.8,
    beacon: [X, Z, 2.4],
    fan: [X + 5.6, 49.4],
    zoom: 0.8,
    begin(G) {
      G.bay(X, Z, 2.9, 4.9, 0);
    },
    step(G, dt) {
      const p = G.p;
      const inside = Math.abs(p.x - X) < 0.8 && Math.abs(p.z - Z) < 1.0;
      const aligned = Math.abs(Math.sin(G.yaw)) < 0.36;
      cd -= dt;
      if (inside && aligned && G.sp < 0.2) {
        if (Math.cos(G.yaw) < 0) {
          t += dt;
          if (t > 0.6) G.done(Math.abs(p.x - X) < 0.3 && Math.abs(Math.sin(G.yaw)) < 0.12 ? 'Reversed in perfectly!' : 'Reversed in!');
        } else if (cd <= 0) {
          cd = 5;
          G.say('Nearly! This time we reverse in, so the nose points out.', 'Abu Sanad', 3200);
        }
      } else t = 0;
    },
    auto: (G) => {
      const p = G.p;
      if (ap === 'back') {
        if (p.x > MARKET.gapX + 1.15) {
          if (G.sp < 0.05) ap = 'pull';
          return { brake: true };
        }
        return { want: PI / 2, intent: 0.3, gear: 'R' };
      }
      if (ap === 'pull') {
        if (p.z > 44.6) ap = 'out';
        return { want: Math.atan2(-1, 1.3), intent: 0.35, gear: 'D' };
      }
      if (ap === 'out') {
        if (p.x < X - 4.4) {
          if (G.sp < 0.05) ap = 'revA';
          return { brake: true };
        }
        const tz = p.x > MARKET.gapX - 4 ? 45.6 : 46.2;
        return { want: Math.atan2(X - 4.7 - p.x, tz - p.z), intent: 0.45, gear: 'D' };
      }
      if (ap === 'revA') {
        if (p.z > 48.3) ap = 'revB';
        return { want: Math.atan2(X + 0.1 - p.x, 48.8 - p.z), intent: 0.32, gear: 'R' };
      }
      if (ap === 'revB') {
        if (p.z > Z - 0.15) ap = 'stop';
        return { want: Math.atan2(X - 0.25 - p.x, 2.4), intent: 0.3, gear: 'R' };
      }
      return { brake: true };
    },
    needBrake: (G) => Math.abs(G.p.x - X) < 1 && Math.abs(G.p.z - Z) < 1.2,
  };
}

function puddles() {
  let splashed = false;
  return {
    label: 'Slowly past the bus stop',
    say: 'Puddles by the bus stop. Go slowly, or we splash everyone!',
    wps: [[MARKET.bus[0] - 2.4, 46.2]],
    beacon: null,
    fan: [MARKET.bus[1] - 0.7, 49.3],
    begin(G) {
      G.onSplash = (who) => {
        if (!who || splashed) return;
        splashed = true;
        G.oops(0.5, 'Splash! Slow down by the puddles when people are waiting.', 'Splashed people at the bus stop');
      };
    },
    step(G) {
      if (G.p.x < MARKET.bus[0] - 1.2) {
        G.onSplash = null;
        G.done(splashed ? 'Splish splash!' : 'Not a drop on anyone!', !splashed);
      }
    },
    auto: (G) => ({ intent: G.p.x < MARKET.bus[1] + 6 ? 0.3 : 0.7 }),
    needBrake: (G) => G.sp > 2.4 && G.p.x < MARKET.bus[1] + 5 && G.p.x > MARKET.bus[0],
  };
}

function wetCorner() {
  let slid = false;
  let checked = false;
  return {
    label: 'Brake before the slippery corner',
    say: 'The corner is slippery in the rain. Slow down before you turn.',
    wps: [[9.5, 46.1], [3.2, 43.4], [0, 37]],
    fan: [-4.4, 44.4],
    step(G) {
      const p = G.p;
      if (!checked && p.x < 9.5 && p.z > 40) {
        checked = true;
        if (G.sp > 3.8) {
          slid = true;
          G.oops(0.5, 'Wheee! Slower before corners when it is wet.', 'Too fast into a wet corner');
        }
      }
      if (G.slipping && !slid) {
        slid = true;
        G.oops(0.5, 'We slid a little! Gentle turns in the rain.', 'Skidded in a wet corner');
      }
      if (p.z < 36.4 && Math.abs(p.x) < 2.6) G.done(slid ? 'Round the corner' : 'Smooth in the rain!', !slid);
    },
    auto: (G) => ({ intent: G.p.x < 16 && G.p.z > 38 ? 0.42 : 0.7 }),
    needBrake: (G) => G.sp > 3.6 && G.p.x < 15 && G.p.x > 6 && G.p.z > 42,
  };
}

function headlights() {
  let nag = false;
  let z0 = null;
  return {
    label: 'Switch on your headlights',
    say: 'It is dark! Press Lights (or L) to switch on the headlights.',
    wps: [[0, 34]],
    fan: [-4.6, 36.2],
    step(G) {
      if (z0 === null) z0 = G.p.z;
      if (G.lights) G.done('Much better!');
      else if (!nag && z0 - G.p.z > 6) {
        nag = true;
        G.say('Lights first, please! Press Lights, we cannot see a thing.', 'Abu Sanad', 0);
      }
    },
    auto: (G) => (G.setLights(true), { intent: 0.5 }),
  };
}

function fox() {
  let violated = false;
  let started = false;
  return {
    label: 'Watch for night animals',
    say: 'Keep watching the road. Night animals like to cross here.',
    wps: [[0, 12.5]],
    hold: (G) => G.fox.onRoad,
    fan: [-4.4, 10.6],
    begin(G) {
      G.fox.ready([-4.3, 0, 15.8], [5.6, 0, 16.9]);
    },
    step(G) {
      const F = G.fox;
      const f = G.front();
      if (!started && G.p.z < 31) {
        started = true;
        F.go();
      }
      if (!violated && F.onRoad && f.z > F.pos.z - 0.8 && f.z - F.pos.z < 2.6 && G.sp > 0.5) {
        violated = true;
        G.oops(1, 'Eek! Stop for animals. The fox is fine, just startled.', 'Did not stop for the fox');
      }
      if (started && (F.state === 'gone' || !F.onRoad) && G.p.z < F.pos.z - 1.5) G.done(violated ? 'Past the fox' : 'The fox says thank you!', !violated);
    },
    auto: (G) => ({ intent: 0.6, brake: G.fox.onRoad && G.front().z > G.fox.pos.z && G.front().z - G.fox.pos.z < 6 }),
    needBrake: (G) => G.fox.onRoad && G.front().z - G.fox.pos.z < 9,
  };
}

function hillStop() {
  const z = HILL.stopZ;
  return {
    label: 'Stop at the line on the hill',
    say: 'Uphill now. Stop just before the white line on the slope.',
    wps: [[HILL.x, z + 0.4]],
    beacon: [HILL.x + 2.9, z, 3.3],
    fan: [56.4, 4.2],
    begin(G) {
      G.zone(HILL.x - 2.15, z - 3.0, HILL.x + 2.15, z - 0.1);
    },
    step(G) {
      const f = G.front();
      if (f.z > z + 0.6) {
        G.oops(0.5, 'Past the line! We stop before it, even on a hill.', 'Stopped past the hill line');
        G.done('Past the line', false);
      } else if (f.z > z - 3.0 && G.sp < 0.2) G.done('Stopped on the hill!');
    },
    auto: (G) => ({ brake: G.front().z > z - 2.4 }),
    needBrake: (G) => G.front().z > z - 5 && G.front().z < z + 0.5,
  };
}

function hillHold() {
  let phase = 'hold';
  let t = 0;
  let zRef = null;
  let rolled = false;
  return {
    label: 'Hold the brake, then pull away',
    say: 'Hold the brake while we wait. If you let go, we roll back!',
    wps: [[HILL.x, HILL.z2 - 0.5]],
    hold: () => phase === 'hold',
    beacon: null,
    fan: [56.4, 4.2],
    begin(G) {
      zRef = G.p.z;
      G.hideZone();
    },
    step(G, dt) {
      const p = G.p;
      if (phase === 'hold') {
        if (Math.abs(G.spd) < 0.1) t += dt;
        if (zRef - p.z > 0.8) {
          G.oops(0.5, 'We are rolling back! Hold the brake while we wait.', 'Rolled back on the hill');
          zRef = p.z;
          t = 0;
        }
        if (p.z > zRef + 1.2) {
          G.oops(0.5, 'Wait for my signal next time!', 'Pulled away too early');
          phase = 'go';
          zRef = p.z;
        }
        if (t > 2.2 && phase === 'hold') {
          phase = 'go';
          zRef = p.z;
          G.pop('Go!', '#c9ffd9');
          G.say('Now off you go, smooth and steady!', 'Abu Sanad', 0);
        }
      } else {
        if (!rolled && zRef - p.z > 0.8) {
          rolled = true;
          G.oops(0.5, 'Oops, a little roll back. Press the gas a bit sooner.', 'Rolled back pulling away');
        }
        if (p.z > HILL.z2 - 1) G.done(rolled ? 'Over the top' : 'Over the top, no rolling!', !rolled);
      }
    },
    auto: () => ({ brake: phase === 'hold', intent: 1 }),
    needBrake: () => phase === 'hold',
  };
}

function downhill() {
  let fast = false;
  return {
    label: 'Easy down the hill',
    say: 'Downhill, the car speeds up all by itself. Use the brake gently.',
    wps: [[HILL.x, HILL.z3 - 0.5]],
    fan: [56.4, 19.6],
    step(G) {
      if (!fast && G.p.z > HILL.z2 + 2 && G.sp > 4.8) {
        fast = true;
        G.oops(0.5, 'A bit quick down the hill! Gentle on the brake.', 'Too fast downhill');
      }
      if (G.p.z > HILL.z3 - 1.2) G.done(fast ? 'Down we go' : 'Nice and steady!', !fast);
    },
    auto: (G) => ({ intent: 0.6, brake: G.sp > 3.4 }),
    needBrake: (G) => G.sp > 4.2,
  };
}

function bridgeGiveWay() {
  let violated = false;
  return {
    label: 'Give way to the tractor',
    say: 'Narrow bridge! The tractor is coming over, so we wait at the line.',
    wps: [[HILL.x, BRIDGE.line - 1.4], [HILL.x, BRIDGE.z1 + 1.8]],
    hold: (G) => !G.tractor.passed,
    beacon: [HILL.x, BRIDGE.line, 2.4],
    fan: [56.6, 32.8],
    begin(G) {
      G.tractor.ready();
      G.tractor.go();
      G.zone(HILL.x - 2.15, BRIDGE.line - 3.0, HILL.x + 2.15, BRIDGE.line - 0.1);
    },
    step(G) {
      const f = G.front();
      if (!violated && f.z > BRIDGE.z0 - 0.3 && G.tractor.coming) {
        violated = true;
        G.oops(1, 'Wait! The tractor was coming over first.', 'Did not give way at the bridge');
      }
      if (G.tractor.passed && f.z > BRIDGE.line + 0.2) G.done(violated ? 'Onto the bridge' : 'Thank you, tractor!', !violated);
    },
    auto: (G) => ({ intent: 0.4, brake: !G.tractor.passed && G.front().z > BRIDGE.line - 2.6 }),
    needBrake: (G) => !G.tractor.passed && G.front().z > BRIDGE.line - 6 && G.front().z < BRIDGE.z0,
  };
}

function bridgeCross() {
  let touched = false;
  return {
    label: 'Cross the narrow bridge',
    say: 'Straight and slow over the bridge. Do not touch the rails!',
    wps: [[HILL.x, BRIDGE.z1 + 2.2]],
    fan: [56.6, 32.8],
    begin(G) {
      G.hideZone();
      G.onRail = () => {
        if (touched) return;
        touched = true;
        G.oops(0.5, 'Bump! Careful of the rails.', 'Touched the bridge rail');
      };
    },
    step(G) {
      if (G.p.z > BRIDGE.z1 + 0.8) {
        G.onRail = null;
        G.done(touched ? 'Over the bridge' : 'Not a scratch!', !touched);
      }
    },
    auto: () => ({ intent: 0.4 }),
  };
}

// ------------------------------------------------------------------ the course
export const LESSONS = [
  {
    id: 'first',
    title: COURSE_TITLES[0],
    sub: 'Slalom, the cone gate, a stop line and the traffic light',
    tip: 'Gentle on the gas, early on the brake. The car always listens to a calm driver.',
    env: 'day',
    start: [32, 46, -PI / 2],
    tasks: () => [warmUp(), slalom(), gate(), stopLine(), light(), giveWayStop()],
  },
  {
    id: 'roundabout',
    title: COURSE_TITLES[1],
    sub: 'Give way to the little cars, go round, mind the ducks',
    tip: 'At a roundabout the cars already going round go first. Look, wait for a gap, then go.',
    env: 'day',
    traffic: 3,
    light: 'green',
    start: [0, -1.5, PI],
    tasks: () => [ringEnter(), ringRound(PI * 2.5, 'south'), ducks(), park()],
  },
  {
    id: 'school',
    title: COURSE_TITLES[2],
    sub: 'Under 20, speed bumps and the crossing guard',
    tip: 'Near a school we drive slowly and expect surprises. Little people are small and quick.',
    env: 'day',
    start: [19, 4.5, PI],
    tasks: () => [ringRound(PI * 0.5, 'east', PI / 2), schoolSlow(), bump(0), crossing(), ball(), bump(1), finish([SCHOOL.finish[0], -12.1, SCHOOL.finish[1] + 0.6, -7.9], 'x+')],
  },
  {
    id: 'parking',
    title: COURSE_TITLES[3],
    sub: 'Parallel parking, then reversing into a bay',
    tip: 'Parking is slow and patient. In Reverse, point the stick where you want the back of the car to go.',
    env: 'day',
    reverse: true,
    start: [49.6, 46, -PI / 2],
    tasks: () => [parallel(), reverseBay()],
  },
  {
    id: 'rain',
    title: COURSE_TITLES[4],
    sub: 'Wipers on, splashy puddles and a slippery corner',
    tip: 'In the rain the road is slippery. Go slower, brake earlier and turn gently.',
    env: 'rain',
    start: [48, 46, -PI / 2],
    tasks: () => [puddles(), wetCorner(), stopLine(true), light()],
  },
  {
    id: 'night',
    title: COURSE_TITLES[5],
    sub: 'Headlights, lamp posts and a curious fox',
    tip: 'At night, lights on first. Drive a little slower, so you can stop for anything in your headlights.',
    env: 'night',
    lights: true,
    traffic: 1,
    start: [0, 40.5, PI],
    tasks: () => [headlights(), fox(), light(), ringEnter(), ringRound(PI * 0.5, 'south'), park({ night: true })],
  },
  {
    id: 'hill',
    title: COURSE_TITLES[6],
    sub: 'A hill start, the way down, a narrow bridge and a tractor',
    tip: 'On a hill, hold the brake while you wait, then give a little gas as you let go. No rolling back!',
    env: 'day',
    reverse: true,
    start: [HILL.x, -1.5, 0],
    tasks: () => [hillStop(), hillHold(), downhill(), bridgeGiveWay(), bridgeCross(), finish([HILL.x - 2.1, 33.0, HILL.x + 2.1, 37.4], 'z+')],
  },
  {
    id: 'test',
    title: COURSE_TITLES[7],
    sub: 'A mixed route, strict marks and a real licence',
    tip: 'This is the real thing. I mark every fault on my clipboard. No serious faults and three small ones at most, and you pass.',
    env: 'day',
    test: true,
    traffic: 2,
    start: [0, 40.5, PI],
    tasks: () => [gate(), stopLine(), light(), ringEnter(), ringRound(PI, 'east'), schoolSlow(), bump(0), crossing(), finish([SCHOOL.finish[0], -12.1, SCHOOL.finish[1] + 0.6, -7.9], 'x+')],
  },
];
