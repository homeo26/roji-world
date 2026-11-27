import * as THREE from 'three';

// Test hook helper for window.__patients.probe(): where the current step's things are on screen
// (CSS px), so a test can play it with real taps, drags and key presses.

const v = new THREE.Vector3();
const rect = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
};

export function probe(step, G) {
  if (!step) return null;
  const cam = G.camera;
  const S = (x, y, z = 0, surf = G.cursor.surface) => {
    surf.world(x, y, z, v).project(cam);
    return { x: Math.round((v.x * 0.5 + 0.5) * window.innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * window.innerHeight) };
  };
  const type = step.constructor.name;
  const o = { type, done: step.done, title: step.title, auto: G.auto };
  const dock = (sel) => rect(G.ui.dock.querySelector(sel));
  try {
    if (type === 'Triage') {
      o.right = rect(step.right[0].card.el);
      o.wrong = rect(step.waiting.find((w) => !step.right.includes(w))?.card.el);
    } else if (type === 'Thermo') {
      o.phase = step.phase;
      o.from = S(step.start.x, step.start.y);
      o.to = S(0, 0);
      o.temp = step.temp;
      o.final = step.spec.temp;
      o.hold = dock('.drs-hold');
    } else if (type === 'Steth') {
      o.from = S(G.cursor.x, G.cursor.y);
      o.to = S(step.spot.x, step.spot.y);
      o.found = step.found;
    } else if (type === 'Light') {
      const D = step.D;
      o.spots = step.pic.spots.map((s, i) => (step.found[i] ? null : S((s.u - 0.5) * D, (0.5 - s.v) * D))).filter(Boolean);
      o.from = S(G.cursor.x, G.cursor.y);
    } else if (type === 'Reflex') {
      o.ang = 0.5 - 0.5 * Math.cos(step.phase);
      o.hits = step.hits;
      o.btn = dock('.drs-btn');
    } else if (type === 'Xray') {
      o.targets = step.pic.targets.map((t, i) => (step.found[i] ? null : S((t.u - 0.5) * 0.92, (0.5 - t.v) * 0.72))).filter(Boolean);
      o.miss = S(0.4, -0.3);
    } else if (type === 'Clean') {
      const D = step.lens.D;
      o.dirt = step.pic.dirt.map((d, i) => (step.dirt[i] > 0 ? S((d.u - 0.5) * D, (0.5 - d.v) * D) : null)).filter(Boolean);
    } else if (type === 'Choice' || type === 'Handoff') {
      const id = type === 'Choice' ? step.right : step.want;
      o.right = rect(step.row.querySelector(`[data-id="${id}"]`));
      o.wrong = rect(step.row.querySelector(`.drs-card:not([data-id="${id}"])`));
    } else if (type === 'Cast') {
      o.centre = S(0, 0);
      const e = S(0.15, 0);
      o.r = Math.round(Math.hypot(e.x - o.centre.x, e.y - o.centre.y));
      o.k = step.total / step.need;
    } else if (type === 'Stitches' || type === 'Incise' || type === 'Close') {
      o.path = step.pts.map((p) => S(p.x, p.y));
      o.k = step.tr.k;
      o.ready = type !== 'Close' || step.closeT >= 1;
      o.lift = G.touch ? G.cursor.lift : 0;
    } else if (type === 'Bandage') {
      o.phase = step.phase;
      o.from = S(step.start.x, step.start.y);
      o.to = S(0, 0);
      o.hold = dock('.drs-hold');
    } else if (type === 'Dose') {
      o.right = step.right;
      o.value = step.slider.value;
      const r = step.slider.el.getBoundingClientRect();
      o.slider = { x0: r.left + 34, x1: r.right - 34, y: r.top + r.height / 2 };
      o.give = dock('.drs-btn');
    } else if (type === 'Calm') {
      const ph = ((Math.max(0, step.t) % step.cycle) / step.cycle);
      o.wantIn = step.t >= 0 && ph < 0.5;
      o.hold = dock('.drs-hold');
    } else if (type === 'Shot') {
      o.s = 3.2 - step.k * 2.6;
      o.btn = dock('.drs-btn');
    } else if (type === 'Scrub') {
      o.centre = S(0, 0);
      o.foam = step.foam;
    } else if (type === 'Sleep') {
      o.ph = step.t / step.beat;
      o.btn = dock('.drs-btn');
    } else if (type === 'Remove') {
      const pic = G.op.pic;
      const b = step.b;
      const it = step.held || step.items.find((x) => !x.out);
      o.held = !!step.held;
      o.left = step.items.filter((x) => !x.out).length;
      if (it) {
        const ch = pic.channels[step.items.indexOf(it)];
        const pts = [pic.lift];
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          pts.push({ u: (1 - t) * (1 - t) * ch[0].u + 2 * (1 - t) * t * ch[1].u + t * t * ch[2].u, v: (1 - t) * (1 - t) * ch[0].v + 2 * (1 - t) * t * ch[1].v + t * t * ch[2].v });
        }
        o.path = pts.map((p) => {
          const l = b.local(p.u, p.v);
          return S(l.x, l.y);
        });
        o.tip = S(b.local(step.tip.u, step.tip.v).x, b.local(step.tip.u, step.tip.v).y);
      }
      o.touches = step.touches;
      o.lift = G.touch ? G.cursor.lift : 0;
    } else if (type === 'Vitals') {
      o.hr = step.mon.hr;
      o.lo = step.mon.lo;
      o.hi = step.mon.hi;
      o.drift = step.drift;
      o.calm = rect(step.btn.els.calm);
      o.boost = rect(step.btn.els.boost);
    } else if (type === 'Sticker') {
      o.to = S(step.goal.x, step.goal.y);
    }
    // How far a touch lift moves the tool up the screen (the tool sits above the finger)
    if (G.cursor.surface && G.touch && G.cursor.lift) {
      const a = S(0, 0);
      const b2 = S(0, G.cursor.lift);
      o.liftPx = Math.round(a.y - b2.y);
    }
  } catch (e) {
    o.err = e.message;
  }
  return o;
}
