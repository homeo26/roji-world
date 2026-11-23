// Popcorn Catch: a cinema popcorn machine pops kernels; catch them in a striped bucket.
const ID = 'popcorn';
const C = '#e5484d';
const GAME_TIME = 45;
const GOAL = 60;
const FONT = 'Fredoka, ui-rounded, system-ui, sans-serif';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const KINDS = {
  plain: { fill: '#fffaf0', edge: '#e8c98a', pts: 1 },
  gold: { fill: '#ffd166', edge: '#e59a1a', pts: 5 },
  burnt: { fill: '#4a3833', edge: '#1f1513', pts: -3 },
};
const PUFFS = [
  [-0.42, 0.16, 0.6],
  [0.42, 0.16, 0.6],
  [0, -0.36, 0.62],
  [0, 0.4, 0.52],
  [-0.2, -0.06, 0.5],
  [0.22, -0.04, 0.48],
];

const CSS = `
.g-popcorn-root { position: absolute; inset: 0; font-family: var(--font); color: var(--ink); }
.g-popcorn-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.g-popcorn-intro { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(40, 16, 30, .35); padding: 10px; }
.g-popcorn-intro.hidden { display: none; }
.g-popcorn-card { background: var(--paper); border-radius: 24px; padding: 18px 24px 16px; box-shadow: var(--shadow); text-align: center; width: min(430px, 100%); }
.g-popcorn-faces { display: flex; justify-content: center; gap: 4px; }
.g-popcorn-card h3 { margin: 4px 0 2px; font-size: 1.45rem; color: ${C}; }
.g-popcorn-card p { margin: 0 0 8px; color: var(--ink-soft); line-height: 1.3; font-size: .95rem; }
.g-popcorn-legend { display: flex; justify-content: center; gap: 16px; margin: 4px 0 10px; }
.g-popcorn-legend span { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; }
.g-popcorn-legend .neg { color: #9a3b3b; }
.g-popcorn-best { margin-top: 8px; font-size: .85rem; color: var(--ink-soft); }
.g-popcorn-short .g-popcorn-card { width: min(620px, 100%); padding: 12px 18px; display: grid; grid-template-columns: auto 1fr; gap: 0 16px; align-items: center; text-align: left; }
.g-popcorn-short .g-popcorn-faces { grid-row: span 2; flex-direction: column; }
.g-popcorn-short .g-popcorn-card h3 { margin-top: 0; }
.g-popcorn-short .g-popcorn-legend { justify-content: flex-start; margin: 2px 0 8px; }
.g-popcorn-short .g-popcorn-go { display: flex; align-items: center; gap: 14px; }
.g-popcorn-short .g-popcorn-best { margin: 0; }
`;

