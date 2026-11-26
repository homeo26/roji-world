import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeSky } from '../places/home/kit.js';
import * as Pots from '../interiors/clay/pots.js';
import { COL, box, rbox, cyl, at, rot, mat, mesh, canvasTexture, glowTex, colorBake, makeWheel, makeStool, makeKiln, makeShelf, makeApron, makePlant, makeMug, makeVase, speechBubble, woodFloorTex, stripeWallTex } from '../interiors/clay/models.js';
import { injectClayStyle, mountInArena, onTap } from '../interiors/clay/ui.js';

// Pottery Wheel: sit at a spinning wheel in the Clay Café and shape the clay to match a ghost vase
// (drag its edge in or out and its top up or down, or use the arrows), fire it in the kiln, glaze it
// and put it on the shelf. The partner sits at the next wheel making a very lumpy pot.

const { N, RMIN, RMAX, HMIN, HMAX, UNIT, WIN_AT, TARGETS, GLAZES, PATTERNS } = Pots;
const FIRE_T = 4.5;
const KEEP_T = 3.4;

const CSS = `
.pot-panel { left: max(12px, env(safe-area-inset-left)); top: 68px; width: clamp(190px, 23vw, 268px); display: flex; flex-direction: column; gap: 8px; }
.pot-shape, .pot-glaze { display: flex; flex-direction: column; gap: 8px; }
.pot-trow { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.pot-trow svg { flex: none; }
.pot-tname { font-size: 1.15rem; display: block; line-height: 1.1; }
.pot-hint { font-size: .8rem; color: #6f5f73; line-height: 1.25; margin-top: 3px; }
.pot-row { display: flex; gap: 8px; }
.pot-row .clay-btn { flex: 1; padding: .4em .4em; font-size: .84rem; }
.pot-sw { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 6px; }
.pot-sw button { aspect-ratio: 1; border-radius: 50%; border: 3px solid #fff; padding: 0; cursor: pointer; box-shadow: 0 2px 6px rgba(52,40,70,.2), inset 0 -5px 7px rgba(0,0,0,.12), inset 0 5px 7px rgba(255,255,255,.35); }
.pot-sw button[aria-pressed="true"] { box-shadow: 0 0 0 3px #d9734e, inset 0 -5px 7px rgba(0,0,0,.12); transform: scale(1.06); }
.pot-pat { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px; }
.pot-pat button { height: 38px; border-radius: 12px; border: 3px solid #fff; padding: 0; cursor: pointer; background-size: cover; background-position: center; box-shadow: 0 2px 6px rgba(52,40,70,.18); }
.pot-pat button[aria-pressed="true"] { box-shadow: 0 0 0 3px #d9734e; }
.pot-pct { font-size: 1.6rem; font-weight: 700; line-height: 1; }
.pot-pct small { font-size: .85rem; font-weight: 600; color: #6f5f73; margin-left: 4px; }
.pot-msg { font-size: .82rem; color: #6f5f73; margin-top: 2px; }
@media (max-height: 460px) {
  .pot-panel { top: 60px; gap: 6px; width: clamp(180px, 25vw, 232px); }
  .pot-panel .clay-box { padding: 7px 10px; }
  .pot-hint { display: none; }
  .pot-shape, .pot-glaze { gap: 6px; }
  .pot-sw { gap: 4px; margin-top: 4px; }
  .pot-sw button { width: 36px; justify-self: center; }
  .pot-pat { gap: 4px; margin-top: 4px; }
  .pot-pat button { height: 28px; border-radius: 10px; }
  .pot-panel .clay-btn.big { min-height: 42px; font-size: .95rem; }
  .pot-pct { font-size: 1.25rem; }
  .pot-msg { display: none; }
}
`;

