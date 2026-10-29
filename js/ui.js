// Small DOM helpers, sidekick buddies, toasts, confetti.
import { sfx } from './audio.js';
import { QUIPS } from './lines.js';

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const rand = (n) => Math.floor(Math.random() * n);
export const pick = (a) => a[rand(a.length)];
export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Tap handler that feels instant on iPhone and plays a click.
export function onTap(el, fn, { sound = true } = {}) {
  el.addEventListener('click', (e) => { if (sound) sfx.tap(); fn(e); });
  return el;
}

// ---------- overlay screens ----------
const layer = () => document.getElementById('screen');
export function openScreen(node, mode = 'full') {
  const s = layer();
  s.innerHTML = '';
  s.className = 'show ' + mode;
  s.appendChild(node);
  return node;
}
export function closeScreen() {
  const s = layer();
  s.className = '';
  s.innerHTML = '';
}

export function toast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------- buddies ----------
// Ruby: a sassy, hard-to-impress red panda.
// Twinkle: a starry-eyed bunny who gets SO excited about everything.
export const BUDDIES = {
  ruby: {
    name: 'Ruby',
    svg: `<svg viewBox="0 0 100 100" class="buddy-svg">
      <rect x="10" y="8" width="24" height="24" rx="5" fill="#c84b1c" stroke="#1d1b3a" stroke-width="4"/>
      <rect x="66" y="8" width="24" height="24" rx="5" fill="#c84b1c" stroke="#1d1b3a" stroke-width="4"/>
      <rect x="16" y="14" width="12" height="12" rx="3" fill="#fff3e6"/><rect x="72" y="14" width="12" height="12" rx="3" fill="#fff3e6"/>
      <rect x="8" y="20" width="84" height="72" rx="16" fill="#e8642a" stroke="#1d1b3a" stroke-width="4"/>
      <rect x="18" y="56" width="26" height="22" rx="10" fill="#fff3e6"/><rect x="56" y="56" width="26" height="22" rx="10" fill="#fff3e6"/>
      <rect x="22" y="34" width="22" height="16" rx="6" fill="#7a2a10"/><rect x="56" y="34" width="22" height="16" rx="6" fill="#7a2a10"/>
      <rect x="26" y="41" width="14" height="8" rx="3" fill="#fff"/><rect x="60" y="41" width="14" height="8" rx="3" fill="#fff"/>
      <rect x="30" y="43" width="7" height="6" rx="2" fill="#1d1b3a"/><rect x="64" y="43" width="7" height="6" rx="2" fill="#1d1b3a"/>
      <rect x="24" y="37" width="20" height="5" fill="#7a2a10"/><rect x="56" y="37" width="20" height="5" fill="#7a2a10"/>
      <rect x="43" y="58" width="14" height="9" rx="4" fill="#1d1b3a"/>
      <path d="M40 74 Q50 72 62 76" stroke="#1d1b3a" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`,
    right: QUIPS.ruby.right,
    wrong: QUIPS.ruby.wrong,
  },
  twinkle: {
    name: 'Twinkle',
    svg: `<svg viewBox="0 0 100 100" class="buddy-svg">
      <rect x="20" y="0" width="16" height="40" rx="8" fill="#c9b8ff" stroke="#1d1b3a" stroke-width="4"/>
      <rect x="64" y="0" width="16" height="40" rx="8" fill="#c9b8ff" stroke="#1d1b3a" stroke-width="4"/>
      <rect x="25" y="6" width="6" height="26" rx="3" fill="#ffb3d9"/><rect x="69" y="6" width="6" height="26" rx="3" fill="#ffb3d9"/>
      <rect x="8" y="24" width="84" height="70" rx="20" fill="#d9cbff" stroke="#1d1b3a" stroke-width="4"/>
      <circle cx="33" cy="52" r="14" fill="#1d1b3a"/><circle cx="67" cy="52" r="14" fill="#1d1b3a"/>
      <path d="M33 42 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#ffe14d"/>
      <path d="M67 42 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#ffe14d"/>
      <circle cx="27" cy="46" r="3" fill="#fff"/><circle cx="61" cy="46" r="3" fill="#fff"/>
      <rect x="14" y="66" width="14" height="7" rx="3" fill="#ff8fc7"/><rect x="72" y="66" width="14" height="7" rx="3" fill="#ff8fc7"/>
      <path d="M40 72 Q50 84 60 72 Z" fill="#1d1b3a"/>
    </svg>`,
    right: QUIPS.twinkle.right,
    wrong: QUIPS.twinkle.wrong,
  },
};

export function buddyHTML(who, text = '') {
  const b = BUDDIES[who];
  return `<div class="buddy ${who}"><div class="buddy-face">${b.svg}</div><div class="bubble"><b>${b.name}</b><span class="say">${text}</span></div></div>`;
}
export function buddySay(root, text, who) {
  const el = root.querySelector('.buddy');
  if (!el) return;
  if (who && !el.classList.contains(who)) {
    el.outerHTML = buddyHTML(who, text);
    return;
  }
  const s = el.querySelector('.say');
  s.innerHTML = text;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

export function confetti(n = 40) {
  const box = document.createElement('div');
  box.className = 'confetti';
  const cols = ['#ff5fa2', '#ffcf3f', '#4fd1ff', '#7be36b', '#9b6bff', '#ff7a1a'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = cols[i % cols.length];
    p.style.animationDelay = Math.random() * 0.3 + 's';
    p.style.animationDuration = 1.2 + Math.random() * 1 + 's';
    p.style.transform = `rotate(${rand(360)}deg)`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
}

// Little "+10¢" floating number.
export function floatText(text, x, y, cls = '') {
  const el = document.createElement('div');
  el.className = 'float-text ' + cls;
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}
