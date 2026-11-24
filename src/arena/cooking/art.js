import { PAL } from '../../interiors/yumyum/theme.js';

// Small hand-drawn pictures for Roji's YumYum Kitchen: every ingredient, every dish, the cooking
// steps and a few signs. Used by the order tickets, the recipe cards and the icons over pots and plates.

const TAU = Math.PI * 2;
export const INK = '#5a3242';

function line(c, s) {
  c.lineWidth = Math.max(1.5, s * 0.045);
  c.strokeStyle = INK;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
function ell(c, x, y, rx, ry, fill, rot = 0, stroke = true) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) c.stroke();
}
function shine(c, x, y, r) {
  c.save();
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath();
  c.ellipse(x, y, r, r * 0.6, -0.6, 0, TAU);
  c.fill();
  c.restore();
}
function leaf(c, x, y, len, w, rot, fill = '#4fae5a') {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -w, len, 0);
  c.quadraticCurveTo(len * 0.5, w, 0, 0);
  c.fillStyle = fill;
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(len * 0.1, 0);
  c.lineTo(len * 0.85, 0);
  c.lineWidth *= 0.6;
  c.stroke();
  c.restore();
}
function bowl(c, x, y, s, fill, rim = '#ffffff', band = PAL.ink) {
  // y: the rim line
  c.beginPath();
  c.moveTo(x - s * 0.42, y);
  c.quadraticCurveTo(x - s * 0.4, y + s * 0.34, x, y + s * 0.34);
  c.quadraticCurveTo(x + s * 0.4, y + s * 0.34, x + s * 0.42, y);
  c.closePath();
  c.fillStyle = rim;
  c.fill();
  c.stroke();
  c.save();
  c.clip();
  c.fillStyle = band;
  c.fillRect(x - s * 0.5, y + s * 0.12, s, s * 0.05);
  c.restore();
  ell(c, x, y, s * 0.42, s * 0.1, fill);
}

