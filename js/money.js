// US money: values in cents, plus SVG drawings of coins and bills.
// Coins are drawn at true relative sizes (dime smallest, quarter biggest),
// with ridged edges on dimes and quarters like the real ones.

export const COINS = [1, 5, 10, 25];
export const ALL = [1, 5, 10, 25, 100, 500, 1000, 2000];
export const BILL_DENOMS = [2000, 1000, 500, 100];

export const INFO = {
  1:   { name: 'penny',   plural: 'pennies',  word: 'ONE CENT',       mm: 19.05, copper: true,  reeded: false,
         clue: 'the penny is the brown (copper) one. It has Lincoln on the front and says ONE CENT on the back' },
  5:   { name: 'nickel',  plural: 'nickels',  word: 'FIVE CENTS',     mm: 21.21, copper: false, reeded: false,
         clue: 'the nickel is big and smooth, with no ridges on the edge. The back has a building and says FIVE CENTS' },
  10:  { name: 'dime',    plural: 'dimes',    word: 'ONE DIME',       mm: 17.91, copper: false, reeded: true,
         clue: 'the dime is the TINIEST coin, with ridges on the edge. The back has a torch and says ONE DIME' },
  25:  { name: 'quarter', plural: 'quarters', word: 'QUARTER DOLLAR', mm: 24.26, copper: false, reeded: true,
         clue: 'the quarter is the BIGGEST coin, with ridges on the edge. The back has an eagle and says QUARTER DOLLAR' },
  100: { name: 'one dollar bill',  plural: 'one dollar bills',  word: 'ONE DOLLAR',   bill: true },
  500: { name: 'five dollar bill', plural: 'five dollar bills', word: 'FIVE DOLLARS', bill: true },
  1000: { name: 'ten dollar bill', plural: 'ten dollar bills', word: 'TEN DOLLARS', bill: true },
  2000: { name: 'twenty dollar bill', plural: 'twenty dollar bills', word: 'TWENTY DOLLARS', bill: true },
};

export const isBill = (d) => d >= 100;

// 135 -> "$1.35"
export function fmt(c) {
  return '$' + Math.floor(c / 100) + '.' + String(c % 100).padStart(2, '0');
}
// 75 -> "75¢", 125 -> "$1.25"
export function fmtShort(c) {
  return c < 100 ? c + '¢' : fmt(c);
}
export function valueLabel(d) {
  return d < 100 ? d + '¢' : '$' + d / 100;
}
export const sum = (list) => list.reduce((a, b) => a + b, 0);

// Words for speaking amounts aloud.
export function sayAmount(c) {
  const cents = (n) => (n === 1 ? '1 cent' : n + ' cents');
  if (c < 100) return cents(c);
  const d = Math.floor(c / 100), r = c % 100;
  const dollars = d === 1 ? 'one dollar' : d + ' dollars';
  return r === 0 ? dollars : dollars + ' and ' + cents(r);
}

// Greedy change: cents -> list of denominations.
export function breakDown(cents, denoms = [2000, 1000, 500, 100, 25, 10, 5, 1]) {
  const out = [];
  for (const d of denoms) {
    while (cents >= d) { out.push(d); cents -= d; }
  }
  return out;
}

let uid = 0;

export function moneySVG(d, opts = {}) {
  return isBill(d) ? billSVG(d, opts) : coinSVG(d, opts);
}

// Real coin illustrations (img/<name>-heads.png / -tails.png), drawn at true
// relative sizes. side: 'heads' | 'tails' | 'random'. Dimes and quarters get a
// ridged rim, like the real ones.
export const MONEY_IMAGES = [
  ...['quarter', 'penny', 'nickel', 'dime'].flatMap((n) => [`img/${n}-heads.png`, `img/${n}-tails.png`]),
  ...[1, 5, 10, 20].map((n) => `img/bill-${n}.png`),
];

export function coinSVG(d, { px = 76, label = false, side = 'heads' } = {}) {
  const info = INFO[d];
  const s = Math.round(px * info.mm / 24.26);
  if (side === 'random') side = Math.random() < 0.5 ? 'heads' : 'tails';
  return `<span class="money coin d${d}" data-d="${d}"><span class="coin-face${info.reeded ? ' reeded' : ''}" style="width:${s}px;height:${s}px">`
    + `<img src="img/${info.name}-${side}.png" alt="${info.name} (${side})" draggable="false"></span>`
    + `${label ? `<b class="val">${valueLabel(d)}</b>` : ''}</span>`;
}