export default {
  id: 'pottery',
  title: 'Pottery Wheel',
  tagline: 'Shape it, fire it, glaze it',

  async start(ctx) {
    const { THREE, scene, camera, hud, input, sound, fx, renderer } = ctx;
    const { damp, clamp, easeOutCubic, easeOutBack, easeInOut } = ctx.util;
    const touch = () => document.body.classList.contains('touch');
    injectClayStyle('pottery', CSS);

    // ---------------------------------------------------------------- lights and room
    const env = ctx.env.indoor({ color: '#f6d8c4' });
    env.sun.position.set(-3, 7, 6);
    env.hemi.intensity = 1.6;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    roomEnv.dispose();
    const envTex = envRT.texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.35;
    const room = new THREE.Group();
    scene.add(room);
    const add = (...o) => (room.add(...o), o[0]);
    const BACK = -2.75;
    const floorTex = woodFloorTex();
    floorTex.repeat.set(5, 4);
    const floor = mesh(new THREE.PlaneGeometry(11, 8), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }), { cast: false });
    floor.rotation.x = -Math.PI / 2;
    add(at(floor, 0, 0, 1.2));
    const wallT = stripeWallTex();
    wallT.repeat.set(11, 1);
    add(at(mesh(new THREE.BoxGeometry(11, 3.2, 0.2), new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.9 })), 0, 1.6, BACK - 0.1));
    add(at(box(11, 0.14, 0.05, '#ffffff'), 0, 0.07, BACK + 0.025));
    const side = mat('#fbe7d3', { rough: 0.9 });
    add(at(box(0.2, 3.2, 5, side), -4.2, 1.6, BACK + 2.4));
    const sky = makeSky();
    const win = (x, y, w, h) => {
      add(at(rbox(w + 0.18, h + 0.18, 0.08, '#ffffff', 0.04), x, y, BACK + 0.04));
      add(at(mesh(new THREE.PlaneGeometry(w, h), sky.material, { cast: false }), x, y, BACK + 0.085));
      add(at(box(0.05, h, 0.04, '#ffffff'), x, y, BACK + 0.1));
      add(at(box(w, 0.05, 0.04, '#ffffff'), x, y, BACK + 0.1));
      add(at(box(w + 0.3, 0.06, 0.16, '#ffffff'), x, y - h / 2 - 0.1, BACK + 0.1));
      for (const s of [-1, 1]) add(at(rbox(0.28, h + 0.4, 0.07, COL.sun, 0.035), x + s * (w / 2 + 0.16), y - 0.02, BACK + 0.18));
    };
    win(1.05, 1.85, 1.3, 1.1);
    add(at(makePlant(0.9, COL.terra, 'tall'), 2.05, 0, BACK + 0.4));
    // Aprons by the window
    add(at(box(1.0, 0.07, 0.05, COL.wood), -2.9, 2.05, BACK + 0.03));
    [COL.rose, COL.sky].forEach((c, i) => add(at(makeApron(c), -3.15 + i * 0.5, 2.02, BACK + 0.03)));
    // Shelf for the finished pots
    const SHELF = { x: -1.3, z: BACK + 0.24, planks: [1.25, 1.75], slots: [-0.66, -0.22, 0.22, 0.66] };
    add(at(makeShelf(1.8, 0.4, [0.75, ...SHELF.planks], COL.wood), SHELF.x, 0, SHELF.z));
    for (let i = 0; i < 4; i++) add(at(makeMug([COL.sun, COL.mint, COL.rose, COL.sky][i]), SHELF.x - 0.6 + i * 0.4, 0.775, SHELF.z));
    for (let i = 0; i < 3; i++) add(at(rbox(0.42, 0.22, 0.3, ['#cdb8a6', '#d9a184', '#cdb8a6'][i], 0.06), SHELF.x - 0.55 + i * 0.55, 0.11, SHELF.z + 0.05));
    // Clay buckets and a little table of tools
    add(at(cyl(0.17, 0.15, 0.3, '#9fd8ef', 14), -0.95, 0.15, 0.35));
    add(at(cyl(0.155, 0.155, 0.02, '#a9654a', 14), -0.95, 0.29, 0.35));
    add(at(rbox(0.7, 0.06, 0.45, COL.woodLight, 0.02), -2.15, 0.62, -0.35));
    for (const [dx, dz] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]]) add(at(box(0.05, 0.6, 0.05, COL.woodDark), -2.15 + dx, 0.3, -0.35 + dz));
    add(at(rbox(0.3, 0.1, 0.22, COL.clay, 0.04), -2.3, 0.7, -0.38));
    add(at(cyl(0.06, 0.05, 0.12, COL.sun, 10), -1.95, 0.71, -0.3));
    for (let k = 0; k < 3; k++) add(rot(at(cyl(0.007, 0.007, 0.2, COL.woodLight, 5), -1.95 + (k - 1) * 0.02, 0.82, -0.3), 0, 0, (k - 1) * 0.25));
    add(at(makeVase(1, '#d8c7b8', 0.8), -2.05, 0.65, -0.48));

    // Wheels: the player's in front, the partner's beside it
    const CLAY = new THREE.Vector3(0, 0, 0);
    const wheel = makeWheel(COL.sun);
    add(at(wheel.root, CLAY.x, 0, CLAY.z));
    const BASE_Y = wheel.top;
    const QW = new THREE.Vector3(0.92, 0, -0.42);
    const QYAW = -0.35;
    const qWheel = makeWheel('#ffb7cb');
    qWheel.root.rotation.y = QYAW;
    add(at(qWheel.root, QW.x, 0, QW.z));
    const meSeat = new THREE.Vector3(0, 0, -0.72);
    const ME_YAW = 0;
    const qSeat = new THREE.Vector3(QW.x - Math.sin(QYAW) * 0.72, 0, QW.z - Math.cos(QYAW) * 0.72);
    add(at(makeStool(COL.terra), meSeat.x, 0, meSeat.z));
    add(at(makeStool(COL.mint), qSeat.x, 0, qSeat.z));

    // The kiln, back right
    const kiln = makeKiln();
    kiln.root.position.set(2.45, 0, -1.55);
    kiln.root.rotation.y = -0.55;
    add(kiln.root);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 3 - row; i++) {
        const lx = 1.35 + i * 0.19 + row * 0.095;
        add(at(cyl(0.09, 0.09, 0.5, i % 2 ? '#a0602e' : '#b8743a', 10), lx, 0.09 + row * 0.16, -2.2)).rotation.x = Math.PI / 2;
        add(at(cyl(0.07, 0.07, 0.505, '#e9c79a', 10), lx, 0.09 + row * 0.16, -2.2)).rotation.x = Math.PI / 2;
      }
    }
    const kilnGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffa65c', transparent: true, depthWrite: false, opacity: 0.2 }));
    kilnGlow.scale.setScalar(0.9);
    scene.add(kilnGlow);
    kiln.root.updateMatrixWorld(true);
    kilnGlow.position.copy(kiln.root.localToWorld(new THREE.Vector3(0, 0.7, 0.85)));
    const MOUTH = kiln.root.localToWorld(new THREE.Vector3(0, 0.43, 0.42));
    const CHIMNEY = kiln.root.localToWorld(kiln.chimney.clone());

    colorBake(room, [wheel.head, qWheel.head, kiln.door, kiln.needle]);

    // ---------------------------------------------------------------- the kids
    const me = ctx.makeKid(ctx.me);
    const pal = ctx.makeKid(ctx.partner);
    const meName = ctx.looks[ctx.me].name;
    const palName = ctx.looks[ctx.partner].name;
    for (const [k, s, yaw] of [[me, meSeat, ME_YAW], [pal, qSeat, QYAW]]) {
      k.pose = 'sit';
      k.hands = 'carry';
      k.root.position.set(s.x, 0.27, s.z);
      k.root.rotation.y = yaw;
      scene.add(k.root);
    }
    const walkers = [];
    const animate = (kid, dt, t) => {
      const speed = walkers.find((w) => w.kid === kid)?.speed || 0;
      const n = Math.max(1, Math.ceil(dt / 0.05));
      for (let i = 0; i < n; i++) kid.update(dt / n, t, speed, 0, 0);
    };
    const bubble = speechBubble(THREE, scene, { width: 0.95 });
    const bubbleAt = new THREE.Vector3();

    // ---------------------------------------------------------------- the clay
    const potMat = Pots.potMaterial('wet');
    let { r, h } = Pots.newLump();
    const potGeo = Pots.potGeometry(Pots.outerOf(r, h));
    const pot = mesh(potGeo, potMat);
    pot.frustumCulled = false;
    wheel.head.add(pot);
    let dirty = false;

    // Partner's lumpy pot
    const qMat = Pots.potMaterial('wet');
    qMat.color.set('#b8603f');
    let { r: qr, h: qh } = Pots.newLump();
    const qGeo = Pots.potGeometry(Pots.outerOf(qr, qh));
    const qPot = mesh(qGeo, qMat);
    qPot.frustumCulled = false;
    const qWobble = new THREE.Group();
    qWobble.add(qPot);
    qWheel.head.add(qWobble);

    // Ghost of the target: a faint shell and a dashed outline that always shows
    let targetIdx = Math.floor(Math.random() * TARGETS.length);
    if (ctx.opts.target != null) targetIdx = ctx.opts.target % TARGETS.length;
    let target = TARGETS[targetIdx];
    const ghostMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.14, depthWrite: false });
    const ghost = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat);
    ghost.renderOrder = 3;
    ghost.position.set(CLAY.x, BASE_Y, CLAY.z);
    scene.add(ghost);
    const GW = RMAX * UNIT * 2.3;
    const GH = HMAX * UNIT * 1.12;
    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = 256;
    lineCanvas.height = Math.round((256 * GH) / GW);
    const lineTex = new THREE.CanvasTexture(lineCanvas);
    lineTex.colorSpace = THREE.SRGBColorSpace;
    const outline = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshBasicMaterial({ map: lineTex, transparent: true, depthTest: false, depthWrite: false }));
    outline.geometry.translate(0, GH / 2 - 0.01, 0);
    outline.renderOrder = 10;
    outline.position.set(CLAY.x, BASE_Y, CLAY.z);
    scene.add(outline);
    const showTarget = () => {
      target = TARGETS[targetIdx];
      const pts = Pots.targetOuter(target, 40);
      ghost.geometry.dispose();
      ghost.geometry = new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...pts.map(([rr, y]) => new THREE.Vector2(rr + 0.002, y))], 40);
      const c = lineCanvas.getContext('2d');
      const w = lineCanvas.width;
      const hh = lineCanvas.height;
      const ppm = w / GW;
      c.clearRect(0, 0, w, hh);
      c.beginPath();
      const Y = (y) => hh - (y + 0.01) * ppm;
      pts.forEach(([rr, y], i) => (i ? c.lineTo(w / 2 - rr * ppm, Y(y)) : c.moveTo(w / 2 - rr * ppm, Y(y))));
      for (let i = pts.length - 1; i >= 0; i--) c.lineTo(w / 2 + pts[i][0] * ppm, Y(pts[i][1]));
      c.setLineDash([12, 9]);
      c.lineWidth = 5;
      c.lineJoin = 'round';
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.stroke();
      c.setLineDash([12, 9]);
      c.lineDashOffset = 0;
      c.lineWidth = 2.5;
      c.strokeStyle = 'rgba(160,80,50,0.9)';
      c.stroke();
      lineTex.needsUpdate = true;
      $('.pot-tname').textContent = target.name;
      $('.pot-tsvg').innerHTML = Pots.potSvg(pts, '#f2d4c4', 40);
    };

    // Hands ring (keyboard and hover) and drag hints
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 6, 40), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 9;
    scene.add(ring);
    const arrowTex = canvasTexture(128, 64, (c, w, hh) => {
      c.strokeStyle = 'rgba(160,80,50,0.95)';
      c.lineWidth = 9;
      c.lineCap = c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(14, hh / 2);
      c.lineTo(w - 14, hh / 2);
      c.moveTo(34, hh / 2 - 18);
      c.lineTo(14, hh / 2);
      c.lineTo(34, hh / 2 + 18);
      c.moveTo(w - 34, hh / 2 - 18);
      c.lineTo(w - 14, hh / 2);
      c.lineTo(w - 34, hh / 2 + 18);
      c.stroke();
    });
    const hints = [0, 1, 2].map((i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: arrowTex, transparent: true, depthTest: false, rotation: i === 2 ? Math.PI / 2 : 0 }));
      s.scale.set(0.12, 0.06, 1);
      s.renderOrder = 11;
      scene.add(s);
      return s;
    });
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffffff', transparent: true, depthTest: false, opacity: 0 }));
    dot.scale.setScalar(0.06);
    dot.renderOrder = 12;
    scene.add(dot);

    // Smoke from the chimney
    const smoke = Array.from({ length: 6 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#f4ece6', transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      scene.add(s);
      return { s, life: 0 };
    });
    const puffSmoke = () => {
      const q = smoke.find((x) => x.life <= 0) || smoke[0];
      q.life = 1;
      q.s.visible = true;
      q.s.position.copy(CHIMNEY);
    };

    // The shelf of saved pots (latest 8)
    const shelfGroup = new THREE.Group();
    scene.add(shelfGroup);
    const slotPos = (i) => new THREE.Vector3(SHELF.x + SHELF.slots[i % 4], SHELF.planks[Math.floor(i / 4)] + 0.026, SHELF.z + 0.02);
    const fitScale = (outer) => Math.min(1, 0.4 / outer[outer.length - 1][1], 0.4 / (Math.max(...outer.map((q) => q[0])) * 2));
    const fillShelf = (list) => {
      for (const o of [...shelfGroup.children]) {
        o.geometry.dispose();
        o.material.dispose();
        o.removeFromParent();
      }
      list.forEach((item, i) => {
        const m = Pots.makePot(item);
        m.scale.setScalar(fitScale(item.profile));
        m.position.copy(slotPos(i));
        m.rotation.y = i * 1.3;
        shelfGroup.add(m);
      });
    };
    let saved = Pots.loadPots();
    fillShelf(saved.slice(-8));

    // ---------------------------------------------------------------- panel
    const panel = document.createElement('div');
    panel.className = 'clay-ui pot-panel';
    panel.innerHTML = `
      <div class="pot-shape">
        <div class="clay-box">
          <div class="clay-eyebrow">Shape a</div>
          <div class="pot-trow"><span class="pot-tsvg"></span><div><b class="pot-tname"></b><div class="pot-hint">Drag the clay's edge in or out. Drag its top up or down.</div></div></div>
        </div>
        <div class="pot-row"><button class="clay-btn" data-a="lump">New lump</button><button class="clay-btn" data-a="next">Other shape</button></div>
        <button class="clay-btn primary big" data-a="fire">Fire it</button>
      </div>
      <div class="pot-glaze clay-hidden">
        <div class="clay-box">
          <div class="pot-pct"></div><div class="pot-msg"></div>
        </div>
        <div class="clay-box">
          <div class="clay-eyebrow">Pick a glaze</div>
          <div class="pot-sw">${GLAZES.map(([n, c], i) => `<button data-g="${i}" style="background:${c}" aria-label="${n} glaze" aria-pressed="${i === 0}"></button>`).join('')}</div>
          <div class="clay-eyebrow" style="margin-top:8px">Pattern</div>
          <div class="pot-pat">${PATTERNS.map((p, i) => `<button data-p="${p.id}" aria-label="${p.name}" title="${p.name}" aria-pressed="${i === 0}"></button>`).join('')}</div>
        </div>
        <button class="clay-btn primary big" data-a="keep">Put it on the shelf</button>
      </div>`;
    mountInArena(panel);
    const $ = (s) => panel.querySelector(s);
    const show = (sel, on) => panel.querySelectorAll(sel).forEach((el) => el.classList.toggle('clay-hidden', !on));
    showTarget();

    // ---------------------------------------------------------------- state
    let phase = 'intro'; // intro | shape | fire | glaze | keep | done
    let pt = 0; // time in the phase
    let pct = 0;
    let glaze = 0;
    let pat = 'plain';
    let touched = false;
    let drag = null;
    let hover = null;
    let keyS = 0.45; // keyboard hands height (0..1 of the clay)
    let keyT = 0; // time since the arrows were last used
    let spinSpeed = 0;
    let squishT = 0;
    let best = ctx.load('best', 0) || 0;
    let flyFrom = new THREE.Vector3();
    let keepSlot = 0;
    const R = (s) => Pots.sampleRows(r, s);
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const tone = (f, d, o) => sound.ctx && sound.tone(f, sound.ctx.currentTime, d, o);

    const resetLump = () => {
      ({ r, h } = Pots.newLump());
      dirty = true;
    };
    const syncGlazeUi = () => {
      panel.querySelectorAll('[data-g]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.g === glaze)));
      const [, color, accent] = GLAZES[glaze];
      panel.querySelectorAll('[data-p]').forEach((b) => {
        const c = document.createElement('canvas');
        c.width = 84;
        c.height = 44;
        Pots.drawGlaze(c.getContext('2d'), 84, 44, color, accent, b.dataset.p, { band: false });
        b.style.backgroundImage = `url(${c.toDataURL()})`;
        b.setAttribute('aria-pressed', String(b.dataset.p === pat));
      });
    };
    const applyGlaze = () => {
      Pots.setPotLook(potMat, 'glazed', GLAZES[glaze][1], pat);
      pot.scale.set(1.08, 0.92, 1.08);
      syncGlazeUi();
    };
    const pickGlaze = (i) => {
      glaze = (i + GLAZES.length) % GLAZES.length;
      applyGlaze();
      sound.ui('pop');
    };
    const pickPattern = (id) => {
      pat = id;
      applyGlaze();
      sound.ui('tap');
    };

    const shaping = () => phase === 'shape' || phase === 'intro';
    function fire() {
      if (!shaping()) return;
      drag = null;
      pct = Pots.matchScore(r, h, target);
      phase = 'fire';
      pt = 0;
      show('.pot-shape', false);
      hud.hint('');
      sound.ui('swoosh');
      flyFrom = pot.getWorldPosition(new THREE.Vector3());
      scene.attach(pot);
      bubble.set(pct >= WIN_AT ? `${meName}, yours looks great!` : `Into the kiln it goes!`, 2200);
    }

    function revealGlaze() {
      phase = 'glaze';
      pt = 0;
      const win = pct >= WIN_AT;
      $('.pot-pct').innerHTML = `${pct}%<small>match</small>`;
      $('.pot-pct').style.color = win ? '#2f9e6b' : '#d9734e';
      $('.pot-msg').textContent = pct >= 90 ? 'Wow, nearly perfect!' : win ? 'Lovely, it matches!' : pct >= 60 ? `Close! ${WIN_AT}% wins.` : `One of a kind! ${WIN_AT}% wins.`;
      show('.pot-glaze', true);
      hud.score(`${pct}% match`);
      hud.message(`${pct}% match`, 1300);
      hud.hint('Pick a glaze and a pattern. Left and Right: glaze, Up and Down: pattern, Enter: keep it');
      applyGlaze();
      sound.ui(win ? 'coin' : 'good');
      if (win) {
        me.squash = 1.25;
        fx.heartsAt(me.head.getWorldPosition(tmp).add(tmp2.set(0, 0.6, 0)), 3);
      }
    }

    function keep() {
      if (phase !== 'glaze') return;
      phase = 'keep';
      pt = 0;
      show('.pot-glaze', false);
      const item = {
        profile: Pots.outerOf(r, h, 16).map(([rr, y]) => [Math.round(rr * 1000) / 1000, Math.round(y * 1000) / 1000]),
        color: GLAZES[glaze][1],
        pattern: pat,
        name: target.name,
        score: pct,
        t: Date.now(),
      };
      const before = saved.slice(-7);
      fillShelf(before);
      keepSlot = before.length;
      saved = Pots.savePots([...saved, item]);
      ctx.save('shelf', saved);
      if (pct > best) {
        best = pct;
        ctx.save('best', best);
      }
      flyFrom = pot.getWorldPosition(new THREE.Vector3());
      scene.attach(pot);
      sound.ui('swoosh');
      hud.hint('');
    }

    function done() {
      phase = 'done';
      const win = pct >= WIN_AT;
      const gname = GLAZES[glaze][0].toLowerCase();
      const pname = PATTERNS.find((p) => p.id === pat).name.toLowerCase();
      const look = pat === 'plain' ? gname : `${gname} ${pname}`;
      const isBest = pct >= best && pct > 0;
      const palLine = ctx.partner === 'homama' ? `Homama says his lumpy pot is a sculpture.` : `Roji says her lumpy pot is a very special shape.`;
      ctx.finish({
        win,
        score: pct,
        title: win ? 'Beautiful pot!' : 'A wobbly treasure',
        text: `${pct}% match with the ${target.name.toLowerCase()}. Your ${look} pot is on the shelf in the Clay Café.${win ? '' : ` ${WIN_AT}% wins.`}${isBest && win ? ' New best!' : ''}<br>${palLine}`,
      });
    }

    onTap(panel, (b) => {
      const a = b.dataset.a;
      if (b.dataset.g != null) return pickGlaze(+b.dataset.g);
      if (b.dataset.p) return pickPattern(b.dataset.p);
      if (a === 'lump' && shaping()) {
        resetLump();
        sound.ui('swoosh');
      } else if (a === 'next' && shaping()) {
        targetIdx = (targetIdx + 1) % TARGETS.length;
        showTarget();
        sound.ui('tap');
      } else if (a === 'fire') fire();
      else if (a === 'keep') keep();
    });

    // ---------------------------------------------------------------- shaping
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane();
    const nrm = new THREE.Vector3();
    // Pointer on the vertical plane through the clay's axis, in clay units: u across, y up from the wheel
    function onClay(ndc) {
      nrm.set(camera.position.x - CLAY.x, 0, camera.position.z - CLAY.z).normalize();
      plane.setFromNormalAndCoplanarPoint(nrm, tmp.set(CLAY.x, BASE_Y, CLAY.z));
      ray.setFromCamera(ndc, camera);
      const hit = ray.ray.intersectPlane(plane, tmp2);
      if (!hit) return null;
      const u = (hit.x - CLAY.x) * nrm.z - (hit.z - CLAY.z) * nrm.x;
      return { u: u / UNIT, y: (hit.y - BASE_Y) / UNIT, p: hit.clone() };
    }
    // Clay units per screen pixel at the clay
    const unitsPerPx = () => {
      const d = Math.hypot(camera.position.x - CLAY.x, camera.position.z - CLAY.z);
      return (2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / window.innerHeight / UNIT;
    };
    function hitMode(q) {
      const tol = (touch() ? 30 : 18) * unitsPerPx();
      const dx = Math.abs(q.u);
      const rTop = r[N - 1];
      if (q.y > h - tol * 1.4 && q.y < h + tol * 1.6 && dx < Math.max(rTop, 0.08) + tol) return 'top';
      if (q.y >= -tol * 0.5 && q.y <= h) {
        const s = clamp(q.y / h, 0, 1);
        if (Math.abs(dx - R(s)) < tol * 1.5) return 'side';
      }
      return null;
    }
    // Pull the wall toward radius tr around height s, smoothing the neighbours
    function pullWall(s, tr, k) {
      const sig = 0.065;
      for (let i = 0; i < N; i++) {
        const d = i / (N - 1) - s;
        const w = Math.exp(-(d * d) / (2 * sig * sig));
        r[i] += (tr - r[i]) * w * k;
      }
      const prev = r.slice();
      for (let i = 1; i < N - 1; i++) r[i] = prev[i] + 0.08 * (prev[i - 1] + prev[i + 1] - 2 * prev[i]);
      r[0] = Math.max(r[0], 0.07);
      for (let i = 0; i < N; i++) r[i] = clamp(r[i], RMIN, RMAX);
      dirty = true;
    }
    function squish(dt, amount) {
      squishT -= dt;
      if (squishT > 0 || amount < 0.0004) return;
      squishT = 0.14;
      tone(150 + Math.random() * 60, 0.09, { type: 'sine', gain: 0.035, slideTo: 95 });
    }
    function shapeInput(dt) {
      const ptr = input.pointer;
      const q = onClay(ptr.ndc);
      if (ptr.justDown && q) {
        const mode = hitMode(q);
        if (mode) {
          drag = { mode, off: q.y - h, last: q };
          if (!touched) touched = true;
          sound.ui('tap');
        }
      }
      if (!ptr.down) drag = null;
      hover = !drag && !touch() && q ? hitMode(q) : null;
      renderer.domElement.style.cursor = drag ? (drag.mode === 'top' ? 'ns-resize' : 'ew-resize') : hover === 'top' ? 'ns-resize' : hover === 'side' ? 'ew-resize' : '';
      if (drag && q) {
        drag.last = q;
        const k = 1 - Math.exp(-dt * 14);
        if (drag.mode === 'side') {
          const s = clamp(q.y / h, 0, 1);
          const tr = clamp(Math.abs(q.u), RMIN, RMAX);
          const before = R(s);
          pullWall(s, tr, k);
          squish(dt, Math.abs(R(s) - before));
        } else {
          const th = clamp(q.y - drag.off, HMIN, HMAX);
          const before = h;
          h += (th - h) * (1 - Math.exp(-dt * 16));
          dirty = true;
          squish(dt, Math.abs(h - before));
        }
      }
      // Arrows: up and down move the hands, left and right squeeze or widen; Space with up and down sets the height
      const ax = input.axis();
      const kb = ax.keyboard || Math.hypot(ax.x, ax.y) > 0.15;
      if (kb && !drag) {
        keyT = 0;
        if (!touched) touched = true;
        if (input.held('jump') || input.held(' ')) {
          const before = h;
          h = clamp(h + ax.y * dt * 0.5, HMIN, HMAX);
          if (h !== before) dirty = true;
          squish(dt, Math.abs(h - before));
        } else {
          keyS = clamp(keyS + ax.y * dt * 0.9, 0.02, 1);
          if (Math.abs(ax.x) > 0.1) {
            const before = R(keyS);
            pullWall(keyS, clamp(R(keyS) + ax.x * 0.04, RMIN, RMAX), 1 - Math.exp(-dt * 9));
            squish(dt, Math.abs(R(keyS) - before));
          }
        }
      } else keyT += dt;
    }

    // ---------------------------------------------------------------- partner
    const Q = { t: 2.5, act: null, s: 0.5, tr: 0.2, th: 0.5, wob: 0.4, flopT: 7 + Math.random() * 4, said: 0 };
    const qLines = ctx.partner === 'homama'
      ? ['Mine is going to be a masterpiece.', 'Is it meant to wobble like that?', 'Oops! It flopped again.', 'It is a sculpture now.', 'I think mine has a face.']
      : ['Mine is going to be so pretty.', 'Why is mine wobbling?', 'Oops! It flopped.', 'It is a very special shape.', 'Mine looks like a little hat.'];
    function partnerStep(dt, t) {
      Q.t -= dt;
      Q.flopT -= dt;
      if (Q.flopT <= 0 && shaping()) {
        Q.flopT = 10 + Math.random() * 6;
        qh = Math.max(HMIN, qh * 0.55);
        for (let i = 0; i < N; i++) qr[i] = clamp(qr[i] * (1 + (i / N) * 0.6), RMIN, RMAX);
        pal.squash = 0.8;
        bubble.set(qLines[2 + (Q.said++ % 2)], 2200);
        tone(320, 0.25, { type: 'sine', gain: 0.05, slideTo: 120 });
        Q.wob = 1;
      }
      if (Q.t <= 0) {
        Q.t = 0.9 + Math.random() * 0.9;
        Q.act = Math.random() < 0.75 ? 'push' : 'pull';
        Q.s = Math.random();
        Q.tr = Math.random() < 0.5 ? 0.06 + Math.random() * 0.08 : 0.26 + Math.random() * 0.14;
        Q.th = 0.3 + Math.random() * 0.55;
      }
      const k = 1 - Math.exp(-dt * 3);
      if (Q.act === 'push') {
        const sig = 0.06;
        for (let i = 0; i < N; i++) {
          const d = i / (N - 1) - Q.s;
          qr[i] += (Q.tr - qr[i]) * Math.exp(-(d * d) / (2 * sig * sig)) * k;
        }
        qr[0] = Math.max(qr[0], 0.1);
      } else if (Q.act === 'pull') qh += (Q.th - qh) * k;
      for (let i = 0; i < N; i++) qr[i] = clamp(qr[i] + Math.sin(i * 1.9 + t * 0.7) * 0.0006, RMIN, RMAX);
      Pots.updatePotGeometry(qGeo, Pots.outerOf(qr, qh));
      Q.wob = damp(Q.wob, 0.35, 0.6, dt);
      qWobble.rotation.z = Math.sin(t * 3.1) * 0.07 * Q.wob;
      qWobble.rotation.x = Math.cos(t * 2.3) * 0.05 * Q.wob;
    }

    // ---------------------------------------------------------------- camera
    const camPos = new THREE.Vector3(0.6, 2.3, 4.6);
    const camLook = new THREE.Vector3(0.2, 0.9, -0.6);
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    // Shaping shot: the clay big in the space beside the panel, the partner at the right
    function shapeShot() {
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const pr = panel.getBoundingClientRect();
      const frac = pr.width > 0 ? clamp((pr.right + 8) / window.innerWidth, 0, 0.45) : 0;
      const xl = -1 + 2 * frac;
      const xc = xl + 0.36 * (1 - xl);
      const hw = 0.9 / Math.max(0.3, 0.76 - xc);
      const d = Math.max(hw / (tan * camera.aspect), 0.64 / tan);
      const lookX = CLAY.x - xc * d * tan * camera.aspect;
      wantLook.set(lookX, 0.93, CLAY.z - 0.15);
      wantPos.set(lookX, 0.93 + d * 0.33, CLAY.z - 0.15 + d * 0.94);
    }
    // Wheel, partner and kiln together, so the pot's flight into the kiln reads
    function kilnShot() {
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.max(3.4, 1.75 / (tan * camera.aspect));
      wantLook.set(1.3, 0.8, -0.75);
      wantPos.copy(wantLook).add(tmp2.set(0.24 * d, 0.4 * d, 0.92 * d));
    }
    // Glazing: a three-quarter view, so even a tall pot leaves the potter's face free
    function glazeShot() {
      shapeShot();
      const a = 0.42;
      const dx = wantPos.x - CLAY.x;
      const dz = wantPos.z - CLAY.z;
      wantPos.x = CLAY.x + dx * Math.cos(a) + dz * Math.sin(a);
      wantPos.z = CLAY.z - dx * Math.sin(a) + dz * Math.cos(a);
      wantLook.x += 0.12;
    }
    // The shelf with both kids beside it
    function shelfShot() {
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.max(3.7, 1.95 / (tan * camera.aspect));
      wantLook.set(SHELF.x, 1.1, SHELF.z + 0.5);
      wantPos.set(SHELF.x + 0.2, 1.1 + d * 0.2, SHELF.z + 0.5 + d * 0.98);
    }

    // ---------------------------------------------------------------- start
    hud.buttons({ action: null, jump: null, stick: false });
    hud.hint("Drag the clay's edge or top. Arrows shape it, hold Space for height, Enter fires");
    hud.score(best ? `Best ${best}%` : '');
    hud.message('Shape the clay!', 1400);
    sound.ui('pop');

    const debug = {
      speed: 1,
      get phase() {
        return phase;
      },
      get pct() {
        return pct;
      },
      get live() {
        return Pots.matchScore(r, h, target);
      },
      perfect() {
        for (let i = 0; i < N; i++) r[i] = Pots.sampleTarget(target, i / (N - 1));
        h = target.h;
        dirty = true;
      },
      fire,
      keep,
      glaze: pickGlaze,
      pattern: pickPattern,
      skip() {
        pt = 99;
      },
      snap() {
        camPos.copy(wantPos);
        camLook.copy(wantLook);
      },
      drag: (u, y) => ({ u, y, mode: hitMode({ u, y }) }),
      // Screen pixel of a clay point (u across, y up, in clay units)
      screen(u, y) {
        nrm.set(camera.position.x - CLAY.x, 0, camera.position.z - CLAY.z).normalize();
        const p = new THREE.Vector3(CLAY.x + u * UNIT * nrm.z, BASE_Y + y * UNIT, CLAY.z - u * UNIT * nrm.x).project(camera);
        return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
      },
      get shape() {
        return { h, r0: R(0.45), rTop: r[N - 1] };
      },
    };
    let liveT = 0;
    let lastLive = -1;

    return {
      debug,
      update(rdt, t) {
        const dt = rdt * debug.speed;
        pt += dt;
        // Phase logic
        if (phase === 'intro') {
          shapeShot();
          if (pt > 1.4) {
            phase = 'shape';
            pt = 0;
            bubble.set(qLines[0], 2600);
          }
        }
        if (phase === 'shape' || phase === 'intro') {
          shapeInput(dt);
          if (input.pressed('action') || input.pressed('enter')) fire();
          shapeShot();
          liveT -= dt;
          if (liveT <= 0) {
            liveT = 0.2;
            const live = Pots.matchScore(r, h, target);
            if (live !== lastLive) {
              lastLive = live;
              hud.score(`Match <b style="color:${live >= WIN_AT ? '#2f9e6b' : '#d9734e'}">${live}%</b>`);
            }
          }
        } else if (phase === 'fire') {
          fireStep(dt, t);
        } else if (phase === 'glaze') {
          glazeShot();
          if (input.pressed('arrowleft') || input.pressed('a')) pickGlaze(glaze - 1);
          if (input.pressed('arrowright') || input.pressed('d')) pickGlaze(glaze + 1);
          const pi = PATTERNS.findIndex((p) => p.id === pat);
          if (input.pressed('arrowup') || input.pressed('w')) pickPattern(PATTERNS[(pi + PATTERNS.length - 1) % PATTERNS.length].id);
          if (input.pressed('arrowdown') || input.pressed('s')) pickPattern(PATTERNS[(pi + 1) % PATTERNS.length].id);
          for (let i = 0; i < 8; i++) if (input.pressed(String(i + 1))) pickGlaze(i);
          if (input.pressed('action') || input.pressed('enter')) keep();
        } else if (phase === 'keep' || phase === 'done') {
          keepStep(dt, t);
        }
        if (dirty) {
          Pots.updatePotGeometry(potGeo, Pots.outerOf(r, h));
          dirty = false;
        }

        // Wheel spin, the partner, the ghost
        const wantSpin = phase === 'shape' || phase === 'intro' ? 9 : phase === 'glaze' ? 1.6 : 0.6;
        spinSpeed = damp(spinSpeed, wantSpin, 3, dt);
        wheel.head.rotation.y += spinSpeed * dt;
        qWheel.head.rotation.y += 7 * dt;
        if (pot.parent === wheel.head) {
          pot.scale.set(damp(pot.scale.x, 1, 8, dt), damp(pot.scale.y, 1, 8, dt), damp(pot.scale.z, 1, 8, dt));
        }
        if (phase !== 'done') partnerStep(dt, t);
        const ghostOn = phase === 'intro' || phase === 'shape';
        ghostMat.opacity = damp(ghostMat.opacity, ghostOn ? 0.14 : 0, 6, dt);
        outline.material.opacity = damp(outline.material.opacity, ghostOn ? 1 : 0, 6, dt);
        ghost.visible = outline.visible = ghostMat.opacity > 0.01;
        outline.rotation.y = Math.atan2(camera.position.x - CLAY.x, camera.position.z - CLAY.z);
        // Hands ring: where the arrows shape, or where the mouse would grab
        let ringS = null;
        if (ghostOn && keyT < 1.5) ringS = keyS;
        if (ghostOn && drag?.mode === 'side') ringS = clamp(drag.last.y / h, 0, 1);
        if (ghostOn && !drag && hover === 'side') {
          const q = onClay(input.pointer.ndc);
          if (q) ringS = clamp(q.y / h, 0, 1);
        }
        ringMat.opacity = damp(ringMat.opacity, ringS === null ? 0 : 0.85, 10, dt);
        if (ringS !== null) {
          const rr = R(ringS) * UNIT + 0.012;
          ring.scale.set(rr, rr, 0.12);
          ring.position.set(CLAY.x, BASE_Y + ringS * h * UNIT, CLAY.z);
        }
        ring.visible = ringMat.opacity > 0.02;
        // Drag dot and the first-time hints
        dot.material.opacity = damp(dot.material.opacity, drag ? 0.9 : 0, 12, dt);
        if (drag?.last) dot.position.copy(drag.last.p);
        const hintA = ghostOn && !touched ? 0.55 + 0.35 * Math.sin(t * 4) : 0;
        hints.forEach((s, i) => {
          s.material.opacity = damp(s.material.opacity, hintA, 8, dt);
          s.visible = s.material.opacity > 0.02;
          const sy = 0.45;
          if (i < 2) s.position.set(CLAY.x + (i ? 1 : -1) * (R(sy) * UNIT + 0.08), BASE_Y + sy * h * UNIT, CLAY.z + 0.05);
          else s.position.set(CLAY.x, BASE_Y + h * UNIT + 0.08, CLAY.z + 0.05);
        });

        // Kids: the player's hands follow the shaping height
        animate(me, dt, t);
        animate(pal, dt, t);
        // Seated at a wheel, legs tuck down behind the splash pan
        for (const kid of [me, pal]) if (kid.pose === 'sit') for (const l of kid.legs) l.rotation.x = -0.95;
        if (me.pose === 'sit' && (phase === 'shape' || phase === 'intro' || phase === 'glaze')) {
          const s = drag ? clamp(drag.last.y / h, 0, 1) : keyS;
          const yy = BASE_Y + s * h * UNIT;
          const lift = clamp((yy - 0.84) * 2.2, -0.5, 0.9);
          const [aL, aR] = me.arms;
          const spread = clamp(0.32 - (R(s) - 0.16) * 1.4, 0.05, 0.5);
          aL.rotation.set(-1.25 - lift, 0, -spread);
          aR.rotation.set(-1.25 - lift, 0, spread);
        }
        // Smoke and the bubble
        for (const q of smoke) {
          if (q.life <= 0) continue;
          q.life -= dt * 0.6;
          q.s.position.y += dt * 0.45;
          q.s.position.x += dt * 0.08;
          q.s.scale.setScalar(0.18 + (1 - q.life) * 0.5);
          q.s.material.opacity = Math.max(0, q.life) * 0.55;
          if (q.life <= 0) q.s.visible = false;
        }
        bubble.update(dt, bubbleAt.copy(pal.head.getWorldPosition(tmp)).add(tmp2.set(0.1, 0.78, 0.05)));

        // Camera
        const rate = phase === 'intro' ? 2.2 : 3.2;
        camPos.x = damp(camPos.x, wantPos.x, rate, dt);
        camPos.y = damp(camPos.y, wantPos.y, rate, dt);
        camPos.z = damp(camPos.z, wantPos.z, rate, dt);
        camLook.x = damp(camLook.x, wantLook.x, rate, dt);
        camLook.y = damp(camLook.y, wantLook.y, rate, dt);
        camLook.z = damp(camLook.z, wantLook.z, rate, dt);
        camera.position.copy(camPos);
        camera.lookAt(camLook);
      },
      dispose() {
        panel.remove();
        renderer.domElement.style.cursor = '';
        hud.hint('');
        scene.environment = null;
        envRT.dispose();
        pmrem.dispose();
        lineTex.dispose();
      },
    };

    // ---------------------------------------------------------------- firing
    function fireStep(dt, t) {
      const k = pt;
      kilnShot();
      const open = (a, b, dir) => {
        const q = clamp((k - a) / (b - a), 0, 1);
        kiln.door.rotation.y = dir ? -1.75 * easeInOut(q) : -1.75 * (1 - easeInOut(q));
      };
      if (k < 1.1) open(0, 0.45, true);
      else if (k < 3.1) open(1.1, 1.45, false);
      else if (k < 4.1) open(3.1, 3.45, true);
      else open(4.15, 4.5, false);
      const flyTo = (a, b, from, to, sFrom, sTo) => {
        const q = clamp((k - a) / (b - a), 0, 1);
        const e = easeInOut(q);
        pot.position.lerpVectors(from, to, e);
        pot.position.y += Math.sin(e * Math.PI) * 0.45;
        pot.scale.setScalar(sFrom + (sTo - sFrom) * e);
        pot.rotation.y += dt * 2;
        return q;
      };
      const home = tmp.set(CLAY.x, BASE_Y, CLAY.z).clone();
      const inside = MOUTH.clone().add(new THREE.Vector3(0, 0, 0).addScaledVector(new THREE.Vector3(Math.sin(-0.55), 0, Math.cos(-0.55)), -0.35));
      if (k < 1.1) flyTo(0.25, 1.05, flyFrom, inside, 1, 0.72);
      else if (k > 3.35 && pot.parent === scene) {
        if (flyTo(3.35, 4.15, inside, home, 0.72, 1) >= 1 && pot.parent !== wheel.head) {
          wheel.head.attach(pot);
          pot.position.set(0, 0, 0);
          pot.rotation.set(0, 0, 0);
          pot.scale.set(1.1, 0.9, 1.1);
        }
      }
      // Burn: glow up, sparks and smoke out of the chimney, crackles
      const burn = clamp((k - 1.4) / 1.7, 0, 1);
      const heat = k > 1.4 && k < 3.3 ? Math.sin(burn * Math.PI) : 0;
      kiln.glow.emissiveIntensity = 0.15 + heat * 2.4 + Math.sin(t * 23) * 0.1 * heat;
      kilnGlow.material.opacity = 0.15 + heat * 0.75;
      kilnGlow.scale.setScalar(0.9 + heat * 0.5);
      kiln.needle.rotation.z = -0.6 * heat - 0.1;
      if (heat > 0.2 && Math.random() < dt * 6) {
        puffSmoke();
        if (Math.random() < 0.5) fx.burst(CHIMNEY, ['#ffb347', '#ff7a2f', '#ffd166'], 2);
      }
      if (heat > 0.1 && Math.random() < dt * 14) tone(1400 + Math.random() * 1800, 0.03, { type: 'square', gain: 0.008 });
      if (k > 1.4 && !fireStep.roar) {
        fireStep.roar = true;
        tone(70, 1.8, { type: 'triangle', gain: 0.05, attack: 0.4 });
      }
      if (burn > 0.5 && potMat.color.getHexString() !== Pots.FIRED.slice(1)) Pots.setPotLook(potMat, 'fired');
      if (k >= FIRE_T) {
        fireStep.roar = false;
        revealGlaze();
      }
    }

    // ---------------------------------------------------------------- keeping
    function keepStep(dt, t) {
      const k = pt;
      shelfShot();
      const to = slotPos(keepSlot);
      const sTo = fitScale(Pots.outerOf(r, h, 16));
      if (pot.parent === scene) {
        const q = clamp(k / 1.25, 0, 1);
        const e = easeInOut(q);
        pot.position.lerpVectors(flyFrom, to, e);
        pot.position.y += Math.sin(e * Math.PI) * 0.6;
        pot.scale.setScalar(1 + (sTo - 1) * e);
        pot.rotation.y += dt * 3;
        if (q >= 1) {
          shelfGroup.attach(pot);
          pot.position.copy(to);
          fx.heartsAt(to.clone().add(tmp.set(0, 0.35, 0.1)), 5);
          sound.ui('coin');
          bubble.set(ctx.partner === 'homama' ? 'Best pot on the shelf!' : 'It is perfect on the shelf!', 2400);
        }
      } else pot.scale.setScalar(damp(pot.scale.x, sTo, 10, dt));
      // Both get up, walk over beside the shelf and celebrate
      if (k > 0.35 && me.pose === 'sit') {
        walkers.length = 0;
        for (const [kid, from, x, z] of [[me, new THREE.Vector3(-0.55, 0, -0.55), SHELF.x - 1.15, SHELF.z + 0.7], [pal, new THREE.Vector3(qSeat.x, 0, qSeat.z - 0.45), SHELF.x + 1.15, SHELF.z + 0.7]]) {
          kid.pose = 'stand';
          kid.hands = null;
          kid.root.position.copy(from);
          kid.squash = 1.2;
          walkers.push({ kid, from: from.clone(), to: new THREE.Vector3(x, 0, z), t: 0, done: false });
        }
        pal.onEmoteFx = () => fx.heartsAt(pal.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.7, 0)), 4);
      }
      for (const w of walkers) {
        if (w.done) continue;
        w.t += dt / 1.2;
        const e = easeInOut(clamp(w.t, 0, 1));
        w.kid.root.position.lerpVectors(w.from, w.to, e);
        const dx = w.to.x - w.from.x;
        const dz = w.to.z - w.from.z;
        w.kid.root.rotation.y = w.t < 0.85 ? Math.atan2(dx, dz) : damp(w.kid.root.rotation.y, 0, 8, dt);
        w.speed = w.t < 0.9 ? 3 : 0;
        if (w.t >= 1.15) {
          w.done = true;
          w.speed = 0;
          w.kid.root.rotation.y = 0;
          w.kid.emote(w.kid === me ? (pct >= WIN_AT ? 'cheer' : 'wave') : 'heart');
        }
      }
      if (k > KEEP_T && phase === 'keep') done();
    }
  },
};