// ---------------------------------------------------------------- ingredients
const DRAW = {
  tomato(c, x, y, s) {
    ell(c, x, y + s * 0.04, s * 0.34, s * 0.3, '#ec4b4b');
    shine(c, x - s * 0.13, y - s * 0.06, s * 0.08);
    c.fillStyle = '#4fae5a';
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * TAU;
      c.lineTo(x + Math.cos(a) * s * 0.14, y - s * 0.22 + Math.sin(a) * s * 0.07);
      const b = a + TAU / 10;
      c.lineTo(x + Math.cos(b) * s * 0.05, y - s * 0.22 + Math.sin(b) * s * 0.03);
    }
    c.closePath();
    c.fill();
    c.stroke();
  },
  cucumber(c, x, y, s) {
    ell(c, x, y, s * 0.4, s * 0.15, '#4f9e45', -0.5);
    c.save();
    c.translate(x, y);
    c.rotate(-0.5);
    c.strokeStyle = '#8fd07a';
    c.lineWidth = s * 0.03;
    for (const dy of [-0.05, 0.04]) {
      c.beginPath();
      c.moveTo(-s * 0.28, dy * s);
      c.lineTo(s * 0.28, dy * s);
      c.stroke();
    }
    c.restore();
    line(c, s);
    ell(c, x + s * 0.32, y - s * 0.18, s * 0.07, s * 0.06, '#d6f0a8', -0.5);
  },
  lettuce(c, x, y, s) {
    for (const [dx, dy, r, f] of [[-0.18, 0.06, 0.2, '#5fb64e'], [0.18, 0.06, 0.2, '#5fb64e'], [0, -0.1, 0.22, '#7ccc5a'], [0, 0.1, 0.22, '#93db6e']]) ell(c, x + dx * s, y + dy * s, r * s, r * s * 0.9, f);
    c.beginPath();
    c.moveTo(x, y + s * 0.26);
    c.lineTo(x, y - s * 0.05);
    c.stroke();
  },
  onion(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y - s * 0.36);
    c.quadraticCurveTo(x + s * 0.06, y - s * 0.24, x + s * 0.3, y - s * 0.02);
    c.quadraticCurveTo(x + s * 0.36, y + s * 0.3, x, y + s * 0.3);
    c.quadraticCurveTo(x - s * 0.36, y + s * 0.3, x - s * 0.3, y - s * 0.02);
    c.quadraticCurveTo(x - s * 0.06, y - s * 0.24, x, y - s * 0.36);
    c.fillStyle = '#b05a9a';
    c.fill();
    c.stroke();
    c.strokeStyle = '#e3a2d2';
    c.lineWidth = s * 0.025;
    for (const k of [0.12, 0.22]) {
      c.beginPath();
      c.ellipse(x, y + s * 0.05, k * s, s * 0.22, 0, -Math.PI * 0.9, -Math.PI * 0.1);
      c.stroke();
    }
    line(c, s);
  },
  lemon(c, x, y, s) {
    ell(c, x, y + s * 0.03, s * 0.34, s * 0.25, '#ffe066', -0.2);
    ell(c, x + s * 0.33, y - s * 0.04, s * 0.05, s * 0.04, '#ffd23f', -0.2);
    shine(c, x - s * 0.12, y - s * 0.06, s * 0.07);
    leaf(c, x - s * 0.18, y - s * 0.18, s * 0.26, s * 0.1, -2.4);
  },
  lamb(c, x, y, s) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.6);
    ell(c, s * 0.3, 0, s * 0.07, s * 0.1, '#fff6e6');
    c.fillStyle = '#fff6e6';
    c.fillRect(s * 0.08, -s * 0.04, s * 0.24, s * 0.08);
    c.strokeRect(s * 0.08, -s * 0.04, s * 0.24, s * 0.08);
    ell(c, -s * 0.06, 0, s * 0.24, s * 0.2, '#d9616b');
    ell(c, -s * 0.06, 0, s * 0.14, s * 0.11, '#f29aa0', 0, false);
    c.restore();
  },
  chicken(c, x, y, s) {
    c.save();
    c.translate(x, y);
    c.rotate(0.6);
    ell(c, s * 0.3, 0, s * 0.06, s * 0.09, '#fff6e6');
    c.fillStyle = '#fff6e6';
    c.fillRect(s * 0.1, -s * 0.035, s * 0.2, s * 0.07);
    c.strokeRect(s * 0.1, -s * 0.035, s * 0.2, s * 0.07);
    ell(c, -s * 0.06, 0, s * 0.25, s * 0.19, '#f6c9a8');
    shine(c, -s * 0.12, -s * 0.06, s * 0.07);
    c.restore();
  },
  patty(c, x, y, s) {
    ell(c, x, y + s * 0.05, s * 0.36, s * 0.2, '#e48a8a');
    ell(c, x, y, s * 0.36, s * 0.2, '#f0a3a3');
    c.fillStyle = '#c86a6a';
    for (const [a, b] of [[-0.15, -0.03], [0.1, 0.05], [0.2, -0.06], [-0.05, 0.08], [0.02, -0.08]]) {
      c.beginPath();
      c.arc(x + a * s, y + b * s, s * 0.022, 0, TAU);
      c.fill();
    }
  },
  bread(c, x, y, s) {
    ell(c, x, y + s * 0.04, s * 0.4, s * 0.22, '#e7c27f');
    ell(c, x, y, s * 0.4, s * 0.22, '#f6dfa8');
    c.fillStyle = '#c9944b';
    for (const [a, b] of [[-0.2, 0], [0.05, -0.08], [0.18, 0.06], [-0.04, 0.1], [0.26, -0.04]]) {
      c.beginPath();
      c.ellipse(x + a * s, y + b * s, s * 0.035, s * 0.02, 0, 0, TAU);
      c.fill();
    }
  },
  bun(c, x, y, s) {
    c.beginPath();
    c.moveTo(x - s * 0.38, y + s * 0.14);
    c.quadraticCurveTo(x - s * 0.38, y - s * 0.28, x, y - s * 0.28);
    c.quadraticCurveTo(x + s * 0.38, y - s * 0.28, x + s * 0.38, y + s * 0.14);
    c.closePath();
    c.fillStyle = '#e9a548';
    c.fill();
    c.stroke();
    ell(c, x, y + s * 0.2, s * 0.37, s * 0.07, '#f6cd8c');
    c.fillStyle = '#fff4d6';
    for (const [a, b] of [[-0.18, -0.06], [0, -0.16], [0.17, -0.05], [-0.06, 0.02], [0.08, -0.02]]) {
      c.beginPath();
      c.ellipse(x + a * s, y + b * s, s * 0.03, s * 0.016, a, 0, TAU);
      c.fill();
    }
    shine(c, x - s * 0.15, y - s * 0.14, s * 0.07);
  },
  rice(c, x, y, s) {
    // a little sack
    c.beginPath();
    c.moveTo(x - s * 0.3, y + s * 0.3);
    c.quadraticCurveTo(x - s * 0.36, y - s * 0.12, x - s * 0.14, y - s * 0.2);
    c.lineTo(x + s * 0.14, y - s * 0.2);
    c.quadraticCurveTo(x + s * 0.36, y - s * 0.12, x + s * 0.3, y + s * 0.3);
    c.closePath();
    c.fillStyle = '#e8d3ad';
    c.fill();
    c.stroke();
    ell(c, x, y - s * 0.2, s * 0.17, s * 0.06, '#fffaf0');
    c.fillStyle = PAL.ink;
    c.fillRect(x - s * 0.18, y - s * 0.12, s * 0.36, s * 0.05);
    c.fillStyle = '#fffaf0';
    for (const [a, b] of [[-0.06, -0.22], [0.05, -0.21], [0, -0.25]]) {
      c.beginPath();
      c.ellipse(x + a * s, y + b * s, s * 0.03, s * 0.015, a * 9, 0, TAU);
      c.fill();
    }
  },
  lentils(c, x, y, s) {
    bowl(c, x, y - s * 0.02, s * 0.9, '#e8973a', '#fff7ea', PAL.olive);
    c.fillStyle = '#f5b25c';
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.arc(x + Math.cos(i * 2.4) * s * 0.22 * ((i % 3) / 3 + 0.3), y - s * 0.04 + Math.sin(i * 2.4) * s * 0.05, s * 0.03, 0, TAU);
      c.fill();
    }
  },
  mint(c, x, y, s) {
    leaf(c, x - s * 0.02, y + s * 0.2, s * 0.42, s * 0.16, -1.2, '#3fae6a');
    leaf(c, x + s * 0.02, y + s * 0.2, s * 0.38, s * 0.15, -2.0, '#5cc584');
    leaf(c, x, y + s * 0.22, s * 0.3, s * 0.12, -0.4, '#2f9a5a');
  },
  ice(c, x, y, s) {
    for (const [dx, dy, r] of [[-0.12, 0.06, -0.2], [0.13, -0.04, 0.25]]) {
      c.save();
      c.translate(x + dx * s, y + dy * s);
      c.rotate(r);
      c.fillStyle = '#d6f1ff';
      c.beginPath();
      c.roundRect(-s * 0.15, -s * 0.15, s * 0.3, s * 0.3, s * 0.06);
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.fillRect(-s * 0.09, -s * 0.1, s * 0.07, s * 0.04);
      c.restore();
    }
  },
  jameed(c, x, y, s) {
    ell(c, x - s * 0.1, y + s * 0.06, s * 0.2, s * 0.19, '#f7f1e1');
    ell(c, x + s * 0.15, y - s * 0.04, s * 0.17, s * 0.16, '#fffaf0');
    c.fillStyle = '#e3d8bd';
    for (const [a, b] of [[-0.15, 0.1], [0.12, -0.08], [-0.05, 0.0], [0.2, 0.02]]) {
      c.beginPath();
      c.arc(x + a * s, y + b * s, s * 0.02, 0, TAU);
      c.fill();
    }
  },
  toum(c, x, y, s) {
    // a small cup of garlic sauce and a bulb
    bowl(c, x - s * 0.06, y, s * 0.7, '#fffdf2', PAL.blush, PAL.ink);
    c.beginPath();
    c.moveTo(x + s * 0.22, y - s * 0.32);
    c.quadraticCurveTo(x + s * 0.45, y - s * 0.12, x + s * 0.3, y + s * 0.04);
    c.quadraticCurveTo(x + s * 0.22, y + s * 0.08, x + s * 0.14, y + s * 0.04);
    c.quadraticCurveTo(x + s * 0.0, y - s * 0.12, x + s * 0.22, y - s * 0.32);
    c.fillStyle = '#fbf3e6';
    c.fill();
    c.stroke();
  },
  soup(c, x, y, s) {
    bowl(c, x, y, s, '#e8973a', '#fff7ea', PAL.ink);
    c.fillStyle = '#ffd09a';
    c.beginPath();
    c.ellipse(x - s * 0.12, y - s * 0.01, s * 0.08, s * 0.025, 0, 0, TAU);
    c.fill();
    ell(c, x + s * 0.12, y + s * 0.0, s * 0.04, s * 0.02, '#4fae5a', 0.3, false);
    c.strokeStyle = 'rgba(255,255,255,.9)';
    c.lineWidth = s * 0.03;
    for (const dx of [-0.12, 0.06]) {
      c.beginPath();
      c.moveTo(x + dx * s, y - s * 0.12);
      c.bezierCurveTo(x + (dx - 0.06) * s, y - s * 0.2, x + (dx + 0.06) * s, y - s * 0.26, x + dx * s, y - s * 0.34);
      c.stroke();
    }
    line(c, s);
  },
  'rice:cooked'(c, x, y, s) {
    bowl(c, x, y + s * 0.02, s, '#fffaf0', '#fff7ea', PAL.olive);
    c.beginPath();
    c.ellipse(x, y + s * 0.02, s * 0.34, s * 0.22, 0, Math.PI, TAU);
    c.fillStyle = '#fffcf3';
    c.fill();
    c.stroke();
    c.fillStyle = '#e8dcc0';
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.ellipse(x + Math.cos(i * 1.7) * s * 0.18, y - s * 0.07 + Math.sin(i * 1.7) * s * 0.05, s * 0.025, s * 0.012, i, 0, TAU);
      c.fill();
    }
  },
  stew(c, x, y, s) {
    bowl(c, x, y, s, '#f7f1e1', '#fff7ea', PAL.ink);
    for (const [a, b] of [[-0.15, 0], [0.08, -0.02], [0.2, 0.01], [-0.02, 0.03]]) ell(c, x + a * s, y + b * s, s * 0.06, s * 0.04, '#9a4a3a');
  },
  lemonade(c, x, y, s) {
    c.beginPath();
    c.moveTo(x - s * 0.22, y - s * 0.32);
    c.lineTo(x - s * 0.17, y + s * 0.34);
    c.lineTo(x + s * 0.17, y + s * 0.34);
    c.lineTo(x + s * 0.22, y - s * 0.32);
    c.closePath();
    c.fillStyle = '#eef9ff';
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = '#e4ef9a';
    c.fillRect(x - s * 0.3, y - s * 0.16, s * 0.6, s * 0.6);
    c.fillStyle = 'rgba(255,255,255,.65)';
    c.fillRect(x - s * 0.12, y - s * 0.08, s * 0.1, s * 0.1);
    c.fillRect(x + s * 0.03, y + s * 0.06, s * 0.09, s * 0.09);
    c.restore();
    c.stroke();
    leaf(c, x + s * 0.02, y - s * 0.16, s * 0.24, s * 0.09, -2.1, '#3fae6a');
    ell(c, x + s * 0.2, y - s * 0.3, s * 0.11, s * 0.11, '#ffe066');
    ell(c, x + s * 0.2, y - s * 0.3, s * 0.06, s * 0.06, '#fff4b0', 0, false);
    c.strokeStyle = PAL.ink;
    c.lineWidth = s * 0.04;
    c.beginPath();
    c.moveTo(x - s * 0.05, y + s * 0.1);
    c.lineTo(x - s * 0.14, y - s * 0.44);
    c.stroke();
    line(c, s);
  },
  burnt(c, x, y, s) {
    ell(c, x, y + s * 0.06, s * 0.32, s * 0.18, '#3b2a22');
    c.fillStyle = '#5a463c';
    c.beginPath();
    c.ellipse(x - s * 0.1, y + s * 0.02, s * 0.08, s * 0.04, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(120,110,110,.7)';
    for (const [a, b, r] of [[-0.1, -0.2, 0.1], [0.08, -0.3, 0.12], [-0.02, -0.4, 0.09]]) {
      c.beginPath();
      c.arc(x + a * s, y + b * s, r * s, 0, TAU);
      c.fill();
    }
  },
};
DRAW['chicken:sliced'] = (c, x, y, s) => {
  for (const [dx, dy, r] of [[-0.12, 0.08, -0.3], [0.05, -0.02, 0.2], [0.16, 0.1, -0.1]]) ell(c, x + dx * s, y + dy * s, s * 0.17, s * 0.07, '#b8733f', r);
  for (const [dx, dy] of [[-0.12, 0.06], [0.05, -0.04]]) ell(c, x + dx * s, y + dy * s, s * 0.08, s * 0.02, '#d99a5e', 0, false);
};
DRAW['patty:cooked'] = (c, x, y, s) => {
  ell(c, x, y + s * 0.05, s * 0.36, s * 0.2, '#6a3420');
  ell(c, x, y, s * 0.36, s * 0.2, '#8a4a2a');
  c.strokeStyle = '#4a2416';
  c.lineWidth = s * 0.035;
  for (const k of [-0.12, 0.02, 0.16]) {
    c.beginPath();
    c.moveTo(x + (k - 0.1) * s, y + s * 0.08);
    c.lineTo(x + (k + 0.1) * s, y - s * 0.08);
    c.stroke();
  }
  line(c, s);
};
function chopped(base, colors) {
  return (c, x, y, s) => {
    const pts = [[-0.2, 0.08], [0.0, 0.12], [0.2, 0.06], [-0.1, -0.08], [0.1, -0.06], [0.02, 0.0]];
    pts.forEach(([a, b], i) => {
      c.save();
      c.translate(x + a * s, y + b * s);
      c.rotate(i * 0.9);
      c.fillStyle = colors[i % colors.length];
      c.beginPath();
      c.roundRect(-s * 0.08, -s * 0.06, s * 0.16, s * 0.12, s * 0.03);
      c.fill();
      c.stroke();
      c.restore();
    });
  };
}
DRAW['tomato:chopped'] = chopped('tomato', ['#ec4b4b', '#f26b5e', '#d93c3c']);
DRAW['cucumber:chopped'] = (c, x, y, s) => {
  for (const [a, b] of [[-0.18, 0.06], [0.02, 0.1], [0.2, 0.04], [-0.06, -0.08], [0.12, -0.08]]) {
    ell(c, x + a * s, y + b * s, s * 0.1, s * 0.08, '#4f9e45');
    ell(c, x + a * s, y + b * s, s * 0.065, s * 0.05, '#cdeea0', 0, false);
  }
};
DRAW['lettuce:chopped'] = chopped('lettuce', ['#7ccc5a', '#93db6e', '#5fb64e']);
DRAW['onion:chopped'] = chopped('onion', ['#b05a9a', '#e3a2d2', '#c873b2']);
DRAW['lamb:chopped'] = chopped('lamb', ['#d9616b', '#e57d84', '#c84f5a']);
DRAW['lemon:chopped'] = (c, x, y, s) => {
  for (const [a, b] of [[-0.14, 0.05], [0.14, 0.0]]) {
    ell(c, x + a * s, y + b * s, s * 0.17, s * 0.17, '#ffd23f');
    ell(c, x + a * s, y + b * s, s * 0.12, s * 0.12, '#fff4b0', 0, false);
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      c.moveTo(x + a * s, y + b * s);
      c.lineTo(x + a * s + Math.cos((i / 6) * TAU) * s * 0.11, y + b * s + Math.sin((i / 6) * TAU) * s * 0.11);
    }
    c.lineWidth *= 0.6;
    c.stroke();
    line(c, s);
  }
};

