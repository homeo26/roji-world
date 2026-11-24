import { THREE, C, mat, umat, roundRect, FONT, colorBake } from './kit.js';

// The yellow school bus, parked with its door side facing +Z and its nose toward +X.
// Local frame: ground at y = 0, centre of the body at x = 0. 6 m long, 2.1 m wide.
// The +Z windows are open so the kids show inside. seats(): where Roji and Homama sit.

export const BUS_YELLOW = '#ffc83d';
const INK = '#4a4458';

export function makeBus(k, atlas) {
  const { box, rbox, cyl, sph, tor, at, rot } = k;
  const P = Math.PI;
  const g = new THREE.Group();
  const body = new THREE.Group(); // everything that rumbles
  g.add(body);
  const add = (...o) => (body.add(...o), o[0]);
  const Y = BUS_YELLOW;
  const glass = mat('#cfeeff', { rough: 0.15, emissive: '#bfe6ff', ei: 0.25 });

  // Wheels stay on the ground
  for (const x of [-1.85, 1.95]) {
    for (const z of [-0.98, 0.98]) {
      const tyre = rot(cyl(0.42, 0.42, 0.28, INK, 18), P / 2, 0, 0);
      g.add(at(tyre, x, 0.42, z));
      const hub = rot(cyl(0.2, 0.2, 0.3, '#fff3c4', 14), P / 2, 0, 0);
      g.add(at(hub, x, 0.42, z));
      g.add(at(rot(cyl(0.07, 0.07, 0.32, C.gold, 10), P / 2, 0, 0), x, 0.42, z));
    }
  }
  add(at(box(5.7, 0.3, 1.86, INK), 0.1, 0.62, 0));
  // Wheel arches
  for (const x of [-1.85, 1.95]) for (const s of [-1, 1]) add(at(tor(0.54, 0.07, INK, P, undefined, 16, 6), x, 0.45, s * 1.07));
  // Lower body, hood and the window band
  // Hollow cabin: thick rounded side panels, a back panel and a floor, so the seats and kids show
  for (const s of [-1, 1]) {
    add(at(rbox(5.0, 0.98, 0.16, Y, 0.07), -0.5, 1.15, s * 0.98));
    add(at(box(5.02, 0.07, 0.04, INK), -0.5, 1.6, s * 1.07));
    add(at(box(5.02, 0.05, 0.04, INK), -0.5, 0.88, s * 1.07));
  }
  add(at(rbox(0.16, 0.98, 2.1, Y, 0.07), -2.92, 1.15, 0));
  add(at(box(4.8, 0.06, 1.84, '#d9cbbd'), -0.5, 0.8, 0));
  add(at(rbox(1.15, 0.86, 1.94, Y, 0.16), 2.45, 1.08, 0));
  add(at(rbox(5.1, 0.2, 2.16, Y, 0.08), -0.5, 2.56, 0));
  add(at(rbox(4.9, 0.14, 1.96, '#fff3c4', 0.06), -0.5, 2.71, 0));
  // Window pillars on both sides, glass on the far (-Z) side
  const pillars = [-2.95, -2.05, -1.15, -0.25, 0.65, 1.95];
  for (const x of pillars) for (const s of [-1, 1]) add(at(rbox(0.14, 0.92, 0.1, Y, 0.03), x, 2.06, s * 1.0));
  for (let i = 0; i < pillars.length - 1; i++) {
    const x = (pillars[i] + pillars[i + 1]) / 2;
    const w = pillars[i + 1] - pillars[i] - 0.12;
    add(at(box(w, 0.82, 0.03, glass), x, 2.06, -0.98));
  }
  // Back and front of the cabin
  add(at(box(0.1, 0.92, 2.0, Y), -2.97, 2.06, 0));
  add(at(box(0.04, 0.6, 1.4, glass), -3.03, 2.08, 0));
  const shield = rot(box(0.05, 0.88, 1.84, glass), 0, 0, -0.16);
  add(at(shield, 2.0, 2.07, 0));
  // Inside: floor, the driver's seat with a wheel and bench seats on the +Z side
  const SEAT = '#3fbf9f';
  for (const x of [-2.5, -1.6, -0.7, 0.2]) {
    for (const z of [0.48, -0.5]) {
      add(at(rbox(0.42, 0.12, 0.8, SEAT, 0.04), x, 0.99, z));
      add(at(rbox(0.1, 0.52, 0.8, SEAT, 0.04), x - 0.22, 1.3, z));
      add(at(box(0.3, 0.2, 0.06, '#2f9a80'), x, 0.85, z));
    }
  }
  add(at(rbox(0.42, 0.12, 0.6, '#5a4a6a', 0.04), 1.35, 0.99, -0.5));
  add(at(rbox(0.1, 0.52, 0.6, '#5a4a6a', 0.04), 1.13, 1.3, -0.5));
  add(at(cyl(0.03, 0.03, 0.5, INK, 6), 1.7, 1.2, -0.5)).rotation.z = 0.5;
  const wheel = rot(tor(0.17, 0.03, INK, P * 2, undefined, 16, 6), 0, P / 2, -0.5);
  add(at(wheel, 1.8, 1.48, -0.5));
  // Folding door with glass panes, near the front on the +Z side
  add(at(rbox(0.86, 1.76, 0.06, INK, 0.03), 1.3, 1.58, 1.07));
  for (const dx of [-0.2, 0.2]) add(at(box(0.32, 1.58, 0.03, glass), 1.3 + dx, 1.6, 1.1));
  add(at(rbox(0.9, 0.12, 0.4, '#8a8fa3', 0.03), 1.3, 0.72, 1.1));
  // Nose: grille, headlights, a smiley bumper and indicator lights
  add(at(rbox(0.08, 0.5, 1.2, INK, 0.03), 3.04, 1.05, 0));
  for (let i = 0; i < 4; i++) add(at(box(0.02, 0.05, 1.08, '#d3dbe5'), 3.08, 0.86 + i * 0.12, 0));
  const lamp = mat('#fff6c8', { emissive: '#ffe680', ei: 0.7, rough: 0.3 });
  for (const s of [-1, 1]) {
    add(at(rot(cyl(0.16, 0.16, 0.08, C.white, 16), 0, 0, P / 2), 3.03, 1.12, s * 0.76));
    add(at(sph(0.12, lamp, undefined, 14), 3.06, 1.12, s * 0.76)).scale.set(0.5, 1, 1);
  }
  add(at(rbox(0.18, 0.22, 2.1, '#d3dbe5', 0.07), 3.1, 0.66, 0));
  const smile = rot(tor(0.32, 0.03, INK, P, undefined, 16, 6), 0, P / 2, P);
  add(at(smile, 3.2, 0.72, 0));
  add(at(rbox(0.18, 0.22, 2.1, '#d3dbe5', 0.07), -3.05, 0.66, 0));
  for (const s of [-1, 1]) add(at(sph(0.08, C.rose, { emissive: '#ff6b8a', ei: 0.4 }, 10), -3.02, 1.05, s * 0.8));
  // Mirrors on stalks
  for (const s of [-1, 1]) {
    add(at(cyl(0.02, 0.02, 0.5, INK, 6), 2.0, 2.0, s * 1.25)).rotation.x = s * 0.9;
    add(at(rbox(0.06, 0.28, 0.18, INK, 0.03), 2.0, 1.9, s * 1.42));
  }
  // Roof lights that blink while the kids are aboard
  const blink = [umat('#ffb347', { emissive: '#ff9a1a', ei: 0.2, rough: 0.3 }), umat('#ff6b6b', { emissive: '#ff3b3b', ei: 0.2, rough: 0.3 })];
  const blinkers = [];
  for (const [x, m] of [[2.0, 0], [-2.9, 1]]) {
    for (const s of [-1, 1]) {
      const b = k.sph(0.09, blink[m], undefined, 10);
      b.scale.y = 0.7;
      add(at(b, x, 2.71, s * 0.82));
      blinkers.push(b);
    }
  }
  // "School Bus" on the side
  const side = atlas.panel(3.2, 0.58, 880, 160, (ctx, w, h) => {
    ctx.fillStyle = Y;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = `700 ${h * 0.62}px ${FONT}`;
    ctx.fillText('School Bus', w * 0.5, h * 0.48);
    ctx.fillStyle = '#ffffff';
    for (const x of [0.07, 0.93]) {
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const r = j % 2 ? h * 0.12 : h * 0.28;
        const a = (j / 10) * P * 2 - P / 2;
        ctx.lineTo(w * x + Math.cos(a) * r, h * 0.5 + Math.sin(a) * r);
      }
      ctx.fill();
    }
  });
  add(at(side, -0.9, 1.2, 1.07));
  const plate = atlas.panel(0.62, 0.24, 200, 78, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 2, 2, w - 4, h - 4, 12);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${h * 0.56}px ${FONT}`;
    ctx.fillText('R + H', w / 2, h / 2 + 2);
  });
  plate.rotation.y = P / 2;
  add(at(plate, 3.2, 0.66, 0));
  // A little stop arm that swings out when the bus stops
  const arm = new THREE.Group();
  arm.position.set(0.72, 1.3, 1.08);
  const sign = new THREE.Group();
  sign.add(at(rot(cyl(0.2, 0.2, 0.03, C.red, 8), P / 2, 0, P / 8), 0, 0, 0));
  sign.add(at(rot(tor(0.19, 0.015, C.white, P * 2, undefined, 8, 4), 0, 0, P / 8), 0, 0, 0.018));
  sign.position.set(0, 0, 0.06);
  arm.add(sign);
  add(arm);

  colorBake(body, [arm, ...blinkers]);
  colorBake(g, [body]);
  colorBake(sign);

  return {
    root: g,
    body,
    // Where a kid sits on the bench under each open window (local, facing +X)
    seat: (i) => ({ x: [0.2, -0.7, -1.6, -2.5][i] + 0.06, y: 0.76, z: 0.6, yaw: 0.3 }),
    door: { x: 1.3, z: 1.6 },
    update(dt, t, on, k) {
      const bob = on ? Math.sin(t * 22) * 0.012 + Math.sin(t * 3.1) * 0.01 : 0;
      body.position.y = bob;
      body.rotation.x = on ? Math.sin(t * 2.3) * 0.008 : 0;
      const ph = Math.floor(t * 3) % 2;
      blink[0].emissiveIntensity = on ? (ph ? 1.8 : 0.15) : 0.2;
      blink[1].emissiveIntensity = on ? (ph ? 0.15 : 1.8) : 0.2;
      arm.rotation.y = -k * 1.0;
      return bob;
    },
  };
}
