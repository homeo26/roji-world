import * as THREE from 'three';
import { mat, mesh, canvasTexture, roundRect, FONT } from '../../util.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Every painted label of the zoo lives in one canvas, so all the sign faces merge into one draw call.
// atlas.plane(id, w, h) -> a plane showing that label; atlas.sign(id, opts) -> a wooden sign with it.

const W = 1024;
const H = 1024;
const REGIONS = {
  arch: [0, 0, 1024, 256],
  jodi: [0, 256, 512, 320],
  jouri: [512, 256, 512, 320],
  deck: [0, 576, 512, 112],
  photo: [512, 576, 512, 112],
  flamingo: [0, 688, 512, 112],
  tortoise: [512, 688, 512, 112],
  penguin: [0, 800, 512, 112],
  tickets: [512, 800, 256, 112],
  map: [768, 800, 256, 224],
  tagJodi: [0, 912, 256, 56],
  tagJouri: [256, 912, 256, 56],
  tagKids: [512, 912, 256, 56],
  deckSub: [0, 968, 512, 56],
  keeper: [512, 968, 256, 56],
};

const INK = '#4a3423';
const CREAM = '#f7ead2';

function board(ctx, w, h, border, r = 24) {
  ctx.fillStyle = CREAM;
  roundRect(ctx, 5, 5, w - 10, h - 10, r);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = border;
  ctx.stroke();
}