// ---------------------------------------------------------------- dishes
const DISHES = {
  fattoush(c, x, y, s) {
    bowl(c, x, y, s * 1.05, '#8fd07a', '#fff7ea', PAL.ink);
    for (const [a, b, f] of [[-0.2, -0.03, '#ec4b4b'], [0.12, -0.05, '#ec4b4b'], [0.0, 0.02, '#4f9e45'], [0.24, 0.0, '#cdeea0'], [-0.08, -0.08, '#f6dfa8'], [0.08, 0.04, '#f6dfa8']]) {
      c.fillStyle = f;
      c.beginPath();
      c.roundRect(x + a * s - s * 0.05, y + b * s - s * 0.035, s * 0.1, s * 0.07, s * 0.02);
      c.fill();
      c.stroke();
    }
    leaf(c, x - s * 0.3, y - s * 0.06, s * 0.2, s * 0.07, -0.6, '#5fb64e');
  },
  wrap(c, x, y, s) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.35);
    c.beginPath();
    c.roundRect(-s * 0.38, -s * 0.13, s * 0.72, s * 0.26, s * 0.13);
    c.fillStyle = '#f2d59a';
    c.fill();
    c.stroke();
    ell(c, -s * 0.38, 0, s * 0.07, s * 0.13, '#b8733f');
    c.fillStyle = '#fffaf0';
    c.beginPath();
    c.moveTo(s * 0.02, -s * 0.15);
    c.lineTo(s * 0.38, -s * 0.15);
    c.lineTo(s * 0.38, s * 0.15);
    c.lineTo(s * 0.02, s * 0.15);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = PAL.ink;
    c.fillRect(s * 0.1, -s * 0.15, s * 0.05, s * 0.3);
    c.restore();
  },
  burger(c, x, y, s) {
    ell(c, x, y + s * 0.26, s * 0.34, s * 0.07, '#f6cd8c');
    c.fillStyle = '#7ccc5a';
    c.beginPath();
    for (let i = 0; i <= 8; i++) c.lineTo(x - s * 0.38 + (i / 8) * s * 0.76, y + s * 0.13 + (i % 2 ? s * 0.05 : 0));
    c.lineTo(x + s * 0.36, y + s * 0.22);
    c.lineTo(x - s * 0.36, y + s * 0.22);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.roundRect(x - s * 0.36, y + s * 0.03, s * 0.72, s * 0.12, s * 0.06);
    c.fillStyle = '#7a3f22';
    c.fill();
    c.stroke();
    c.fillStyle = '#ec4b4b';
    c.beginPath();
    c.roundRect(x - s * 0.3, y - s * 0.02, s * 0.6, s * 0.06, s * 0.03);
    c.fill();
    c.stroke();
    DRAW.bun(c, x, y - s * 0.1, s * 0.9);
  },
  mansaf(c, x, y, s) {
    ell(c, x, y + s * 0.1, s * 0.46, s * 0.18, '#d9a441');
    ell(c, x, y + s * 0.06, s * 0.44, s * 0.16, '#fff3d6');
    c.beginPath();
    c.ellipse(x, y + s * 0.06, s * 0.36, s * 0.3, 0, Math.PI, TAU);
    c.fillStyle = '#fff4cf';
    c.fill();
    c.stroke();
    for (const [a, b] of [[-0.16, -0.06], [0.1, -0.12], [0.0, -0.02], [0.2, -0.02], [-0.06, -0.16]]) ell(c, x + a * s, y + b * s, s * 0.07, s * 0.05, '#9a4a3a');
    c.fillStyle = '#c98a5a';
    for (const [a, b] of [[-0.1, -0.18], [0.14, -0.06], [0.05, -0.2], [-0.2, 0.0]]) {
      c.beginPath();
      c.ellipse(x + a * s, y + b * s, s * 0.025, s * 0.012, a * 7, 0, TAU);
      c.fill();
    }
    leaf(c, x + s * 0.02, y - s * 0.22, s * 0.12, s * 0.05, -1.4, '#4fae5a');
  },
};
DISHES.soup = DRAW.soup;
DISHES.lemonade = DRAW.lemonade;

