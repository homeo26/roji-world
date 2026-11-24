// Family pictures drawn on a canvas: the photos in the hallway (Roji as a baby, her graduation,
// the wedding...), the album pages, Roji's old school drawing on the fridge and the family photo.
import { FONT, roundRect } from './kit.js';
import { LOOKS } from './family.js';

const P = Math.PI;

// A little chibi person. s: head radius in pixels. o: { scarf, cap, veil, gown, baby, jump, eyesShut, dress }
export function drawPerson(c, x, y, s, look, o = {}) {
  const skin = look.skin || '#f8dccb';
  const hair = look.hair || '#2a1a13';
  const top = o.top || look.top || '#ef5b6f';
  const girl = look.gender === 'girl';
  c.save();
  c.translate(x, y - (o.jump || 0));
  // Body
  c.fillStyle = o.gown ? '#2c2a4a' : o.dress ? o.dress : top;
  c.beginPath();
  if (girl || o.gown || o.dress) {
    c.moveTo(-s * 0.55, s * 0.9);
    c.lineTo(s * 0.55, s * 0.9);
    c.lineTo(s * 1.0, s * 2.7);
    c.lineTo(-s * 1.0, s * 2.7);
  } else {
    roundRect(c, -s * 0.72, s * 0.9, s * 1.44, s * 1.5, s * 0.35);
  }
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(70,40,40,0.35)';
  c.lineWidth = Math.max(1.5, s * 0.07);
  c.stroke();
  if (!girl && !o.gown && !o.dress) {
    c.fillStyle = look.bottom || '#2c3e66';
    c.fillRect(-s * 0.62, s * 2.25, s * 0.52, s * 0.7);
    c.fillRect(s * 0.1, s * 2.25, s * 0.52, s * 0.7);
  }
  // Arms
  c.fillStyle = skin;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.arc(k * s * 0.82, s * 1.6 - (o.armsUp ? s * 1.1 : 0), s * 0.2, 0, P * 2);
    c.fill();
  }
  // Head
  c.fillStyle = skin;
  c.beginPath();
  c.arc(0, 0, s, 0, P * 2);
  c.fill();
  c.strokeStyle = 'rgba(70,40,40,0.3)';
  c.lineWidth = Math.max(1.5, s * 0.06);
  c.stroke();
  // Hair, scarf, bald crown
  const style = look.hairstyle;
  if (o.scarf) {
    c.fillStyle = o.scarf;
    c.beginPath();
    c.arc(0, -s * 0.05, s * 1.14, P * 1.02, P * 1.98);
    c.lineTo(s * 1.14, s * 0.4);
    c.quadraticCurveTo(s * 1.0, s * 1.4, 0, s * 1.35);
    c.quadraticCurveTo(-s * 1.0, s * 1.4, -s * 1.14, s * 0.4);
    c.closePath();
    c.fill();
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(0, s * 0.12, s * 0.7, s * 0.82, 0, 0, P * 2);
    c.fill();
  } else if (style === 'bald') {
    c.fillStyle = hair;
    for (const k of [-1, 1]) {
      c.beginPath();
      c.ellipse(k * s * 0.9, s * 0.0, s * 0.22, s * 0.42, 0, 0, P * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(-s * 0.3, -s * 0.6, s * 0.28, s * 0.14, -0.4, 0, P * 2);
    c.fill();
  } else if (!o.baby || o.babyHair) {
    c.fillStyle = hair;
    c.beginPath();
    c.arc(0, -s * 0.1, s * 1.05, P * 1.05, P * 1.95);
    c.quadraticCurveTo(s * 0.4, -s * 0.5, -s * 1.02, -s * 0.25);
    c.closePath();
    c.fill();
    if (girl && style === 'pigtails') {
      for (const k of [-1, 1]) {
        c.beginPath();
        c.ellipse(k * s * 1.1, s * 0.35, s * 0.3, s * 0.48, k * 0.3, 0, P * 2);
        c.fill();
      }
    } else if (girl) {
      c.fillRect(-s * 1.04, -s * 0.2, s * 0.3, s * 1.1);
      c.fillRect(s * 0.74, -s * 0.2, s * 0.3, s * 1.1);
    } else if (style === 'curly') {
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.arc(-s * 0.75 + i * s * 0.3, -s * 0.75 + Math.sin(i) * s * 0.06, s * 0.24, 0, P * 2);
        c.fill();
      }
    }
  } else {
    c.fillStyle = hair;
    c.beginPath();
    c.arc(0, -s * 0.85, s * 0.18, 0, P * 2);
    c.fill();
  }
  if (o.veil) {
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath();
    c.moveTo(-s * 0.6, -s * 0.9);
    c.quadraticCurveTo(-s * 1.8, s * 1.2, -s * 1.3, s * 2.6);
    c.lineTo(s * 1.3, s * 2.6);
    c.quadraticCurveTo(s * 1.8, s * 1.2, s * 0.6, -s * 0.9);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(0, -s * 0.95, s * 0.16, 0, P * 2);
    c.fill();
  }
  if (o.cap) {
    c.fillStyle = '#2c2a4a';
    c.beginPath();
    c.moveTo(-s * 1.3, -s * 0.85);
    c.lineTo(0, -s * 1.35);
    c.lineTo(s * 1.3, -s * 0.85);
    c.lineTo(0, -s * 0.45);
    c.closePath();
    c.fill();
    c.strokeStyle = '#ffd166';
    c.lineWidth = s * 0.08;
    c.beginPath();
    c.moveTo(s * 0.2, -s * 0.85);
    c.lineTo(s * 1.0, -s * 0.4);
    c.lineTo(s * 1.0, s * 0.1);
    c.stroke();
  }
  // Face
  c.fillStyle = '#1d130f';
  for (const k of [-1, 1]) {
    c.beginPath();
    if (o.eyesShut) c.ellipse(k * s * 0.36, s * 0.05, s * 0.14, s * 0.04, 0, 0, P * 2);
    else c.ellipse(k * s * 0.36, s * 0.05, s * 0.11, s * 0.15, 0, 0, P * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(255,120,140,0.45)';
  for (const k of [-1, 1]) {
    c.beginPath();
    c.arc(k * s * 0.58, s * 0.35, s * 0.15, 0, P * 2);
    c.fill();
  }
  c.strokeStyle = '#b23a48';
  c.lineWidth = Math.max(1.5, s * 0.08);
  c.beginPath();
  c.arc(0, s * 0.32, s * 0.2, 0.15 * P, 0.85 * P);
  c.stroke();
  if (look.mustache) {
    c.fillStyle = hair;
    c.beginPath();
    c.ellipse(-s * 0.16, s * 0.26, s * 0.2, s * 0.08, 0.2, 0, P * 2);
    c.ellipse(s * 0.16, s * 0.26, s * 0.2, s * 0.08, -0.2, 0, P * 2);
    c.fill();
  }
  if (look.beard) {
    c.fillStyle = hair;
    c.beginPath();
    c.arc(0, s * 0.15, s * 0.98, 0.1 * P, 0.9 * P);
    c.quadraticCurveTo(0, s * 0.75, s * 0.96, s * 0.45);
    c.fill();
  }
  c.restore();
}

function frame(c, w, h, bg = '#fff3e0') {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, h);
  c.fillStyle = bg;
  c.fillRect(w * 0.06, h * 0.06, w * 0.88, h * 0.72);
}

const ROJI = { id: 'roji', name: 'Roji', gender: 'girl', skin: '#f8dccb', hair: '#2a1a13', hairstyle: 'pigtails', top: '#ef5b6f' };
const HOMAMA = { id: 'homama', name: 'Homama', gender: 'boy', skin: '#f6d8c6', hair: '#141010', hairstyle: 'short', top: '#3f7bf0', bottom: '#2c3e66' };
const look = (id, looks) => (id === 'roji' ? looks?.roji || ROJI : id === 'homama' ? looks?.homama || HOMAMA : LOOKS[id]);
const opts = (id) => (id === 'hanan' ? { scarf: '#e7a1bd', dress: LOOKS.hanan.top } : {});

// The photos on the hallway wall and in the album. kind: 'baby' | 'graduation' | 'wedding' | 'kids' | 'sultan' | 'garden'
export const PHOTOS = {
  baby: 'Roji, three months old, already holding a spoon like a stethoscope.',
  kids: 'Roji and Basem at the beach. Basem buried her shoes.',
  graduation: "Dr. Roji's graduation day. Odeh cried twice.",
  wedding: 'Roji and Homama on their wedding day. Hanan danced all night.',
  sultan: "Sultan's first steps. Straight into the cake.",
  garden: "Odeh's first tomato. He named it.",
};

export function drawPhoto(c, w, h, kind, looks) {
  const bgs = { baby: '#ffe4ec', kids: '#cdeffa', graduation: '#e8e2ff', wedding: '#fff0d6', sultan: '#e4f6dc', garden: '#fff3c4' };
  frame(c, w, h, bgs[kind]);
  const s = h * 0.085;
  const base = h * 0.4;
  if (kind === 'baby') {
    drawPerson(c, w * 0.42, base, s * 1.2, LOOKS.hanan, opts('hanan'));
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(w * 0.6, base + s * 1.8, s * 1.3, s * 0.8, -0.3, 0, P * 2);
    c.fill();
    drawPerson(c, w * 0.6, base + s * 1.0, s * 0.7, ROJI, { baby: true, eyesShut: true, dress: '#ffd1dc' });
  } else if (kind === 'kids') {
    c.fillStyle = '#f7e3b8';
    c.fillRect(w * 0.06, h * 0.6, w * 0.88, h * 0.18);
    drawPerson(c, w * 0.35, base + s, s * 0.9, { ...ROJI, top: '#ffd166' });
    drawPerson(c, w * 0.64, base + s * 0.8, s, { ...LOOKS.basem, beard: false, top: '#7fd3ff' });
  } else if (kind === 'graduation') {
    drawPerson(c, w * 0.3, base, s * 1.15, LOOKS.odeh);
    drawPerson(c, w * 0.52, base + s * 0.2, s, look('roji', looks), { gown: true, cap: true });
    drawPerson(c, w * 0.74, base, s * 1.1, LOOKS.hanan, opts('hanan'));
  } else if (kind === 'wedding') {
    drawPerson(c, w * 0.38, base + s * 0.2, s * 1.05, look('roji', looks), { veil: true, dress: '#ffffff' });
    drawPerson(c, w * 0.62, base + s * 0.1, s * 1.05, { ...look('homama', looks), top: '#2c2a4a', bottom: '#2c2a4a' });
    c.fillStyle = '#ef5b6f';
    heart(c, w * 0.5, base - s * 1.6, s * 0.5);
  } else if (kind === 'sultan') {
    c.fillStyle = '#ffffff';
    roundRect(c, w * 0.56, base + s * 1.6, s * 2.2, s * 1.1, s * 0.2);
    c.fill();
    c.fillStyle = '#ff8fb1';
    roundRect(c, w * 0.56, base + s * 1.6, s * 2.2, s * 0.35, s * 0.15);
    c.fill();
    drawPerson(c, w * 0.42, base + s * 1.2, s * 0.8, LOOKS.sultan, { armsUp: true });
  } else if (kind === 'garden') {
    drawPerson(c, w * 0.42, base, s * 1.15, LOOKS.odeh, { armsUp: true });
    c.fillStyle = '#e5484d';
    c.beginPath();
    c.arc(w * 0.66, base - s * 0.3, s * 0.7, 0, P * 2);
    c.fill();
    c.fillStyle = '#4f9a55';
    c.fillRect(w * 0.64, base - s * 1.1, s * 0.12, s * 0.4);
  }
  c.fillStyle = '#5a4652';
  c.font = `600 ${Math.round(h * 0.075)}px ${FONT}`;
  c.textAlign = 'center';
  c.fillText({ baby: 'Roji, 3 months', kids: 'Aqaba, summer', graduation: 'Dr. Roji!', wedding: 'The wedding', sultan: 'First steps', garden: 'The first tomato' }[kind], w / 2, h * 0.91);
}

function heart(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.3);
  c.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  c.fill();
}