function injectStyle() {
  if (document.getElementById('style-g-' + ID)) return;
  const s = document.createElement('style');
  s.id = 'style-g-' + ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function kernelSvg(kind, px) {
  const k = KINDS[kind];
  const circles = (r, f) => PUFFS.map(([x, y, s]) => `<circle cx="${20 + x * 16}" cy="${20 + y * 16}" r="${s * 16 + r}" fill="${f}"/>`).join('');
  return `<svg width="${px}" height="${px}" viewBox="0 0 40 40" aria-hidden="true">${circles(2, k.edge)}${circles(0, k.fill)}</svg>`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.createElement('div');
    root.className = 'g-popcorn-root';
    const how = api.isTouch ? 'Drag anywhere to move the bucket.' : 'Move the mouse, drag, or hold <kbd>&larr;</kbd> <kbd>&rarr;</kbd>.';
    root.innerHTML = `
      <canvas class="g-popcorn-cv" aria-label="Popcorn Catch play area"></canvas>
      <div class="g-popcorn-intro">
        <div class="g-popcorn-card">
          <div class="g-popcorn-faces">${api.avatar(api.me, 48)}${api.avatar(api.partner, 48)}</div>
          <div>
            <h3>Popcorn Catch</h3>
            <p>The movie starts in ${GAME_TIME} seconds. Catch popcorn for you and ${api.partner.name}: ${GOAL} points fills the bucket. ${how}</p>
            <div class="g-popcorn-legend">
              <span>${kernelSvg('plain', 28)}+1</span><span>${kernelSvg('gold', 28)}+5</span><span class="neg">${kernelSvg('burnt', 28)}-3</span>
            </div>
            <div class="g-popcorn-go">
              <button class="btn primary big g-popcorn-start" style="--c:${C}">Start</button>
              <div class="g-popcorn-best"></div>
            </div>
          </div>
        </div>
      </div>`;
    stage.appendChild(root);
    const cv = root.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const intro = root.querySelector('.g-popcorn-intro');
    const startBtn = root.querySelector('.g-popcorn-start');
    const bestEl = root.querySelector('.g-popcorn-best');

    let best = api.load('best', 0) || 0;
    bestEl.textContent = best ? `Best: ${best}` : 'Goal: ' + GOAL;

    // Layout in CSS pixels, recomputed on resize.
    let W = 1, H = 1;
    const L = {};
    function resize() {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      root.classList.toggle('g-popcorn-short', H < 440);
      L.floorY = H - clamp(H * 0.05, 12, 34);
      L.r = clamp(H * 0.036, 11, 18);
      L.bw = clamp(H * 0.2, 66, 128);
      L.bh = L.bw * 0.92;
      L.rimY = L.floorY - L.bh;
      L.wall = clamp(W * 0.05, 22, 64);
      L.mh = clamp(H * 0.3, 92, 196);
      L.mw = L.mh * 0.92;
      L.mx = W / 2;
      L.mtop = clamp(H * 0.035, 8, 26);
      L.g = H * 1.15;
      L.vt = H * 0.62;
      L.minX = L.wall + L.bw / 2;
      L.maxX = W - L.wall - L.bw / 2;
      targetX = clamp(targetX || W / 2, L.minX, L.maxX);
      bucketX = clamp(bucketX || W / 2, L.minX, L.maxX);
    }

    // Game state.
    let phase = 'intro'; // intro | play | ending | done
    let t = 0;
    let timeLeft = GAME_TIME;
    let spawnT = 0.6;
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let fullShown = false;
    let shake = 0;
    let popPulse = 0;
    let lastTick = 99;
    let endTimer = 0;
    let targetX = 0;
    let bucketX = 0;
    let banner = null;
    const keys = { l: false, r: false };
    const kernels = [];
    const landed = [];
    const floats = [];
    const sparks = [];
    // Heap puffs inside the bucket, lowest first, in bucket units.
    const heap = [];
    for (let i = 0; i < 34; i++) {
      const lvl = i / 34;
      const spread = 1 - lvl * 0.8;
      heap.push({ u: rand(-1, 1) * spread, v: lvl, rot: rand(0, 6.28), gold: Math.random() < 0.1 });
    }

    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    function setScore() {
      api.setScore(`${score} / ${GOAL}`);
    }

    function begin() {
      if (phase !== 'intro') return;
      api.sfx('tap');
      intro.classList.add('hidden');
      phase = 'play';
      timeLeft = GAME_TIME;
      setScore();
      banner = { text: 'Catch!', t: 0, life: 1.1 };
    }
    startBtn.addEventListener('click', begin);
    startBtn.focus();

    function spawn() {
      const prog = 1 - timeLeft / GAME_TIME;
      const roll = Math.random();
      const kind = roll < 0.1 ? 'gold' : roll < 0.1 + 0.12 + prog * 0.1 ? 'burnt' : 'plain';
      const side = Math.random() < 0.5 ? -1 : 1;
      kernels.push({
        kind,
        x: L.mx + side * rand(0, L.mw * 0.12),
        y: L.mtop + L.mh * 0.04,
        vx: side * rand(0.06, 1) * W * 0.3,
        vy: -rand(0.18, 0.4) * H,
        rot: rand(0, 6.28),
        spin: rand(-4, 4),
        r: L.r * (kind === 'gold' ? 1.05 : 1),
      });
      popPulse = 1;
    }

    function addFloat(text, x, y, color) {
      floats.push({ text, x, y, color, t: 0 });
    }

    function burst(x, y, color, n) {
      const count = reduce ? Math.ceil(n / 3) : n;
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(40, 140) * (H / 600);
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: rand(0.35, 0.7), color, r: rand(1.5, 3.2) });
      }
    }

    function onCatch(k) {
      if (k.kind === 'burnt') {
        score = Math.max(0, score - 3);
        combo = 0;
        shake = 0.35;
        api.sfx('bad');
        addFloat('-3', k.x, L.rimY - 10, '#ffb4b4');
        burst(k.x, L.rimY, '#6b5a55', 8);
      } else {
        combo++;
        maxCombo = Math.max(maxCombo, combo);
        const mult = combo >= 15 ? 3 : combo >= 6 ? 2 : 1;
        const pts = KINDS[k.kind].pts * mult;
        score += pts;
        api.sfx(k.kind === 'gold' ? 'coin' : 'pop');
        addFloat('+' + pts, k.x, L.rimY - 10, k.kind === 'gold' ? '#ffd166' : '#ffffff');
        burst(k.x, L.rimY, k.kind === 'gold' ? '#ffd166' : '#fff3c4', k.kind === 'gold' ? 12 : 6);
        if (!fullShown && score >= GOAL) {
          fullShown = true;
          banner = { text: 'Bucket full!', t: 0, life: 1.4 };
          api.sfx('good');
        }
      }
      setScore();
    }

    function endGame() {
      phase = 'ending';
      endTimer = 1.6;
      banner = { text: "Time's up!", t: 0, life: 1.6 };
      api.sfx('swoosh');
    }

    function finishGame() {
      phase = 'done';
      const win = score >= GOAL;
      const isBest = score > best;
      if (isBest) {
        best = score;
        api.save('best', best);
      }
      const comboText = maxCombo >= 3 ? ` Longest combo: ${maxCombo}.` : '';
      const bestText = isBest ? ' New best score!' : ` Best: ${best}.`;
      api.finish({
        win,
        title: win ? 'Bucket full!' : 'Not quite full',
        text: win
          ? `${score} points. ${api.me.name} and ${api.partner.name} have popcorn for the whole movie.${comboText}${bestText}`
          : `${score} of ${GOAL} points.${comboText}${bestText}`,
      });
    }

    function update(dt) {
      t += dt;
      popPulse = Math.max(0, popPulse - dt * 4);
      shake = Math.max(0, shake - dt);
      if (phase === 'play') {
        timeLeft -= dt;
        const sec = Math.ceil(timeLeft);
        if (sec <= 5 && sec < lastTick && sec > 0) {
          lastTick = sec;
          api.sfx('tick');
        }
        if (timeLeft <= 0) {
          timeLeft = 0;
          endGame();
        } else {
          spawnT -= dt;
          if (spawnT <= 0) {
            const prog = 1 - timeLeft / GAME_TIME;
            spawn();
            if (Math.random() < 0.1 + prog * 0.15) spawn();
            spawnT = lerp(0.78, 0.42, prog) * rand(0.75, 1.25);
          }
        }
      } else if (phase === 'ending') {
        endTimer -= dt;
        if (endTimer <= 0) finishGame();
      }

      const dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      if (dir && phase !== 'done') targetX = clamp(targetX + dir * W * 1.05 * dt, L.minX, L.maxX);
      bucketX += (targetX - bucketX) * (1 - Math.exp(-dt * 24));

      for (let i = kernels.length - 1; i >= 0; i--) {
        const k = kernels[i];
        const prevY = k.y;
        k.vy = Math.min(k.vy + L.g * dt, L.vt);
        k.vx *= 1 - 0.3 * dt;
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        k.rot += k.spin * dt;
        if (k.x < L.wall + k.r) {
          k.x = L.wall + k.r;
          k.vx = Math.abs(k.vx) * 0.55;
        } else if (k.x > W - L.wall - k.r) {
          k.x = W - L.wall - k.r;
          k.vx = -Math.abs(k.vx) * 0.55;
        }
        const live = phase === 'play' || phase === 'ending';
        if (live && k.vy > 0 && prevY < L.rimY && k.y >= L.rimY && Math.abs(k.x - bucketX) < L.bw * 0.5 + k.r * 0.25) {
          kernels.splice(i, 1);
          onCatch(k);
          continue;
        }
        if (k.y >= L.floorY - k.r * 0.5) {
          kernels.splice(i, 1);
          landed.push({ ...k, y: L.floorY - k.r * 0.5, t: 0 });
          if (k.kind !== 'burnt' && live && combo > 0) {
            if (combo >= 3) addFloat('combo lost', k.x, L.floorY - 30, '#ffd0d6');
            combo = 0;
          }
        }
      }
      for (let i = landed.length - 1; i >= 0; i--) {
        landed[i].t += dt;
        if (landed[i].t > 1.4) landed.splice(i, 1);
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].t += dt;
        if (floats[i].t > 0.9) floats.splice(i, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.t += dt;
        s.vy += H * 0.6 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.t > s.life) sparks.splice(i, 1);
      }
      if (banner) {
        banner.t += dt;
        if (banner.t > banner.life) banner = null;
      }
    }

    // ------------------------------------------------------------------ drawing
    function drawKernel(x, y, r, rot, kind, alpha = 1) {
      const k = KINDS[kind];
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = k.edge;
      for (const [px, py, s] of PUFFS) {
        ctx.beginPath();
        ctx.arc(px * r, py * r, s * r + 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = k.fill;
      for (const [px, py, s] of PUFFS) {
        ctx.beginPath();
        ctx.arc(px * r, py * r, s * r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (kind === 'plain') {
        ctx.fillStyle = '#f0b545';
        ctx.beginPath();
        ctx.arc(r * 0.1, r * 0.14, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = kind === 'burnt' ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.85)';
      ctx.beginPath();
      ctx.arc(-r * 0.18, -r * 0.5, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (kind === 'gold' && alpha > 0.5) {
        ctx.save();
        ctx.translate(x + r * 0.7, y - r * 0.7);
        ctx.rotate(t * 3);
        ctx.fillStyle = '#fff6c9';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const rr = i % 2 ? r * 0.12 : r * 0.42;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.fill();
        ctx.restore();
      }
      if (kind === 'burnt' && alpha > 0.5) {
        ctx.fillStyle = 'rgba(200,190,190,.35)';
        for (let i = 0; i < 3; i++) {
          const ph = (t * 1.6 + i / 3) % 1;
          ctx.beginPath();
          ctx.arc(x + Math.sin(ph * 6 + i) * r * 0.4, y - r - ph * r * 1.6, r * (0.2 + ph * 0.25), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawBackground() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#6b2440');
      g.addColorStop(1, '#3d1630');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // warm glow behind the machine
      const glow = ctx.createRadialGradient(L.mx, L.mtop + L.mh * 0.5, 10, L.mx, L.mtop + L.mh * 0.5, Math.max(W, H) * 0.5);
      glow.addColorStop(0, 'rgba(255,200,120,.32)');
      glow.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      // marquee bulbs along the top
      const step = clamp(W / 30, 22, 40);
      for (let x = step / 2, i = 0; x < W; x += step, i++) {
        const on = reduce ? i % 2 === 0 : (Math.floor(t * 3) + i) % 3 !== 0;
        ctx.fillStyle = on ? '#ffe7a3' : '#a2675a';
        ctx.beginPath();
        ctx.arc(x, 5, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // carpet
      ctx.fillStyle = '#b8323a';
      ctx.fillRect(0, L.floorY, W, H - L.floorY);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(0, L.floorY, W, 3);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      for (let x = 0; x < W; x += 18) ctx.fillRect(x, L.floorY + 8, 9, 3);
      // curtains
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? 0 : W;
        const cw = L.wall;
        const cg = ctx.createLinearGradient(x0, 0, x0 - side * cw, 0);
        cg.addColorStop(0, '#9e2233');
        cg.addColorStop(0.6, C);
        cg.addColorStop(1, '#c23443');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 - side * cw * 1.25, 0);
        ctx.quadraticCurveTo(x0 - side * cw * 0.7, H * 0.35, x0 - side * cw * 0.95, H * 0.55);
        ctx.quadraticCurveTo(x0 - side * cw * 1.15, H * 0.8, x0 - side * cw * 0.9, H);
        ctx.lineTo(x0, H);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,10,25,.35)';
        ctx.lineWidth = 2;
        for (let f = 0.3; f < 1; f += 0.3) {
          ctx.beginPath();
          ctx.moveTo(x0 - side * cw * f, 0);
          ctx.quadraticCurveTo(x0 - side * cw * f * 0.7, H * 0.4, x0 - side * cw * f * 0.8, H);
          ctx.stroke();
        }
        // tie-back
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.ellipse(x0 - side * cw * 0.8, H * 0.55, cw * 0.32, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawMachine() {
      const { mx: cx, mtop: top, mw, mh } = L;
      const rh = mh * 0.22;
      const gh = mh * 0.52;
      const bH = mh * 0.26;
      const gw = mw * 0.84;
      const gy = top + rh;
      // chimney
      ctx.fillStyle = '#ffd166';
      roundRect(ctx, cx - mw * 0.08, top - 2, mw * 0.16, rh * 0.3, 4);
      ctx.fill();
      // roof
      ctx.fillStyle = C;
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.3, top + rh * 0.12);
      ctx.lineTo(cx + mw * 0.3, top + rh * 0.12);
      ctx.lineTo(cx + mw * 0.5, top + rh);
      ctx.lineTo(cx - mw * 0.5, top + rh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(rh * 0.42)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('POPCORN', cx, top + rh * 0.6);
      // scalloped awning
      const n = 7;
      const sw = gw / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? '#fff' : C;
        ctx.beginPath();
        ctx.arc(cx - gw / 2 + sw * (i + 0.5), gy, sw / 2, 0, Math.PI);
        ctx.fill();
      }
      // glass cabinet
      ctx.fillStyle = 'rgba(255,236,205,.2)';
      roundRect(ctx, cx - gw / 2, gy, gw, gh, 4);
      ctx.fill();
      // popcorn heap inside
      for (let i = 0; i < 14; i++) {
        const u = (i % 7) / 6 - 0.5;
        const row = Math.floor(i / 7);
        drawKernel(cx + u * gw * 0.82, gy + gh - L.r * 0.6 - row * L.r * 0.9, L.r * 0.75, i, 'plain');
      }
      // kettle
      const swing = reduce ? 0 : Math.sin(t * 2.4) * 0.08 + popPulse * 0.25;
      ctx.save();
      ctx.translate(cx, gy + gh * 0.12);
      ctx.strokeStyle = '#d8d2da';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -gh * 0.12);
      ctx.lineTo(0, gh * 0.06);
      ctx.stroke();
      ctx.rotate(swing);
      const kw = gw * 0.42;
      const kh = gh * 0.34;
      ctx.fillStyle = '#c9c3cf';
      roundRect(ctx, -kw / 2, gh * 0.06, kw, kh, [3, 3, kh * 0.45, kh * 0.45]);
      ctx.fill();
      ctx.fillStyle = '#eeeaf1';
      roundRect(ctx, -kw / 2 + 3, gh * 0.06 + 3, kw * 0.25, kh * 0.6, 3);
      ctx.fill();
      ctx.restore();
      // glass frame and shine
      ctx.strokeStyle = '#b8323a';
      ctx.lineWidth = 3;
      roundRect(ctx, cx - gw / 2, gy, gw, gh, 4);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + gw * 0.3, gy + gh * 0.15);
      ctx.lineTo(cx + gw * 0.38, gy + gh * 0.45);
      ctx.stroke();
      // base cabinet
      ctx.fillStyle = C;
      roundRect(ctx, cx - mw * 0.46, gy + gh, mw * 0.92, bH, [2, 2, 8, 8]);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(cx - mw * 0.46, gy + gh, mw * 0.92, 3);
      ctx.fillStyle = '#c23443';
      roundRect(ctx, cx - mw * 0.2, gy + gh + bH * 0.25, mw * 0.4, bH * 0.55, 5);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(cx + mw * 0.13, gy + gh + bH * 0.52, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // pop puff
      if (popPulse > 0 && !reduce) {
        ctx.fillStyle = `rgba(255,250,235,${popPulse * 0.5})`;
        ctx.beginPath();
        ctx.arc(cx, top, mw * 0.1 * (1.6 - popPulse), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function bucketPath(x, top, bw, bh) {
      ctx.beginPath();
      ctx.moveTo(x - bw / 2, top);
      ctx.lineTo(x + bw / 2, top);
      ctx.lineTo(x + bw * 0.37, top + bh);
      ctx.lineTo(x - bw * 0.37, top + bh);
      ctx.closePath();
    }

    function drawBucket() {
      const { bw, bh, rimY: top } = L;
      const x = bucketX + (shake > 0 && !reduce ? Math.sin(t * 60) * shake * 10 : 0);
      const fill = clamp(score / GOAL, 0, 1.2);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(x, L.floorY + 2, bw * 0.45, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // inside
      ctx.fillStyle = '#7a2230';
      ctx.beginPath();
      ctx.ellipse(x, top, bw / 2, bh * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // popcorn heap above the rim
      const shown = Math.round(Math.min(1, fill) * heap.length);
      const domeH = bh * 0.62;
      for (let i = 0; i < shown; i++) {
        const p = heap[i];
        const lift = p.v * domeH * Math.min(1, fill + 0.15);
        drawKernel(x + p.u * bw * 0.42, top - lift + L.r * 0.2, L.r * 0.95, p.rot, p.gold ? 'gold' : 'plain');
      }
      // body with stripes
      ctx.save();
      bucketPath(x, top, bw, bh);
      ctx.clip();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - bw, top, bw * 2, bh);
      const stripes = 7;
      ctx.fillStyle = C;
      for (let i = 0; i < stripes; i += 2) {
        const a = i / stripes;
        const b = (i + 1) / stripes;
        ctx.beginPath();
        ctx.moveTo(x - bw / 2 + bw * a, top);
        ctx.lineTo(x - bw / 2 + bw * b, top);
        ctx.lineTo(x - bw * 0.37 + bw * 0.74 * b, top + bh);
        ctx.lineTo(x - bw * 0.37 + bw * 0.74 * a, top + bh);
        ctx.fill();
      }
      const sh = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
      sh.addColorStop(0, 'rgba(0,0,0,.12)');
      sh.addColorStop(0.35, 'rgba(255,255,255,.12)');
      sh.addColorStop(1, 'rgba(0,0,0,.18)');
      ctx.fillStyle = sh;
      ctx.fillRect(x - bw, top, bw * 2, bh);
      ctx.restore();
      ctx.strokeStyle = '#9e2233';
      ctx.lineWidth = 2;
      bucketPath(x, top, bw, bh);
      ctx.stroke();
      // rim
      ctx.fillStyle = '#fff';
      roundRect(ctx, x - bw * 0.54, top - 4, bw * 1.08, 9, 5);
      ctx.fill();
      ctx.stroke();
      // badge
      const by = top + bh * 0.52;
      const br = bw * 0.2;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(x, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9e2233';
      ctx.font = `700 ${Math.round(br * 0.78)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('POP', x, by + 1);
    }

    function pill(x, y, w, h, text, color = '#fff', bg = 'rgba(255,250,243,.95)') {
      ctx.fillStyle = bg;
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = `700 ${Math.round(h * 0.55)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    }

    function drawHud() {
      const h = clamp(H * 0.075, 26, 40);
      const x = L.wall + 8;
      const y = 14;
      const sec = Math.ceil(timeLeft);
      const low = phase === 'play' && sec <= 10;
      pill(x, y, h * 2.3, h, `0:${String(sec).padStart(2, '0')}`, low ? '#e5484d' : '#3b2b3f');
      // fill progress
      const bwid = h * 2.3;
      const fill = clamp(score / GOAL, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      roundRect(ctx, x, y + h + 6, bwid, 8, 4);
      ctx.fill();
      ctx.fillStyle = fill >= 1 ? '#ffd166' : '#fff3c4';
      roundRect(ctx, x, y + h + 6, Math.max(8, bwid * fill), 8, 4);
      ctx.fill();
      // combo
      if (combo >= 2 && phase !== 'intro') {
        const mult = combo >= 15 ? 3 : combo >= 6 ? 2 : 1;
        const label = mult > 1 ? `Combo ${combo}  x${mult}` : `Combo ${combo}`;
        ctx.font = `700 ${Math.round(h * 0.5)}px ${FONT}`;
        const tw = ctx.measureText(label).width + h;
        const cx = clamp(bucketX, L.wall + tw / 2, W - L.wall - tw / 2);
        pill(cx - tw / 2, L.rimY - L.bh * 0.62 - h * 1.5, tw, h * 0.8, label, mult > 1 ? '#9e2233' : '#3b2b3f', mult > 1 ? '#ffd166' : 'rgba(255,250,243,.9)');
      }
    }

    function draw() {
      ctx.save();
      drawBackground();
      drawMachine();
      for (const k of landed) drawKernel(k.x, k.y, k.r, k.rot, k.kind, clamp(1.4 - k.t, 0, 1));
      drawBucket();
      for (const k of kernels) drawKernel(k.x, k.y, k.r, k.rot, k.kind);
      for (const s of sparks) {
        ctx.globalAlpha = clamp(1 - s.t / s.life, 0, 1);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const f of floats) {
        ctx.globalAlpha = clamp(1 - f.t / 0.9, 0, 1);
        ctx.fillStyle = f.color;
        ctx.font = `700 ${Math.round(L.r * 1.5)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(60,20,40,.6)';
        ctx.lineWidth = 3;
        const fy = f.y - f.t * 40;
        ctx.strokeText(f.text, f.x, fy);
        ctx.fillText(f.text, f.x, fy);
      }
      ctx.globalAlpha = 1;
      if (phase !== 'intro') drawHud();
      if (banner) {
        const a = clamp(Math.min(banner.t / 0.15, (banner.life - banner.t) / 0.3), 0, 1);
        const s = reduce ? 1 : 0.8 + 0.2 * Math.min(1, banner.t / 0.2);
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate(W / 2, H * 0.55);
        ctx.scale(s, s);
        ctx.font = `700 ${Math.round(clamp(H * 0.11, 30, 72))}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#9e2233';
        ctx.strokeText(banner.text, 0, 0);
        ctx.fillStyle = '#ffd166';
        ctx.fillText(banner.text, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // ------------------------------------------------------------------ input
    function pointerX(e) {
      const r = cv.getBoundingClientRect();
      return e.clientX - r.left;
    }
    function onDown(e) {
      if (phase === 'intro') return;
      cv.setPointerCapture?.(e.pointerId);
      targetX = clamp(pointerX(e), L.minX, L.maxX);
    }
    function onMove(e) {
      if (phase === 'intro' || phase === 'done') return;
      if (e.pointerType !== 'mouse' && !e.buttons) return;
      targetX = clamp(pointerX(e), L.minX, L.maxX);
    }
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    const keyMap = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r' };
    function onKeyDown(e) {
      if (phase === 'intro' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        begin();
        return;
      }
      const k = keyMap[e.key];
      if (k) {
        keys[k] = true;
        e.preventDefault();
      }
    }
    function onKeyUp(e) {
      const k = keyMap[e.key];
      if (k) keys[k] = false;
    }
    function onBlur() {
      keys.l = keys.r = false;
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Test hook for the headless check (only with ?gdebug in the URL): x of the next good kernel.
    if (location.search.includes('gdebug')) {
      window.__popAuto = () => {
        let pick = null;
        for (const k of kernels) if (k.kind !== 'burnt' && k.y < L.rimY && k.vy > 0 && (!pick || k.y > pick.y)) pick = k;
        return pick ? pick.x : null;
      };
    }

    // ------------------------------------------------------------------ loop
    let raf = 0;
    let last = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      update(dt);
      draw();
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      delete window.__popAuto;
      root.remove();
    };
  },
};
