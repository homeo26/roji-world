// Example 3D minigame for the dev harness (dev.html?arena=example). Not offered in the game.
// Walk the player's kid around a lawn and collect 8 stars before the time runs out.

export default {
  id: 'example',
  title: 'Star Catch',
  tagline: 'Collect 8 stars',

  async start(ctx) {
    const { THREE, scene, camera, util, hud, input, sound, fx } = ctx;
    const env = ctx.env.outdoor({ shadow: 16 });
    const lawn = util.mesh(new THREE.CircleGeometry(14, 48), util.mat('#9ad06a', { rough: 0.95 }), { cast: false });
    lawn.rotation.x = -Math.PI / 2;
    scene.add(lawn);
    const kid = ctx.makeKid(ctx.me);
    scene.add(kid.root);
    const pos = new THREE.Vector3();
    let yaw = 0;
    const stars = [];
    for (let i = 0; i < 8; i++) {
      const s = util.mesh(new THREE.OctahedronGeometry(0.35), util.umat('#ffd166', { emissive: '#ffb347', ei: 0.6 }));
      const a = (i / 8) * Math.PI * 2;
      s.position.set(Math.cos(a) * 7, 0.8, Math.sin(a) * 7);
      scene.add(s);
      stars.push(s);
    }
    let got = 0;
    let time = 30;
    let running = false;
    hud.buttons({ action: null, jump: 'Jump' });
    hud.hint('WASD or arrows to walk, Space to jump');
    hud.score(`0 / 8`);
    await hud.countdown(3);
    running = true;
    let vy = 0;
    let y = 0;

    return {
      update(dt, t) {
        if (running) {
          time -= dt;
          const ax = input.axis();
          const speed = Math.hypot(ax.x, ax.y) * (input.held('run') ? 7 : 4.6);
          if (speed > 0.1) yaw = Math.atan2(ax.x, -ax.y);
          pos.x += Math.sin(yaw) * speed * dt;
          pos.z += Math.cos(yaw) * speed * dt;
          if (input.pressed('jump') && y === 0) {
            vy = 7;
            sound.jump();
          }
          vy -= 22 * dt;
          y = Math.max(0, y + vy * dt);
          if (y === 0) vy = 0;
          for (const s of stars) {
            if (s.visible && s.position.distanceTo(pos.clone().setY(0.8)) < 0.9) {
              s.visible = false;
              got++;
              sound.ui('coin');
              fx.burst(s.position, ['#ffd166', '#ffffff'], 30);
            }
          }
          hud.score(`${got} / 8 &nbsp; ${Math.ceil(time)}s`);
          if (got === 8 || time <= 0) {
            running = false;
            ctx.finish({ win: got === 8, text: got === 8 ? 'Every star caught!' : `You caught ${got} stars.` });
          }
          kid.root.position.set(pos.x, y, pos.z);
          kid.root.rotation.y = yaw;
          kid.update(dt, t, speed, y, 0);
        } else kid.update(dt, t, 0, 0, 0);
        for (const s of stars) s.rotation.y = t * 2;
        camera.position.set(pos.x, 9, pos.z + 11);
        camera.lookAt(pos.x, 0.8, pos.z);
        env.follow(pos);
      },
      dispose() {},
    };
  },
};
