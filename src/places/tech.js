import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COL, box, rbox, cyl, sph, at, mat, umat, mesh, canvasTexture, roundRect, FONT, rng, officeWindowTex, makeDuck, makePlant, makeMug, planeTex, trimShadows } from './tech/kit.js';
import { buildTechInterior } from './tech/interior.js';

// Homama's Tech Studio: a cheerful glass office with a round tower, solar panels and a rooftop garden,
// a bike rack, a giant debug duck in a pond and a "Homama works here" sign. Inside: see tech/interior.js.

const TEAL = COL.teal;

export default {
  id: 'tech',
  stop: {
    title: 'Tech Studio',
    tag: 'Where Homama works',
    icon: 'code',
    color: '#21a99a',
    text: 'Homama builds apps here, with three monitors, a rubber duck and lots of coffee. Help him ship a feature!',
  },
  icons: {
    code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M13.5 5l-3 14',
    coffee: 'M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M17 10h1.5a2.5 2.5 0 0 1 0 5H17 M8 3.5c-.6 1 .6 1.6 0 2.6 M12 3.5c-.6 1 .6 1.6 0 2.6',
    paddle: 'M15 3a6 6 0 0 1 4.2 10.3l-2.1 2.1a3 3 0 0 1-4.2 0L8.4 19.9a1.5 1.5 0 0 1-2.1-2.1l4.5-4.5a3 3 0 0 1 0-4.2l2.1-2.1A6 6 0 0 1 15 3z M19.5 19.5h.01',
    duck: 'M8 10a4 4 0 1 1 7.5 2H19a2 2 0 0 1 2 2 6 6 0 0 1-6 6H9a5 5 0 0 1-5-5c0-1.7.8-3.2 2.1-4.1 M5.5 9H3 M10.5 8.5h.01',
  },

  build(ctx) {
    const { THREE, size } = ctx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const add = (...o) => (g.add(...o), o[0]);
    const cream = mat(COL.cream);
    const white = mat(COL.white);
    const teal = mat(TEAL);

    // ---------------------------------------------------------------- main building
    const BZ = -3.7; // centre
    const BD = 7.8;
    const BW = 12.4;
    const FZ = BZ + BD / 2; // front face z = 0.2
    add(at(box(BW + 0.3, 0.3, BD + 0.3, '#e9dccb'), 0, 0.15, BZ));
    add(at(rbox(BW, 5.6, BD, cream, 0.12), 0, 2.8, BZ));
    add(at(box(BW + 0.12, 0.24, BD + 0.12, teal), 0, 2.85, BZ));
    add(at(rbox(BW + 0.3, 0.3, BD + 0.3, mat('#f2e6d6'), 0.06), 0, 5.75, BZ));
    colliders.push({ type: 'box', x: 0, z: BZ, hw: BW / 2 + 0.1, hd: BD / 2 + 0.1 });

    // Windows: one cloned texture per repeat pattern
    const winTex = (rx) => {
      const t = officeWindowTex();
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.set(rx, 1);
      return t;
    };
    const glassMat = (rx) => {
      const t = winTex(rx);
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.25, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.35 });
    };
    const winGround = glassMat(4);
    const winUpper = glassMat(8);
    const frameMat = mat(TEAL);
    const mullion = mat(COL.white);
    const glazing = (x, y, w, h, m, panes) => {
      add(at(rbox(w + 0.18, h + 0.18, 0.1, frameMat, 0.05), x, y, FZ + 0.02));
      add(at(mesh(new THREE.PlaneGeometry(w, h), m, { cast: false }), x, y, FZ + 0.08));
      for (let i = 1; i < panes; i++) add(at(box(0.06, h, 0.06, mullion), x - w / 2 + (i * w) / panes, y, FZ + 0.1));
      add(at(rbox(w + 0.3, 0.08, 0.26, mullion, 0.03), x, y - h / 2 - 0.1, FZ + 0.12));
    };
    glazing(-3.45, 1.5, 4.3, 2.0, winGround, 4);
    glazing(3.45, 1.5, 4.3, 2.0, winGround, 4);
    glazing(0, 4.15, 11.2, 1.6, winUpper, 8);
    // Sun shades over the upper windows
    for (let i = 0; i < 8; i++) {
      const fin = rbox(0.08, 0.06, 0.5, mat(COL.sun), 0.02);
      add(at(fin, -5.25 + i * 1.5, 5.12, FZ + 0.25));
    }
    add(at(rbox(11.6, 0.08, 0.55, mat(COL.sun), 0.03), 0, 5.12, FZ + 0.27));

    // Entrance: glass doors, a canopy with an LED panel, a doormat
    add(at(rbox(1.75, 2.35, 0.12, frameMat, 0.05), 0, 1.38, FZ + 0.02));
    const doorGlass = mat('#bfe9f2', { rough: 0.15, emissive: '#bfe9f2', ei: 0.25 });
    for (const s of [-1, 1]) {
      add(at(box(0.7, 2.15, 0.05, doorGlass), s * 0.38, 1.38, FZ + 0.09));
      add(at(box(0.04, 0.5, 0.06, white), s * 0.08, 1.3, FZ + 0.15));
    }
    add(at(box(0.04, 2.15, 0.07, white), 0, 1.38, FZ + 0.12));
    add(at(rbox(3.4, 0.18, 1.7, mat(COL.coral), 0.05), 0, 2.72, FZ + 0.85));
    for (const s of [-1, 1]) add(at(cyl(0.06, 0.06, 2.6, white, 10), s * 1.5, 1.3, FZ + 1.55));
    colliders.push({ type: 'circle', x: -1.5, z: FZ + 1.55, r: 0.1 }, { type: 'circle', x: 1.5, z: FZ + 1.55, r: 0.1 });
    // LED panel with messages that change
    const led = document.createElement('canvas');
    led.width = 512;
    led.height = 64;
    const ledCtx = led.getContext('2d');
    const ledTex = new THREE.CanvasTexture(led);
    ledTex.colorSpace = THREE.SRGBColorSpace;
    const MSG = [['Hello Roji', '#ff9eb5'], ['Build passing', '#7ee8a8'], ['Ship it!', '#ffd166'], ['Coffee is ready', '#7fe0ff']];
    const drawLed = (i) => {
      ledCtx.fillStyle = '#1d2235';
      ledCtx.fillRect(0, 0, 512, 64);
      ledCtx.fillStyle = MSG[i][1];
      ledCtx.font = `700 40px ${FONT}`;
      ledCtx.textAlign = 'center';
      ledCtx.textBaseline = 'middle';
      ledCtx.fillText(MSG[i][0], 256, 34);
      ledCtx.fillStyle = 'rgba(29,34,53,0.55)';
      for (let x = 0; x < 512; x += 6) ledCtx.fillRect(x, 0, 2, 64);
      for (let y = 0; y < 64; y += 6) ledCtx.fillRect(0, y, 512, 2);
      ledTex.needsUpdate = true;
    };
    drawLed(0);
    const ledPanel = mesh(new THREE.PlaneGeometry(2.6, 0.32), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false }), { cast: false });
    add(at(ledPanel, 0, 2.72, FZ + 1.71));
    dynamic.push(ledPanel);
    const matTex = canvasTexture(256, 128, (c, w, h) => {
      c.fillStyle = COL.coral;
      roundRect(c, 0, 0, w, h, 24);
      c.fill();
      c.fillStyle = '#fff6ec';
      c.font = `600 44px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('Welcome', w / 2, h / 2 + 3);
    });
    const doormat = mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshStandardMaterial({ map: matTex, roughness: 1 }), { cast: false });
    doormat.rotation.x = -Math.PI / 2;
    add(at(doormat, 0, 0.02, FZ + 0.75));

    // Big "Tech Studio" sign on the roof edge
    const signTex = canvasTexture(1024, 256, (c, w, h) => {
      c.fillStyle = '#fffaf4';
      roundRect(c, 8, 8, w - 16, h - 16, 110);
      c.fill();
      c.lineWidth = 14;
      c.strokeStyle = TEAL;
      c.stroke();
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      c.fillStyle = COL.coral;
      c.beginPath();
      c.arc(150, h / 2, 74, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.font = `700 76px ${FONT}`;
      c.fillText('</>', 150, h / 2 + 4);
      c.fillStyle = '#17574f';
      c.font = `700 120px ${FONT}`;
      c.fillText('Tech Studio', 590, h / 2 + 8);
    });
    add(at(rbox(5.3, 1.38, 0.16, teal, 0.12), 0, 6.62, FZ - 0.3));
    add(at(planeTex(5.12, 1.28, signTex, { glow: 0.25 }), 0, 6.62, FZ - 0.21));
    for (const s of [-1, 1]) add(at(box(0.14, 0.6, 0.14, teal), s * 1.8, 6.0, FZ - 0.38));

    // ---------------------------------------------------------------- round glass tower
    const TX = -7.25;
    const TZ = -4.0;
    const TR = 2.0;
    add(at(cyl(TR, TR, 7.2, cream, 32), TX, 3.6, TZ));
    const bandTex = winTex(7);
    const bandMat = new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.25, emissive: '#ffffff', emissiveMap: bandTex, emissiveIntensity: 0.35 });
    for (const y of [1.55, 3.85, 6.0]) {
      add(at(mesh(new THREE.CylinderGeometry(TR + 0.03, TR + 0.03, 1.35, 32, 1, true), bandMat, { cast: false }), TX, y, TZ));
      add(at(cyl(TR + 0.08, TR + 0.08, 0.12, teal, 32), TX, y + 0.74, TZ));
    }
    add(at(cyl(TR + 0.15, TR + 0.15, 0.3, teal, 32), TX, 7.3, TZ));
    const domeG = new THREE.SphereGeometry(1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    add(at(mesh(domeG, mat(COL.mint)), TX, 7.45, TZ));
    add(at(cyl(0.04, 0.04, 1.4, white, 6), TX, 9.1, TZ));
    const blink = sph(0.1, umat('#ff5f6d', { emissive: '#ff3b4f', ei: 1.5 }), undefined, 10);
    add(at(blink, TX, 9.85, TZ));
    dynamic.push(blink);
    colliders.push({ type: 'circle', x: TX, z: TZ, r: TR + 0.1 });

    // ---------------------------------------------------------------- right wing with a roof garden
    const WX = 7.85;
    const WZ = -4.4;
    add(at(rbox(3.3, 3.3, 5.2, cream, 0.1), WX, 1.65, WZ));
    add(at(box(3.36, 0.5, 5.26, mat(COL.mint)), WX, 0.25, WZ));
    add(at(rbox(3.5, 0.22, 5.4, mat('#f2e6d6'), 0.05), WX, 3.36, WZ));
    colliders.push({ type: 'box', x: WX, z: WZ, hw: 1.7, hd: 2.65 });
    const roundWin = glassMat(1);
    for (const x of [WX - 0.75, WX + 0.75]) {
      const ring = mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 24), frameMat);
      add(at(ring, x, 1.85, WZ + 2.62));
      add(at(mesh(new THREE.CircleGeometry(0.5, 24), roundWin, { cast: false }), x, 1.85, WZ + 2.61));
      add(at(rbox(1.0, 0.24, 0.3, mat(COL.pot), 0.05), x, 1.2, WZ + 2.75));
      for (let i = 0; i < 4; i++) add(at(sph(0.09, i % 2 ? COL.pink : COL.sun, undefined, 8), x - 0.33 + i * 0.22, 1.37, WZ + 2.78));
    }
    // Roof garden on the wing
    const deck = mat('#d9a86c');
    add(at(box(3.1, 0.08, 5.0, deck), WX, 3.51, WZ));
    for (const [x, z] of [[WX - 1.1, WZ - 1.8], [WX + 1.1, WZ - 1.8], [WX - 1.1, WZ + 1.8]]) {
      add(at(rbox(0.7, 0.4, 0.7, mat(COL.pot), 0.06), x, 3.75, z));
      add(at(sph(0.42, mat(COL.leaf), undefined, 12), x, 4.25, z));
      add(at(sph(0.08, COL.pink, undefined, 8), x + 0.2, 4.5, z + 0.25), at(sph(0.08, COL.sun, undefined, 8), x - 0.25, 4.4, z + 0.2));
    }
    add(at(rbox(1.3, 0.12, 0.4, mat(COL.wood), 0.04), WX + 0.5, 3.85, WZ + 1.4));
    for (const s of [-1, 1]) add(at(box(0.08, 0.3, 0.32, teal), WX + 0.5 + s * 0.55, 3.68, WZ + 1.4));
    // Small wind turbine
    add(at(cyl(0.05, 0.08, 2.0, white, 8), WX + 1.05, 4.55, WZ + 0.2));
    const rotorParts = [new THREE.SphereGeometry(0.12, 10, 8)];
    for (let i = 0; i < 3; i++) rotorParts.push(new THREE.BoxGeometry(0.1, 0.75, 0.03).translate(0, 0.4, 0).rotateZ((i / 3) * Math.PI * 2).toNonIndexed());
    rotorParts[0] = rotorParts[0].toNonIndexed();
    const rotor = mesh(mergeGeometries(rotorParts), white);
    rotor.position.set(WX + 1.05, 5.6, WZ + 0.33);
    add(rotor);
    dynamic.push(rotor);

    // ---------------------------------------------------------------- main roof: solar panels and a garden deck
    const RY = 5.9;
    const panelTex = canvasTexture(256, 160, (c, w, h) => {
      c.fillStyle = '#2f4d9a';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8fb3ff';
      c.lineWidth = 3;
      for (let x = 0; x <= w; x += w / 6) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
      }
      for (let y = 0; y <= h; y += h / 4) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath();
      c.moveTo(0, h);
      c.lineTo(w * 0.4, 0);
      c.lineTo(w * 0.6, 0);
      c.lineTo(w * 0.2, h);
      c.fill();
    });
    const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.25, metalness: 0.3 });
    const panelGeo = new THREE.BoxGeometry(1.6, 0.05, 1.0);
    const panelTop = new THREE.PlaneGeometry(1.52, 0.92);
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 3; i++) {
        const x = 1.2 + i * 1.75;
        const z = -6.2 + r * 1.9;
        const p = mesh(panelGeo, mat('#c9d3e6'));
        p.rotation.x = 0.4;
        add(at(p, x, RY + 0.45, z));
        const top = mesh(panelTop, panelMat, { cast: false });
        top.rotation.x = 0.4 - Math.PI / 2;
        add(at(top, x, RY + 0.45 + 0.026 * Math.cos(0.4), z + 0.026 * Math.sin(0.4)));
        add(at(box(0.06, 0.5, 0.06, mat(COL.steel)), x - 0.7, RY + 0.25, z - 0.35), at(box(0.06, 0.5, 0.06, mat(COL.steel)), x + 0.7, RY + 0.25, z - 0.35));
      }
    }
    add(at(box(5.6, 0.06, 4.4, deck), -2.6, RY + 0.03, -3.9));
    for (const [x, z, kind] of [[-4.6, -5.6, 'tall'], [-0.7, -5.7, 'round'], [-4.7, -2.1, 'round']]) {
      const p = makePlant(kind, kind === 'tall' ? 1.6 : 1.0, COL.white);
      p.position.set(x, RY, z);
      add(p);
    }
    // Pergola with string lights
    const pw = mat(COL.wood);
    for (const [x, z] of [[-3.9, -4.6], [-1.4, -4.6], [-3.9, -2.6], [-1.4, -2.6]]) add(at(box(0.12, 1.8, 0.12, pw), x, RY + 0.9, z));
    for (const z of [-4.6, -2.6]) add(at(box(2.7, 0.1, 0.12, pw), -2.65, RY + 1.82, z));
    for (let i = 0; i < 5; i++) add(at(box(0.08, 0.08, 2.3, pw), -3.85 + i * 0.6, RY + 1.9, -3.6));
    const lightMat = mat('#fff3c4', { emissive: '#ffd98a', ei: 1.2 });
    for (let i = 0; i < 9; i++) add(at(sph(0.06, lightMat, undefined, 8), -3.8 + i * 0.3, RY + 1.7 - Math.sin((i / 8) * Math.PI) * 0.18, -2.6));
    add(at(cyl(0.45, 0.45, 0.05, white, 18), -2.65, RY + 0.72, -3.6));
    add(at(cyl(0.05, 0.08, 0.7, white, 8), -2.65, RY + 0.36, -3.6));
    for (const s of [-1, 1]) add(at(rbox(0.6, 0.3, 0.6, mat(s > 0 ? COL.pink : COL.sun), 0.12), -2.65 + s * 0.85, RY + 0.17, -3.6));
    add(at(makeMug(COL.coral, COL.white, 1.6), -2.5, RY + 0.745, -3.5));
    // AC box
    add(at(rbox(1.1, 0.7, 0.8, mat('#e7ebf1'), 0.06), 4.9, RY + 0.35, -1.6));
    add(at(cyl(0.26, 0.26, 0.04, mat('#b8c0cc'), 16), 4.9, RY + 0.72, -1.6));

    // ---------------------------------------------------------------- forecourt
    const pathTex = canvasTexture(256, 512, (c, w, h) => {
      c.fillStyle = '#efe6d8';
      c.fillRect(0, 0, w, h);
      for (let j = 0; j < 8; j++)
        for (let i = 0; i < 4; i++) {
          c.fillStyle = (i + j) % 2 ? '#f8f1e6' : '#fbf6ee';
          roundRect(c, i * 64 + 4, j * 64 + 4, 56, 56, 10);
          c.fill();
        }
      c.fillStyle = TEAL;
      c.fillRect(0, 0, 8, h);
      c.fillRect(w - 8, 0, 8, h);
    });
    const path = mesh(new THREE.PlaneGeometry(3.0, 7.0), new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9 }), { cast: false });
    path.rotation.x = -Math.PI / 2;
    add(at(path, 0, 0.012, FZ + 4.15));
    // Planters along the front with flowers
    const flowerCols = [COL.pink, COL.sun, '#ffffff', COL.coral, COL.lilac];
    const r = rng(31);
    for (const s of [-1, 1]) {
      const px = s * 3.6;
      add(at(rbox(3.6, 0.5, 0.7, mat('#f2e6d6'), 0.08), px, 0.25, FZ + 0.65));
      add(at(box(3.4, 0.05, 0.55, '#6b4a33'), px, 0.5, FZ + 0.65));
      for (let i = 0; i < 4; i++) add(at(sph(0.3, mat(COL.leaf), undefined, 12), px - 1.3 + i * 0.87, 0.65, FZ + 0.62));
      for (let i = 0; i < 9; i++) add(at(sph(0.07, flowerCols[i % 5], undefined, 8), px - 1.55 + i * 0.39, 0.86 + r() * 0.1, FZ + 0.82 + r() * 0.08));
      colliders.push({ type: 'box', x: px, z: FZ + 0.65, hw: 1.8, hd: 0.35, h: 0.5 });
    }
    // Lamp posts along the path
    const glowMat = mat('#fff6d8', { emissive: '#ffe6a0', ei: 1.0 });
    for (const z of [FZ + 2.6, FZ + 6.0]) {
      for (const s of [-1, 1]) {
        add(at(cyl(0.06, 0.08, 2.4, teal, 10), s * 1.9, 1.2, z));
        add(at(sph(0.2, glowMat, undefined, 14), s * 1.9, 2.5, z));
        add(at(cyl(0.22, 0.22, 0.06, teal, 14), s * 1.9, 2.32, z));
        colliders.push({ type: 'circle', x: s * 1.9, z, r: 0.12 });
      }
    }
    // Wooden sign
    const sign = ctx.sign(['Homama works here', 'Tech Studio'], { width: 2.6, height: 1.1, accent: TEAL });
    sign.position.set(3.3, 0, FZ + 6.7);
    sign.rotation.y = -0.2;
    add(sign);
    colliders.push({ type: 'box', x: 3.3, z: FZ + 6.7, hw: 1.1, hd: 0.12 });

    // Bike rack with two bikes
    const metal = mat(COL.steel, { metal: 0.6, rough: 0.35 });
    for (let i = 0; i < 3; i++) {
      const hoop = mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 14, Math.PI), metal);
      add(at(hoop, -8.9 + i * 0.75, 0.0, FZ + 2.0));
    }
    add(at(box(1.9, 0.04, 0.08, metal), -8.15, 0.02, FZ + 2.0));
    const bike = (x, color, basket) => {
      const b = new THREE.Group();
      const tire = mat('#2b2f3a');
      for (const z of [-0.42, 0.42]) {
        const w = mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 20), tire);
        w.rotation.y = Math.PI / 2;
        b.add(at(w, 0, 0.32, z));
        const hub = cyl(0.04, 0.04, 0.08, metal, 8);
        hub.rotation.z = Math.PI / 2;
        b.add(at(hub, 0, 0.32, z));
      }
      const fm = mat(color);
      const bar = (y1, z1, y2, z2) => {
        const len = Math.hypot(y2 - y1, z2 - z1);
        const c = cyl(0.03, 0.03, len, fm, 8);
        c.position.set(0, (y1 + y2) / 2, (z1 + z2) / 2);
        c.rotation.x = Math.atan2(z2 - z1, y2 - y1);
        b.add(c);
      };
      bar(0.32, -0.42, 0.68, -0.1);
      bar(0.68, -0.1, 0.66, 0.3);
      bar(0.32, -0.1, 0.68, -0.1);
      bar(0.32, -0.1, 0.66, 0.3);
      bar(0.32, 0.42, 0.8, 0.32);
      b.add(at(rbox(0.12, 0.05, 0.22, mat('#3b2b3f'), 0.02), 0, 0.74, -0.12));
      const hb = cyl(0.025, 0.025, 0.42, metal, 8);
      hb.rotation.z = Math.PI / 2;
      b.add(at(hb, 0, 0.82, 0.32));
      if (basket) {
        b.add(at(rbox(0.3, 0.18, 0.22, mat('#e8c497'), 0.03), 0, 0.82, 0.5));
        for (let i = 0; i < 3; i++) b.add(at(sph(0.06, [COL.pink, COL.sun, COL.coral][i], undefined, 8), -0.08 + i * 0.08, 0.95, 0.5));
      }
      b.position.set(x, 0, FZ + 2.05);
      b.scale.setScalar(1.25);
      add(b);
    };
    bike(-8.6, COL.blue, false);
    bike(-7.75, COL.pink, true);
    colliders.push({ type: 'box', x: -8.2, z: FZ + 2.05, hw: 1.05, hd: 0.55 });

    // Giant debug duck in a little pond
    const PX = -6.0;
    const PZ = FZ + 5.0;
    add(at(cyl(1.55, 1.65, 0.45, mat('#f2e6d6'), 28), PX, 0.225, PZ));
    add(at(mesh(new THREE.TorusGeometry(1.52, 0.1, 8, 32), mat(COL.white)), PX, 0.45, PZ)).rotation.x = Math.PI / 2;
    const water = mesh(new THREE.CircleGeometry(1.45, 28), umat('#7fd3e6', { rough: 0.15, emissive: '#5fc0d8', ei: 0.15 }), { cast: false });
    water.rotation.x = -Math.PI / 2;
    add(at(water, PX, 0.4, PZ));
    dynamic.push(water);
    const bigDuck = makeDuck(1.25);
    bigDuck.position.set(PX, 0.28, PZ);
    add(bigDuck);
    dynamic.push(bigDuck);
    const plaqueTex = canvasTexture(256, 96, (c, w, h) => {
      c.fillStyle = COL.sun;
      roundRect(c, 4, 4, w - 8, h - 8, 30);
      c.fill();
      c.fillStyle = '#6b4a12';
      c.font = `600 40px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('Debug Duck', w / 2, h / 2 + 2);
    });
    const plaque = planeTex(0.9, 0.34, plaqueTex);
    plaque.rotation.x = -0.4;
    add(at(plaque, PX + 0.6, 0.55, PZ + 1.62));
    colliders.push({ type: 'circle', x: PX, z: PZ, r: 1.65 });

    // Outdoor coding table with a parasol
    const OX = 6.6;
    const OZ = FZ + 2.4;
    add(at(cyl(0.5, 0.5, 0.05, white, 20), OX, 0.74, OZ));
    add(at(cyl(0.04, 0.04, 2.2, white, 8), OX, 1.1, OZ));
    add(at(mesh(new THREE.ConeGeometry(1.25, 0.5, 10), mat(TEAL)), OX, 2.3, OZ));
    add(at(sph(0.06, COL.sun, undefined, 8), OX, 2.58, OZ));
    for (const s of [-1, 1]) {
      add(at(cyl(0.22, 0.22, 0.07, mat(COL.peach), 14), OX + s * 0.8, 0.46, OZ));
      add(at(cyl(0.04, 0.05, 0.45, COL.steel, 6), OX + s * 0.8, 0.23, OZ));
      colliders.push({ type: 'circle', x: OX + s * 0.8, z: OZ, r: 0.22, h: 0.5 });
    }
    const lapG = new THREE.Group();
    lapG.add(at(rbox(0.4, 0.02, 0.28, mat('#c9cedb', { metal: 0.3, rough: 0.4 }), 0.008), 0, 0.01, 0));
    const lapScreen = rbox(0.4, 0.27, 0.015, mat('#c9cedb', { metal: 0.3, rough: 0.4 }), 0.008);
    lapScreen.position.set(0, 0.13, -0.13);
    lapScreen.rotation.x = -0.3;
    lapG.add(lapScreen);
    lapG.add(at(box(0.08, 0.08, 0.005, COL.pink), 0.08, 0.15, -0.115).rotateX(-0.3));
    lapG.position.set(OX - 0.1, 0.77, OZ);
    lapG.rotation.y = 0.5;
    add(lapG);
    add(at(makeMug(COL.sun, COL.white, 1.5), OX + 0.25, 0.77, OZ + 0.15));
    colliders.push({ type: 'circle', x: OX, z: OZ, r: 0.5 });
    // Bench to hop on
    const bx = 6.4;
    const bz = FZ + 5.6;
    for (let i = 0; i < 3; i++) add(at(rbox(1.9, 0.06, 0.14, mat(COL.wood), 0.02), bx, 0.45, bz - 0.17 + i * 0.17));
    for (const s of [-1, 1]) add(at(rbox(0.1, 0.42, 0.5, teal, 0.03), bx + s * 0.8, 0.21, bz));
    colliders.push({ type: 'box', x: bx, z: bz, hw: 0.95, hd: 0.27, h: 0.48 });
    // Trees and bushes
    const leaf = mat(COL.leaf);
    const leaf2 = mat(COL.leafDark);
    const tree = (x, z, s = 1, pink = false) => {
      add(at(cyl(0.12 * s, 0.16 * s, 1.6 * s, mat(COL.woodDark), 8), x, 0.8 * s, z));
      const m = pink ? mat('#ffb3c7') : leaf;
      add(at(sph(0.9 * s, m, undefined, 14), x, 2.0 * s, z));
      add(at(sph(0.6 * s, pink ? m : leaf2, undefined, 12), x + 0.5 * s, 1.75 * s, z + 0.2 * s));
      colliders.push({ type: 'circle', x, z, r: 0.25 * s });
    };
    tree(-9.0, FZ + 7.0, 0.9, true);
    tree(9.1, FZ + 6.9, 1.0);
    tree(9.2, FZ + 0.6, 0.8, true);
    for (const [x, z, s] of [[-9.3, FZ + 3.9, 0.45], [-3.6, FZ + 7.4, 0.35], [8.0, FZ + 4.2, 0.4], [-9.4, FZ - 0.4, 0.5], [4.5, FZ + 7.6, 0.3]]) {
      add(at(sph(s, leaf, undefined, 12), x, s * 0.7, z));
      add(at(sph(s * 0.7, leaf2, undefined, 10), x + s * 0.6, s * 0.5, z + 0.1));
    }

    // ---------------------------------------------------------------- hotspots and update
    let squeak = 0;
    const tone = (api, f, d, o) => {
      const s = api.sound;
      if (s?.ctx && !s.muted) s.tone(f, s.ctx.currentTime, d, o);
    };
    const hotspots = [
      {
        x: PX + 0.9,
        z: PZ + 2.05,
        r: 1.4,
        label: 'Squeak the duck',
        icon: 'duck',
        act: (api) => {
          squeak = 1;
          tone(api, 760, 0.18, { type: 'square', gain: 0.07, slideTo: 520 });
          setTimeout(() => tone(api, 700, 0.16, { type: 'square', gain: 0.06, slideTo: 480 }), 200);
          api.fx.burst(api.world(PX, PZ, 1.6), ['#ffd23f', '#ffffff', '#7fd3e6'], 24);
          api.toast('Squeak! The debug duck says your code is lovely.', 2400);
        },
      },
    ];
    let ledT = 0;
    let ledI = 0;
    trimShadows(g, dynamic);
    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      pad: { x: 0, z: size.d / 2 + 1.2 },
      door: { x: 0, z: FZ + 0.6 },
      interior: { title: 'Tech Studio', build: (ictx) => buildTechInterior(ictx) },
      ground: [{ x: 0, z: FZ + 3.9, hw: 9.4, hd: 3.6, color: '#efe6d8', feather: 0.9 }],
      update(dt, t) {
        ledT += dt;
        if (ledT > 3) {
          ledT = 0;
          ledI = (ledI + 1) % MSG.length;
          drawLed(ledI);
        }
        blink.material.emissiveIntensity = Math.sin(t * 3) > 0.6 ? 2.5 : 0.3;
        rotor.rotation.z = t * 2.2;
        squeak = Math.max(0, squeak - dt * 2.5);
        const sq = 1 - Math.sin(squeak * Math.PI) * 0.25;
        bigDuck.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
        bigDuck.position.y = 0.28 + Math.sin(t * 1.6) * 0.04;
        bigDuck.rotation.set(Math.sin(t * 1.3) * 0.04, Math.sin(t * 0.3) * 0.6, Math.sin(t * 1.1) * 0.05);
      },
    };
  },
};
