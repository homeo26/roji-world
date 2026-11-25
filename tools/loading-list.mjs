// Writes loading.json: every file the game needs before the start screen can say "Start the journey",
// with its size, so the loading screen can show a real percentage. Run from the project root with
// `node tools/loading-list.mjs` after adding or removing modules (the publish step runs it too).
//
// It follows the static imports from src/main.js, adds the places and interiors that src/engine/manifest.js
// loads at start-up (3D games and town life modules load later, in the background, so they are left out),
// and the stylesheet, its fonts and the images in assets/.
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const IMPORT_MAP = { three: 'vendor/three/build/three.module.js', 'three/addons/': 'vendor/three/addons/' };
const files = new Map(); // project-relative path -> size in bytes

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const add = (p) => {
  const abs = path.join(ROOT, p);
  if (!files.has(p) && fs.existsSync(abs) && fs.statSync(abs).isFile()) files.set(p, fs.statSync(abs).size);
};

function resolve(spec, fromFile) {
  if (spec in IMPORT_MAP) return IMPORT_MAP[spec];
  for (const [k, v] of Object.entries(IMPORT_MAP)) if (k.endsWith('/') && spec.startsWith(k)) return v + spec.slice(k.length);
  if (spec.startsWith('.') || spec.startsWith('/')) return rel(path.resolve(path.dirname(path.join(ROOT, fromFile)), spec));
  return null;
}

// Static imports and re-exports only: dynamic import() calls load later (games, films, props on demand)
const IMPORT_RE = /\b(?:import|export)\s*(?:[\w*{}\s,$]+?\s*from\s*)?['"]([^'"\n]+)['"]/g;
function crawl(p) {
  if (files.has(p)) return;
  add(p);
  if (!files.has(p) || !p.endsWith('.js')) return;
  const src = fs
    .readFileSync(path.join(ROOT, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const m of src.matchAll(IMPORT_RE)) {
    const r = resolve(m[1], p);
    if (r) crawl(r);
  }
}

crawl('src/main.js');

// Places and interiors that Spaces.load() imports before the game is ready
const manifest = fs.readFileSync(path.join(ROOT, 'src/engine/manifest.js'), 'utf8');
for (const list of ['PLACES', 'INTERIORS']) {
  const block = manifest.match(new RegExp(`export const ${list} = \\[([\\s\\S]*?)\\n\\];`))?.[1] || '';
  for (const line of block.split('\n')) {
    const m = line.match(/module: '([^']+)'/);
    if (m && !/dev: true/.test(line)) crawl(resolve(m[1], 'src/engine/manifest.js'));
  }
}

// The stylesheet, the fonts it uses, and the images the start-up code draws with
add('index.html');
add('style.css');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (!m[1].startsWith('data:')) add(rel(path.resolve(ROOT, m[1])));
const walk = (dir) => {
  if (!fs.existsSync(path.join(ROOT, dir))) return;
  for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${f.name}`;
    if (f.isDirectory()) walk(p);
    else if (/\.(png|jpe?g|webp|svg)$/i.test(f.name)) add(p);
  }
};
walk('assets');

const list = [...files].map(([p, s]) => [p, s]).sort((a, b) => b[1] - a[1]);
const total = list.reduce((a, [, s]) => a + s, 0);
fs.writeFileSync(path.join(ROOT, 'loading.json'), JSON.stringify({ total, files: Object.fromEntries(list) }) + '\n');
console.log(`loading.json: ${list.length} files, ${(total / 1024 / 1024).toFixed(2)} MB`);
