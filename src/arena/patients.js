import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kit, C, emblem, makeTool, plant, skyTexture, windowMesh, colorBake } from '../places/hospital/models.js';
import { TOOLS, SYMPTOMS, PATIENTS, patientById } from '../places/hospital/roster.js';
import { makePerson, dress } from '../places/hospital/people.js';

// Patient Rounds: a 3D exam room at Sunny Hill. A patient sits on the bed and says what is wrong;
// pick the right tool from the tray (tap it, or press 1 to 8). Five patients per shift, a calm clock and stars.

const SHIFT = 5;
const TIME = 150;
const SLOT = 0.55;
const STAR = 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z';
const starsHtml = (n) =>
  `<span style="display:inline-flex;gap:6px;margin:4px 0 10px">${[0, 1, 2]
    .map((i) => `<svg width="38" height="38" viewBox="0 0 24 24"><path d="${STAR}" fill="${i < n ? '#ffd166' : '#eadfd6'}" stroke="${i < n ? '#e0a800' : '#cdbfb4'}" stroke-width="1.3" stroke-linejoin="round"/></svg>`)
    .join('')}</span>`;

export default {
  id: 'patients',
  title: 'Patient Rounds',
  tagline: 'Help Dr. Roji make five patients feel better',

  async start(ctx) {
    const { THREE, scene, camera, util, hud, input, sound, fx } = ctx;
    const { canvasTexture, roundRect, FONT, damp, easeOutBack, easeOutCubic, clamp } = util;
    const k = kit();
    const { box, rbox, cyl, sph, at } = k;
    const env = ctx.env.indoor({ color: '#f3dccd' });
    env.sun.position.set(-3, 8, 6);
    env.hemi.intensity = 1.75;
    const room = new THREE.Group();
    scene.add(room);
    const add = (...o) => (room.add(...o), o[0]);
    const me = ctx.me;

    // ---------------------------------------------------------------- room
    const tiles = canvasTexture(256, 256, (c, w) => {
      c.fillStyle = '#f2fbf7';
      c.fillRect(0, 0, w, w);
      c.fillStyle = '#d3f1e5';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect((i * w) / 4, (j * w) / 4, w / 4, w / 4);
    });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
    tiles.repeat.set(6, 5);
    const floor = util.mesh(new THREE.BoxGeometry(10, 0.1, 8), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.85 }), { cast: false });
    add(at(floor, 0, -0.05, -0.6));
    const paper = canvasTexture(128, 128, (c, w) => {
      c.fillStyle = '#e6f6f0';
      c.fillRect(0, 0, w, w);
      c.fillStyle = '#cbeee0';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * (w / 3);
        const y = (j + 0.5) * (w / 3);
        c.fillRect(x - 9, y - 3, 18, 6);
        c.fillRect(x - 3, y - 9, 6, 18);
      }
    });
    paper.wrapS = paper.wrapT = THREE.RepeatWrapping;
    paper.repeat.set(6, 2.5);
    const back = util.mesh(new THREE.BoxGeometry(10, 3.6, 0.2), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 }));
    add(at(back, 0, 1.8, -3.7));
    add(at(box(10, 0.2, 0.06, C.white), 0, 0.1, -3.58));
    add(at(box(10, 0.08, 0.05, C.white), 0, 1.1, -3.58));
    for (const s of [-1, 1]) add(at(box(0.2, 3.6, 7, '#f7ece0'), s * 5, 1.8, -0.2));
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture() });
    add(at(windowMesh(k, skyMat, { w: 1.2, h: 1.0, curtain: C.pink }), 2.6, 2.05, -3.55));
    // Emblem plaque over the bed
    const plaque = emblem(k, 0.6);
    add(at(plaque, -0.7, 2.45, -3.52));
    // Eye chart
    const chart = k.panel(0.7, 1.0, 256, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = C.mintDeep;
      c.lineWidth = 10;
      c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = C.ink;
      c.textAlign = 'center';
      const rows = ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D'];
      rows.forEach((r, i) => {
        c.font = `700 ${70 - i * 11}px ${FONT}`;
        c.fillText(r, w / 2, 80 + i * 66);
      });
    });
    add(at(rbox(0.78, 1.08, 0.04, C.mintDeep, 0.03), -2.7, 1.95, -3.58));
    add(at(chart, -2.7, 1.95, -3.55));
    // Giraffe height chart
    const giraffe = k.panel(0.5, 1.7, 256, (c, w, h) => {
      c.fillStyle = '#fff3d6';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffc94d';
      roundRect(c, w * 0.32, h * 0.12, w * 0.36, h * 0.86, 30);
      c.fill();
      c.beginPath();
      c.ellipse(w * 0.55, h * 0.1, w * 0.28, h * 0.06, 0.2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#d98b2b';
      for (let i = 0; i < 9; i++) {
        c.beginPath();
        c.arc(w * (0.42 + (i % 2) * 0.16), h * (0.22 + i * 0.085), 10, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = C.ink;
      c.beginPath();
      c.arc(w * 0.68, h * 0.09, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = C.mintDeep;
      for (let i = 0; i < 8; i++) c.fillRect(0, h * (0.1 + i * 0.11), w * 0.2, 5);
    });
    add(at(giraffe, -4.0, 1.3, -3.58));
    // Cabinet with jars, a counter with a sink, a plant
    add(at(rbox(1.2, 2.0, 0.5, C.white, 0.05), -3.4, 1.0, -3.3));
    add(at(box(1.04, 0.04, 0.42, C.mint), -3.4, 1.3, -3.25));
    add(at(box(1.04, 0.04, 0.42, C.mint), -3.4, 1.7, -3.25));
    [C.rose, C.sun, C.sky, C.lilac, C.mint].forEach((cc, i) => {
      add(at(cyl(0.07, 0.07, 0.18, cc, 12), -3.8 + i * 0.2, 1.42, -3.22));
      add(at(cyl(0.075, 0.075, 0.04, C.white, 12), -3.8 + i * 0.2, 1.53, -3.22));
    });
    add(at(rbox(0.5, 0.36, 0.06, C.pink, 0.04), -3.4, 0.55, -3.04));
    add(at(rbox(1.8, 0.9, 0.6, C.mint, 0.05), 3.3, 0.45, -3.25));
    add(at(rbox(1.9, 0.07, 0.66, C.white, 0.03), 3.3, 0.93, -3.25));
    add(at(rbox(0.6, 0.05, 0.4, C.steel, 0.02, { metal: 0.4, rough: 0.3 }), 3.0, 0.95, -3.25));
    const tap = k.tor(0.12, 0.022, C.steel, Math.PI, { metal: 0.6, rough: 0.25 });
    tap.rotation.y = Math.PI / 2;
    add(at(tap, 3.0, 1.0, -3.45));
    add(at(plant(k, { scale: 0.7, pot: C.sun }), 3.85, 0.96, -3.3));
    add(at(plant(k, { scale: 1.3 }), 4.4, 0, -2.4));
    // Exam bed
    const BX = -0.7;
    const BZ = -1.8;
    add(at(rbox(1.9, 0.5, 0.72, C.white, 0.06), BX, 0.25, BZ));
    add(at(rbox(2.06, 0.16, 0.84, C.mintDeep, 0.07), BX, 0.56, BZ));
    add(at(box(1.5, 0.012, 0.56, '#ffffff'), BX + 0.1, 0.645, BZ));
    add(at(rbox(0.5, 0.14, 0.62, C.white, 0.07), BX - 0.75, 0.7, BZ));
    for (const dx of [-0.45, 0.45]) {
      add(at(rbox(0.7, 0.16, 0.04, C.mint, 0.02), BX + dx, 0.3, BZ + 0.37));
      add(at(sph(0.025, C.sun, undefined, 8), BX + dx, 0.3, BZ + 0.4));
    }
    // Exam lamp arching over the bed
    add(at(cyl(0.22, 0.25, 0.06, C.ink, 16), BX - 1.5, 0.03, BZ - 0.55));
    add(at(cyl(0.03, 0.03, 2.0, C.steel, 8), BX - 1.5, 1.0, BZ - 0.55));
    const lampArm = cyl(0.025, 0.025, 0.9, C.steel, 8);
    lampArm.rotation.z = -1.0;
    add(at(lampArm, BX - 1.13, 2.1, BZ - 0.45));
    const lampHead = cyl(0.08, 0.2, 0.18, C.pink, 16);
    add(at(lampHead, BX - 0.75, 2.28, BZ - 0.35));
    add(at(sph(0.08, '#fff6d8', { emissive: '#ffe9a8', ei: 0.9 }, 12), BX - 0.75, 2.2, BZ - 0.35));
    // Tray on wheels, numbered tools on top
    const TZ = 0.2;
    const TY = 0.9;
    add(at(rbox(4.6, 0.07, 0.7, C.white, 0.03), 0, TY - 0.035, TZ));
    add(at(rbox(4.66, 0.05, 0.76, C.mint, 0.02), 0, TY - 0.09, TZ));
    add(at(rbox(4.5, 0.05, 0.6, C.white, 0.02), 0, 0.3, TZ));
    for (const [x, z] of [[-2.2, -0.3], [2.2, -0.3], [-2.2, 0.3], [2.2, 0.3]]) {
      add(at(cyl(0.025, 0.025, 0.8, C.steel, 6), x, 0.45, TZ + z));
      add(at(sph(0.05, C.ink, undefined, 8), x, 0.05, TZ + z));
    }
    const strip = k.panel(4.4, 0.22, 2048, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${h * 0.62}px ${FONT}`;
      TOOLS.forEach((tl, i) => {
        c.fillStyle = i % 2 ? '#f2fbf7' : '#ffffff';
        c.fillRect((i * w) / 8, 0, w / 8, h);
        c.fillStyle = C.ink;
        c.fillText(tl.name, ((i + 0.5) * w) / 8, h / 2 + 3, w / 8 - 10);
      });
    });
    add(at(strip, 0, TY - 0.17, TZ + 0.36));
    colorBake(room);
    util.bakeStatic(room, [], mergeGeometries);

    // Tools, number badges, hit boxes and a glow under the hovered one
    const tools = [];
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const ringMat = new THREE.MeshBasicMaterial({ color: '#7fd8bf', transparent: true, opacity: 0, depthWrite: false });
    const ringGeo = new THREE.RingGeometry(0.17, 0.24, 28);
    const hits = [];
    TOOLS.forEach((tl, i) => {
      const x = (i - 3.5) * SLOT;
      const model = makeTool(k, tl.id);
      const holder = new THREE.Group();
      holder.add(model);
      holder.scale.setScalar(1.55);
      holder.position.set(x, TY, TZ);
      scene.add(holder);
      const badge = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: canvasTexture(128, 128, (c, w) => {
            c.fillStyle = '#ffffff';
            c.beginPath();
            c.arc(w / 2, w / 2, w / 2 - 6, 0, Math.PI * 2);
            c.fill();
            c.lineWidth = 10;
            c.strokeStyle = C.mintDeep;
            c.stroke();
            c.fillStyle = C.ink;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.font = `700 78px ${FONT}`;
            c.fillText(String(i + 1), w / 2, w / 2 + 5);
          }),
          depthTest: false,
          transparent: true,
        }),
      );
      badge.scale.setScalar(0.2);
      badge.renderOrder = 4;
      badge.position.set(x - 0.2, TY + 0.06, TZ + 0.26);
      scene.add(badge);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(SLOT * 0.96, 0.55, 0.8), hitMat);
      hit.position.set(x, TY + 0.2, TZ + 0.05);
      hit.userData.slot = i;
      scene.add(hit);
      hits.push(hit);
      const ring = new THREE.Mesh(ringGeo, i === 0 ? ringMat : ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, TY + 0.005, TZ);
      scene.add(ring);
      tools.push({ id: tl.id, name: tl.name, holder, model, home: new THREE.Vector3(x, TY, TZ), ring, lift: 0, shake: 0, busy: false, pop: 1 });
    });

    // ---------------------------------------------------------------- people
    const roji = ctx.makeKid('roji');
    scene.add(roji.root);
    const ROJI_AT = new THREE.Vector3(0.95, 0, -1.4);
    roji.root.position.copy(ROJI_AT);
    let rojiYaw = -0.45;
    let homama = null;
    if (me === 'homama') {
      homama = ctx.makeKid('homama');
      homama.root.position.set(1.85, 0, -1.05);
      homama.root.rotation.y = -0.45;
      const clip = new THREE.Group();
      clip.add(rbox(0.26, 0.34, 0.03, C.woodDark, 0.02));
      clip.add(at(box(0.22, 0.26, 0.01, '#ffffff'), 0, -0.02, 0.02));
      clip.add(at(box(0.08, 0.04, 0.03, C.steel), 0, 0.16, 0.02));
      for (let i = 0; i < 3; i++) clip.add(at(box(0.15, 0.015, 0.005, i ? C.steel : C.rose), 0, 0.05 - i * 0.06, 0.03));
      clip.rotation.x = -0.6;
      homama.carry(clip);
      scene.add(homama.root);
    }

    // Speech bubbles: the patient's (left) and Dr. Roji's hints (right)
    const bubble = (tail) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 300;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 }));
      s.renderOrder = 6;
      s.scale.set(1.9, 0.89, 1);
      scene.add(s);
      const o = {
        s,
        k: 0,
        on: false,
        set(name, text, color = C.mintDeep) {
          const c = canvas.getContext('2d');
          const w = canvas.width;
          const h = canvas.height;
          c.clearRect(0, 0, w, h);
          c.fillStyle = '#ffffff';
          c.strokeStyle = color;
          c.lineWidth = 9;
          roundRect(c, 10, 10, w - 20, h - 70, 46);
          c.fill();
          c.stroke();
          c.beginPath();
          const tx = tail > 0 ? w - 150 : 150;
          c.moveTo(tx - 30, h - 64);
          c.lineTo(tx + tail * 40, h - 8);
          c.lineTo(tx + 30, h - 64);
          c.fill();
          c.stroke();
          c.fillRect(tx - 26, h - 70, 52, 12);
          c.fillStyle = color;
          c.font = `700 40px ${FONT}`;
          c.textAlign = 'left';
          c.textBaseline = 'top';
          c.fillText(name, 40, 30);
          c.fillStyle = C.ink;
          c.font = `500 38px ${FONT}`;
          const words = text.split(' ');
          let line = '';
          let y = 84;
          for (const wd of words) {
            const test = line ? `${line} ${wd}` : wd;
            if (c.measureText(test).width > w - 80 && line) {
              c.fillText(line, 40, y);
              line = wd;
              y += 46;
            } else line = test;
          }
          c.fillText(line, 40, y);
          tex.needsUpdate = true;
          this.on = true;
          this.k = 0;
        },
        hide() {
          this.on = false;
        },
        update(dt, pos) {
          this.k = damp(this.k, this.on ? 1 : 0, 10, dt);
          s.material.opacity = this.k;
          s.visible = this.k > 0.02;
          const sc = (0.75 + 0.25 * easeOutBack(clamp(this.k, 0, 1))) * (this.size || 1);
          s.scale.set(1.9 * sc, 0.89 * sc, 1);
          s.position.copy(pos);
        },
      };
      return o;
    };
    const say = bubble(1);
    const hint = bubble(-1);
    let hintT = 0;
    const SAY_AT = new THREE.Vector3();
    const HINT_AT = new THREE.Vector3();
    // Wide phone screens have room at the sides: bigger bubbles, further out and a little lower
    const layout = () => {
      const wide = camera.aspect > 1.85;
      say.size = hint.size = wide ? 1.3 : 1;
      SAY_AT.set(wide ? -2.75 : -2.0, wide ? 1.78 : 2.3, -1.4);
      HINT_AT.set(wide ? 2.55 : 1.75, wide ? 1.85 : 2.35, -1.2);
    };
    // The town's thumbstick is not needed here (everything is a tap)
    const style = document.createElement('style');
    style.textContent = 'body.arena-on #stick, body.arena-on #joy { display: none !important; }';
    document.head.appendChild(style);

    // ---------------------------------------------------------------- patients
    const first = patientById(ctx.opts.patient);
    const pool = PATIENTS.filter((p) => p !== first).sort(() => Math.random() - 0.5);
    const queue = first ? [first] : [];
    for (const p of pool) {
      if (queue.length >= SHIFT) break;
      if (!queue.some((q) => q.symptom === p.symptom)) queue.push(p);
    }
    for (const p of pool) if (queue.length < SHIFT && !queue.includes(p)) queue.push(p);

    const tint = (hex, to, amt) => '#' + new THREE.Color(hex).lerp(new THREE.Color(to), amt).getHexString();
    const sickLook = (p) => ({ ...p.look, skin: p.symptom === 'fever' ? tint(p.look.skin, '#ff9f8f', 0.35) : tint(p.look.skin, '#d9e6c4', 0.45) });
    const SIT = new THREE.Vector3(BX, 0.32, BZ + 0.08);
    const FRONT = new THREE.Vector3(BX, 0, BZ + 0.78);
    const DOOR = new THREE.Vector3(-5.6, 0, -0.75);

    let cur = null; // { p, s, kid, cues, state, t, mistakes, kept: [] }
    let index = -1;
    let helped = 0;
    let mistakes = 0;
    let time = TIME;
    let clockOn = false;
    let over = false;
    const healed = [];

    function addCues(c) {
      const kid = c.kid;
      const sym = c.p.symptom;
      c.cues = {};
      kid.mouth.rotation.z = 0;
      kid.mouth.position.y += 0.02;
      if (sym === 'fever') {
        kid.head.traverse((o) => {
          if (o.isMesh && o.material.isMeshBasicMaterial) {
            o.material.color.set('#ff5a6a');
            o.material.opacity = 0.85;
          }
        });
        const heat = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: canvasTexture(128, 64, (g, w, h) => {
              g.strokeStyle = '#ff7a59';
              g.lineWidth = 7;
              g.lineCap = 'round';
              for (let i = 0; i < 3; i++) {
                g.beginPath();
                for (let x = 0; x <= 16; x++) g.lineTo(24 + i * 38 + Math.sin(x * 0.8) * 6, 56 - x * 3);
                g.stroke();
              }
            }),
            transparent: true,
            depthWrite: false,
          }),
        );
        heat.scale.set(0.36, 0.18, 1);
        heat.position.set(0, 0.74, 0);
        kid.head.add(heat);
        c.cues.heat = heat;
      } else if (sym === 'knee') {
        const scrape = sph(0.05, C.rose, { rough: 0.6 }, 10);
        scrape.scale.set(1.1, 0.7, 0.45);
        kid.legs[0].add(at(scrape, 0, -0.11, 0.05));
        c.cues.scrape = scrape;
      } else if (sym === 'bump') {
        const bump = sph(0.07, '#ff9eb5', { rough: 0.5 }, 12);
        kid.head.add(at(bump, 0.1, 0.52, 0.18));
        c.cues.bump = bump;
      } else if (sym === 'throat') {
        const scarf = k.tor(0.1, 0.045, '#f6907a', Math.PI * 2, { rough: 0.9 }, 18);
        scarf.rotation.x = Math.PI / 2;
        kid.body.add(at(scarf, 0, 0.79, 0));
        c.cues.scarf = scarf;
      } else if (sym === 'wrist') {
        const ring = k.tor(0.055, 0.02, C.rose, Math.PI * 2, undefined, 14);
        ring.rotation.x = Math.PI / 2;
        kid.arms[1].add(at(ring, 0, -0.22, 0));
        c.cues.ring = ring;
      } else if (sym === 'splinter') {
        const sp = cyl(0.008, 0.008, 0.08, '#8a5a3c', 5);
        sp.rotation.z = 0.8;
        kid.arms[0].add(at(sp, 0.03, -0.31, 0.04));
        c.cues.splinter = sp;
      } else if (sym === 'tummy') kid.hands = 'carry';
      if (sym === 'cough' || sym === 'sneeze') c.cues.puffT = 0.5;
    }

    const puffs = [];
    const glow = canvasTexture(64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,0.95)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      scene.add(s);
      puffs.push({ s, life: 0, v: new THREE.Vector3() });
    }
    const puffAt = (pos, n, big) => {
      for (let i = 0; i < n; i++) {
        const q = puffs.find((x) => x.life <= 0) || puffs[0];
        q.life = 1;
        q.s.visible = true;
        q.s.position.copy(pos);
        q.v.set((Math.random() - 0.3) * 0.5, 0.25 + Math.random() * 0.3, 0.5 + Math.random() * 0.4).multiplyScalar(big ? 1.6 : 1);
      }
    };

    const disposeKid = (kid) => {
      kid.root.removeFromParent();
      kid.root.traverse((o) => {
        o.geometry?.dispose();
        if (o.material?.isMeshBasicMaterial || o.material?.isSpriteMaterial) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
    };

    function nextPatient() {
      index++;
      if (index >= queue.length) return endShift(true);
      const p = queue[index];
      const kid = makePerson(ctx.makeKid, p, sickLook(p));
      kid.root.position.copy(DOOR);
      scene.add(kid.root);
      cur = { p, s: SYMPTOMS[p.symptom], kid, state: 'enter', t: 0, mistakes: 0, from: DOOR.clone(), yaw: Math.PI / 2, kept: [] };
      addCues(cur);
      say.hide();
      hud.score(scoreText());
    }

    const scoreText = () => {
      const s = Math.max(0, Math.ceil(time));
      return `Patient ${Math.min(index + 1, SHIFT)} / ${SHIFT} &nbsp; ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };

    // World position of the body part a tool goes to.
    const v = new THREE.Vector3();
    function partPos(c, part, out = new THREE.Vector3()) {
      const kid = c.kid;
      kid.root.updateMatrixWorld(true);
      if (part === 'mouth') return kid.mouth.getWorldPosition(out).add(v.set(0, 0, 0.12));
      if (part === 'chest') return kid.body.localToWorld(out.set(0, 0.6, 0.24));
      if (part === 'knee') return kid.legs[0].localToWorld(out.set(0, -0.11, 0.1));
      if (part === 'head') return kid.head.localToWorld(out.set(0.08, 0.56, 0.2));
      if (part === 'wrist') return kid.arms[1].localToWorld(out.set(0, -0.22, 0.08));
      if (part === 'finger') return kid.arms[0].localToWorld(out.set(0.03, -0.31, 0.08));
      return kid.head.getWorldPosition(out);
    }

    function pickTool(i) {
      if (!cur || cur.state !== 'wait' || over) return;
      const tool = tools[i];
      if (!tool || tool.busy) return;
      sound.ui('tap');
      if (tool.id === cur.s.tool) {
        tool.busy = true;
        cur.state = 'treat';
        cur.t = 0;
        cur.tool = tool;
        cur.target = partPos(cur, cur.s.part);
        cur.start = tool.holder.position.clone();
        hint.hide();
        say.hide();
        rojiYaw = -1.25;
        roji.hands = 'hold';
        return;
      }
      tool.shake = 0.6;
      mistakes++;
      cur.mistakes++;
      const ac = sound.ctx;
      if (ac) {
        sound.tone(392, ac.currentTime, 0.18, { type: 'triangle', gain: 0.05 });
        sound.tone(330, ac.currentTime + 0.14, 0.26, { type: 'triangle', gain: 0.05 });
      }
      const nm = cur.p.name;
      hint.set('Dr. Roji', `Not the ${tool.name.toLowerCase()}. ${cur.s.hint.replace('{n}', nm)}`, C.rose);
      hintT = 3.4;
    }

    // Each right tool's little animation while it does its job (k: 0..1 of the action).
    function action(c, kk, t) {
      const tool = c.tool;
      const h = tool.holder;
      const id = tool.id;
      if (id === 'thermometer') {
        h.rotation.set(0, 0.4, Math.sin(t * 20) * 0.05 * (1 - kk));
        if (c.cues.heat) c.cues.heat.material.opacity = 1 - kk;
      } else if (id === 'stethoscope') {
        h.rotation.set(-1.2, 0, 0);
        if (Math.floor(kk * 3) !== c.beat) {
          c.beat = Math.floor(kk * 3);
          if (c.beat < 3) {
            fx.heartsAt(c.target.clone().add(v.set(0, 0.1, 0.1)), 1);
            const ac = sound.ctx;
            if (ac) {
              sound.tone(80, ac.currentTime, 0.12, { gain: 0.25, slideTo: 50 });
              sound.tone(70, ac.currentTime + 0.16, 0.12, { gain: 0.18, slideTo: 45 });
            }
          }
        }
      } else if (id === 'bandage') {
        h.rotation.set(-1.0, 0, 0.3);
        h.scale.setScalar(damp(h.scale.x, 0.55, 6, 1 / 60));
      } else if (id === 'medicine') {
        h.rotation.set(0, 0, Math.sin(kk * Math.PI) * 1.1);
        if (Math.random() < 0.15) fx.burst(c.target.clone(), ['#ff9eb5', '#ffffff', '#ffd166'], 2);
      } else if (id === 'icepack') {
        h.rotation.set(0.3, 0, 0.2);
        if (c.cues.bump) c.cues.bump.scale.setScalar(Math.max(0.01, 1 - kk));
      } else if (id === 'light') {
        h.rotation.set(0, 0.2, 0);
        c.kid.mouth.scale.set(1.3, 1 + Math.sin(kk * Math.PI) * 1.6, 1);
        if (kk > 0.2 && !c.ahh) {
          c.ahh = true;
          say.set(c.p.name, 'Ahhhh...', C.mintDeep);
        }
      } else if (id === 'splint') {
        h.rotation.set(0, 0, -1.3);
        h.scale.setScalar(damp(h.scale.x, 0.6, 6, 1 / 60));
      } else if (id === 'tweezers') {
        h.rotation.set(0, 0, 0.6 + Math.sin(t * 25) * 0.08);
        if (kk > 0.6 && c.cues.splinter && c.cues.splinter.parent !== scene) {
          const wp = c.cues.splinter.getWorldPosition(new THREE.Vector3());
          scene.attach(c.cues.splinter);
          c.cues.splinter.position.copy(wp);
          c.flyOff = c.cues.splinter;
          fx.burst(wp, ['#ffffff', '#ffd166'], 8);
        }
      }
    }

    function heal(c) {
      const keep = c.tool.id;
      c.kid.setLook({ id: c.p.id, ...c.p.look });
      dress(c.kid, c.p);
      c.kid.hands = null;
      c.cues = {};
      if (keep === 'bandage') {
        const b = k.rbox(0.1, 0.03, 0.06, '#f4c7a1', 0.01);
        c.kid.legs[0].add(at(b, 0, -0.11, 0.06));
        b.rotation.x = Math.PI / 2;
      } else if (keep === 'splint') {
        const sp = k.rbox(0.13, 0.05, 0.13, '#9fe0c8', 0.02);
        c.kid.arms[1].add(at(sp, 0, -0.2, 0));
      }
      c.kid.squash = 1.2;
      const head = c.kid.head.getWorldPosition(new THREE.Vector3()).add(v.set(0, 0.5, 0.1));
      fx.heartsAt(head, 6);
      fx.burst(head, ['#ff8fb1', '#ffd166', '#7fd8bf', '#ffffff'], 40);
      sound.ui('good');
      const ac = sound.ctx;
      if (ac) [72, 76, 79, 84].forEach((n, i) => sound.tone(440 * Math.pow(2, (n - 69) / 12), ac.currentTime + 0.1 + i * 0.08, 0.5, { gain: 0.05 }));
      say.set(c.p.name, `${c.s.thanks} Thank you, Dr. Roji!`, C.rose);
      roji.hands = null;
      rojiYaw = -0.45;
      setTimeout(() => roji.emote(me === 'roji' ? 'heart' : 'cheer'), 60);
      if (homama) setTimeout(() => homama.emote('cheer'), 260);
      helped++;
      healed.push(c.p.id);
      try {
        ctx.opts.onCured?.(c.p.id);
      } catch (e) {
        console.error(e);
      }
    }

    function endShift(all) {
      if (over) return;
      over = true;
      clockOn = false;
      say.hide();
      hint.hide();
      let stars;
      if (all) stars = Math.max(1, 3 - (mistakes >= 2) - (mistakes >= 5) - (time < 25));
      else stars = helped >= 3 ? 1 : 0;
      const best = Math.max(stars, ctx.load('best', 0));
      ctx.save('best', best);
      const partnerLine = me === 'roji' ? '<b>Homama:</b> "You were amazing today, Dr. Roji."' : '<b>Roji:</b> "Thank you for helping, Homama. Best team ever."';
      const wrong = mistakes === 0 ? 'Not a single wrong tool!' : `${mistakes} wrong ${mistakes === 1 ? 'tool' : 'tools'} along the way.`;
      fx.burst(new THREE.Vector3(0, 1.6, -1), ['#ffd166', '#ff8fb1', '#7fd8bf', '#ffffff'], 90);
      setTimeout(
        () =>
          ctx.finish(
            all
              ? { win: true, stars, title: stars === 3 ? 'Wonderful shift!' : stars === 2 ? 'Great shift!' : 'Shift complete!', text: `${starsHtml(stars)}<br>Five patients feel better. ${wrong}<br>${partnerLine}`, helped: healed }
              : { win: false, stars, title: 'Time for a break', text: `${starsHtml(stars)}<br>You helped ${helped} of ${SHIFT} patients. The rest can come back after a cup of tea.`, helped: healed },
          ),
        700,
      );
    }

    // ---------------------------------------------------------------- camera
    const LOOK = new THREE.Vector3(0, 1.15, -0.8);
    const camPos = new THREE.Vector3();
    const camLook = LOOK.clone();
    // Far enough that the whole tray fits the width, and the bed and bubbles fit the height
    const fit = () => {
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      return Math.max(4.5, 2.6 / (tan * camera.aspect) + 1.25);
    };
    const dir = new THREE.Vector3(0, 0.45, 1).normalize();

    hud.buttons({ action: null, jump: null });
    hud.hint('Tap a tool or press 1 to 8');
    hud.score(scoreText());
    hud.message('Rounds start!', 1300);
    nextPatient();

    const debug = {
      speed: 1,
      pick: (i) => pickTool(i),
      get state() {
        return cur?.state;
      },
      get index() {
        return index;
      },
      get right() {
        return cur ? TOOLS.findIndex((tl) => tl.id === cur.s.tool) : -1;
      },
      get mistakes() {
        return mistakes;
      },
      set time(v) {
        time = v;
      },
    };
    let hovered = -1;
    // Kid springs (hair, squash) stay stable with small steps, even on a slow frame
    const animate = (kid, dt, t, speed = 0, air = 0) => {
      const n = Math.max(1, Math.ceil(dt / 0.05));
      for (let i = 0; i < n; i++) kid.update(dt / n, t, speed, air, 0);
    };

    return {
      debug,
      update(rdt, t) {
        const dt = rdt * debug.speed;
        // Input
        if (!over) {
          for (let i = 0; i < 8; i++) if (input.pressed(String(i + 1))) pickTool(i);
          if (input.taps().length) {
            const hit = input.pick(hits)[0];
            if (hit) pickTool(hit.object.userData.slot);
          }
          const pt = input.pointer;
          hovered = -1;
          if (!document.body.classList.contains('touch')) {
            const h = input.pick(hits, pt.ndc)[0];
            if (h) hovered = h.object.userData.slot;
          }
        }
        // Clock
        if (clockOn && !over) {
          time -= dt;
          if (time <= 0) {
            time = 0;
            endShift(false);
          }
        }
        if (Math.floor(time * 2) !== Math.floor((time + dt) * 2) || !clockOn) hud.score(scoreText());

        // Patient
        const c = cur;
        if (c && !over) {
          c.t += dt;
          const kid = c.kid;
          let speed = 0;
          let air = 0;
          if (c.state === 'enter') {
            const d = Math.hypot(FRONT.x - kid.root.position.x, FRONT.z - kid.root.position.z);
            if (d > 0.05) {
              speed = 2.2;
              const step = Math.min(d, speed * dt);
              const dx = (FRONT.x - kid.root.position.x) / d;
              const dz = (FRONT.z - kid.root.position.z) / d;
              kid.root.position.x += dx * step;
              kid.root.position.z += dz * step;
              c.yaw = Math.atan2(dx, dz);
            } else {
              c.state = 'hopOn';
              c.t = 0;
              c.from = kid.root.position.clone();
            }
          } else if (c.state === 'hopOn' || c.state === 'hopOff') {
            const on = c.state === 'hopOn';
            const kk = Math.min(1, c.t / 0.5);
            const a = on ? c.from : SIT;
            const b = on ? SIT : FRONT;
            kid.root.position.lerpVectors(a, b, easeOutCubic(kk));
            kid.root.position.y += Math.sin(kk * Math.PI) * 0.4;
            air = Math.sin(kk * Math.PI) * 0.4;
            c.yaw = damp(c.yaw, 0, 12, dt);
            if (kk > 0.5) kid.pose = on ? 'sit' : 'stand';
            if (kk >= 1) {
              kid.squash = 0.8;
              if (on) {
                c.state = 'wait';
                c.t = 0;
                say.set(c.p.name, c.s.line);
                clockOn = true;
                sound.ui('pop');
              } else {
                c.state = 'cheer';
                c.t = 0;
                kid.emote('cheer');
              }
            }
          } else if (c.state === 'wait') {
            if (c.cues.puffT !== undefined) {
              c.cues.puffT -= dt;
              if (c.cues.puffT <= 0) {
                const sneeze = c.p.symptom === 'sneeze';
                c.cues.puffT = sneeze ? 2.6 : 1.7;
                puffAt(partPos(c, 'mouth'), sneeze ? 4 : 2, sneeze);
                kid.squash = sneeze ? 1.18 : 0.92;
                const ac = sound.ctx;
                if (ac) sound.tone(sneeze ? 520 : 220, ac.currentTime, 0.16, { type: 'triangle', gain: 0.03, slideTo: sneeze ? 300 : 160 });
              }
            }
            if (c.mistakes >= 2) {
              const tool = tools.find((tl) => tl.id === c.s.tool);
              tool.ring.material.opacity = 0.5 + Math.sin(t * 6) * 0.35;
            }
          } else if (c.state === 'treat') {
            const tool = c.tool;
            const fly = 0.55;
            const act = 1.5;
            if (c.t < fly) {
              const kk = easeOutCubic(c.t / fly);
              const dest = c.target.clone().add(v.set(0, 0.02, 0.14));
              tool.holder.position.lerpVectors(c.start, dest, kk);
              tool.holder.position.y += Math.sin(kk * Math.PI) * 0.5;
              tool.holder.scale.setScalar(1.55 - kk * 0.6);
            } else if (c.t < fly + act) {
              tool.holder.position.copy(c.target).add(v.set(0, 0.02, 0.14));
              action(c, (c.t - fly) / act, t);
            } else {
              heal(c);
              c.state = 'better';
              c.t = 0;
              tool.back = 0;
              tool.backFrom = tool.holder.position.clone();
            }
          } else if (c.state === 'better') {
            if (c.t > 1.5) {
              c.state = 'hopOff';
              c.t = 0;
            }
          } else if (c.state === 'cheer') {
            if (c.t > 1.4) {
              c.state = 'leave';
              c.t = 0;
              say.hide();
            }
          } else if (c.state === 'leave') {
            speed = 2.6;
            const d = Math.hypot(DOOR.x - kid.root.position.x, DOOR.z - kid.root.position.z);
            const dx = (DOOR.x - kid.root.position.x) / d;
            const dz = (DOOR.z - kid.root.position.z) / d;
            kid.root.position.x += dx * speed * dt;
            kid.root.position.z += dz * speed * dt;
            c.yaw = damp(c.yaw, Math.atan2(dx, dz), 8, dt);
            if (c.t > 0.4 && !c.waved) {
              c.waved = true;
              kid.emote('wave');
            }
            if (d < 0.2 || kid.root.position.x < DOOR.x + 0.1) {
              disposeKid(kid);
              cur = null;
              nextPatient();
            }
          }
          if (cur === c) {
            kid.root.rotation.y = c.yaw;
            animate(kid, dt, t, speed, air);
          }
          if (c.flyOff) {
            c.flyOff.position.add(v.set(0.9 * dt, 1.4 * dt, 0.6 * dt));
            c.flyOff.rotation.z += dt * 8;
          }
        }

        // Tools: hover lift, wrong-pick shake, return after use
        tools.forEach((tl, i) => {
          if (tl.back !== undefined) {
            tl.back += dt / 0.6;
            const kk = Math.min(1, tl.back);
            const keep = tl.id === 'bandage' || tl.id === 'splint';
            if (keep) {
              tl.holder.position.copy(tl.home);
              tl.holder.rotation.set(0, 0, 0);
              tl.holder.scale.setScalar(1.55 * easeOutBack(kk));
            } else {
              tl.holder.position.lerpVectors(tl.backFrom, tl.home, easeOutCubic(kk));
              tl.holder.position.y += Math.sin(kk * Math.PI) * 0.4;
              tl.holder.rotation.set(0, 0, 0);
              tl.holder.scale.setScalar(0.95 + kk * 0.6);
            }
            if (kk >= 1) {
              tl.back = undefined;
              tl.busy = false;
            }
            return;
          }
          if (tl.busy) return;
          tl.lift = damp(tl.lift, hovered === i ? 1 : 0, 12, rdt);
          tl.shake = Math.max(0, tl.shake - rdt);
          const sh = tl.shake > 0 ? Math.sin(tl.shake * 40) * 0.25 * (tl.shake / 0.6) : 0;
          tl.holder.position.set(tl.home.x, tl.home.y + tl.lift * 0.08 + (tl.shake > 0 ? Math.sin((tl.shake / 0.6) * Math.PI) * 0.12 : 0), tl.home.z);
          tl.holder.rotation.set(0, Math.sin(t * 1.2 + i) * 0.06 + tl.lift * 0.3, sh);
          const helping = cur && cur.mistakes >= 2 && cur.state === 'wait' && tl.id === cur.s.tool;
          if (!helping) tl.ring.material.opacity = damp(tl.ring.material.opacity, hovered === i ? 0.75 : 0, 12, rdt);
        });

        // Dr. Roji and Homama
        const ry = roji.root.rotation.y;
        roji.root.rotation.y = ry + (rojiYaw - ry) * Math.min(1, dt * 6);
        animate(roji, dt, t);
        if (homama) animate(homama, dt, t);

        // Bubbles and puffs
        hintT = Math.max(0, hintT - dt);
        if (hintT <= 0 && hint.on) hint.hide();
        layout();
        say.update(rdt, SAY_AT);
        hint.update(rdt, HINT_AT);
        for (const q of puffs) {
          if (q.life <= 0) continue;
          q.life -= dt * 1.4;
          q.s.position.addScaledVector(q.v, dt);
          q.s.scale.setScalar(0.12 + (1 - q.life) * 0.3);
          q.s.material.opacity = Math.max(0, q.life) * 0.8;
          if (q.life <= 0) q.s.visible = false;
        }

        // Camera: fits the bed and the tray, leans in while a tool is at work
        const d = fit();
        const lean = cur && (cur.state === 'treat' || cur.state === 'better') ? 0.12 : 0;
        const want = LOOK.clone().lerp(new THREE.Vector3(BX, 1.25, BZ), lean);
        camLook.x = damp(camLook.x, want.x, 3, rdt);
        camLook.y = damp(camLook.y, want.y, 3, rdt);
        camLook.z = damp(camLook.z, want.z, 3, rdt);
        camPos.copy(camLook).addScaledVector(dir, d * (1 - lean * 0.6));
        camPos.x += Math.sin(t * 0.3) * 0.06;
        camera.position.copy(camPos);
        camera.lookAt(camLook);
      },
      dispose() {
        hud.hint('');
        style.remove();
      },
    };
  },
};
