// Grown-up screen behind a PIN: what she has mastered, mix-ups, settings.
import { state, save, ZONES, BADGES, walletTotal, addMoney, resetAll } from './progress.js';
import { INFO, fmt } from './money.js';
import { item } from './catalog.js';
import { h, $, $$, onTap, openScreen, closeScreen, toast } from './ui.js';
import { prefs, refreshMusic } from './audio.js';

function pinPad({ title, sub, onDone, onCancel }) {
  let val = '';
  const scr = h(`<div class="panel-screen pin">
    <div class="sheet-head"><h2>${title}</h2><button class="x-btn" aria-label="Close">✕</button></div>
    <p class="pin-sub">${sub}</p>
    <div class="pin-dots">${'<i></i>'.repeat(4)}</div>
    <div class="pin-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k) => `<button class="pin-key" data-k="${k}" ${k === '' ? 'disabled' : ''}>${k}</button>`).join('')}</div>
  </div>`);
  openScreen(scr);
  onTap($('.x-btn', scr), onCancel);
  const dots = $$('.pin-dots i', scr);
  const draw = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));
  for (const b of $$('.pin-key', scr)) {
    onTap(b, () => {
      const k = b.dataset.k;
      if (k === '⌫') val = val.slice(0, -1);
      else if (val.length < 4) val += k;
      draw();
      if (val.length === 4) setTimeout(() => {
        const ok = onDone(val);
        if (ok === false) { val = ''; draw(); scr.querySelector('.pin-dots').classList.add('bad'); setTimeout(() => scr.querySelector('.pin-dots')?.classList.remove('bad'), 500); }
      }, 120);
    });
  }
}

