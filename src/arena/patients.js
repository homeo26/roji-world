import * as THREE from 'three';
import { kit, C, heartMug } from '../places/hospital/models.js';
import { STAFF } from '../places/hospital/roster.js';
import { makePerson } from '../places/hospital/people.js';
import { buildRooms } from './patients/rooms.js';
import { createUI, starsHtml } from './patients/ui.js';
import { Monitor, Board, surgeryPic } from './patients/art.js';
import { STEPS, NURSE_STEPS, Cursor } from './patients/steps.js';
import { PEOPLE, CASES, makeShift, caseStars, shiftStars, unlocked, UNLOCKS, HANDOFF, TREATS } from './patients/cases.js';
import * as M from './patients/models.js';
import { probe } from './patients/probe.js';

// Dr. Roji's Shift: a day at Sunny Hill Hospital in four rooms. Patients wait in reception and Dr. Roji picks
// who needs her first (triage); in the exam room she listens, looks, taps and reads X-rays, then treats
// (a plaster cast, stitches, a plaster, the right dose of medicine, a vaccine); the hardest cases go to the
// surgery theatre (scrub in, gown on, a sleepy countdown, a steady incision, tweezers that must not touch
// the edges, a heart monitor to keep steady, stitches and a heart sticker); everyone ends in the recovery
// room with balloons and their family. Shifts mix the cases and get busier, with twists. Played as Homama,
// he is Dr. Roji's nurse: he hands her the tools and does the simple steps while she does the doctor's work.

const AGES = { lina: 7, yousef: 9, nour: 6, adam: 8, mira: 5, zaid: 9, leo: 4, salma: 7, omar: 10, rana: 8, karim: 9, dana: 6, tala: 3 };
const DIR = new THREE.Vector3(0.12, 0.38, 1).normalize();
const STEP_LINE = { thermo: 'Exam: checking the temperature', steth: 'Exam: listening with the stethoscope', light: 'Exam: shining the little light', reflex: 'Exam: checking reflexes', xray: 'Exam: reading the X-ray', clean: 'Exam: cleaning a scrape', choice: 'Exam: picking the treatment', cast: 'Treatment: a plaster cast', stitches: 'Treatment: stitches', bandage: 'Treatment: a plaster', dose: 'Treatment: the right dose', calm: 'Calming a nervous patient', vaccine: 'Treatment: a vaccine', scrub: 'Surgery: scrubbing in', gown: 'Surgery: gown and mask on', sleep: 'Surgery: sleepy countdown', incise: 'Surgery: the incision', remove: 'Surgery: taking it out', vitals: 'Surgery: keeping the heart steady', close: 'Surgery: closing up', sticker: 'Surgery: a heart sticker', triage: 'Triage: who is next' };