// Older hand-drawn coin, kept as a fallback.
export function coinDrawing(d, { px = 76, label = false } = {}) {
  const info = INFO[d];
  const s = Math.round(px * info.mm / 24.26);
  const id = 'c' + (uid++);
  const hi = info.copper ? '#ffc79a' : '#ffffff';
  const mid = info.copper ? '#e08a52' : '#cfd5df';
  const lo = info.copper ? '#9a4a1e' : '#8c96a8';
  const rim = info.copper ? '#5e2a0c' : '#4a5263';
  let ticks = '';
  if (info.reeded) {
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2;
      const x1 = 50 + 45.5 * Math.cos(a), y1 = 50 + 45.5 * Math.sin(a);
      const x2 = 50 + 49 * Math.cos(a), y2 = 50 + 49 * Math.sin(a);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${rim}" stroke-width="1.7"/>`;
    }
  }
  const fs = d === 25 ? 8.6 : 10;
  const svg = `
<svg class="coin-svg" width="${s}" height="${s}" viewBox="0 0 100 100" aria-label="${info.name}">
  <defs>
    <radialGradient id="${id}g" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/>
    </radialGradient>
    <path id="${id}b" d="M 15 50 A 35 35 0 0 0 85 50"/>
    <path id="${id}t" d="M 19 50 A 31 31 0 0 1 81 50"/>
  </defs>
  <circle cx="50" cy="50" r="49.5" fill="${rim}"/>
  <circle cx="50" cy="50" r="46" fill="url(#${id}g)"/>
  ${ticks}
  <circle cx="50" cy="50" r="39" fill="none" stroke="${lo}" stroke-opacity=".55" stroke-width="2"/>
  <path d="M41 72 C37 62,35 53,38 43 C42 31,58 29,64 38 C67 43,66 47,69 51 L66 53 C67 56,65 58,63 60 C63 64,61 68,59 72 Z"
        fill="${lo}" fill-opacity=".45"/>
  <text font-family="Fredoka, sans-serif" font-weight="700" font-size="7.5" fill="${rim}" fill-opacity=".8" letter-spacing="1.5">
    <textPath href="#${id}t" startOffset="50%" text-anchor="middle">LIBERTY</textPath></text>
  <text font-family="Fredoka, sans-serif" font-weight="700" font-size="${fs}" fill="${rim}" letter-spacing=".6">
    <textPath href="#${id}b" startOffset="50%" text-anchor="middle">${info.word}</textPath></text>
</svg>`;
  return `<span class="money coin d${d}" data-d="${d}">${svg}${label ? `<b class="val">${valueLabel(d)}</b>` : ''}</span>`;
}

export function billSVG(d, { px = 76, label = false } = {}) {
  const w = Math.round(px * 1.9), h = Math.round(w / 2.36);
  if (BILL_DENOMS.includes(d)) {
    return `<span class="money bill d${d}" data-d="${d}"><img class="bill-img" src="img/bill-${d / 100}.png" alt="${INFO[d].name}" draggable="false" style="width:${w}px;height:${h}px">`
      + `${label ? `<b class="val">${valueLabel(d)}</b>` : ''}</span>`;
  }
  const five = d === 500;
  const paper = five ? '#e4dcef' : '#d7e8cc';
  const ink = five ? '#4b3a78' : '#2f5d34';
  const n = d / 100;
  const svg = `
<svg class="bill-svg" width="${w}" height="${h}" viewBox="0 0 236 100" aria-label="${INFO[d].name}">
  <rect x="1.5" y="1.5" width="233" height="97" rx="6" fill="${paper}" stroke="#1d1b3a" stroke-width="3"/>
  <rect x="9" y="8" width="218" height="84" rx="4" fill="none" stroke="${ink}" stroke-width="2.5"/>
  <ellipse cx="118" cy="50" rx="27" ry="32" fill="${ink}" fill-opacity=".14" stroke="${ink}" stroke-width="2"/>
  <path d="M106 70 C104 60,104 50,108 42 C112 33,126 33,129 42 C131 47,130 51,132 54 L129 56 C130 59,128 61,126 62 C126 66,124 69,122 72 Z" fill="${ink}" fill-opacity=".5"/>
  <text x="118" y="19" font-family="Fredoka, sans-serif" font-weight="700" font-size="9" fill="${ink}" text-anchor="middle" letter-spacing="1">THE UNITED STATES OF AMERICA</text>
  <text x="118" y="91" font-family="Fredoka, sans-serif" font-weight="700" font-size="11" fill="${ink}" text-anchor="middle" letter-spacing="2">${INFO[d].word}</text>
  <g font-family="Lilita One, Fredoka, sans-serif" font-size="26" fill="${ink}" text-anchor="middle">
    <text x="28" y="36">${n}</text><text x="208" y="36">${n}</text>
    <text x="28" y="84">${n}</text><text x="208" y="84">${n}</text>
  </g>
  <circle cx="62" cy="54" r="13" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="3 2"/>
  <circle cx="174" cy="54" r="13" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="3 2"/>
</svg>`;
  return `<span class="money bill d${d}" data-d="${d}">${svg}${label ? `<b class="val">${valueLabel(d)}</b>` : ''}</span>`;
}
