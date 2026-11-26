import * as THREE from 'three';
import { buildPool, HZ, DECK } from './swimrace/pool.js';
import { Swimmer } from './swimrace/swimmer.js';
import { makeUI } from './swimrace/ui.js';
import { makeSfx } from './swimrace/sfx.js';
import { runRace } from './swimrace/race.js';
import { runRings } from './swimrace/rings.js';
import { runSync } from './swimrace/sync.js';

// Splash Gala: a swimming day in a bright 3D pool, five events in a row.
//   1 Sprint: one length, dive at the whistle, swim in rhythm with the ring; the partner waits with a towel.
//   2 Race: two lengths against the partner, with a flip turn at the far wall.
//   3 Relay: swim the first length, send the partner off at the touch, then swim the second leg as them.
//   4 Ring Dive: dive for rings on the pool floor before your air runs out; a heart ring hides in a chest.
//   5 Synchronised Swim: copy the partner's moves on the beat, then a big finish together.
// Stars for every event (1 to 3), a saved best and best times; rivals get quicker as your best grows.

const NPCS = [
  { name: 'Kai', cap: '#3fbf7f', look: { id: 'kai', name: 'Kai', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', outfit: 'tee-shorts', top: '#3fbf7f', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' } },
  { name: 'Mina', cap: '#a77bff', look: { id: 'mina', name: 'Mina', gender: 'girl', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'ponytail', outfit: 'dress', top: '#8b5cf6', bottom: '#c7a6ff', shoes: '#7a2e3a', accent: '#c7a6ff' } },
  { name: 'Lulu', cap: '#ffd166', look: { id: 'lulu', name: 'Lulu', gender: 'girl', skin: '#e3b08e', hair: '#141010', hairstyle: 'buns', outfit: 'dress', top: '#ffd166', bottom: '#ffd166', shoes: '#e5484d', accent: '#ff7fa3' } },
  { name: 'Sami', cap: '#f08a5d', look: { id: 'sami', name: 'Sami', gender: 'boy', skin: '#f2cdb4', hair: '#4a2c1a', hairstyle: 'spiky', outfit: 'tee-shorts', top: '#f08a5d', bottom: '#3f7bf0', shoes: '#ffffff', accent: '#6fb8ff' } },
];

const STAR = '&#9733;';
const NOSTAR = '&#9734;';
const stars = (n) => `${STAR.repeat(n)}${NOSTAR.repeat(3 - n)}`;

export default {
  id: 'swimrace',
  title: 'Splash Gala',
  tagline: 'Race, dive and swim in sync',

  async start(ctx) {
    const { scene, camera, hud, sound } = ctx;
    const env = ctx.env.outdoor({ sky: '#a9e0ec', fog: [70, 200], sun: [-12, 24, 14], shadow: 20 });
    const pool = buildPool(ctx);
    const ui = makeUI(ctx);
    const sfx = makeSfx(sound);
    const looks = ctx.looks;
    const NAME = { roji: looks.roji?.name || 'Roji', homama: looks.homama?.name || 'Homama' };

    // ---------------------------------------------------------------- people
    const kids = {
      roji: new Swimmer(ctx, 'roji', { name: NAME.roji, cap: '#ff7fa3', mark: 'heart', main: true, color: '#ef5b6f' }),
      homama: new Swimmer(ctx, 'homama', { name: NAME.homama, cap: '#3f7bf0', mark: 'star', main: true, color: '#3f7bf0' }),
    };
    const npcs = NPCS.map((n) => new Swimmer(ctx, n.look, { name: n.name, cap: n.cap, color: n.cap }));
    for (const s of npcs) s.visible = false;

    // ---------------------------------------------------------------- saved progress
    const best = ctx.load('best', { total: 0, galas: 0, times: {} });
    const level = Math.min(2, Math.floor((best.total || 0) / 6));

    // ---------------------------------------------------------------- the director
    let disposed = false;
    const waits = [];
    const dbg = { auto: false, speed: 1, rival: 1 };
    const G = {
      ctx,
      pool,
      ui,
      sfx,
      npcs,
      level,
      now: 0,
      title: 'Splash Gala',
      auto: false,
      tick: null,
      foam: [],
      clockT: 0,
      focusX: 0,
      alive: () => !disposed,
      wait: (s) => new Promise((res) => waits.push({ at: G.now + s, res })),
      until: (fn) => new Promise((res) => waits.push({ fn, res })),
      line: (html, ms = 2800) => ui.line(html, ms),
    };
    Object.defineProperty(G, 'auto', { get: () => dbg.auto });
    Object.defineProperty(G, 'speedRival', { get: () => dbg.rival });

    // camera that eases toward a goal
    const cam = {
      pos: new THREE.Vector3(0, 14, 30),
      look: new THREE.Vector3(0, 0, 0),
      gp: new THREE.Vector3(0, 14, 30),
      gl: new THREE.Vector3(0, 0, 0),
      rate: 2,
      shake: 0,
      goal(px, py, pz, lx, ly, lz, rate = 3) {
        this.gp.set(px, py, pz);
        this.gl.set(lx, ly, lz);
        this.rate = rate;
      },
      cut(px, py, pz, lx, ly, lz) {
        this.goal(px, py, pz, lx, ly, lz, this.rate);
        this.pos.copy(this.gp);
        this.look.copy(this.gl);
      },
    };
    G.cam = cam;
    const aspectFix = () => {
      // a phone in landscape shows more width: pull in a little; a tall window: pull back
      const a = window.innerWidth / window.innerHeight;
      return a > 1.9 ? 0.9 : a < 1.4 ? 1.18 : 1;
    };

    // ---------------------------------------------------------------- choose who swims
    hud.buttons({ action: null, jump: null, stick: false });
    ui.pads([]);
    const roji = kids.roji;
    const homama = kids.homama;
    roji.place('stand', -0.6, DECK, HZ + 1.6, 0.2);
    homama.place('stand', 0.6, DECK, HZ + 1.6, -0.2);
    let preview = true;
    let orbit = 0;
    G.tick = (dt, t) => {
      orbit += dt * 0.07;
      cam.goal(Math.sin(orbit) * 9, 4.2, HZ + 8.5 + Math.cos(orbit) * 1.5, 0, 0.6, 0, 2);
      if (Math.random() < dt * 0.4) (Math.random() < 0.5 ? roji : homama).kid.emote(Math.random() < 0.5 ? 'wave' : 'cheer');
      roji.update(dt, t);
      homama.update(dt, t);
    };
    cam.cut(-8, 5, HZ + 9, 0, 0.6, 0);

    const order = ctx.me === 'homama' ? ['homama', 'roji'] : ['roji', 'homama'];
    const bestLine = best.galas ? `Best gala: ${best.total} of 15 stars` : 'Five events, up to 15 stars';
    hud
      .choose({
        title: 'Who swims in the gala?',
        text: `${bestLine}${level ? `. Gala level ${level + 1}: quicker rivals.` : ''}`,
        options: order.map((id) => ({ id, label: `${NAME[id]} swims`, sub: `${NAME[id === 'roji' ? 'homama' : 'roji']} cheers, races and swims the relay too` })),
      })
      .then((pick) => {
        if (disposed) return;
        if (!pick) {
          ctx.end({ quit: true });
          return;
        }
        preview = false;
        gala(pick).catch((e) => !disposed && console.error('swimrace', e));
      });

    // ---------------------------------------------------------------- the gala
    async function gala(meId) {
      const me = kids[meId];
      const pal = kids[meId === 'roji' ? 'homama' : 'roji'];
      Object.assign(G, { me, pal, meId, palId: pal === roji ? 'roji' : 'homama', names: { me: NAME[meId], pal: NAME[pal === roji ? 'roji' : 'homama'] }, palIsHomama: pal === homama });
      const events = [
        { id: 'sprint', kind: 'sprint', title: 'Sprint', eyebrow: 'Event 1 of 5', sub: 'Event 1: Sprint', tip: 'Tap Left and Right in turn, right when the ring meets the circle', cadence: 0.5, foot: 'One length' },
        { id: 'race', kind: 'race', title: `Race ${G.names.pal}`, eyebrow: 'Event 2 of 5', sub: `Event 2: Race ${G.names.pal}`, tip: 'Two lengths. Flip at the far wall with Space', cadence: 0.46, foot: 'Two lengths with a flip turn' },
        { id: 'relay', kind: 'relay', title: 'Relay', eyebrow: 'Event 3 of 5', sub: 'Event 3: Relay', tip: `Swim to ${G.names.pal}, press Go as you touch the wall, then swim home`, cadence: 0.44, foot: `${G.names.me} and ${G.names.pal} vs two teams` },
        { id: 'rings', title: 'Ring Dive', eyebrow: 'Event 4 of 5', sub: 'Event 4: Ring Dive', tip: 'Dive for the rings before your air runs out' },
        { id: 'sync', title: 'Synchronised Swim', eyebrow: 'Event 5 of 5', sub: 'Event 5: Synchronised Swim', tip: `Watch ${G.names.pal}, then copy the moves on the beat` },
      ];
      G.events = events;
      const results = [];
      G.results = results;
      const startAt = dbg.startAt || 0;
      for (let i = startAt; i < events.length; i++) {
        const ev = events[i];
        G.index = i;
        ui.wipe(true);
        await G.wait(0.45);
        if (disposed) return;
        for (const s of [roji, homama, ...npcs]) {
          s.pose2 = null;
          s.cheer = 0;
          s.kid.cancelEmote();
        }
        G.drape?.removeFromParent();
        G.drape = null;
        setTimeout(() => !disposed && ui.wipe(false), 120);
        let res;
        if (ev.kind) res = await runRace(G, ev);
        else if (ev.id === 'rings') res = await runRings(G, ev);
        else res = await runSync(G, ev);
        if (!res || disposed) return;
        results[i] = res;
        if (res.time && (!best.times[ev.id] || res.time < best.times[ev.id])) {
          res.newBest = !!best.times[ev.id];
          best.times[ev.id] = +res.time.toFixed(2);
        }
        ui.big(`<div class="e">${ev.title}</div><div class="st">${stars(res.stars)}</div><div class="s">${res.text}${res.newBest ? ' &middot; new best time!' : ''}</div>`, 2300);
        sfx.sparkle();
        await G.wait(2.5);
        if (disposed) return;
      }
      await ceremony(results, events);
    }

    // ---------------------------------------------------------------- the end of the day
    async function ceremony(results, events) {
      const { me, pal } = G;
      const total = results.reduce((a, r) => a + (r?.stars || 0), 0);
      const full = results.filter(Boolean).length === events.length;
      const newBest = full && total > (best.total || 0);
      best.galas = (best.galas || 0) + 1;
      if (full) best.total = Math.max(best.total || 0, total);
      ctx.save('best', best);
      ui.wipe(true);
      await G.wait(0.45);
      if (disposed) return;
      hud.buttons({ action: null, jump: null, stick: false });
      ui.pads([]);
      ui.lane(false);
      ui.air(false);
      ui.moves(false);
      hud.hint('');
      for (const s of npcs) s.visible = false;
      const x = 0;
      const z = HZ + 1.7;
      me.visible = pal.visible = true;
      // facing each other, turned a little toward the camera so both faces show
      me.place('stand', x - 0.27, DECK, z, Math.PI / 2 - 0.55);
      pal.place('stand', x + 0.27, DECK, z, -Math.PI / 2 + 0.55);
      const medal = total >= 12 ? '#ffd166' : total >= 8 ? '#dfe6ee' : '#e0a06a';
      for (const s of [me, pal]) {
        const m = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16), new THREE.MeshStandardMaterial({ color: medal, metalness: 0.6, roughness: 0.3 }));
        disc.rotation.x = Math.PI / 2;
        disc.position.set(0, 0.5, 0.21);
        const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 5, 18, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: '#ef5b6f', roughness: 0.7 }));
        ribbon.rotation.set(-Math.PI / 2 - 0.35, 0, -Math.PI * 0.1 - Math.PI / 2 + Math.PI * 0.4);
        ribbon.position.set(0, 0.66, 0.1);
        m.add(disc, ribbon);
        s.kid.body.add(m);
      }
      G.tick = (dt, t) => {
        me.update(dt, t);
        pal.update(dt, t);
        G.foam = [];
      };
      // framed low so the two of them stay in view under the result card
      cam.cut(x, 2.7, z + 6.2, x, 2.25, z - 0.3);
      ui.wipe(false);
      ctx.fx.burst(new THREE.Vector3(x, 2.2, z), ['#ff7fa3', '#ffd166', '#7fd3c8', '#ffffff', '#3f7bf0'], 120);
      pool.crowd.cheer(1);
      sfx.cheer(0.08, 2.2);
      await G.wait(0.6);
      if (disposed) return;
      const homamaKid = G.palIsHomama ? pal : me;
      const rojiKid = G.palIsHomama ? me : pal;
      homamaKid.kid.emote('kiss');
      rojiKid.kid.emote('heart');
      await G.wait(1.2);
      if (disposed) return;
      const rows = events.map((e, i) => `${e.title}: ${results[i] ? stars(results[i].stars) : '-'}`).join('<br>');
      const title = total >= 13 ? 'Gala champions!' : total >= 9 ? 'What a splashy day!' : 'A lovely swim together';
      ctx.finish({
        win: total >= 9,
        stars: total,
        title,
        text: `<b>${total} of 15 stars</b>${newBest ? ' (new best!)' : best.total ? ` (best ${best.total})` : ''}<br><span style="font-size:.86em">${rows}</span>`,
      });
      pool.drawBoard('Gala results', events.map((e, i) => ({ stars: results[i]?.stars || 0, name: e.title, right: results[i]?.short || '' })), `${total} of 15 stars`);
      hud.score(`${total} of 15 &#9733;`);
    }


    // ---------------------------------------------------------------- debug hook
    dbg.state = () => ({ preview, index: G.index ?? -1, now: +G.now.toFixed(2), results: G.results?.map((r) => r && { stars: r.stars, text: r.text }), ev: G.evState?.() });
    dbg.pick = (id) => {
      const b = document.querySelector(`.choose [data-c="${id}"]`);
      if (!b) return false;
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      b.click();
      return true;
    };
    window.__swimrace = dbg;

    // ---------------------------------------------------------------- frame
    function step(dt, t) {
      G.now += dt;
      for (let i = waits.length - 1; i >= 0; i--) {
        const w = waits[i];
        if (w.fn ? w.fn() : G.now >= w.at) {
          waits.splice(i, 1);
          w.res();
        }
      }
      G.tick?.(dt, t);
    }
    let gt = 0;
    return {
      update(dt) {
        if (disposed) return;
        let left = dt * (dbg.speed || 1);
        while (left > 1e-6) {
          const h = Math.min(0.05, left);
          left -= h;
          gt += h;
          step(h, gt);
        }
        const t = gt;
        pool.update(dt, t, G.foam, G.clockT);
        // camera
        const k = 1 - Math.exp(-cam.rate * dt * (dbg.speed || 1));
        cam.pos.lerp(cam.gp, k);
        cam.look.lerp(cam.gl, k);
        const af = aspectFix();
        camera.position.copy(cam.look).addScaledVector(cam.pos.clone().sub(cam.look), af);
        if (cam.shake > 0) {
          cam.shake = Math.max(0, cam.shake - dt);
          camera.position.x += (Math.random() - 0.5) * cam.shake * 0.6;
          camera.position.y += (Math.random() - 0.5) * cam.shake * 0.6;
        }
        camera.lookAt(cam.look);
        env.follow(cam.look);
      },
      dispose() {
        disposed = true;
        waits.length = 0;
        ui.remove();
        if (window.__swimrace === dbg) delete window.__swimrace;
      },
    };
  },
};