// Roji's old school drawing: Baba, Mama and little Roji with a doctor's bag, in crayon
export function drawSchoolDrawing(c, w, h) {
  c.fillStyle = '#fffdf6';
  c.fillRect(0, 0, w, h);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const crayon = (col, wd = 6) => {
    c.strokeStyle = col;
    c.lineWidth = wd;
  };
  // Sun with rays
  crayon('#ffb000', 7);
  c.beginPath();
  c.arc(w * 0.85, h * 0.18, h * 0.08, 0, P * 2);
  c.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * P * 2;
    c.beginPath();
    c.moveTo(w * 0.85 + Math.cos(a) * h * 0.11, h * 0.18 + Math.sin(a) * h * 0.11);
    c.lineTo(w * 0.85 + Math.cos(a) * h * 0.16, h * 0.18 + Math.sin(a) * h * 0.16);
    c.stroke();
  }
  // Grass
  crayon('#3fbf7f', 6);
  for (let x = 10; x < w; x += 18) {
    c.beginPath();
    c.moveTo(x, h * 0.92);
    c.lineTo(x + 6, h * 0.84);
    c.stroke();
  }
  // Stick people
  const fig = (x, hh, col, extra) => {
    crayon(col, 6);
    c.beginPath();
    c.arc(x, h * 0.92 - hh, hh * 0.18, 0, P * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(x, h * 0.92 - hh * 0.82);
    c.lineTo(x, h * 0.92 - hh * 0.35);
    c.lineTo(x - hh * 0.14, h * 0.92);
    c.moveTo(x, h * 0.92 - hh * 0.35);
    c.lineTo(x + hh * 0.14, h * 0.92);
    c.moveTo(x - hh * 0.2, h * 0.92 - hh * 0.62);
    c.lineTo(x + hh * 0.2, h * 0.92 - hh * 0.62);
    c.stroke();
    extra?.(x, h * 0.92 - hh);
  };
  fig(w * 0.24, h * 0.5, '#7a4a26', (x, y) => {
    crayon('#3b2b3f', 5);
    c.beginPath();
    c.moveTo(x - 12, y + 10);
    c.lineTo(x + 12, y + 10);
    c.stroke();
  });
  fig(w * 0.46, h * 0.47, '#d9477a', (x, y) => {
    crayon('#f4a3c0', 6);
    c.beginPath();
    c.arc(x, y, h * 0.11, P * 1.05, P * 1.95);
    c.stroke();
  });
  fig(w * 0.66, h * 0.3, '#ef5b6f', (x, y) => {
    crayon('#e5484d', 5);
    c.strokeRect(x + 14, h * 0.92 - h * 0.18, 20, 14);
    c.beginPath();
    c.moveTo(x + 24, h * 0.92 - h * 0.18 + 2);
    c.lineTo(x + 24, h * 0.92 - h * 0.18 + 12);
    c.moveTo(x + 19, h * 0.92 - h * 0.18 + 7);
    c.lineTo(x + 29, h * 0.92 - h * 0.18 + 7);
    c.stroke();
  });
  c.fillStyle = '#3f7bf0';
  c.font = `700 ${Math.round(h * 0.09)}px ${FONT}`;
  c.textAlign = 'left';
  c.fillText('BABA  MAMA  ME', w * 0.06, h * 0.15);
  c.fillStyle = '#e5484d';
  c.font = `700 ${Math.round(h * 0.07)}px ${FONT}`;
  c.fillText('I will be a DOKTOR', w * 0.06, h * 0.26);
}

