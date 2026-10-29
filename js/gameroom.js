// The Game Room: side games that cost money to play (a break that still practices paying).
import { state, save, walletTotal, removeMoney, addMoney, award, BADGES } from './progress.js';
import { moneySVG, fmt, fmtShort, breakDown } from './money.js';
import { h, $, $$, onTap, openScreen, closeScreen, toast, confetti, buddyHTML } from './ui.js';
import { sfx, speak, setMusic } from './audio.js';
import { SAY } from './lines.js';
import { moneyCounter } from './shop.js';
import { startDonutDash } from './donutdash.js';

export const TRIES = 3; // one payment = 3 tries, saved until used

const triesLeft = (id) => (state.gameTries && state.gameTries[id]) || 0;

export const GAMES = [
  { id: 'donutdash', name: 'Donut Dash', icon: '🍩', price: 50, blurb: 'Grab 5 donuts before Bandit the raccoon catches you!', play: startDonutDash },
  { id: 'lava', name: 'Floor Is Lava', icon: '🌋', price: 50, blurb: 'Coming soon!', soon: true },
  { id: 'bumper', name: 'Bumper Pandas', icon: '🎡', price: 50, blurb: 'Coming soon!', soon: true },
];

export function openGameRoom({ onClose }) {
  const scr = h(`<div class="panel-screen gameroom">
    <div class="sheet-head"><h2>GAME ROOM</h2><div class="wallet-pill">${moneySVG(25, { px: 22 })}<b>${fmt(walletTotal())}</b></div><button class="x-btn" aria-label="Close">✕</button></div>
    ${buddyHTML('twinkle', 'Welcome to the Game Room!! Every game costs money to play. Ooh, pick one!')}
    <div class="cabinets">${GAMES.map((g) => `
      <button class="cabinet ${g.soon ? 'soon' : ''}" data-id="${g.id}">
        <span class="cab-screen">${g.icon}</span>
        <span class="cab-name">${g.name}</span>
        <span class="cab-blurb">${g.blurb}</span>
        ${g.soon ? '<span class="owned-tag">SOON</span>'
          : triesLeft(g.id) ? `<span class="tries-tag">🎟️ ${triesLeft(g.id)} ${triesLeft(g.id) === 1 ? 'try' : 'tries'} left</span>`
          : `<span class="price-tag">${fmt(g.price)}</span><span class="cab-tries">${TRIES} tries</span>`}
      </button>`).join('')}
    </div>
  </div>`);
  openScreen(scr);
  speak(SAY.gameRoom);
  onTap($('.x-btn', scr), () => { closeScreen(); onClose(); });
  for (const b of $$('.cabinet', scr)) {
    onTap(b, () => {
      const g = GAMES.find((x) => x.id === b.dataset.id);
      if (g.soon) { toast(`${g.icon} ${g.name} is coming soon!`); return; }
      if (triesLeft(g.id)) play(g, { onClose });
      else payToPlay(g, { onClose });
    });
  }
}

function payToPlay(g, { onClose }) {
  const have = walletTotal();
  if (have < g.price) {
    sfx.wrong();
    toast(`You have ${fmt(have)}. ${g.name} costs ${fmt(g.price)}. Play a zone to earn ${fmtShort(g.price - have)} more!`, 3500);
    speak(SAY.needMore(g.price - have));
    return;
  }
  const scr = h(`<div class="panel-screen gameroom pay">
    <div class="sheet-head"><h2>PAY TO PLAY</h2><button class="x-btn" aria-label="Back">✕</button></div>
    <div class="pay-top"><div class="pay-item">${g.icon} ${g.name}<small>${TRIES} tries</small></div><div class="price-tag big">${fmt(g.price)}</div></div>
    <div class="pay-body"></div>
    <div class="pay-msg"></div>
    <div class="choice-row"><button class="btn big paybtn">PAY &amp; PLAY</button></div>
  </div>`);
  openScreen(scr);
  speak(SAY.costs(g.price));
  const mc = moneyCounter($('.pay-body', scr), { showTotal: state.settings.shopHint });
  const msg = $('.pay-msg', scr);
  onTap($('.x-btn', scr), () => openGameRoom({ onClose }));
  onTap($('.paybtn', scr), () => {
    const t = mc.total();
    if (t < g.price) {
      sfx.wrong();
      msg.innerHTML = t === 0 ? 'Tap your money to put it on the counter!' : `That's <b>${fmt(t)}</b>. You need <b>${fmtShort(g.price - t)}</b> more!`;
      speak(t === 0 ? SAY.tapMoney : SAY.needMore(g.price - t));
      return;
    }
    removeMoney(mc.placed());
    const change = t - g.price;
    if (change) addMoney(breakDown(change, [100, 25, 10, 5, 1]));
    state.stats.games = (state.stats.games || 0) + 1;
    state.gameTries = { ...(state.gameTries || {}), [g.id]: TRIES };
    save();
    sfx.kaching();
    if (change) toast(`Your change: ${fmtShort(change)}`);
    play(g, { onClose });
  });
}

function play(g, { onClose }) {
  closeScreen();
  document.body.classList.add('in-minigame');
  setMusic('town');
  // Use up one try now (leaving mid-game still counts as a try).
  state.gameTries = { ...(state.gameTries || {}), [g.id]: Math.max(0, triesLeft(g.id) - 1) };
  save();
  g.play({
    equipped: state.equipped,
    triesLeft: triesLeft(g.id),
    price: g.price,
    onEnd: ({ won, again }) => {
      document.body.classList.remove('in-minigame');
      if (won) {
        state.stats.gameWins = (state.stats.gameWins || 0) + 1;
        if (award('donut_champ')) setTimeout(() => toast(`${BADGES.donut_champ.icon} New badge: <b>${BADGES.donut_champ.name}</b>`, 3000), 300);
        confetti(50);
        save();
      }
      if (again) (triesLeft(g.id) ? play(g, { onClose }) : payToPlay(g, { onClose }));
      else openGameRoom({ onClose });
    },
  });
}
