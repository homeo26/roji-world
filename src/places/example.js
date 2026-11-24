// Example place for the dev harness (dev.html?place=example). Not on the map.
// Shows every part of the place contract: a building with an interior, a bench you can jump onto,
// a sit-down activity, a small sunken pond to swim in, an icy patch, a painted area and a moving hotspot.

export default {
  id: 'example',
  stop: { title: 'Example Garden', tag: 'Dev only', icon: 'star', color: '#21a99a', text: 'A test garden for the place contract.' },
  // Optional new icons (24x24 stroke paths), usable by name in hotspots and stops
  icons: { leaf: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14z M5 19l7-7' },

  build(ctx) {
    const { THREE, util, size } = ctx;
    const { mat, mesh } = util;
    const g = new THREE.Group();
    const box = (w, h, d, color, x, y, z) => {
      const m = mesh(new THREE.BoxGeometry(w, h, d), mat(color));
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    // Hut at the back, door facing +Z
    box(4, 2.6, 3, '#fff2e1', -3, 1.3, -2.5);
    box(4.4, 0.3, 3.4, '#ef5b6f', -3, 2.75, -2.5);
    box(0.9, 1.6, 0.08, '#a0602e', -3, 0.8, -0.98);
    // Bench you can jump onto: collider with a height h
    box(2.2, 0.5, 0.7, '#c98a5a', 3, 0.25, 1);
    // Pond: a hole in the ground, a basin below it and a water surface at y = -0.25
    const pond = new THREE.Group();
    const floor = mesh(new THREE.BoxGeometry(3, 0.1, 2.4), mat('#7fc9d6'));
    floor.position.y = -1.4;
    const water = mesh(new THREE.PlaneGeometry(3, 2.4), new THREE.MeshStandardMaterial({ color: '#6fd0e0', transparent: true, opacity: 0.75, roughness: 0.1 }), { cast: false });
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.25;
    pond.add(floor, water);
    for (const [w, d, x, z] of [[3.2, 0.1, 0, 1.25], [3.2, 0.1, 0, -1.25], [0.1, 2.6, 1.55, 0], [0.1, 2.6, -1.55, 0]]) {
      const wall = mesh(new THREE.BoxGeometry(w, 1.4, d), mat('#e6f3f5'));
      wall.position.set(x, -0.7, z);
      pond.add(wall);
    }
    pond.position.set(3, 0, -2.5);
    g.add(pond);
    // A bobbing star that the hotspot follows
    const star = mesh(new THREE.OctahedronGeometry(0.3), util.umat('#ffd166', { emissive: '#ffb347', ei: 0.6 }));
    g.add(star);

    return {
      group: g,
      dynamic: [star, water], // animated or transparent: not merged
      pad: { x: 0, z: size.d / 2 + 1.2 },
      colliders: [
        { type: 'box', x: -3, z: -2.5, hw: 2, hd: 1.5 }, // hut walls (no h: nobody stands on it)
        { type: 'box', x: 3, z: 1, hw: 1.1, hd: 0.35, h: 0.5 }, // bench, 0.5 m high: jump onto it
      ],
      holes: [{ x: 3, z: -2.5, hw: 1.5, hd: 1.2 }],
      water: [{ x: 3, z: -2.5, hw: 1.5, hd: 1.2, y: -0.25, depth: 1.15 }],
      zones: [{ x: -3, z: 2.5, hw: 1.5, hd: 1.2, ground: 'ice' }],
      ground: [{ x: -3, z: 2.5, hw: 1.5, hd: 1.2, color: '#dff3ff', feather: 0.6 }],
      hotspots: [
        {
          x: 3,
          z: 1.7,
          label: 'Sit on the bench',
          icon: 'smile',
          act: (api) =>
            api.activity({
              label: 'Get up',
              seats: [
                { who: 'player', x: 2.6, z: 1.05, y: 0.32, yaw: 0, pose: 'sit' },
                { who: 'partner', x: 3.4, z: 1.05, y: 0.32, yaw: 0, pose: 'sit', hands: 'read' },
              ],
              focus: { x: 3, z: 1, y: 0.8, zoom: 0.55 },
              exit: { x: 3, z: 1.9 },
              onEnd: () => api.toast('That was nice.'),
            }),
        },
        { track: () => ({ x: star.position.x, z: star.position.z }), r: 1.2, label: 'Catch the star', icon: 'leaf', act: (api) => api.toast('Twinkle!') },
      ],
      door: { x: -3, z: -0.9 },
      interior: {
        title: 'Example hut',
        build(ictx) {
          const ig = new ictx.THREE.Group();
          const floorM = mesh(new ictx.THREE.BoxGeometry(8, 0.1, 6), mat('#e8c9a0'));
          floorM.position.y = -0.05;
          ig.add(floorM);
          const wall = mesh(new ictx.THREE.BoxGeometry(8, 2.6, 0.2), mat('#ffeedd'));
          wall.position.set(0, 1.3, -3);
          ig.add(wall);
          return {
            group: ig,
            size: { w: 8, d: 6 },
            spawn: { x: 0, z: 1.8, yaw: Math.PI },
            exit: { x: 0, z: 2.6 },
            background: '#f7dcc8',
            colliders: [
              { type: 'box', x: 0, z: -3, hw: 4, hd: 0.1 },
              { type: 'box', x: -4, z: 0, hw: 0.1, hd: 3 },
              { type: 'box', x: 4, z: 0, hw: 0.1, hd: 3 },
              { type: 'box', x: 0, z: 3.1, hw: 4, hd: 0.1 },
            ],
            hotspots: [{ x: 0, z: -2, label: 'Say hi', icon: 'hand', act: (api) => api.emote('player', 'wave') }],
          };
        },
      },
      update(dt, t) {
        star.position.set(Math.cos(t * 0.6) * 4, 1 + Math.sin(t * 3) * 0.2, Math.sin(t * 0.6) * 2 + 2);
        star.rotation.y = t * 2;
      },
    };
  },
};