// The family photo taken in the courtyard: Roji and Homama in the middle, Sultan mid-jump
export function drawFamilyPhoto(looks, ids, { night = false, n = 1 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = 600;
  cv.height = 460;
  const c = cv.getContext('2d');
  frame(c, 600, 460, night ? '#3b3f7a' : '#bfe6f0');
  // The house behind them
  c.fillStyle = night ? '#a99c86' : '#ead6b4';
  c.fillRect(60, 110, 480, 240);
  c.fillStyle = '#2f86c8';
  roundRect(c, 270, 118, 60, 100, 30);
  c.fill();
  c.fillStyle = night ? '#ffd27a' : '#ffe9b0';
  for (const x of [120, 430]) {
    roundRect(c, x, 170, 50, 70, 24);
    c.fill();
  }
  const order = ['odeh', 'roji', 'homama', 'hanan', ...(ids.includes('basem') ? ['basem'] : [])];
  const xs = order.length === 5 ? [110, 220, 320, 420, 515] : [140, 250, 350, 460];
  order.forEach((id, i) => {
    const big = id === 'odeh' || id === 'hanan' || id === 'basem' ? 1.15 : 1;
    drawPerson(c, xs[i], 200, 30 * big, look(id, looks), { ...opts(id), armsUp: id === 'homama' });
  });
  if (ids.includes('sultan')) drawPerson(c, 300, 262, 20, LOOKS.sultan, { jump: 46, armsUp: true });
  c.fillStyle = '#5a4652';
  c.font = `600 30px ${FONT}`;
  c.textAlign = 'center';
  c.fillText(`Odeh's hill, photo ${n}`, 300, 425);
  return cv.toDataURL('image/png');
}

// A quick white camera flash over the screen
export function flash() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0.9;pointer-events:none;z-index:60;transition:opacity .45s ease-out';
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '0')));
  setTimeout(() => el.remove(), 600);
}

// An album page as an image (for the album card)
export function photoDataUrl(kind, looks) {
  const cv = document.createElement('canvas');
  cv.width = 420;
  cv.height = 360;
  drawPhoto(cv.getContext('2d'), 420, 360, kind, looks);
  return cv.toDataURL('image/png');
}