export default {
  id: 'patients',
  title: "Dr. Roji's Shift",
  tagline: 'Exams, surgeries and lots of smiles',

  async start(ctx) {
    const { scene, camera, util, hud, input, sound, fx } = ctx;
    const { damp, lerp } = util;
    const me = ctx.me;
    const nurse = me === 'homama';
    const k = kit();
    const env = ctx.env.indoor({ color: '#f6e3d6' });
    env.hemi.intensity = 1.7;
    env.sun.shadow.mapSize.set(1024, 1024);
    let alive = true;
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(() => alive && fn(), ms));

    // ---------------------------------------------------------------- saved progress
    const totalStars0 = ctx.load('stars', 0);
    const shiftN = window.__patientsShift || ctx.load('shifts', 0) + 1; // the test hook may force a shift number
    const plaques0 = ctx.load('plaque', 0);
    const have = unlocked(totalStars0);
    const r = util.rng((ctx.online.seed ^ (shiftN * 7919)) >>> 0 || 1);
    const love = { note: !nurse && (shiftN === 1 || r() < 0.5), coffee: !nurse && r() < 0.6, sign: !nurse && r() < 0.7, ...(window.__patientsLove || {}) };
    if (love.note && love.coffee && love.sign) love.sign = false;

    // ---------------------------------------------------------------- rooms
    const rooms = buildRooms(ctx, k, { gold: have.has('gold'), heartLamp: have.has('heartlamp'), note: love.note });
    if (plaques0 > 0) rooms.reception.plaqueSpot.add(M.plaque(k, plaques0));
    const bin = new THREE.Group();
    bin.visible = false;
    scene.add(bin);
    const monitor = new Monitor(rooms.theatre.monitor.userData.screen);
    monitor.draw();
    const softTex = util.canvasTexture(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.7)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    });

    // ---------------------------------------------------------------- sounds
    const ac = () => sound.ctx;
    const tone = (f, at, dur, o) => {
      const a = ac();
      if (a) sound.tone(f, a.currentTime + at, dur, o);
    };
    const sfx = {
      good: () => sound.ui('good'),
      bad: () => (tone(392, 0, 0.16, { type: 'triangle', gain: 0.05 }), tone(330, 0.12, 0.22, { type: 'triangle', gain: 0.05 })),
      pop: () => sound.ui('pop'),
      tick: () => tone(1500, 0, 0.03, { gain: 0.02 }),
      swoosh: () => sound.ui('swoosh'),
      beep: (n = 1) => {
        for (let i = 0; i < n; i++) tone(1760, i * 0.16, 0.08, { gain: 0.05 });
      },
      listen(spot, near) {
        const g = 0.03 + near * near * 0.3;
        if (spot === 'rumble') for (let i = 0; i < 4; i++) tone(160 + Math.random() * 220, i * 0.05, 0.05, { type: 'square', gain: g * 0.12 });
        else if (spot === 'gurgle') tone(320, 0, 0.3, { gain: g * 0.6, slideTo: 110 });
        else if (spot === 'whistle') tone(1100, 0, 0.25, { gain: g * 0.25, slideTo: 1500 });
        tone(80, 0, 0.12, { gain: g, slideTo: 50 });
        tone(70, 0.18, 0.12, { gain: g * 0.7, slideTo: 45 });
      },
      found(spot) {
        sfx.listen(spot, 1);
        sfx.chime(3);
      },
      chime: (n = 1) => [72, 76, 79, 84].slice(0, Math.max(1, Math.min(4, n + 1))).forEach((m, i) => tone(440 * 2 ** ((m - 69) / 12), i * 0.07, 0.4, { gain: 0.04 })),
      boing: () => tone(220, 0, 0.3, { type: 'triangle', gain: 0.09, slideTo: 660 }),
      sparkle: () => [88, 91, 96].forEach((m, i) => tone(440 * 2 ** ((m - 69) / 12), i * 0.05, 0.2, { gain: 0.025 })),
      stitch: (n) => tone(500 + n * 60, 0, 0.08, { type: 'triangle', gain: 0.05 }),
      layer: (n) => (sound.ui('swoosh'), tone(523 + n * 130, 0.05, 0.25, { gain: 0.05 })),
      gulp: () => tone(300, 0, 0.18, { gain: 0.08, slideTo: 150 }),
      alarm: (up) => (tone(up ? 880 : 520, 0, 0.12, { type: 'square', gain: 0.025 }), tone(up ? 990 : 440, 0.16, 0.12, { type: 'square', gain: 0.025 })),
      buzz: () => tone(110, 0, 0.22, { type: 'sawtooth', gain: 0.06 }),
      pick: () => tone(1200, 0, 0.05, { type: 'triangle', gain: 0.05 }),
      plop: () => tone(700, 0, 0.2, { gain: 0.07, slideTo: 220 }),
      soft: () => tone(523, 0, 0.18, { gain: 0.04 }),
      cut: () => tone(2400, 0, 0.03, { gain: 0.012 }),
      count: (i) => tone(660 - i * 50, 0, 0.35, { gain: 0.05 }),
      monitor: () => tone(988, 0, 0.07, { gain: 0.025 }),
      siren: () => {
        for (let i = 0; i < 6; i++) tone(i % 2 ? 960 : 720, i * 0.32, 0.3, { type: 'triangle', gain: 0.05 });
      },
      squeak: () => tone(1300, 0, 0.12, { type: 'triangle', gain: 0.04, slideTo: 1800 }),
      whistle: () => tone(1500, 0, 0.3, { gain: 0.03, slideTo: 1100 }),
    };
    monitor.beat = () => current === 'theatre' && sfx.monitor();

    // ---------------------------------------------------------------- people
    const prep = (kid, shadow = false) => {
      kid.batch?.();
      if (!shadow) kid.root.traverse((o) => o.isMesh && (o.castShadow = false));
      scene.add(kid.root);
      return kid;
    };
    const roji = prep(ctx.makeKid('roji'), true);
    const homama = prep(ctx.makeKid('homama'), true);
    const maya = prep(makePerson(ctx.makeKid, STAFF.maya));
    maya.root.position.copy(rooms.reception.spots.maya);
    const actors = new Map(); // kid -> { kid, room, walk, speed, yaw, air, over }
    const actor = (kid, room) => {
      const a = actors.get(kid) || { kid, room, walk: null, yaw: 0, speed: 0 };
      a.room = room;
      actors.set(kid, a);
      kid.root.visible = room === current;
      return a;
    };
    let current = 'reception';
    actor(roji, 'reception');
    actor(homama, nurse ? 'reception' : 'none');
    actor(maya, 'reception');
    const place = (kid, pos, yaw = 0, room = current) => {
      const a = actor(kid, room);
      kid.root.position.copy(pos);
      a.yaw = yaw;
      kid.root.rotation.set(0, yaw, 0);
      a.walk = null;
      return a;
    };
    const walkTo = (kid, to, speed = 2.2) =>
      new Promise((res) => {
        const a = actors.get(kid);
        a.walk = { to: to.clone(), speed, res };
      });
    // A kid who leaves: free its own geometry (materials are shared and cached)
    const disposeKid = (kid) => {
      actors.delete(kid);
      kid.root.removeFromParent();
      kid.root.traverse((o) => {
        o.geometry?.dispose();
        if (o.material && !Array.isArray(o.material) && (o.material.isMeshBasicMaterial || o.material.isSpriteMaterial) && !o.material.map) o.material.dispose();
      });
    };

    // ---------------------------------------------------------------- the UI and the camera
    const ui = createUI({ camera, sound });
    const bubbles = {};
    for (const who of ['roji', 'patient', 'homama', 'other']) bubbles[who] = { b: ui.bubble(), ttl: 0, kid: null, side: who === 'roji' ? 'right' : 'left' };
    for (const [who, b] of Object.entries(bubbles)) b.b.a.side = b.side;
    const style = document.createElement('style');
    style.textContent = 'body.arena-on #stick, body.arena-on #joy { display: none !important; }';
    document.head.appendChild(style);

    const cam = {
      pos: new THREE.Vector3(0, 4, 8),
      look: new THREE.Vector3(),
      goalPos: new THREE.Vector3(),
      goalLook: new THREE.Vector3(),
      want: null,
      rate: 3.2,
      set(look, h, w, dir = DIR) {
        this.want = { look: look.clone(), h, w, dir: dir.clone().normalize() };
        return this.solve();
      },
      solve() {
        const { look, h, w, dir } = this.want;
        const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const short = window.innerHeight < 520 ? 1.14 : 1.04;
        const dist = Math.max((h * short) / 2 / tan, w / 2 / (tan * camera.aspect));
        this.goalLook.copy(look);
        this.goalPos.copy(look).addScaledVector(dir, dist);
        return { pos: this.goalPos, dist };
      },
      snap() {
        this.solve();
        this.pos.copy(this.goalPos);
        this.look.copy(this.goalLook);
      },
      update(dt) {
        if (!this.want) return;
        this.solve();
        const kk = 1 - Math.exp(-this.rate * dt);
        this.pos.lerp(this.goalPos, kk);
        this.look.lerp(this.goalLook, kk);
        camera.position.copy(this.pos);
        camera.lookAt(this.look);
      },
    };
    const roomView = (id) => {
      const v = rooms[id].view;
      const look = v.look.clone();
      if (id === 'recovery') look.x += camera.aspect > 1.3 ? 0.9 : 0.3;
      cam.set(look, v.h, v.w);
    };

    // ---------------------------------------------------------------- the patient
    let patient = null;
    const tint = (hex, to, amt) => '#' + new THREE.Color(hex).lerp(new THREE.Color(to), amt).getHexString();
    function makePatient(entry) {
      const person = PEOPLE[entry.who];
      const kid = prep(makePerson(ctx.makeKid, person));
      if (person.small) kid.root.scale.setScalar(0.88);
      const P = {
        entry,
        person,
        kid,
        name: person.name,
        look: person.look,
        age: person.grown ? 'grown-up' : AGES[person.id] ?? 7,
        over: { mouth: 0, kick: 0, armOut: 0, nervous: entry.nervous ? 1 : 0, cradle: 0, ear: 0, tummy: 0 },
        armK: 0,
        keep: [],
        keepTheatre: [],
        cues: [],
        castColor: have.has('rainbow') ? '#ffffff' : [person.look.fav, person.look.top, '#8fd3ff'].find((c) => c && c !== '#ffffff') || '#8fd3ff',
        qs: [],
        lying: false,
        part(name) {
          const kd = this.kid;
          kd.root.updateMatrixWorld(true);
          const v = new THREE.Vector3();
          if (name === 'mouth') return kd.mouth.getWorldPosition(v);
          if (name === 'head') return kd.head.localToWorld(v.set(0, 0.29, 0));
          if (name === 'eyes') return kd.head.localToWorld(v.set(0, 0.26, 0.2));
          if (name === 'ear') return kd.head.localToWorld(v.set(0.28, 0.27, 0.02));
          if (name === 'forehead') return kd.head.localToWorld(v.set(0.04, 0.47, 0.22));
          if (name === 'chest') return kd.body.localToWorld(v.set(0, 0.56, 0.18));
          if (name === 'knee') return kd.legs[0].localToWorld(v.set(0, -0.1, 0.07));
          if (name === 'scrape') return kd.legs[0].localToWorld(v.set(0, -0.1, 0.066));
          if (name === 'shin') return kd.legs[0].localToWorld(v.set(0, -0.15, 0));
          if (name === 'forearm') return kd.arms[0].localToWorld(v.set(0, -0.18, 0));
          if (name === 'elbow' || name === 'elbowScrape') return kd.arms[0].localToWorld(v.set(0, -0.15, 0.05));
          if (name === 'upperArm') return kd.arms[0].localToWorld(v.set(0, -0.07, 0.07));
          return kd.head.getWorldPosition(v);
        },
        // Arm and face overrides on top of the kid's own animation
        update(dt, t = 0) {
          const kd = this.kid;
          const o = this.over;
          this.armK = dt ? damp(this.armK, o.armOut, 7, dt) : o.armOut;
          const a = this.armK;
          if (a > 0.001) {
            const arm = kd.arms[0];
            arm.rotation.x = lerp(arm.rotation.x, -0.15, a);
            arm.rotation.y = lerp(arm.rotation.y, 0, a);
            arm.rotation.z = lerp(arm.rotation.z, 1.42, a);
          }
          if (this.lying) {
            kd.arms[0].rotation.set(0, 0, 0.08);
            kd.arms[1].rotation.set(0, 0, -0.08);
          } else {
            if (o.cradle && a < 0.2) kd.arms[0].rotation.set(-1.25, 0, -0.55);
            if (o.ear) kd.arms[1].rotation.set(-0.4, 0, -2.25);
            if (o.tummy) {
              kd.arms[0].rotation.set(-0.95, 0, -0.3);
              kd.arms[1].rotation.set(-0.95, 0, 0.3);
            }
          }
          if (o.dangle) for (const lg of kd.legs) lg.rotation.x = -0.12;
          if (o.kick) kd.legs[0].rotation.x += -0.9 * o.kick;
          kd.mouth.scale.set(1 + o.mouth * 0.7, 1 + o.mouth * 2.6, 1);
          if (o.nervous) {
            kd.body.rotation.z += Math.sin(t * 34) * 0.025 * o.nervous;
            kd.mouth.rotation.z = Math.PI * (1 - o.nervous) + 0;
          }
          if (this.lying) kd.blob.visible = false;
          kd.root.updateMatrixWorld(true);
        },
      };
      addCues(P);
      return P;
    }

    // How the hurt shows while they wait
    function addCues(P) {
      const kd = P.kid;
      const cue = P.entry.c.cue;
      const add = (o, parent) => (parent.add(o), P.cues.push(o), o);
      if (cue === 'fever') {
        kd.head.traverse((o) => o.isMesh && o.material.isMeshBasicMaterial && o.material.transparent && (o.material = o.material.clone(), o.material.color.set('#ff4d63'), (o.material.opacity = 0.85)));
        const heat = new THREE.Sprite(new THREE.SpriteMaterial({ map: heatTex(), transparent: true, depthWrite: false }));
        heat.scale.set(0.36, 0.18, 1);
        heat.position.set(0, 0.74, 0);
        add(heat, kd.head);
      } else if (cue === 'knee') {
        const s = k.sph(0.05, '#ef5b6f', { rough: 0.6 }, 10);
        s.scale.set(1.1, 0.7, 0.45);
        add(k.at(s, 0, -0.1, 0.055), kd.legs[0]);
      } else if (cue === 'elbow' || cue === 'cut') {
        const s = cue === 'cut' ? k.cap(0.008, 0.07, '#e8607a') : k.sph(0.04, '#ef5b6f', { rough: 0.6 }, 10);
        if (cue === 'cut') s.rotation.z = 1.2;
        else s.scale.set(1, 0.7, 0.5);
        add(k.at(s, 0, -0.15, 0.045), kd.arms[0]);
      } else if (cue === 'arm') {
        P.over.cradle = 1;
        const s = k.sph(0.055, '#ff9eb5', { rough: 0.6 }, 10);
        s.scale.set(1, 1.4, 1);
        add(k.at(s, 0, -0.19, 0), kd.arms[0]);
      } else if (cue === 'leg') {
        const s = k.sph(0.068, '#ff9eb5', { rough: 0.6 }, 10);
        s.scale.set(1, 1.3, 1);
        add(k.at(s, 0, -0.17, 0), kd.legs[0]);
      } else if (cue === 'head') {
        add(k.at(k.sph(0.06, '#ff9eb5', { rough: 0.5 }, 12), 0.1, 0.52, 0.18), kd.head);
      } else if (cue === 'ear') P.over.ear = 1;
      else if (cue === 'tummy' || cue === 'squeak' || cue === 'whistle') P.over.tummy = 1;
      if (cue === 'cough' || cue === 'squeak' || cue === 'whistle') P.puffT = 1;
    }
    let heatT = null;
    function heatTex() {
      if (heatT && heatT.image.width > 1) return heatT;
      heatT = util.canvasTexture(128, 64, (g) => {
        g.strokeStyle = '#ff7a59';
        g.lineWidth = 7;
        g.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          for (let x = 0; x <= 16; x++) g.lineTo(24 + i * 38 + Math.sin(x * 0.8) * 6, 56 - x * 3);
          g.stroke();
        }
      });
      return heatT;
    }
    function heal(P) {
      for (const o of P.cues) bin.add(o);
      P.cues = [];
      P.over.cradle = P.over.ear = P.over.tummy = P.over.nervous = 0;
      P.puffT = undefined;
      P.kid.head.traverse((o) => o.isMesh && o.material.isMeshBasicMaterial && o.material.transparent && o.material.color.getHexString() === 'ff4d63' && (o.material.color.set('#ff8fa0'), (o.material.opacity = 0.55)));
      P.kid.squash = 1.2;
      const head = P.part('head').add(new THREE.Vector3(0, 0.5, 0));
      fx.heartsAt(head, 5);
      fx.burst(head, ['#ff8fb1', '#ffd166', '#7fd8bf', '#ffffff'], 36);
      sound.ui('good');
      try {
        if (PEOPLE[ctx.opts.patient] && P.person.id === ctx.opts.patient) ctx.opts.onCured?.(P.person.id);
      } catch (e) {
        console.error(e);
      }
    }

    // Cough puffs and squeaks while a patient is poorly
    const puffs = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      scene.add(s);
      puffs.push({ s, life: 0, v: new THREE.Vector3() });
    }
    const puffAt = (pos, n) => {
      for (let i = 0; i < n; i++) {
        const q = puffs.find((x) => x.life <= 0) || puffs[0];
        q.life = 1;
        q.s.visible = true;
        q.s.position.copy(pos);
        q.v.set((Math.random() - 0.3) * 0.5, 0.25 + Math.random() * 0.3, 0.5 + Math.random() * 0.4);
      }
    };

    // ---------------------------------------------------------------- the game object steps use
    const debug = { speed: 1, auto: false };
    const hv = new THREE.Vector3();
    const G = {
      THREE,
      scene,
      camera,
      k,
      ui,
      fx,
      input,
      sound,
      sfx,
      rooms,
      roji,
      homama,
      nurse,
      bin,
      cam,
      monitor,
      softTex,
      gold: have.has('gold'),
      rainbow: have.has('rainbow'),
      boost: false,
      r,
      autoStep: false,
      get player() {
        return nurse ? homama : roji;
      },
      get patient() {
        return patient;
      },
      get auto() {
        return debug.auto || G.autoStep;
      },
      get touch() {
        return document.body.classList.contains('touch');
      },
      place,
      frameAt(look, h, w, dir) {
        return cam.set(look, h, w, dir);
      },
      // The patient and the doctor together
      frameMedium(s = 1) {
        const p = patient.kid.root.position;
        const rp = roji.root.position;
        const c = new THREE.Vector3(p.x * 0.6 + rp.x * 0.4, 0.95, p.z * 0.6 + rp.z * 0.4);
        return cam.set(c, 2.05 * s, 3.0 * s, new THREE.Vector3(0.05, 0.3, 1));
      },
      frameOp() {
        return cam.set(G.op.anchor.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 0.02)), 0.44, 0.66, new THREE.Vector3(0, 1, 0.62));
      },
      frameMonitor() {
        const m = rooms.theatre.spots.monitor;
        const h = patient.part('head');
        return cam.set(new THREE.Vector3(m.x - 0.85, 1.2, m.z + 0.6), 1.45, 2.6, new THREE.Vector3(0.05, 0.3, 1));
      },
      placeTeam() {
        const s = rooms.theatre.spots;
        place(roji, s.roji, 0, 'theatre');
        if (nurse) place(homama, s.homama, -0.2, 'theatre');
      },
      say(who, text, kind) {
        const b = bubbles[who] || bubbles.other;
        const kid = who === 'roji' ? roji : who === 'homama' ? homama : who === 'patient' ? patient?.kid : null;
        if (!kid) return;
        b.kid = kid;
        const col = who === 'roji' ? C.rose : who === 'homama' ? '#3f7bf0' : C.mintDeep;
        const nm = who === 'roji' ? (nurse ? 'Dr. Roji' : 'Roji') : who === 'homama' ? (nurse ? 'Nurse Homama' : 'Homama') : patient.name;
        b.b.say(nm, kind === 'big' ? `<span style="font-size:1.4em">${text}</span>` : text, col);
        b.ttl = 3.4;
      },
      word(text, at, color, small) {
        ui.word(text, at, color, small);
      },
      setHint(h, keys) {
        hud.title(stepTitle, h);
        hud.hint(keys || '');
      },
      find(text) {
        if (patient) {
          patient.found = patient.found || [];
          patient.found.push(text);
        }
      },
      showNotes() {
        ui.notes(`${patient.name}'s chart`, patient.found?.length ? patient.found : ['Feeling poorly']);
      },
      showItems(o) {
        if (!G.op) return;
        G.op.items.forEach((m) => {
          m.visible = o > 0.4;
          m.scale.setScalar(1.35 * Math.min(1, Math.max(0, (o - 0.4) / 0.6)) + 0.001);
        });
      },
      op: null,
    };
    const cursor = new Cursor(G);
    G.cursor = cursor;

    // ---------------------------------------------------------------- waits and steps
    const waits = [];
    const wait = (s) => new Promise((res) => waits.push({ t: s, res }));
    let step = null;
    let stepTitle = '';
    let stepRes = null;
    let afterT = 0;
    function runStep(type, spec = {}) {
      const S = STEPS[type];
      const st = new S(G, spec);
      step = st;
      stepTitle = st.title;
      const doc = nurse && !NURSE_STEPS.has(type);
      hud.title(doc ? `Dr. Roji: ${st.title.charAt(0).toLowerCase()}${st.title.slice(1)}` : st.title, doc ? 'Nurse Homama watches and helps' : st.hint);
      hud.hint(doc ? '' : st.keys || '');
      G.autoStep = doc;
      ctx.online.progress(STEP_LINE[type] || st.title);
      st.enter();
      afterT = 0.65;
      return new Promise((res) => (stepRes = res));
    }
    function endStep() {
      const st = step;
      st.exit();
      step = null;
      G.autoStep = false;
      stepRes?.(st);
    }
    // A doctor step: played by Dr. Roji when Homama is the nurse (after he hands her the tool)
    async function doStep(type, spec = {}) {
      if (nurse && !NURSE_STEPS.has(type)) {
        if (type === 'choice') {
          hud.title('Dr. Roji decides', 'Nurse Homama listens');
          G.frameMedium();
          G.say('roji', `What we found tells me: ${TREATS[patient.entry.c.treat].name.toLowerCase()}.`);
          await wait(1.8);
          return;
        }
        const h = await runStep('handoff', { tool: HANDOFF[type] });
        score(h.q);
        await runStep(type, spec);
        return;
      }
      const st = await runStep(type, spec);
      if (st.scored) score(st.q);
    }
    let points = 0;
    function score(q) {
      patient?.qs.push(q);
      points += Math.round(q * 100);
      ctx.online.score(points);
      badge();
    }

    // ---------------------------------------------------------------- the shift
    const shift = makeShift(shiftN, r, { first: PEOPLE[ctx.opts.patient] ? ctx.opts.patient : null, have });
    // Test hook: window.__patientsCases = ['toy', 'cut', ...] plays exactly those cases
    if (Array.isArray(window.__patientsCases)) {
      const used = new Set();
      shift.cases = window.__patientsCases.map((id) => {
        const c = CASES.find((x) => x.id === id);
        const who = c.who.find((w) => !used.has(w)) || c.who[0];
        used.add(who);
        return { c, who, emergency: !!window.__patientsSiren && c.kind === 'surgery', pair: false, nervous: !!c.nervous };
      });
      if (window.__patientsPair && shift.cases.length > 2) {
        shift.cases[1].pair = true;
        shift.cases[2].pairWith = true;
      }
    }
    const N = shift.cases.length;
    let doneCount = 0;
    const results = [];
    const badge = () => hud.score(`Case ${Math.min(N, doneCount + 1)} / ${N} &nbsp;<span style="color:#e0a800">${points}</span>`);
    hud.buttons({ action: null, jump: null, stick: false });
    badge();

    // Seats in reception
    const seats = rooms.reception.spots.seats.map(() => null);
    const queue = shift.cases.slice();
    // Opened from a ward bed: that patient is seen first, without triage
    const wardFirst = PEOPLE[ctx.opts.patient] && queue[0]?.who === ctx.opts.patient ? queue.shift() : null;
    const waiting = [];
    async function arrive(entry) {
      const P = makePatient(entry);
      const i = Math.max(0, seats.findIndex((s) => !s));
      seats[i] = P;
      P.seat = i;
      const door = rooms.reception.spots.door;
      place(P.kid, door, 0, 'reception');
      const seat = rooms.reception.spots.seats[i];
      waiting.push(P);
      await walkTo(P.kid, seat.clone().add(new THREE.Vector3(0, 0, 0.45)), 2.4);
      P.kid.pose = 'sit';
      place(P.kid, seat.clone().add(new THREE.Vector3(0, 0.17, 0.02)), 0, 'reception');
      P.kid.squash = 0.85;
      return P;
    }
    async function fillWaiting() {
      const want = Math.min(shift.room, 4);
      const arrivals = [];
      while (waiting.length + arrivals.length < want) {
        const i = queue.findIndex((e) => !e.emergency && !e.pairWith);
        if (i < 0) break;
        const e = queue[i];
        const twin = e.pair ? queue[i + 1] : null;
        if (twin && waiting.length + arrivals.length + 2 > 4) break;
        queue.splice(i, twin ? 2 : 1);
        e.urgNow = Math.max(e.c.urg, twin?.c.urg || 0);
        arrivals.push(e);
        if (twin) {
          twin.urgNow = e.urgNow;
          arrivals.push(twin);
        }
      }
      const ps = [];
      for (const [j, e] of arrivals.entries()) {
        ps.push(wait(j * 0.5).then(() => arrive(e)));
      }
      await Promise.all(ps);
    }
    const ROOM_LINE = { reception: 'Patients are waiting', exam: 'Hands-on check-up', theatre: 'Surgery time', recovery: 'Feeling better' };
    async function toRoom(id, setup) {
      ui.fade(true, `${rooms[id].name}`);
      hud.title(rooms[id].name, ROOM_LINE[id]);
      hud.hint('');
      await wait(0.4);
      if (!alive) return;
      for (const rm of Object.values(rooms)) rm.group.visible = rm.id === id;
      current = id;
      for (const a of actors.values()) a.kid.root.visible = a.room === id;
      env.sun.position.set(rooms[id].x - 4, 9, 6);
      env.sun.target.position.set(rooms[id].x, 0, -1);
      for (const b of Object.values(bubbles)) b.b.hide();
      setup?.();
      cam.snap();
      await wait(0.15);
      ui.fade(false);
    }
    const bedPos = (bed) => (bed === 'B' ? rooms.exam.spots.bedB : rooms.exam.spots.bedA);

    async function examCase(P) {
      patient = P;
      const bed = bedPos(P.bed);
      P.kid.pose = 'sit';
      P.over.dangle = 1;
      place(P.kid, bed.clone().add(new THREE.Vector3(0, 0.32, 0.4)), 0, 'exam');
      const sideX = P.bed === 'B' ? -1 : 1;
      place(roji, bed.clone().add(new THREE.Vector3(1.1 * sideX, 0, 0.3)), -1.15 * sideX, 'exam');
      roji.hands = 'hold';
      if (nurse) place(homama, bed.clone().add(new THREE.Vector3(2.0 * sideX, 0, 0.3)), -1.2 * sideX, 'exam');
      G.frameMedium();
      hud.title(`${P.name} is here`, P.entry.c.chips.map((c) => c[1]).join(', '));
      G.say('patient', P.entry.c.line);
      await wait(1.6);
      if (P.entry.nervous && !P.calm) {
        G.say('roji', `${P.name} is a little nervous. Let us breathe together first.`);
        await wait(0.8);
        await doStep('calm');
      }
      for (const s of P.entry.c.steps) {
        if (s.type === 'xray') {
          G.frameMedium();
          G.say('roji', 'Let us take a picture of the inside.');
          await wait(0.9);
        }
        await doStep(s.type, s);
        P.over.armOut = 0;
      }
      await doStep('choice');
      const t = P.entry.c.treat;
      if (t === 'surgery') return 'surgery';
      const spec = { limb: P.entry.c.limb, part: P.entry.c.part };
      if (t === 'vaccine' && !P.calm && !P.person.grown) {
        G.say('roji', `A tiny pinch is easier when we are calm. Breathe with me, ${P.name}.`);
        await wait(1.0);
        await doStep('calm');
      }
      await doStep(t, spec);
      P.over.armOut = 0;
      heal(P);
      G.frameMedium();
      G.say('patient', `${P.entry.c.thanks} Thank you, Dr. Roji!`);
      roji.hands = null;
      later(80, () => roji.emote(nurse ? 'cheer' : 'heart'));
      if (nurse) later(300, () => homama.emote('cheer'));
      await wait(1.8);
      return 'done';
    }

    async function surgeryCase(P, emergency) {
      patient = P;
      const s = rooms.theatre.spots;
      await toRoom('theatre', () => {
        if (emergency) {
          rooms.theatre.alarm.material.emissiveIntensity = 1.2;
        }
        layDown(P);
        place(roji, s.sink.clone().add(new THREE.Vector3(0, 0, -0.55)), 0, 'theatre');
        if (nurse) place(homama, s.sink.clone().add(new THREE.Vector3(1.3, 0, 0.3)), -0.6, 'theatre');
        roomView('theatre');
      });
      monitor.on = true;
      monitor.hr = 104;
      monitor.asleep = false;
      if (emergency) ui.banner('Emergency surgery: no time to lose!', 'red', 2600);
      G.say('roji', `To the theatre! We will take out ${P.entry.c.what}.`);
      await wait(1.4);
      await doStep('scrub');
      await doStep('gown');
      G.placeTeam();
      await doStep('sleep');
      G.placeTeam();
      await doStep('incise');
      await doStep('remove');
      await doStep('vitals');
      await doStep('close');
      await doStep('sticker');
      // Wake up happy
      for (const o of P.keepTheatre) bin.add(o);
      P.asleep = false;
      monitor.asleep = false;
      rooms.theatre.alarm.material.emissiveIntensity = 0.1;
      P.kid.pose = 'stand';
      heal(P);
      cam.set(P.part('head').add(new THREE.Vector3(0.3, 0.1, 0)), 1.2, 1.7, new THREE.Vector3(0.2, 0.9, 0.75));
      G.say('patient', 'Is it over? I feel great!');
      sceneName = 'wake';
      ctx.online.progress('Surgery: the patient wakes up happy');
      await wait(2.0);
    }

    // The patient lies on the operating table under a soft drape, with the tummy window on top
    function layDown(P) {
      const t = rooms.theatre.spots.table;
      const kd = P.kid;
      const sc = kd.root.scale.x;
      kd.pose = 'stand';
      P.lying = true;
      P.over.dangle = 0;
      // Only the head shows above the drape
      P.hiddenParts = kd.body.children.filter((c) => c !== kd.head && c.visible);
      for (const c of P.hiddenParts) c.visible = false;
      const rootX = t.x + 0.72;
      place(kd, new THREE.Vector3(rootX, 0.89 + 0.3 * sc, t.z), 0, 'theatre');
      kd.root.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      actors.get(kd).lying = true;
      const op = {};
      const drapeTop = 0.89 + 0.4 * sc;
      const drape = k.rbox(0.95, drapeTop - 0.86, 0.82, '#7fd3c0', 0.2, { rough: 0.9 });
      drape.position.set(rootX - 0.42, (drapeTop + 0.86) / 2, t.z);
      scene.add(drape);
      op.drape = drape;
      op.anchor = new THREE.Object3D();
      op.anchor.position.set(rootX - 0.5 * sc, drapeTop + 0.004, t.z);
      op.anchor.rotation.x = -Math.PI / 2;
      scene.add(op.anchor);
      op.board = new Board(0.5, 0.36, 768, { basic: false });
      op.anchor.add(op.board.mesh);
      op.board.mesh.material.transparent = false;
      op.pic = surgeryPic(op.board, r, P.entry.c.item, P.look.skin);
      op.board.flush();
      op.items = op.pic.items.map((it, i) => {
        const m = M.surgeryItem(k, P.entry.c.item, i);
        const lp = op.board.local(it.u, it.v);
        m.position.copy(op.anchor.localToWorld(new THREE.Vector3(lp.x, lp.y, 0.015)));
        m.visible = false;
        scene.add(m);
        return m;
      });
      op.dish = new THREE.Group();
      const dish = k.cyl(0.065, 0.045, 0.025, '#cfd8e2', 18, { rough: 0.35 });
      dish.scale.set(1.35, 1, 1);
      const rim = k.tor(0.065, 0.007, '#e8eef4', Math.PI * 2, undefined, 20);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1.35, 1, 1);
      rim.position.y = 0.012;
      op.dish.add(dish, rim);
      op.dish.position.copy(op.anchor.localToWorld(new THREE.Vector3(0.31, -0.1, 0.02)));
      scene.add(op.dish);
      G.op = op;
      P.op = op;
    }
    function clearOp() {
      const op = G.op;
      if (!op) return;
      for (const o of [op.drape, op.anchor, op.dish, ...op.items]) bin.add(o);
      op.board.dispose();
      G.op = null;
    }

    async function recovery(P, surgery, pairWith) {
      const s = rooms.recovery.spots;
      const fam = familyFor(P);
      let signKid = null;
      await toRoom('recovery', () => {
        clearOp();
        P.lying = false;
        for (const c of P.hiddenParts || []) c.visible = true;
        P.hiddenParts = null;
        actors.get(P.kid).lying = false;
        P.over.dangle = 0;
        if (pairWith) pairWith.over.dangle = 0;
        if (surgery) {
          P.kid.pose = 'sit';
          place(P.kid, s.bed.clone().add(new THREE.Vector3(0, 0.3, -0.62)), 0, 'recovery');
        } else {
          P.kid.pose = 'stand';
          place(P.kid, s.stand, 0.2, 'recovery');
          const b = M.balloon(k, ['#ff9eb5', '#ffd166', '#8fd3ff'][doneCount % 3]);
          b.root.scale.setScalar(0.8);
          P.kid.arms[1].add(b.root);
          b.root.position.set(0, -0.3, 0);
          b.root.rotation.z = 0.35;
          P.keep.push(b.root);
          P.balloon = b;
        }
        if (pairWith) {
          pairWith.kid.pose = 'stand';
          place(pairWith.kid, s.stand.clone().add(new THREE.Vector3(-0.75, 0, 0.1)), 0.15, 'recovery');
        }
        fam.forEach((f, i) => place(f, s.family[i], -0.35 + i * 0.2, 'recovery'));
        place(roji, s.roji, -0.6, 'recovery');
        roji.hands = null;
        for (const g of G.gowned || []) for (const p of g) bin.add(p);
        G.gowned = null;
        if (nurse) place(homama, s.homama.clone().add(new THREE.Vector3(0.5, 0, 0.5)), -0.5, 'recovery');
        else if (surgery && love.sign && !love.signDone) {
          love.signDone = true;
          signKid = homama;
          place(homama, s.homama, -0.4, 'recovery');
          const sg = M.sign(k, 'You did it!');
          sg.scale.setScalar(0.8);
          homama.carry(sg);
          sg.position.set(0, -0.1, 0.05);
        }
        roomView('recovery');
      });
      ctx.online.progress(`Recovery: ${P.name} says thank you`);
      sceneName = `recovery-${P.name}`;
      later(200, () => fam.forEach((f, i) => later(i * 250, () => f.emote('wave'))));
      G.say('patient', surgery ? `${P.entry.c.thanks} Thank you, Dr. Roji!` : 'Look, a balloon! Thank you, Dr. Roji!');
      if (signKid) {
        later(900, () => G.say('homama', 'You did it, Dr. Roji! I knew you would.'));
        later(1200, () => roji.emote('heart'));
        ui.banner('Homama waited outside the theatre for you', 'love', 3200);
      } else if (nurse) later(900, () => G.say('roji', ['Thank you, Nurse Homama. Best team ever.', 'I could not do this without you, Homama.', 'Look at that smile. We did that together!'][doneCount % 3]));
      await wait(1.6);
      const st = caseStars(P.qs.length ? P.qs.reduce((a, b) => a + b, 0) / P.qs.length : 1);
      results.push({ name: P.name, stars: st, surgery, qs: P.qs.map((q) => +q.toFixed(2)) });
      sfx.chime(st);
      const last = doneCount + 1 >= N;
      await Promise.race([ui.caseCard({ title: `${P.name} feels better!`, stars: st, text: surgery ? `Surgery done: ${P.entry.c.what} is out.` : `${TREATS[P.entry.c.treat].name} for ${P.name}.`, button: last ? 'Finish the shift' : 'Next patient', ms: debug.auto ? 900 : 6000 }), waitAuto()]);
      ui.closeCase?.();
      if (signKid) {
        homama.carry(null);
        actors.get(homama).room = 'none';
      }
      for (const f of fam) disposeKid(f);
      disposeKid(P.kid);
      if (pairWith) disposeKid(pairWith.kid);
      patient = null;
    }
    const waitAuto = () => new Promise((res) => {
      const chk = () => (debug.auto ? res() : alive && later(300, chk));
      later(1200, chk);
    });
    function familyFor(P) {
      const pal = ['#ff9eb5', '#8fd3ff', '#ffd166', '#c7a6ff', '#7fd8bf', '#f6907a'];
      const a = Math.floor(r() * pal.length);
      const base = P.person.look;
      const grownP = !!P.person.grown;
      const looks = [
        { name: 'Family', gender: 'girl', skin: base.skin, hair: base.hair === '#e9e4de' ? '#2a1a13' : base.hair, hairstyle: 'long', outfit: 'dress', top: pal[a], bottom: pal[a], shoes: '#7a2e3a', accent: '#ffffff' },
        grownP
          ? { name: 'Family', gender: 'girl', skin: base.skin, hair: '#4a2c1a', hairstyle: 'pigtails', outfit: 'overalls', top: '#ffffff', bottom: pal[(a + 2) % 6], shoes: '#ffffff', accent: '#ff7fa3', kid: true }
          : { name: 'Family', gender: 'boy', skin: base.skin, hair: '#2a1a13', hairstyle: r() < 0.3 ? 'bald' : 'short', mustache: r() < 0.6, outfit: 'tee-pants', top: pal[(a + 3) % 6], bottom: '#3b2b3f', shoes: '#3b2b3f' },
      ];
      return looks.map((lk) => {
        const kd = prep(ctx.makeKid(lk));
        if (!lk.kid) kd.root.scale.setScalar(1.17);
        actor(kd, 'none');
        return kd;
      });
    }

    // ---------------------------------------------------------------- love: a note, a coffee
    let sceneName = 'start';
    async function lockerNote() {
      sceneName = 'note';
      const s = rooms.reception.spots;
      place(roji, s.locker.clone().setY(0).add(new THREE.Vector3(-0.7, 0, -0.62)), 0.85, 'reception');
      cam.set(s.locker.clone().add(new THREE.Vector3(-0.3, -0.1, 0.3)), 1.7, 2.4, new THREE.Vector3(-1, 0.3, 0.32));
      cam.snap();
      ui.banner('A sticky note on your locker: "My favourite doctor"', 'love', 3000);
      await wait(1.2);
      roji.emote('heart');
      fx.heartsAt(s.locker.clone().add(new THREE.Vector3(0, 0.2, 0.2)), 4);
      G.say('roji', 'Homama... I love you too.');
      await wait(2.0);
    }
    async function coffee() {
      sceneName = 'coffee';
      const s = rooms.reception.spots;
      love.coffeeDone = true;
      actor(homama, 'reception');
      place(homama, s.door, 0, 'reception');
      const mug = heartMug(k);
      mug.scale.setScalar(1.6);
      homama.carry(mug);
      cam.set(s.roji.clone().add(new THREE.Vector3(-0.35, 0.95, 0.2)), 2.3, 3.4);
      await walkTo(homama, s.roji.clone().add(new THREE.Vector3(-0.7, 0, 0.3)), 2.6);
      actors.get(homama).yaw = 0.9;
      actors.get(roji).yaw = -0.9;
      G.say('homama', 'A coffee for the best doctor in town.');
      await wait(1.0);
      homama.carry(null);
      roji.carry(mug);
      fx.heartsAt(roji.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.5, 0)), 5);
      sound.ui('coin');
      G.say('roji', 'Thank you, Homama. Just what I needed!');
      G.boost = true;
      ui.banner('Coffee boost: steadier hands for the next stitches and cuts', 'love', 3200);
      await wait(1.4);
      later(400, () => homama.emote('wave'));
      await walkTo(homama, s.door, 2.6);
      actors.get(homama).room = 'none';
      homama.root.visible = false;
      roji.carry(null);
      bin.add(mug);
    }

    // ---------------------------------------------------------------- the whole shift
    async function run() {
      await toRoom('reception', () => {
        place(roji, rooms.reception.spots.roji, -0.9, 'reception');
        if (nurse) place(homama, rooms.reception.spots.roji.clone().add(new THREE.Vector3(0.8, 0, 0.35)), -0.8, 'reception');
        roomView('reception');
      });
      hud.title(nurse ? 'Nurse Homama helps Dr. Roji' : "Dr. Roji's Shift", `Shift ${shiftN}: ${N} ${N === 1 ? 'patient' : 'patients'}${shift.twists.length ? ' and a surprise' : ''}`);
      if (love.note) await lockerNote();
      place(roji, rooms.reception.spots.roji, -0.9, 'reception');
      roomView('reception');
      ui.banner(`Shift ${shiftN} begins`, '', 1800);
      sceneName = 'reception';
      G.say('roji', nurse ? 'Good morning, Nurse Homama. Ready to help?' : 'Good morning, Sunny Hill! Let us help everyone feel better.');
      if (nurse) later(1200, () => G.say('homama', 'Ready, Dr. Roji! I will hand you the tools.'));
      await fillWaiting();
      while (doneCount < N && alive) {
        const emergency = doneCount >= 1 ? queue.find((e) => e.emergency) : null;
        let picked;
        if (wardFirst && doneCount === 0) {
          const P = makePatient(wardFirst);
          actor(P.kid, 'none');
          picked = [P];
          ui.banner(`${P.name} first: Dr. Roji came to check on ${P.name}`, '', 2600);
          await wait(1.2);
        } else if (emergency) {
          queue.splice(queue.indexOf(emergency), 1);
          sfx.siren();
          sceneName = 'siren';
          ui.banner('Siren! An emergency is on the way', 'red', 2600);
          rooms.reception.group.visible && fx.burst(rooms.reception.spots.door.clone().add(new THREE.Vector3(0, 1.5, 0.3)), ['#ff5d72', '#ffffff'], 20);
          const P = makePatient(emergency);
          place(P.kid, rooms.reception.spots.door, 0, 'reception');
          await walkTo(P.kid, rooms.reception.spots.door.clone().add(new THREE.Vector3(1.4, 0, 1.4)), 3);
          patient = P;
          G.say('patient', P.entry.c.line);
          G.say('roji', 'No time to lose. Straight to the theatre!');
          await wait(1.8);
          picked = [P];
        } else {
          if (!waiting.length) await fillWaiting();
          if (!waiting.length) break;
          if (love.coffee && !love.coffeeDone && doneCount >= 2) await coffee();
          roomView('reception');
          cam.set(rooms.reception.view.look.clone().add(new THREE.Vector3(-0.85, 0.15, -0.3)), 2.65, 5.4);
          let chosen;
          if (waiting.length === 1 && !(waiting[0].entry.pair || waiting[0].entry.pairWith)) {
            // Only one patient left: no need to choose
            chosen = waiting[0];
            G.say('roji', `Your turn, ${chosen.name}. Come with me!`);
            ctx.online.progress(`Reception: ${chosen.name} is next`);
            await wait(1.4);
          } else {
            const tri = await runStep('triage', { waiting: waiting.map((P) => ({ entry: P.entry, kid: P.kid, name: P.name, P })) });
            score(tri.q);
            chosen = tri.chosen.P;
          }
          picked = [chosen];
          if (chosen.entry.pair || chosen.entry.pairWith) {
            const other = waiting.find((x) => x !== chosen && (x.entry.pair || x.entry.pairWith));
            if (other) picked.push(other);
          }
          for (const P of picked) {
            waiting.splice(waiting.indexOf(P), 1);
            seats[P.seat] = null;
          }
          // The picked ones walk off, the others wait
          for (const P of picked) {
            P.kid.pose = 'stand';
            place(P.kid, P.kid.root.position.clone().setY(0).add(new THREE.Vector3(0, 0, 0.45)), 0, 'reception');
            walkTo(P.kid, rooms.reception.spots.roji.clone().add(new THREE.Vector3(1.2, 0, 1.0)), 2.6);
          }
          await wait(0.9);
        }
        const first = picked[0];
        const pairP = picked[1] || null;
        first.bed = 'A';
        if (pairP) pairP.bed = 'B';
        let surgery = first.entry.c.kind === 'surgery';
        if (emergency) {
          await surgeryCase(first, true);
        } else {
          await toRoom('exam', () => {
            if (pairP) {
              pairP.kid.pose = 'sit';
              pairP.over.dangle = 1;
              place(pairP.kid, rooms.exam.spots.bedB.clone().add(new THREE.Vector3(0, 0.32, 0.4)), 0, 'exam');
            }
          });
          if (pairP) ui.banner('Two patients at once!', 'gold', 2400);
          const res = await examCase(first);
          if (res === 'surgery') {
            surgery = true;
            await surgeryCase(first, false);
          } else if (pairP) {
            // The second twin on the other bed
            later(200, () => first.kid.emote('wave'));
            const r2 = await examCase(pairP);
            if (r2 === 'surgery') await surgeryCase(pairP, false);
          }
        }
        G.boost = false;
        await recovery(first, surgery, pairP);
        if (pairP) {
          results.push({ name: pairP.name, stars: caseStars(pairP.qs.length ? pairP.qs.reduce((a, b) => a + b, 0) / pairP.qs.length : 1), surgery: false });
          doneCount++;
        }
        doneCount++;
        badge();
        if (doneCount < N) {
          await toRoom('reception', () => {
            place(roji, rooms.reception.spots.roji, -0.9, 'reception');
            if (nurse) place(homama, rooms.reception.spots.roji.clone().add(new THREE.Vector3(0.8, 0, 0.35)), -0.8, 'reception');
            roomView('reception');
          });
          await fillWaiting();
        }
      }
      if (alive) endShift();
    }

    function endShift() {
      over = true;
      const avg = results.reduce((a, b) => a + b.stars, 0) / Math.max(1, results.length);
      const stars = shiftStars(avg);
      const caseStarSum = results.reduce((a, b) => a + b.stars, 0);
      const total = totalStars0 + caseStarSum;
      ctx.save('stars', total);
      ctx.save('shifts', shiftN);
      const best = Math.max(points, ctx.load('bestScore', 0));
      const newBest = points > ctx.load('bestScore', 0);
      ctx.save('bestScore', best);
      ctx.save('best', Math.max(stars, ctx.load('best', 0)));
      let plaque = '';
      if (stars === 3) {
        ctx.save('plaque', plaques0 + 1);
        plaque = `<br><b style="color:#c9921e">Doctor of the week!</b> A golden plaque goes up in reception.`;
      }
      const fresh = UNLOCKS.filter((u) => totalStars0 < u.at && total >= u.at);
      const next = UNLOCKS.find((u) => total < u.at);
      const list = results.map((x) => `${x.name} ${starsInline(x.stars)}`).join(' &nbsp; ');
      const partner = nurse ? '<b>Roji:</b> "Thank you, Nurse Homama. Best team ever."' : '<b>Homama:</b> "You were amazing today, Dr. Roji."';
      fx.burst(cam.look.clone().add(new THREE.Vector3(0, 0.4, 0)), ['#ffd166', '#ff8fb1', '#7fd8bf', '#ffffff'], 80);
      hud.title(nurse ? 'Nurse Homama helps Dr. Roji' : "Dr. Roji's Shift", 'Shift complete');
      later(500, () =>
        ctx.finish({
          win: true,
          stars,
          score: points,
          title: stars === 3 ? 'Wonderful shift!' : stars === 2 ? 'Great shift!' : 'Shift complete!',
          text: `${starsHtml(stars)}<br>${list}<br>${points} points${newBest ? ' <b>(new best!)</b>' : ` (best ${best})`}${plaque}${fresh.map((u) => `<br><b style="color:#3fbf9f">New: ${u.name}.</b> ${u.text}`).join('')}${!fresh.length && next ? `<br><small>${next.at - total} more stars to unlock: ${next.name}</small>` : ''}<br>${partner}`,
          helped: results.map((x) => x.name),
        }),
      );
    }
    const starsInline = (n) => `<span style="color:#e0a800;letter-spacing:-1px">${'&#9733;'.repeat(n)}</span><span style="color:#e6d8cc;letter-spacing:-1px">${'&#9733;'.repeat(3 - n)}</span>`;

    // ---------------------------------------------------------------- test hook
    let over = false;
    const defs = {
      get room() {
        return current;
      },
      get step() {
        return step?.constructor.name || null;
      },
      get stepTitle() {
        return stepTitle;
      },
      get done() {
        return doneCount;
      },
      get cases() {
        return shift.cases.map((e) => e.c.id + (e.emergency ? '!' : '') + (e.pair ? '+' : ''));
      },
      get twists() {
        return shift.twists;
      },
      get points() {
        return points;
      },
      get results() {
        return results;
      },
      get scene() {
        return sceneName;
      },
      get over() {
        return over;
      },
      get stepObj() {
        return step;
      },
      skip() {
        step?.finish(1);
      },
      probe: () => probe(step, G),
      cursor,
      G,
    };
    Object.defineProperties(debug, Object.getOwnPropertyDescriptors(defs));
    window.__patients = debug;

    run().catch((e) => alive && console.error(e));

    return {
      debug,
      update(rdt, t) {
        if (!alive) return;
        const dt = rdt * debug.speed;
        for (let i = waits.length - 1; i >= 0; i--) {
          waits[i].t -= dt;
          if (waits[i].t <= 0) {
            const w = waits.splice(i, 1)[0];
            w.res();
          }
        }
        cursor.update(dt);
        if (step) {
          if (G.auto && !step.done) step.auto(dt);
          step.update(dt);
          if (step.done) {
            afterT -= dt;
            if (afterT <= 0) endStep();
          }
        }
        // People
        for (const a of actors.values()) {
          const kd = a.kid;
          let speed = 0;
          if (a.walk) {
            const w = a.walk;
            const dx = w.to.x - kd.root.position.x;
            const dz = w.to.z - kd.root.position.z;
            const d = Math.hypot(dx, dz);
            if (d < 0.05) {
              a.walk = null;
              w.res();
            } else {
              speed = w.speed;
              const s = Math.min(d, speed * dt);
              kd.root.position.x += (dx / d) * s;
              kd.root.position.z += (dz / d) * s;
              a.yaw = Math.atan2(dx, dz);
            }
          }
          if (!a.lying) kd.root.rotation.y = util.dampAngle(kd.root.rotation.y, a.yaw, 8, dt);
          if (kd.root.visible) {
            const n = Math.max(1, Math.ceil(dt / 0.05));
            for (let i = 0; i < n; i++) kd.update(dt / n, t, speed, 0, 0);
            if (kd.over?.rub !== undefined) {
              kd.arms[0].rotation.set(-1.1, 0, -0.35 + kd.over.rub * 0.25);
              kd.arms[1].rotation.set(-1.1, 0, 0.35 + kd.over.rub * 0.25);
            }
          }
        }
        for (const P of [patient, ...waiting]) {
          if (!P || !P.kid.root.visible) continue;
          if (P.asleep) P.kid.pose = 'sleep';
          P.update(dt, t);
          if (P.puffT !== undefined) {
            P.puffT -= dt;
            if (P.puffT <= 0) {
              const cue = P.entry.c.cue;
              P.puffT = 1.8 + Math.random();
              if (cue === 'cough') {
                puffAt(P.part('mouth').add(new THREE.Vector3(0, 0, 0.1)), 2);
                P.kid.squash = 0.92;
                if (P === patient) sfx.cut();
              } else if (cue === 'squeak' && P === patient) sfx.squeak();
              else if (cue === 'whistle' && P === patient) sfx.whistle();
            }
          }
        }
        for (const q of puffs) {
          if (q.life <= 0) continue;
          q.life -= dt * 1.4;
          q.s.position.addScaledVector(q.v, dt);
          q.s.scale.setScalar(0.12 + (1 - q.life) * 0.3);
          q.s.material.opacity = Math.max(0, q.life) * 0.8;
          if (q.life <= 0) q.s.visible = false;
        }
        rooms[current].update?.(dt, t);
        if (current === 'theatre') {
          monitor.update(dt);
          if (rooms.theatre.alarm.material.emissiveIntensity > 0.2) rooms.theatre.alarm.material.emissiveIntensity = 0.6 + Math.sin(t * 10) * 0.6;
        }
        // Speech bubbles over heads (or in a corner in close-ups)
        for (const b of Object.values(bubbles)) {
          if (b.ttl > 0) {
            b.ttl -= dt;
            if (b.ttl <= 0 || !b.kid?.root.visible) b.b.hide();
            else b.b.at(b.kid.head.getWorldPosition(b.b.a.pos).add(new THREE.Vector3(0, 0.78 * b.kid.root.scale.y, 0)));
          }
        }
        cam.update(rdt * Math.min(debug.speed, 3));
        for (const kd of [roji, homama, maya]) {
          const a = actors.get(kd);
          if (!a || a.room !== current) continue;
          // In a close-up, whoever stands nearer the camera than the patient steps out of the shot
          const d = kd.head.getWorldPosition(hv).distanceTo(camera.position);
          const near = step && cam.want?.h < 1.6 ? Math.min(1.9, camera.position.distanceTo(cam.look) * 0.98) : 0.95;
          kd.root.visible = d > near * kd.root.scale.y;
        }
        ui.update();
      },
      dispose() {
        alive = false;
        for (const t of timers) clearTimeout(t);
        ui.dispose();
        style.remove();
        hud.hint('');
        if (window.__patients === debug) delete window.__patients;
      },
    };
  },
};
