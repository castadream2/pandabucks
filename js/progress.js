// Saved game state (on this phone only), zones, badges, and mastery rules.
import { breakDown, sum } from './money.js';

const KEY = 'pandabucks.v1';

export const ZONES = [
  { id: 'coins',  name: 'Coin Check',    color: '#ffcf3f', len: 8, next: 'hop',
    blurb: 'Know your coins!' },
  { id: 'hop',    name: 'Quarter Hop',   color: '#4fd1ff', len: 6, next: 'dollar',
    blurb: 'Count by quarters: 25, 50, 75, $1!' },
  { id: 'dollar', name: 'Make a Dollar', color: '#7be36b', len: 5, next: null,
    blurb: 'Give exactly one dollar in change.' },
];
export const SOON = ['Bills', 'Dollar Up', 'Enough?', 'Card Mode', 'Shopping Trip'];
export const zone = (id) => ZONES.find((z) => z.id === id);

export const BADGES = {
  first:    { name: 'First Run!',     icon: '🐼', desc: 'Finished your first run' },
  perfect:  { name: 'Perfect Run',    icon: '💯', desc: 'Got every one right on the first try' },
  coins_m:  { name: 'Coin Expert',    icon: '🪙', desc: 'Mastered Coin Check' },
  hop_m:    { name: 'Quarter Hopper', icon: '🐸', desc: 'Mastered Quarter Hop' },
  dollar_m: { name: 'Dollar Maker',   icon: '💵', desc: 'Mastered Make a Dollar' },
  shop1:    { name: 'First Buy',      icon: '🛍️', desc: 'Bought something in the shop' },
  trade1:   { name: 'Big Trader',     icon: '🔁', desc: 'Traded coins for a dollar bill' },
  streak3:  { name: 'On Fire',        icon: '🔥', desc: 'Played 3 runs in one day' },
  fashion:  { name: 'Fashion Panda',  icon: '👑', desc: 'Own 5 shop items' },
  saver:    { name: 'Super Saver',    icon: '🐷', desc: 'Saved up $5.00' },
};

function freshZone(unlocked) {
  return { unlocked, hint: 2, tier: 1, runs: [], goodDays: [], mastered: false };
}

function fresh() {
  return {
    v: 1,
    name: '',
    welcomed: false,
    wallet: { 1: 0, 5: 0, 10: 0, 25: 0, 100: 0, 500: 0, 1000: 0, 2000: 0 },
    owned: [],
    equipped: { hat: null, glasses: null, shirt: null, back: null, pet: null },
    zones: { coins: freshZone(true), hop: freshZone(false), dollar: freshZone(false) },
    confusions: {},
    badges: [],
    pin: null,
    settings: { sound: true, speech: true, music: true, shopHint: true },
    stats: { runs: 0, purchases: 0, trades: 0, msPlayed: 0, lastPlayed: null, runDays: {} },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const base = fresh();
      // Fill in anything added in later versions.
      const merged = { ...base, ...s };
      merged.wallet = { ...base.wallet, ...s.wallet };
      merged.equipped = { ...base.equipped, ...s.equipped };
      merged.settings = { ...base.settings, ...s.settings };
      merged.stats = { ...base.stats, ...s.stats };
      merged.zones = { ...base.zones, ...s.zones };
      return merged;
    }
  } catch (e) { /* fall through */ }
  return fresh();
}

export let state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
}

export function resetAll() {
  const pin = state.pin;
  state = fresh();
  state.pin = pin;
  save();
}

try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* ignore */ }

export function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ---- wallet ----
export function walletList() {
  const out = [];
  for (const d of [2000, 1000, 500, 100, 25, 10, 5, 1]) for (let i = 0; i < (state.wallet[d] || 0); i++) out.push(d);
  return out;
}
export const walletTotal = () => sum(walletList());
export function addMoney(list) {
  for (const d of list) state.wallet[d] = (state.wallet[d] || 0) + 1;
  if (walletTotal() >= 500) award('saver');
  save();
}
export function removeMoney(list) {
  for (const d of list) state.wallet[d] = Math.max(0, (state.wallet[d] || 0) - 1);
  save();
}

// Run reward: 10¢ per first-try answer + 25¢ for finishing. Paid in coins only,
// so she can practice trading coins for bills. Mixed up a little for variety.
export function payoutCoins(cents) {
  let list = breakDown(cents, [25, 10, 5, 1]);
  if (list.filter((d) => d === 25).length >= 2 && Math.random() < 0.5) {
    list.splice(list.indexOf(25), 1);
    list.push(10, 10, 5);
  }
  return list.sort((a, b) => b - a);
}

// ---- badges ----
export function award(id) {
  if (state.badges.includes(id)) return false;
  state.badges.push(id);
  save();
  return true;
}

export function recordConfusion(asked, tapped) {
  const k = asked + '>' + tapped;
  state.confusions[k] = (state.confusions[k] || 0) + 1;
  save();
}

// ---- mastery ----
// Good run = 80%+ right on the first try.
// - A good run unlocks the next zone and turns hints down one notch.
// - A rough run (under 50%) turns hints back up.
// - Mastered = good runs on 2 different days with low hints
//   (and, for Make a Dollar, using mixed coins).
export function recordRun(zoneId, { firstTry, total, hint, tier, ms }) {
  const z = state.zones[zoneId];
  const meta = zone(zoneId);
  const pct = total ? firstTry / total : 0;
  const day = today();
  const out = { pct, unlocked: null, badges: [], hintDown: false, hintUp: false, tierUp: false, masteredNow: false };

  z.runs.push({ day, at: Date.now(), firstTry, total, hint, tier });
  if (z.runs.length > 60) z.runs.shift();

  state.stats.runs++;
  state.stats.msPlayed += ms || 0;
  state.stats.lastPlayed = Date.now();
  state.stats.runDays[day] = (state.stats.runDays[day] || 0) + 1;

  if (pct >= 0.8) {
    const counts = hint <= 1 && (zoneId !== 'dollar' || tier >= 3);
    if (counts && !z.goodDays.includes(day)) z.goodDays.push(day);
    if (z.hint > 0) { z.hint--; out.hintDown = true; }
    const maxTier = zoneId === 'dollar' ? 4 : 3;
    if (z.tier < maxTier) { z.tier++; out.tierUp = true; }
    if (meta.next && !state.zones[meta.next].unlocked) {
      state.zones[meta.next].unlocked = true;
      out.unlocked = meta.next;
    }
    if (!z.mastered && z.goodDays.length >= 2) {
      z.mastered = true;
      out.masteredNow = true;
      if (award(zoneId + '_m')) out.badges.push(zoneId + '_m');
    }
  } else if (pct < 0.5 && z.hint < 2) {
    z.hint++;
    out.hintUp = true;
  }

  if (award('first')) out.badges.push('first');
  if (pct === 1 && award('perfect')) out.badges.push('perfect');
  if (state.stats.runDays[day] >= 3 && award('streak3')) out.badges.push('streak3');
  save();
  return out;
}
