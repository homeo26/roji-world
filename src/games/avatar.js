// 2D chibi portrait of a character, as an SVG string. Used by minigames and menus.
// avatar(look, size) where look comes from looks.js (skin, hair, hairstyle, top, accent, gender).

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function hairBack(style, c) {
  switch (style) {
    case 'pigtails':
      return `<circle cx="14" cy="64" r="11" fill="${c}"/><circle cx="86" cy="64" r="11" fill="${c}"/><circle cx="10" cy="80" r="8" fill="${c}"/><circle cx="90" cy="80" r="8" fill="${c}"/>`;
    case 'ponytail':
      return `<ellipse cx="80" cy="34" rx="14" ry="11" fill="${c}"/><ellipse cx="88" cy="52" rx="9" ry="16" fill="${c}"/>`;
    case 'bob':
      return `<path d="M17 50 C17 22 83 22 83 50 L85 80 C78 86 70 84 66 80 L34 80 C30 84 22 86 15 80 Z" fill="${c}"/>`;
    case 'long':
      return `<path d="M16 50 C16 20 84 20 84 50 L88 96 L12 96 Z" fill="${c}"/>`;
    case 'buns':
      return `<circle cx="26" cy="24" r="12" fill="${c}"/><circle cx="74" cy="24" r="12" fill="${c}"/>`;
    default:
      return '';
  }
}

// Hair volume behind the face, slightly larger than the head, so the crown is never bare.
function hairBase(style, c, girl) {
  return girl ? `<ellipse cx="50" cy="50" rx="34" ry="32" fill="${c}"/>` : `<ellipse cx="50" cy="51" rx="32.5" ry="30.5" fill="${c}"/>`;
}

// Front hair drawn over the face. Every cap peaks above the top of the head (y = 25).
function hairFront(style, c) {
  const hi = shade(c, 1.35);
  const shine = `<path d="M30 34 C38 27 50 25 60 27" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
  const cap = `<path d="M17 58 C13 11 87 11 83 58 C79 46 71 40 63 41 C59 47 54 48 50 44 C46 48 41 47 37 41 C29 40 21 46 17 58 Z" fill="${c}"/>` + shine;
  switch (style) {
    case 'short':
      return `<path d="M18 56 C13 13 87 13 82 56 C77 46 68 41 60 42 L56 37 L50 43 C40 41 26 45 18 56 Z" fill="${c}"/>` + shine;
    case 'curly': {
      let s = `<path d="M19 56 C14 14 86 14 81 56 C72 44 28 44 19 56 Z" fill="${c}"/>`;
      for (const [x, y, r] of [[24, 40, 9], [34, 30, 10], [48, 26, 10], [62, 28, 10], [74, 36, 9], [80, 48, 7], [20, 50, 7]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
      return s;
    }
    case 'spiky':
      return `<path d="M19 56 C15 22 85 22 81 56 C72 44 28 44 19 56 Z" fill="${c}"/><path d="M20 50 L18 34 L28 37 L27 20 L38 29 L44 14 L52 27 L60 14 L64 29 L74 20 L72 37 L82 34 L80 50 Z" fill="${c}"/>`;
    case 'sidepart':
      return `<path d="M18 57 C13 12 87 12 82 57 C80 46 74 40 66 38 C54 36 40 40 30 50 C26 52 22 54 18 57 Z" fill="${c}"/>` + shine;
    default:
      return cap + `<path d="M26 46 C30 52 36 52 40 46 C44 52 52 52 56 46 C60 52 68 52 74 46 L74 40 L26 40 Z" fill="${c}"/>`;
  }
}

export function avatar(look, size = 64) {
  const hair = look.hair || '#2a1a13';
  const skin = look.skin || '#f8dccb';
  const top = look.top || '#ef5b6f';
  const style = look.hairstyle || 'pigtails';
  const ties = style === 'pigtails' ? `<circle cx="20" cy="58" r="3.5" fill="${look.accent || '#ff7fa3'}"/><circle cx="80" cy="58" r="3.5" fill="${look.accent || '#ff7fa3'}"/>` : '';
  const bow = look.gender === 'girl' ? `<g transform="translate(30 30) rotate(-20)"><ellipse cx="-6" cy="0" rx="7" ry="5" fill="${look.accent || '#ff7fa3'}"/><ellipse cx="6" cy="0" rx="7" ry="5" fill="${look.accent || '#ff7fa3'}"/><circle r="3" fill="${shade(look.accent || '#ff7fa3', 0.8)}"/></g>` : '';
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="${look.name || ''}" role="img">
    ${hairBack(style, hair)}
    ${hairBase(style, hair, look.gender === 'girl')}
    <path d="M22 100 C24 84 36 80 50 80 C64 80 76 84 78 100 Z" fill="${top}"/>
    <path d="M40 81 L50 90 L60 81" fill="none" stroke="#fffaf4" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="50" cy="55" r="30" fill="${skin}"/>
    ${hairFront(style, hair)}
    ${ties}${bow}
    <ellipse cx="39" cy="59" rx="3.8" ry="4.8" fill="#1d130f"/><ellipse cx="61" cy="59" rx="3.8" ry="4.8" fill="#1d130f"/>
    <circle cx="40.4" cy="57.2" r="1.3" fill="#fff"/><circle cx="62.4" cy="57.2" r="1.3" fill="#fff"/>
    <ellipse cx="31" cy="67" rx="5" ry="3.2" fill="#ff8fa0" opacity=".55"/><ellipse cx="69" cy="67" rx="5" ry="3.2" fill="#ff8fa0" opacity=".55"/>
    <path d="M44 68 Q50 74 56 68" fill="none" stroke="#b23a48" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`;
}