function text(ctx, s, x, y, size, color = INK, weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function fit(ctx, s, maxW, size) {
  ctx.font = `600 ${size}px ${FONT}`;
  const m = ctx.measureText(s).width;
  return m > maxW ? Math.floor((size * maxW) / m) : size;
}

function spot(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const rr = r * (0.82 + ((k * 37) % 5) * 0.06);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (k) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// A little painted giraffe face for the name signs
function portrait(ctx, cx, cy, who) {
  const jodi = who === 'jodi';
  const base = jodi ? '#f6deac' : '#ffe5a8';
  const sp = jodi ? '#a8562c' : '#e38e3d';
  ctx.save();
  ctx.fillStyle = jodi ? '#cfe6e2' : '#ffd9e3';
  ctx.beginPath();
  ctx.arc(cx, cy, 108, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  // neck
  ctx.fillStyle = base;
  ctx.fillRect(cx - 34, cy + 20, 68, 120);
  spot(ctx, cx - 10, cy + 70, 16, sp);
  spot(ctx, cx + 18, cy + 100, 13, sp);
  // ossicones
  ctx.strokeStyle = base;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + 22 * s, cy - 40);
    ctx.lineTo(cx + 30 * s, cy - 78);
    ctx.stroke();
    ctx.fillStyle = '#5a3420';
    ctx.beginPath();
    ctx.arc(cx + 31 * s, cy - 82, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  // ears
  ctx.fillStyle = base;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + 66 * s, cy - 30, 30, 12, s * (jodi ? 0.35 : -0.25), 0, Math.PI * 2);
    ctx.fill();
  }
  // head and muzzle
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 56, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  spot(ctx, cx - 28, cy - 38, 11, sp);
  spot(ctx, cx + 30, cy - 34, 9, sp);
  ctx.fillStyle = jodi ? '#fff2d9' : '#fff7e6';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 26, 44, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3420';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + 14 * s, cy + 18, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = jodi ? '#f4b9ae' : '#ff8fb1';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + 40 * s, cy + 12, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // eyes
  ctx.fillStyle = '#1d130f';
  ctx.strokeStyle = '#1d130f';
  ctx.lineWidth = 4;
  for (const s of [-1, 1]) {
    const ex = cx + 24 * s;
    const ey = cy - 14;
    if (!jodi && s === 1) {
      ctx.beginPath();
      ctx.arc(ex, ey + 2, 9, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      continue;
    }
    ctx.beginPath();
    ctx.ellipse(ex, ey, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 2.5, ey - 4, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d130f';
    if (jodi) {
      ctx.fillStyle = base;
      ctx.fillRect(ex - 10, ey - 13, 20, 9);
      ctx.fillStyle = '#1d130f';
      ctx.beginPath();
      ctx.moveTo(ex - 10, ey - 4);
      ctx.lineTo(ex + 10, ey - 4);
      ctx.stroke();
    }
    // lashes
    for (const k of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(ex + s * (6 + k * 2), ey - (jodi ? 4 : 8) + k * 3);
      ctx.lineTo(ex + s * (13 + k * 3), ey - (jodi ? 9 : 14) + k * 4);
      ctx.stroke();
    }
  }
  // brows
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#5a3420';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    const lift = jodi ? (s === -1 ? -10 : 0) : -4;
    ctx.moveTo(cx + 14 * s, cy - 32 + lift);
    ctx.lineTo(cx + 34 * s, cy - 32 + lift + (jodi ? (s === -1 ? -4 : 3) : 3));
    ctx.stroke();
  }
  // mouth
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (jodi) {
    ctx.moveTo(cx - 12, cy + 38);
    ctx.lineTo(cx + 12, cy + 38);
    ctx.stroke();
    // bow tie
    ctx.fillStyle = '#2c3e66';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 82);
    ctx.lineTo(cx - 28, cy + 68);
    ctx.lineTo(cx - 28, cy + 96);
    ctx.closePath();
    ctx.moveTo(cx, cy + 82);
    ctx.lineTo(cx + 28, cy + 68);
    ctx.lineTo(cx + 28, cy + 96);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.arc(cx, cy + 30, 16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#d465a8';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 52, 9, 13, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // flower
    ctx.fillStyle = '#ff8fb1';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx - 62 + Math.cos(a) * 10, cy - 52 + Math.sin(a) * 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(cx - 62, cy - 52, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const DRAW = {
  arch(ctx, w, h) {
    ctx.fillStyle = CREAM;
    roundRect(ctx, 6, 6, w - 12, h - 12, 60);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#21a99a';
    ctx.stroke();
    const cols = ['#e38e3d', '#a8562c', '#e38e3d'];
    for (let i = 0; i < 9; i++) {
      spot(ctx, 60 + i * 30, 50 + (i % 2) * 22, 11 + (i % 3) * 3, cols[i % 3]);
      spot(ctx, w - 60 - i * 30, h - 50 - (i % 2) * 22, 11 + (i % 3) * 3, cols[i % 3]);
    }
    text(ctx, 'WELCOME TO THE', w / 2, h * 0.3, 44, '#ef5b6f');
    text(ctx, 'Island Zoo', w / 2, h * 0.64, 116);
  },
  jodi(ctx, w, h) {
    board(ctx, w, h, '#7b4f2f', 30);
    portrait(ctx, 130, h / 2, 'jodi');
    text(ctx, 'THE SERIOUS ONE', 372, 78, 30, '#21a99a');
    text(ctx, 'Jodi', 372, 150, 92);
    text(ctx, 'Very polite. Likes', 372, 222, 30, '#7b5a3f', 500);
    text(ctx, 'neat little bites.', 372, 258, 30, '#7b5a3f', 500);
  },
  jouri(ctx, w, h) {
    board(ctx, w, h, '#7b4f2f', 30);
    portrait(ctx, 130, h / 2, 'jouri');
    text(ctx, 'THE SILLY ONE', 372, 78, 30, '#ef5b6f');
    text(ctx, 'Jouri', 372, 150, 92);
    text(ctx, 'Loves dancing.', 372, 222, 30, '#7b5a3f', 500);
    text(ctx, 'May lick you.', 372, 258, 30, '#7b5a3f', 500);
  },
  deck(ctx, w, h) {
    board(ctx, w, h, '#21a99a');
    text(ctx, 'Feeding Deck', w / 2, h / 2 + 3, 58);
  },
  deckSub(ctx, w, h) {
    ctx.fillStyle = '#21a99a';
    roundRect(ctx, 4, 4, w - 8, h - 8, 22);
    ctx.fill();
    text(ctx, 'Meet them at head height', w / 2, h / 2 + 2, 30, '#ffffff');
  },
  photo(ctx, w, h) {
    board(ctx, w, h, '#ef5b6f');
    text(ctx, 'Photo Spot', w / 2, h / 2 + 3, 60);
  },
  flamingo(ctx, w, h) {
    board(ctx, w, h, '#ff8fb1');
    text(ctx, 'Flamingo Pond', w / 2, h / 2 + 3, fit(ctx, 'Flamingo Pond', w - 60, 58));
  },
  tortoise(ctx, w, h) {
    board(ctx, w, h, '#7fae4e');
    text(ctx, 'Tortoise Garden', w / 2, h / 2 + 3, fit(ctx, 'Tortoise Garden', w - 60, 58));
  },
  penguin(ctx, w, h) {
    board(ctx, w, h, '#3f7bf0');
    text(ctx, 'Penguin Pool', w / 2, h / 2 + 3, 58);
  },
  tickets(ctx, w, h) {
    ctx.fillStyle = '#ffd166';
    roundRect(ctx, 4, 4, w - 8, h - 8, 26);
    ctx.fill();
    text(ctx, 'Tickets', w / 2, h / 2 + 3, 50);
  },
  keeper(ctx, w, h) {
    ctx.fillStyle = '#7a9a4f';
    roundRect(ctx, 4, 4, w - 8, h - 8, 20);
    ctx.fill();
    text(ctx, 'Keepers only', w / 2, h / 2 + 2, 30, '#ffffff');
  },
  map(ctx, w, h) {
    board(ctx, w, h, '#7b4f2f', 18);
    ctx.fillStyle = '#bfe3a0';
    roundRect(ctx, 18, 40, w - 36, h - 58, 14);
    ctx.fill();
    text(ctx, 'Zoo map', w / 2, 24, 26);
    ctx.fillStyle = '#ead39a';
    roundRect(ctx, 28, 50, 150, 60, 10);
    ctx.fill();
    ctx.fillStyle = '#bfe7f5';
    roundRect(ctx, 186, 50, 42, 60, 8);
    ctx.fill();
    ctx.fillStyle = '#86d4e4';
    ctx.beginPath();
    ctx.ellipse(66, 168, 34, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8fcf66';
    roundRect(ctx, 160, 148, 60, 42, 8);
    ctx.fill();
    ctx.fillStyle = '#f3dfb4';
    ctx.fillRect(116, 110, 24, 96);
    ctx.fillRect(28, 112, 200, 14);
    spot(ctx, 80, 78, 9, '#e38e3d');
    spot(ctx, 120, 86, 7, '#a8562c');
    ctx.fillStyle = '#ef5b6f';
    ctx.beginPath();
    ctx.arc(128, 196, 8, 0, Math.PI * 2);
    ctx.fill();
  },
};

function tag(label, color) {
  return (ctx, w, h) => {
    ctx.fillStyle = color;
    roundRect(ctx, 3, 3, w - 6, h - 6, 18);
    ctx.fill();
    text(ctx, label, w / 2, h / 2 + 2, 30, '#ffffff');
  };
}
DRAW.tagJodi = tag('Jodi 4.5 m', '#a8562c');
DRAW.tagJouri = tag('Jouri 4.0 m', '#e38e3d');
DRAW.tagKids = tag('You 1.4 m', '#ef5b6f');

export function makeAtlas() {
  const tex = canvasTexture(W, H, (ctx) => {
    for (const [id, [x, y, w, h]] of Object.entries(REGIONS)) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      DRAW[id](ctx, w, h);
      ctx.restore();
    }
  });
  const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 });
  const wood = mat('#9b6a43', { rough: 0.85 });
  const woodDark = mat('#7b4f2f', { rough: 0.85 });

  const plane = (id, w, h) => {
    const [rx, ry, rw, rh] = REGIONS[id];
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (rx + uv.getX(i) * rw) / W, 1 - (ry + rh) / H + (uv.getY(i) * rh) / H);
    return mesh(g, material, { cast: false });
  };

  // A wooden sign: two posts (unless post = 0), a backing board and the painted face
  const sign = (id, { w, h, post = 1.0, depth = 0.1 } = {}) => {
    const grp = new THREE.Group();
    if (post > 0) {
      for (const sx of [-w * 0.36, w * 0.36]) {
        const p = mesh(new THREE.BoxGeometry(0.11, post + h, 0.11), wood);
        p.position.set(sx, (post + h) / 2, -depth / 2 - 0.05);
        grp.add(p);
      }
    }
    const back = mesh(new RoundedBoxGeometry(w + 0.08, h + 0.08, depth, 2, 0.04), woodDark);
    back.position.set(0, post + h / 2, 0);
    const face = plane(id, w, h);
    face.position.set(0, post + h / 2, depth / 2 + 0.006);
    grp.add(back, face);
    return grp;
  };
  return { material, plane, sign };
}