// ---------------------------------------------------------------- steps and signs
const STEP = {
  chop(c, x, y, s) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.7);
    c.beginPath();
    c.moveTo(-s * 0.05, -s * 0.36);
    c.quadraticCurveTo(s * 0.16, -s * 0.2, s * 0.1, s * 0.06);
    c.lineTo(-s * 0.05, s * 0.06);
    c.closePath();
    c.fillStyle = '#e8edf2';
    c.fill();
    c.stroke();
    c.beginPath();
    c.roundRect(-s * 0.06, s * 0.06, s * 0.12, s * 0.28, s * 0.04);
    c.fillStyle = '#b8743a';
    c.fill();
    c.stroke();
    c.restore();
  },
  pan(c, x, y, s) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.4);
    c.fillStyle = '#4b4248';
    c.beginPath();
    c.roundRect(s * 0.18, -s * 0.04, s * 0.26, s * 0.08, s * 0.04);
    c.fill();
    c.stroke();
    ell(c, -s * 0.06, 0, s * 0.26, s * 0.24, '#4b4248');
    ell(c, -s * 0.06, 0, s * 0.18, s * 0.16, '#6a6168', 0, false);
    c.restore();
  },
  pot(c, x, y, s) {
    c.beginPath();
    c.roundRect(x - s * 0.3, y - s * 0.16, s * 0.6, s * 0.4, s * 0.08);
    c.fillStyle = '#9aa3ad';
    c.fill();
    c.stroke();
    ell(c, x, y - s * 0.16, s * 0.32, s * 0.08, '#d7dde3');
    for (const k of [-1, 1]) {
      c.beginPath();
      c.roundRect(x + k * s * 0.3 - (k < 0 ? s * 0.1 : 0), y - s * 0.08, s * 0.1, s * 0.06, s * 0.03);
      c.fillStyle = '#4b4248';
      c.fill();
      c.stroke();
    }
  },
  jug(c, x, y, s) {
    c.beginPath();
    c.moveTo(x - s * 0.2, y - s * 0.3);
    c.lineTo(x + s * 0.18, y - s * 0.3);
    c.lineTo(x + s * 0.14, y + s * 0.14);
    c.lineTo(x - s * 0.16, y + s * 0.14);
    c.closePath();
    c.fillStyle = '#eef9ff';
    c.fill();
    c.stroke();
    c.beginPath();
    c.roundRect(x - s * 0.24, y + s * 0.14, s * 0.46, s * 0.18, s * 0.05);
    c.fillStyle = PAL.ink;
    c.fill();
    c.stroke();
    ell(c, x, y + s * 0.23, s * 0.04, s * 0.04, '#ffffff', 0, false);
  },
  spit(c, x, y, s) {
    c.fillStyle = '#9aa3ad';
    c.fillRect(x - s * 0.02, y - s * 0.4, s * 0.04, s * 0.78);
    c.beginPath();
    c.moveTo(x - s * 0.22, y - s * 0.28);
    c.lineTo(x + s * 0.22, y - s * 0.28);
    c.lineTo(x + s * 0.14, y + s * 0.26);
    c.lineTo(x - s * 0.14, y + s * 0.26);
    c.closePath();
    c.fillStyle = '#c47a42';
    c.fill();
    c.stroke();
    c.strokeStyle = '#8d4f26';
    for (const k of [-0.12, 0.02, 0.16]) {
      c.beginPath();
      c.moveTo(x - s * 0.18, y + k * s);
      c.lineTo(x + s * 0.18, y + k * s);
      c.stroke();
    }
    line(c, s);
  },
  wash(c, x, y, s) {
    ell(c, x, y + s * 0.05, s * 0.34, s * 0.22, '#ffffff');
    ell(c, x, y + s * 0.05, s * 0.2, s * 0.12, '#f1ece6', 0, false);
    for (const [a, b, r] of [[-0.2, -0.2, 0.08], [0.0, -0.28, 0.1], [0.2, -0.18, 0.07]]) ell(c, x + a * s, y + b * s, r * s, r * s, 'rgba(190,230,255,.9)');
  },
  warn(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y - s * 0.36);
    c.lineTo(x + s * 0.38, y + s * 0.3);
    c.lineTo(x - s * 0.38, y + s * 0.3);
    c.closePath();
    c.fillStyle = '#ffb02e';
    c.fill();
    c.stroke();
    c.fillStyle = INK;
    c.beginPath();
    c.roundRect(x - s * 0.04, y - s * 0.16, s * 0.08, s * 0.26, s * 0.04);
    c.fill();
    c.beginPath();
    c.arc(x, y + s * 0.19, s * 0.045, 0, TAU);
    c.fill();
  },
  fire(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y - s * 0.4);
    c.bezierCurveTo(x + s * 0.3, y - s * 0.1, x + s * 0.32, y + s * 0.34, x, y + s * 0.34);
    c.bezierCurveTo(x - s * 0.32, y + s * 0.34, x - s * 0.3, y - s * 0.06, x - s * 0.08, y - s * 0.18);
    c.bezierCurveTo(x - s * 0.06, y - s * 0.04, x + s * 0.04, y - s * 0.12, x, y - s * 0.4);
    c.fillStyle = '#ff7a2e';
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(x, y - s * 0.06);
    c.bezierCurveTo(x + s * 0.16, y + s * 0.08, x + s * 0.14, y + s * 0.28, x, y + s * 0.28);
    c.bezierCurveTo(x - s * 0.14, y + s * 0.28, x - s * 0.16, y + s * 0.1, x, y - s * 0.06);
    c.fillStyle = '#ffd23f';
    c.fill();
  },
  check(c, x, y, s) {
    ell(c, x, y, s * 0.34, s * 0.34, '#7cc95a');
    c.strokeStyle = '#ffffff';
    c.lineWidth = s * 0.09;
    c.beginPath();
    c.moveTo(x - s * 0.15, y);
    c.lineTo(x - s * 0.03, y + s * 0.13);
    c.lineTo(x + s * 0.17, y - s * 0.12);
    c.stroke();
    line(c, s);
  },
  plate(c, x, y, s) {
    ell(c, x, y + s * 0.04, s * 0.4, s * 0.24, '#ffffff');
    ell(c, x, y + s * 0.04, s * 0.26, s * 0.15, '#f6efe8', 0, false);
    c.strokeStyle = PAL.band;
    c.lineWidth = s * 0.03;
    c.beginPath();
    c.ellipse(x, y + s * 0.04, s * 0.33, s * 0.195, 0, 0, TAU);
    c.stroke();
    line(c, s);
  },
};

