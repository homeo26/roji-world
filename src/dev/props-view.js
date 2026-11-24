import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Kid } from '../kid.js';
import { loadLooks } from '../looks.js';
import { canvasTexture, FONT } from '../util.js';
import { FOODS, makeFood } from '../props/food.js';
import { GIFTS, makeGift, makeGiftBox } from '../props/gifts.js';

// Dev view of every shared prop in a labelled grid, under the game's lighting.
// dev-props.html?set=food|gift|all  ?ids=mansaf,teddy  ?box&k=0,0.5,1  &kids=0  &zoom=1.2  &spin

const params = new URLSearchParams(location.search);
await Promise.race([document.fonts.load('600 40px Fredoka'), new Promise((r) => setTimeout(r, 1200))]);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = new THREE.Color('#a6dde2');
scene.background = SKY;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const hemi = new THREE.HemisphereLight('#fff6ea', '#7fae74', 1.35);
const sun = new THREE.DirectionalLight('#fff0d8', 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(hemi, sun, sun.target);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 200);

const lawn = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#9ad06a', roughness: 0.95 }));
lawn.rotation.x = -Math.PI / 2;
lawn.receiveShadow = true;
scene.add(lawn);

function label(text, sub) {
  const tex = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,250,243,0.92)';
    ctx.beginPath();
    ctx.roundRect(8, 10, w - 16, h - 20, 40);
    ctx.fill();
    ctx.fillStyle = '#3b2b3f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${sub ? 40 : 48}px ${FONT}`;
    ctx.fillText(text, w / 2, sub ? h / 2 - 12 : h / 2 + 2);
    if (sub) {
      ctx.font = `500 26px ${FONT}`;
      ctx.fillStyle = '#8a6f80';
      ctx.fillText(sub, w / 2, h / 2 + 26);
    }
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(0.6, 0.15, 1);
  return s;
}

const tris = (o) => {
  let n = 0;
  o.traverse((m) => m.isMesh && (n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3));
  return Math.round(n);
};
const meshes = (o) => {
  let n = 0;
  o.traverse((m) => m.isMesh && n++);
  return n;
};

// What to show
const items = [];
const set = params.get('set') || 'all';
const ids = params.get('ids')?.split(',').filter(Boolean);
const spin = [];
if (params.has('box')) {
  const ks = (params.get('k') || '0,0.25,0.5,0.75,1').split(',').map(Number);
  const colors = [['#ef5b6f', '#ffd166'], ['#7fd3a7', '#ffffff'], ['#c7a6ff', '#ff6f91'], ['#6fb8ff', '#ffd166'], ['#ffd166', '#ef5b6f']];
  ks.forEach((k, i) => {
    const [c, r] = colors[i % colors.length];
    const box = makeGiftBox(c, r);
    box.open(k);
    items.push({ obj: box.root, name: `open(${k})`, id: 'box' });
  });
} else {
  const all = [...(set !== 'gift' ? FOODS.map((f) => ({ ...f, kind: 'food' })) : []), ...(set !== 'food' ? GIFTS.map((g) => ({ ...g, kind: 'gift' })) : [])];
  const list = ids ? ids.map((id) => all.find((a) => a.id === id) || { id, name: id, kind: FOODS.some((f) => f.id === id) ? 'food' : 'gift' }) : all;
  for (const it of list) items.push({ obj: it.kind === 'food' ? makeFood(it.id) : makeGift(it.id), name: it.name, id: it.id, kind: it.kind });
}

const n = items.length;
const cols = +(params.get('cols') || (n <= 3 ? n : n <= 8 ? Math.ceil(n / 2) : Math.ceil(Math.sqrt(n * 1.7))));
const rows = Math.ceil(n / cols);
const close = n <= 8;
const cell = params.has('box') ? 0.9 : close ? 0.5 : 0.8;
const stats = [];
items.forEach((it, i) => {
  const c = i % cols;
  const r = Math.floor(i / cols);
  const x = (c - (cols - 1) / 2) * cell;
  const z = (r - (rows - 1) / 2) * cell * 1.05;
  it.obj.position.set(x, 0, z);
  scene.add(it.obj);
  if (params.has('spin')) spin.push(it.obj);
  const t = tris(it.obj);
  stats.push({ id: it.id, tris: t, meshes: meshes(it.obj) });
  const l = label(it.name, params.has('stats') ? `${t} tris, ${meshes(it.obj)} meshes` : null);
  l.position.set(x, 0.02, z + cell * 0.42);
  if (close) l.scale.multiplyScalar(0.55);
  scene.add(l);
});

// Roji and Homama for scale
const looks = loadLooks();
const kids = [];
if (params.get('kids') !== '0') {
  const half = ((cols - 1) / 2) * cell;
  for (const [id, sx] of [['roji', -1], ['homama', 1]]) {
    const k = new Kid(looks[id]);
    k.root.position.set(sx * (half + cell * 0.9), 0, 0);
    k.root.rotation.y = -sx * 0.5;
    scene.add(k.root);
    kids.push(k);
  }
}

// Camera framing like the game: from the front and above
const width = cols * cell + (kids.length ? cell * 2.4 : 0);
const depth = rows * cell;
const zoom = +(params.get('zoom') || 1);
const aspect = innerWidth / innerHeight;
const fitW = width / 2 / Math.tan(THREE.MathUtils.degToRad(20)) / aspect;
const fitD = depth / 2 / Math.tan(THREE.MathUtils.degToRad(20));
const dist = Math.max(fitW, fitD * 1.1, 1.1) * 1.08 / zoom;
const pitch = THREE.MathUtils.degToRad(+(params.get('pitch') || 38));
const look = new THREE.Vector3(0, close ? 0.14 : 0.1, depth * 0.06);
camera.position.set(0, look.y + Math.sin(pitch) * dist, look.z + Math.cos(pitch) * dist);
camera.lookAt(look);
const half = Math.max(width, depth) * 0.75 + 1;
const sc = sun.shadow.camera;
sc.left = sc.bottom = -half;
sc.right = sc.top = half;
sc.near = 1;
sc.far = 60;
sc.updateProjectionMatrix();
sun.position.set(-11, 22, 12).normalize().multiplyScalar(25);

const timer = new THREE.Timer();
timer.connect(document);
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.getElapsed();
  for (const k of kids) k.update(dt, t, 0, 0, 0);
  for (const o of spin) o.rotation.y += dt * 0.6;
  renderer.render(scene, camera);
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.__props = { ready: true, stats, info: () => ({ ...renderer.info.render }), scene, camera };
console.log('props ready', n);
