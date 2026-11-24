import * as THREE from 'three';
import { COL, box, rbox, cyl, sph, at, mat, umat, mesh, canvasTexture, roundRect, FONT, glowSprite, codeScreen, drawScreen, drawPipeline, rojiPhoto, laptopLid, deskMatTex, makeDuck, makePlant, makeMug } from './kit.js';

// Homama's desk: three monitors, an RGB keyboard, a gaming chair and lots of little things.
// Local frame: desk centred on the origin, top at H, the person sits on the +Z side facing -Z.
// angled: side monitors turn in toward the chair (the office); flat: one straight row (the Ship It! game).

export function buildGamingChair(atlas = null) {
  const g = new THREE.Group();
  const black = mat('#2b2f3a');
  const blue = mat(COL.blue);
  const teal = mat('#3fd0c0');
  const metal = mat(COL.steel, { metal: 0.6, rough: 0.35 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(0.05, 0.04, 0.3, metal);
    leg.position.set(Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15);
    leg.rotation.y = a;
    const wheel = sph(0.035, black, undefined, 10);
    wheel.position.set(Math.sin(a) * 0.29, 0.035, Math.cos(a) * 0.29);
    g.add(leg, wheel);
  }
  g.add(at(cyl(0.035, 0.035, 0.3, metal, 10), 0, 0.24, 0));
  g.add(at(rbox(0.52, 0.1, 0.5, black, 0.04), 0, 0.45, 0));
  for (const s of [-1, 1]) {
    g.add(at(rbox(0.07, 0.11, 0.46, blue, 0.03), s * 0.24, 0.5, 0));
    const armPost = box(0.04, 0.16, 0.04, black);
    at(armPost, s * 0.27, 0.58, 0.02);
    const armPad = rbox(0.07, 0.04, 0.26, black, 0.02);
    at(armPad, s * 0.27, 0.67, 0.02);
    g.add(armPost, armPad);
  }
  // Backrest, behind the person (+Z), leaning back a little
  const back = new THREE.Group();
  back.add(at(rbox(0.46, 0.62, 0.1, black, 0.05), 0, 0.31, 0));
  for (const s of [-1, 1]) back.add(at(rbox(0.08, 0.6, 0.12, blue, 0.04), s * 0.23, 0.31, 0));
  back.add(at(box(0.05, 0.56, 0.01, teal), -0.1, 0.31, 0.055), at(box(0.05, 0.56, 0.01, teal), 0.1, 0.31, 0.055));
  const drawHeart = (ctx) => {
    ctx.fillStyle = '#2b2f3a';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ff9eb5';
    ctx.beginPath();
    ctx.moveTo(64, 104);
    ctx.bezierCurveTo(4, 60, 24, 6, 64, 36);
    ctx.bezierCurveTo(104, 6, 124, 60, 64, 104);
    ctx.fill();
  };
  const heart = atlas ? atlas.plane(0.16, 0.16, atlas.add(128, 128, drawHeart)) : mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: canvasTexture(128, 128, drawHeart), roughness: 0.6 }), { cast: false });
  heart.position.set(0, 0.46, 0.056);
  back.add(heart);
  back.position.set(0, 0.5, 0.24);
  back.rotation.x = 0.12;
  g.add(back);
  return { group: g, heart };
}