// Draw any picture by key: an ingredient ('tomato'), a part ('tomato:chopped'), a dish ('dish:burger'),
// a step ('step:chop') or a sign ('step:warn').
export function draw(c, key, x, y, s) {
  c.save();
  line(c, s);
  const [kind, id] = key.includes(':') && (key.startsWith('dish:') || key.startsWith('step:')) ? key.split(':') : [null, key];
  const fn = kind === 'dish' ? DISHES[id] : kind === 'step' ? STEP[id] : DRAW[id] || DRAW[id?.split(':')[0]];
  fn?.(c, x, y, s);
  c.restore();
}

const urls = new Map();
// A PNG data URL of a picture, for the HTML tickets and cards.
export function url(key, px = 96) {
  const k = `${key}@${px}`;
  if (urls.has(k)) return urls.get(k);
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  draw(cv.getContext('2d'), key, px / 2, px / 2, px * 0.92);
  const u = cv.toDataURL();
  urls.set(k, u);
  return u;
}

// ---------------------------------------------------------------- the icon atlas for the 3D bubbles
// Every icon is drawn on a round white bubble. Returns { canvas, index(key), cols, rows }.
export const ICONS = [
  'tomato', 'cucumber', 'lettuce', 'onion', 'lemon', 'lamb', 'chicken', 'patty', 'bread', 'bun', 'rice', 'lentils', 'mint', 'ice', 'jameed', 'toum',
  'tomato:chopped', 'cucumber:chopped', 'lettuce:chopped', 'onion:chopped', 'lemon:chopped', 'lamb:chopped', 'chicken:sliced', 'patty:cooked',
  'soup', 'rice:cooked', 'stew', 'lemonade', 'burnt', 'step:warn', 'step:fire', 'step:check',
  'dish:fattoush', 'dish:wrap', 'dish:burger', 'dish:mansaf', 'step:plate', 'step:chop', 'step:wash', 'step:spit',
];
export function buildAtlas(cell = 128) {
  const cols = 8;
  const rows = Math.ceil(ICONS.length / cols);
  const cv = document.createElement('canvas');
  cv.width = cols * cell;
  cv.height = rows * cell;
  const c = cv.getContext('2d');
  ICONS.forEach((key, i) => {
    const x = (i % cols) * cell + cell / 2;
    const y = Math.floor(i / cols) * cell + cell / 2;
    const warn = key === 'step:warn' || key === 'step:fire';
    c.fillStyle = warn ? '#fff1e0' : '#fffdf8';
    c.strokeStyle = warn ? '#e5484d' : PAL.band;
    c.lineWidth = cell * 0.06;
    c.beginPath();
    c.arc(x, y, cell * 0.44, 0, TAU);
    c.fill();
    c.stroke();
    draw(c, key, x, y, cell * 0.7);
  });
  return { canvas: cv, cols, rows, index: (k) => ICONS.indexOf(k) };
}