export function openParent({ onClose, world }) {
  const cancel = () => { closeScreen(); onClose(); };
  if (!state.pin) {
    pinPad({
      title: 'GROWN-UPS', sub: 'Make a 4-digit PIN for the parent screen.', onCancel: cancel,
      onDone: (a) => {
        pinPad({
          title: 'GROWN-UPS', sub: 'Type the same PIN again.', onCancel: cancel,
          onDone: (b) => {
            if (a !== b) { toast('PINs didn\'t match. Try again.'); setTimeout(() => openParent({ onClose, world }), 50); return; }
            state.pin = a; save(); dashboard();
          },
        });
      },
    });
  } else {
    pinPad({ title: 'GROWN-UPS', sub: 'Enter the parent PIN.', onCancel: cancel, onDone: (v) => (v === state.pin ? (dashboard(), true) : false) });
  }

  function dashboard() {
    const scr = h('<div class="panel-screen parent"></div>');
    openScreen(scr);
    render();

    function render() {
      const s = state.stats;
      const weekAgo = Date.now() - 7 * 864e5;
      const runsWeek = ZONES.reduce((n, z) => n + state.zones[z.id].runs.filter((r) => r.at > weekAgo).length, 0);
      const zoneRows = ZONES.map((z) => {
        const zs = state.zones[z.id];
        const status = zs.mastered ? ['Mastered', 'm'] : !zs.unlocked ? ['Locked', 'l'] : zs.runs.length ? ['Learning', 'w'] : ['Not started', 'n'];
        const last = zs.runs.slice(-8);
        const bars = last.map((r) => `<i style="height:${Math.max(8, Math.round((r.firstTry / r.total) * 100))}%" class="${r.firstTry / r.total >= 0.8 ? 'g' : r.firstTry / r.total >= 0.5 ? 'y' : 'r'}" title="${r.day}: ${r.firstTry}/${r.total}"></i>`).join('');
        const hintTxt = ['Off', 'Low', 'High'][zs.hint];
        return `<div class="pz">
          <div class="pz-head"><b>${z.name}</b><span class="status ${status[1]}">${status[0]}</span></div>
          <div class="pz-meta">Helpers: <b>${hintTxt}</b>${z.id === 'dollar' ? ` · Coins level: <b>${['', 'Quarters', '+ Dimes', '+ Nickels', '+ Pennies'][zs.tier]}</b>` : ` · Level <b>${zs.tier}</b>`}
            · Good days: <b>${zs.goodDays.length}/2</b> · Runs: <b>${zs.runs.length}</b></div>
          <div class="pz-bars">${bars || '<span class="muted">No runs yet</span>'}</div>
        </div>`;
      }).join('');

      const conf = Object.entries(state.confusions).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => {
        const [asked, tapped] = k.split('>');
        let text;
        if (asked.startsWith('more:')) text = `Thought a ${INFO[tapped].name} was worth more than a ${INFO[asked.slice(5)].name}`;
        else if (asked.startsWith('value:')) text = `Said a ${INFO[asked.slice(6)].name} is worth ${tapped}¢`;
        else text = `Tapped a ${INFO[tapped].name} when asked for a ${INFO[asked].name}`;
        return `<li>${text} <b>×${n}</b></li>`;
      }).join('');

      scr.innerHTML = `
        <div class="sheet-head"><h2>PARENT</h2><button class="x-btn" aria-label="Close">✕</button></div>
        <div class="pcards">
          <div class="pcard"><b>${s.runs}</b><span>runs total</span></div>
          <div class="pcard"><b>${runsWeek}</b><span>runs this week</span></div>
          <div class="pcard"><b>${Math.round(s.msPlayed / 60000)}</b><span>minutes played</span></div>
          <div class="pcard"><b>${fmt(walletTotal())}</b><span>in wallet</span></div>
        </div>
        <p class="muted">Last played: ${s.lastPlayed ? new Date(s.lastPlayed).toLocaleString() : 'never'} · Items bought: ${s.purchases} · Coin trades: ${s.trades}</p>
        <h3>Skills</h3>
        <p class="muted small">A skill is <b>mastered</b> after 80%+ first-try runs on 2 different days with low or no helpers. Bars show her last runs (green = 80%+).</p>
        ${zoneRows}
        <h3>Mix-ups to practice in real life</h3>
        ${conf ? `<ul class="conf">${conf}</ul>` : '<p class="muted">None yet.</p>'}
        <h3>Badges (${state.badges.length}/${Object.keys(BADGES).length})</h3>
        <p>${state.badges.map((b) => BADGES[b].icon + ' ' + BADGES[b].name).join(' · ') || '<span class="muted">None yet</span>'}</p>
        <h3>Settings</h3>
        <label class="tog"><input type="checkbox" data-set="sound" ${state.settings.sound ? 'checked' : ''}> Sound effects</label>
        <label class="tog"><input type="checkbox" data-set="speech" ${state.settings.speech ? 'checked' : ''}> Read-aloud voice</label>
        <label class="tog"><input type="checkbox" data-set="music" ${state.settings.music ? 'checked' : ''}> Background music</label>
        <label class="tog"><input type="checkbox" data-set="shopHint" ${state.settings.shopHint ? 'checked' : ''}> Show money total when paying in the shop</label>
        <h3>Rewards & tools</h3>
        <div class="pbtns">
          <button class="btn small give1">Give her $1.00 bonus (4 quarters)</button>
          <button class="btn small unlock">Unlock all zones</button>
          <button class="btn small ghost newpin">Change PIN</button>
          <button class="btn small danger reset">Reset all progress</button>
        </div>
        <p class="muted small">Progress is saved on this phone only.</p>`;

      onTap($('.x-btn', scr), () => { closeScreen(); onClose(); });
      for (const cb of $$('[data-set]', scr)) {
        cb.addEventListener('change', () => {
          state.settings[cb.dataset.set] = cb.checked;
          prefs.sound = state.settings.sound;
          prefs.speech = state.settings.speech;
          prefs.music = state.settings.music;
          refreshMusic();
          save();
        });
      }
      onTap($('.give1', scr), () => { addMoney([25, 25, 25, 25]); toast('Added 4 quarters to her wallet'); render(); });
      onTap($('.unlock', scr), () => { for (const z of ZONES) state.zones[z.id].unlocked = true; save(); world.refresh(); toast('All zones unlocked'); render(); });
      onTap($('.newpin', scr), () => { state.pin = null; save(); openParent({ onClose, world }); });
      onTap($('.reset', scr), () => {
        if (!confirm('Erase ALL progress, money and items? This cannot be undone.')) return;
        resetAll();
        location.reload();
      });
    }
  }
}

export function openBadges({ onClose }) {
  const scr = h(`<div class="panel-screen badges">
    <div class="sheet-head"><h2>MY BADGES</h2><button class="x-btn" aria-label="Close">✕</button></div>
    <div class="badge-grid">${Object.entries(BADGES).map(([id, b]) => {
      const got = state.badges.includes(id);
      return `<div class="badge ${got ? 'got' : ''}"><div class="badge-icon">${got ? b.icon : '❔'}</div><b>${b.name}</b><span>${b.desc}</span></div>`;
    }).join('')}</div>
  </div>`);
  openScreen(scr);
  onTap($('.x-btn', scr), () => { closeScreen(); onClose(); });
}