export function buildDesk({ angled = true, W = 2.4, D = 0.9, H = 0.76, flatSize = 0.82, pipelineNote = null, atlas = null, kbX = -0.12, riser = false } = {}) {
  const g = new THREE.Group();
  const dynamic = [];
  const white = mat('#fdfbf7');
  const ink = mat(COL.ink);
  const metal = mat(COL.steel, { metal: 0.6, rough: 0.35 });

  // Desk
  g.add(at(rbox(W, 0.05, D, white, 0.02), 0, H - 0.025, 0));
  for (const s of [-1, 1]) g.add(at(rbox(0.06, H - 0.05, D - 0.12, COL.teal, 0.02), s * (W / 2 - 0.12), (H - 0.05) / 2, 0));
  g.add(at(box(W - 0.3, 0.06, 0.12, ink), 0, H - 0.09, -D / 2 + 0.12));
  // Drawers on the right
  const drawers = rbox(0.42, H - 0.12, D - 0.2, mat(COL.cream2), 0.03);
  at(drawers, W / 2 - 0.42, (H - 0.12) / 2 + 0.02, -0.02);
  g.add(drawers);
  for (const y of [0.2, 0.42, 0.6]) g.add(at(box(0.14, 0.025, 0.02, metal), W / 2 - 0.42, y, D / 2 - 0.11));
  // Glowing strip under the back edge
  const ledMat = umat('#8b5cf6', { emissive: '#8b5cf6', ei: 1.4, rough: 0.4 });
  const led = box(W - 0.2, 0.015, 0.015, ledMat);
  at(led, 0, H - 0.06, -D / 2 + 0.02);
  g.add(led);
  dynamic.push(led);

  // Desk mat
  const decal = (w, h, name) => (atlas ? atlas.plane(w, h, atlas.named(name)) : mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: { deskMatTex, rojiPhoto, laptopLid }[name](), roughness: 0.7 }), { cast: false }));
  const deskMat = decal(1.3, 0.56, 'deskMatTex');
  deskMat.rotation.x = -Math.PI / 2;
  at(deskMat, -0.08, H + 0.003, 0.15);
  g.add(deskMat);

  // Monitors
  const zBase = -D / 2 + 0.2;
  const midSize = angled ? [0.74, 0.44] : [flatSize, flatSize * 0.6];
  const sideSize = angled ? [0.64, 0.4] : midSize;
  const screenY = H + 0.2;
  const screens = {};
  const mkMonitor = (name, [w, h], x, z, rotY, tex) => {
    const m = new THREE.Group();
    m.add(at(rbox(w + 0.04, h + 0.04, 0.035, ink, 0.015), 0, 0, 0));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.z = 0.019;
    m.add(screen);
    m.add(at(box(0.05, 0.05, 0.05, ink), 0, -0.02, -0.04));
    m.position.set(x, screenY + h / 2, z);
    m.rotation.y = rotY;
    g.add(m);
    const pole = cyl(0.018, 0.018, screenY + h / 2 - H, metal, 8);
    pole.position.set(x - Math.sin(rotY) * 0.07, H + (screenY + h / 2 - H) / 2, z - Math.cos(rotY) * 0.07);
    const base = rbox(0.22, 0.015, 0.14, metal, 0.006);
    base.position.set(pole.position.x, H + 0.008, pole.position.z);
    base.rotation.y = rotY;
    g.add(pole, base);
    screens[name] = { group: m, screen, tex, w, h };
    dynamic.push(screen);
    return m;
  };
  const codeL = codeScreen(sideSize[0] / sideSize[1], 3);
  const codeM = codeScreen(midSize[0] / midSize[1], 11);
  mkMonitor('mid', midSize, 0, zBase, 0, codeM);
  const pipe = drawScreen(sideSize[0] / sideSize[1], (ctx, w, h, states, t, note) => drawPipeline(ctx, w, h, states, t, note ?? pipelineNote), 512);
  if (angled) {
    const a = 0.42;
    const ex = midSize[0] / 2 + 0.03;
    const off = (sideSize[0] / 2) * Math.cos(a);
    const dz = (sideSize[0] / 2) * Math.sin(a);
    mkMonitor('left', sideSize, -ex - off, zBase + dz, a, codeL);
    mkMonitor('right', sideSize, ex + off, zBase + dz, -a, pipe.tex);
  } else {
    const ex = midSize[0] / 2 + 0.04 + sideSize[0] / 2;
    mkMonitor('left', sideSize, -ex, zBase, 0, codeL);
    mkMonitor('right', sideSize, ex, zBase, 0, pipe.tex);
  }
  screens.pipe = pipe;
  // Sticky notes on the left monitor
  const drawNotes = (ctx) => {
    ctx.fillStyle = COL.ink;
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#fff0a3';
    ctx.fillRect(4, 4, 56, 56);
    ctx.fillStyle = '#ffc8d6';
    ctx.fillRect(68, 6, 56, 56);
    ctx.fillStyle = '#4a3a3f';
    ctx.textAlign = 'center';
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('Ship', 32, 26);
    ctx.fillText('it!', 32, 44);
    ctx.fillText('Call', 96, 28);
    ctx.fillText('Roji', 96, 46);
  };
  const notes = atlas ? atlas.plane(0.13, 0.065, atlas.add(128, 64, drawNotes)) : mesh(new THREE.PlaneGeometry(0.13, 0.065), new THREE.MeshStandardMaterial({ map: canvasTexture(128, 64, drawNotes), roughness: 0.8 }), { cast: false });
  notes.position.set(sideSize[0] / 2 - 0.05, -sideSize[1] / 2 + 0.02, 0.022);
  notes.rotation.z = 0.05;
  screens.left.group.add(notes);

  // Monitor riser (the Ship It! game uses its front as part of the play surface)
  if (riser) {
    g.add(at(rbox(W - 0.34, 0.2, 0.2, white, 0.02), 0, H + 0.1, -D / 2 + 0.12));
    const strip = box(W - 0.4, 0.012, 0.012, ledMat);
    g.add(at(strip, 0, H + 0.008, -D / 2 + 0.226));
    dynamic.push(strip);
  }

  // RGB keyboard: one instanced mesh of keys, recoloured every frame
  const kbZ = D / 2 - 0.13;
  g.add(at(rbox(0.6, 0.03, 0.2, ink, 0.012), kbX, H + 0.015, kbZ));
  const keyGeo = new THREE.BoxGeometry(0.03, 0.016, 0.03);
  const keyList = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 15; c++) {
      if (r === 4 && c > 3 && c < 11) {
        if (c === 4) keyList.push({ x: kbX - 0.28 + 7.5 * 0.0375, z: kbZ - 0.075 + r * 0.0375, sx: 6.6, col: 7 });
        continue;
      }
      keyList.push({ x: kbX - 0.2625 + c * 0.0375, z: kbZ - 0.075 + r * 0.0375, sx: 1, col: c });
    }
  }
  const keyMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, keyList.length);
  const m4 = new THREE.Matrix4();
  keyList.forEach((k, i) => {
    m4.makeScale(k.sx, 1, 1).setPosition(k.x, H + 0.038, k.z);
    keys.setMatrixAt(i, m4);
    keys.setColorAt(i, new THREE.Color('#ffffff'));
  });
  keys.castShadow = false;
  g.add(keys);
  dynamic.push(keys);
  const glowTex = canvasTexture(256, 96, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, w, 0);
    ['#ff5f8f', '#ffd166', '#5fe0a0', '#5fb8ff', '#b07cff'].forEach((c, i) => gr.addColorStop(i / 4, c));
    ctx.fillStyle = gr;
    ctx.filter = 'blur(10px)';
    roundRect(ctx, 18, 18, w - 36, h - 36, 20);
    ctx.fill();
  });
  const kbGlow = mesh(new THREE.PlaneGeometry(0.78, 0.3), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }), { cast: false });
  kbGlow.rotation.x = -Math.PI / 2;
  at(kbGlow, kbX, H + 0.006, kbZ);
  g.add(kbGlow);
  dynamic.push(kbGlow);
  g.add(at(rbox(0.56, 0.02, 0.06, mat(COL.pink), 0.01), kbX, H + 0.01, kbZ + 0.14));
  // Mouse
  const mouse = sph(0.032, ink, undefined, 12);
  mouse.scale.set(0.8, 0.5, 1.2);
  at(mouse, kbX + 0.48, H + 0.015, kbZ + 0.02);
  g.add(mouse);
  const mouseLed = box(0.006, 0.004, 0.05, mat('#3fd0c0', { emissive: '#3fd0c0', ei: 0.6 }));
  at(mouseLed, kbX + 0.48, H + 0.031, kbZ + 0.02);
  g.add(mouseLed);

  // Rubber duck, mug, plants, photo of Roji, laptop, lamp, headphones
  const duck = makeDuck(0.11);
  duck.position.set(0.55, H, 0.12);
  duck.rotation.y = -0.5;
  g.add(duck);
  const mug = makeMug(COL.white, COL.coral);
  mug.position.set(-0.62, H, 0.22);
  mug.rotation.y = 2.4;
  g.add(mug);
  const steam = [];
  for (let i = 0; i < 2; i++) {
    const s = glowSprite('#ffffff', 0.08);
    g.add(s);
    steam.push(s);
    dynamic.push(s);
  }
  const succ = makePlant('succulent', 0.18, COL.white);
  succ.position.set(-W / 2 + 0.16, H, -D / 2 + 0.14);
  const cactus = makePlant('cactus', 0.2, COL.lilac);
  cactus.position.set(W / 2 - 0.42, H, -D / 2 + 0.16);
  g.add(succ, cactus);
  const photo = new THREE.Group();
  photo.add(at(rbox(0.17, 0.21, 0.02, mat(COL.pink), 0.01), 0, 0, 0));
  const pic = decal(0.135, 0.17, 'rojiPhoto');
  pic.position.z = 0.011;
  photo.add(pic);
  photo.add(at(box(0.03, 0.14, 0.02, mat(COL.pink)), 0, -0.04, -0.04));
  photo.position.set(W / 2 - 0.22, H + 0.11, -D / 2 + 0.32);
  photo.rotation.set(-0.15, -0.35, 0);
  g.add(photo);
  // Closed laptop with stickers
  const laptop = new THREE.Group();
  laptop.add(at(rbox(0.36, 0.022, 0.25, mat('#c9cedb', { metal: 0.3, rough: 0.4 }), 0.008), 0, 0.011, 0));
  const lid = decal(0.35, 0.24, 'laptopLid');
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = 0.0225;
  laptop.add(lid);
  laptop.position.set(-W / 2 + 0.34, H, 0.12);
  laptop.rotation.y = 0.25;
  g.add(laptop);
  // Desk lamp
  const lamp = new THREE.Group();
  lamp.add(at(cyl(0.07, 0.08, 0.02, COL.coral, 16), 0, 0.01, 0));
  const arm1 = cyl(0.012, 0.012, 0.34, mat(COL.coral), 8);
  arm1.position.set(0, 0.17, 0.05);
  arm1.rotation.x = 0.35;
  const joint = sph(0.025, COL.coral, undefined, 10);
  joint.position.set(0, 0.33, 0.11);
  const arm2 = cyl(0.012, 0.012, 0.26, mat(COL.coral), 8);
  arm2.position.set(0, 0.36, 0.23);
  arm2.rotation.x = -1.2;
  const shade = mesh(new THREE.ConeGeometry(0.07, 0.1, 16, 1, true), mat(COL.coral, { side: THREE.DoubleSide }));
  shade.position.set(0, 0.36, 0.36);
  shade.rotation.x = 0.4;
  const bulb = sph(0.03, mat('#fff3c4', { emissive: '#ffe08a', ei: 2 }), undefined, 10);
  bulb.position.set(0, 0.33, 0.37);
  lamp.add(arm1, joint, arm2, shade, bulb);
  const lampGlow = glowSprite('#ffe4a0', 0.5);
  lampGlow.position.set(0, 0.3, 0.38);
  lamp.add(lampGlow);
  dynamic.push(lampGlow);
  lamp.position.set(W / 2 - 0.12, H, -D / 2 + 0.1);
  lamp.rotation.y = -0.6;
  g.add(lamp);
  // Headphones on a little stand
  const hp = new THREE.Group();
  hp.add(at(cyl(0.05, 0.06, 0.015, ink, 14), 0, 0.008, 0));
  hp.add(at(cyl(0.008, 0.008, 0.26, metal, 6), 0, 0.14, 0));
  const band = mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16, Math.PI), mat(COL.navy));
  band.position.y = 0.25;
  hp.add(band);
  for (const s of [-1, 1]) {
    const cup = cyl(0.04, 0.04, 0.03, COL.navy, 14);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(s * 0.078, 0.22, 0);
    const ring = mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 14), mat('#3fd0c0', { emissive: '#3fd0c0', ei: 0.6 }));
    ring.rotation.y = Math.PI / 2;
    ring.position.set(s * 0.095, 0.22, 0);
    hp.add(cup, ring);
  }
  hp.position.set(-W / 2 + 0.17, H, -0.12);
  hp.rotation.y = 0.3;
  g.add(hp);

  // Gaming chair and where the person sits
  const chairZ = D / 2 + 0.2;
  const chair = buildGamingChair(atlas);
  chair.group.position.set(kbX, 0, chairZ);
  g.add(chair.group);
  const seat = { x: kbX, z: chairZ - 0.02, y: 0.19, yaw: Math.PI };

  // Animation
  const pipeState = ['wait', 'wait', 'wait', 'wait'];
  const pal = ['#ff5f8f', '#ffb347', '#ffe066', '#5fe0a0', '#5fd0ff', '#7f8cff', '#c07cff'];
  const c = new THREE.Color();
  const ca = new THREE.Color();
  let keyTimer = 0;
  let cycle = 0;
  function update(dt, t, { idlePipeline = true } = {}) {
    codeL.offset.y -= dt * 0.035;
    codeM.offset.y -= dt * 0.05;
    keyTimer += dt;
    if (keyTimer > 1 / 30) {
      keyTimer = 0;
      keyList.forEach((k, i) => {
        const h = ((k.col / 15 + t * 0.35) % 1) * pal.length;
        const a = Math.floor(h);
        c.set(pal[a % pal.length]).lerp(ca.set(pal[(a + 1) % pal.length]), h - a);
        keys.setColorAt(i, c);
      });
      keys.instanceColor.needsUpdate = true;
      ledMat.emissive.setHSL((t * 0.08) % 1, 0.8, 0.6);
    }
    steam.forEach((s, i) => {
      const k = (t * 0.5 + i * 0.5) % 1;
      s.position.set(mug.position.x + Math.sin(k * 6 + i) * 0.015, H + 0.12 + k * 0.16, mug.position.z);
      s.material.opacity = 0.5 * Math.sin(k * Math.PI);
      s.scale.setScalar(0.05 + k * 0.07);
    });
    lampGlow.material.opacity = 0.55 + Math.sin(t * 2) * 0.05;
    if (idlePipeline) {
      // Office mode: the pipeline runs stage by stage, turns green, then starts over
      const prev = cycle;
      cycle = Math.floor(t / 1.3) % 7;
      if (prev !== cycle || !pipe.drawn) {
        for (let i = 0; i < 4; i++) pipeState[i] = cycle > i ? 'ok' : cycle === i ? 'run' : 'wait';
        if (cycle >= 4) pipeState.fill('ok');
        pipe.redraw(pipeState, t);
        pipe.drawn = true;
      }
    }
  }

  return { group: g, dynamic, update, screens, keys, duck, mug, seat, chairZ, kbX, kbZ, H, W, D, chair, props: { succ, cactus, photo, laptop, lamp, hp } };
}
