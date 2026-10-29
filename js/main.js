// PANDABUCKS entry point: builds Panda Town and routes between screens.
import { World } from './world.js';
import { state, save, addMoney, ZONES, walletTotal } from './progress.js';
import { startRun } from './runner.js';
import { openShop, openWallet } from './shop.js';
import { openGameRoom } from './gameroom.js';
import { openParent, openBadges } from './parent.js';
import { prefs, speak, sfx, setMusic, refreshMusic } from './audio.js';
import { h, $, onTap, openScreen, closeScreen, toast, confetti, buddyHTML, pick } from './ui.js';
import { moneySVG, fmt, MONEY_IMAGES } from './money.js';
import { SAY } from './lines.js';

prefs.sound = state.settings.sound;
prefs.speech = state.settings.speech;
prefs.music = state.settings.music;
setMusic('town');

try { await document.fonts.load('48px "Lilita One"'); } catch (e) { /* fonts optional */ }
// Load the coin and bill pictures up front so they never pop in late.
await Promise.all(MONEY_IMAGES.map((src) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = src; })));

const world = new World($('#world'), { onPad });
world.start();
updateHud();

onTap($('#wallet-btn'), () => { world.stop(); openWallet({ onClose: backToTown }); });
onTap($('#badges-btn'), () => { world.stop(); openBadges({ onClose: backToTown }); });
onTap($('#parent-btn'), () => { world.stop(); openParent({ onClose: backToTown, world }); });
onTap($('#shop-btn'), () => world.selectPad('shop'));
onTap($('#music-btn'), () => {
  state.settings.music = !state.settings.music;
  prefs.music = state.settings.music;
  save();
  refreshMusic();
  updateHud();
});

if (!state.welcomed) welcome();

function updateHud() {
  $('#wallet-btn b').textContent = fmt(walletTotal());
  $('#hello').textContent = state.name ? `Hi, ${state.name}!` : '';
  $('#music-btn').textContent = state.settings.music ? '🎵' : '🔇';
}

function backToTown() {
  closeScreen();
  setMusic('town');
  world.setPandaMode(false);
  world.refresh();
  world.start();
  updateHud();
}

function onPad(id, { locked, soon }) {
  if (soon) { toast('🚧 Coming soon! Keep practicing!'); return; }
  if (locked) {
    const prev = ZONES.find((z) => z.next === id);
    toast(`🔒 Do great in <b>${prev.name}</b> to unlock this!`);
    speak(SAY.locked(prev.name));
    return;
  }
  if (id === 'home') {
    world.cheer(2);
    toast(pick(['🐼 Home sweet home!', '🎋 Munch munch... bamboo break!', '🐼 Tap a zone to play!']));
    return;
  }
  if (id === 'games') {
    world.stop();
    openGameRoom({ onClose: backToTown });
    return;
  }
  if (id === 'shop') {
    openShop({ world, onClose: () => { world.refresh(); updateHud(); } });
    return;
  }
  world.stop();
  setMusic('lesson');
  startRun(id, { onExit: backToTown });
}

function welcome() {
  const scr = h(`<div class="panel-screen welcome">
    <h1 class="logo">PANDA<span>BUCKS</span></h1>
    ${buddyHTML('twinkle', 'Hi hi HI!! Welcome to Panda Town! What\'s your name?')}
    <input class="name-in" maxlength="16" placeholder="Your name" autocomplete="off" autocapitalize="words">
    <button class="btn big go">LET'S GO!</button>
  </div>`);
  openScreen(scr);
  onTap($('.go', scr), () => {
    state.name = $('.name-in', scr).value.trim().slice(0, 16);
    save();
    gift();
  });
}

function gift() {
  const scr = h(`<div class="panel-screen welcome">
    <h1>WELCOME GIFT!</h1>
    ${buddyHTML('ruby', `Fine, ${state.name || 'panda'}. Here's some money. Don't spend it all in one place.`)}
    <div class="earned">${[25, 25, 25, 25].map((d, i) => `<span class="drop" style="animation-delay:${0.3 + i * 0.3}s">${moneySVG(d, { px: 70 })}</span>`).join('')}</div>
    <p class="big-say">4 quarters = <b>$1.00</b></p>
    <button class="btn big go">THANKS!</button>
  </div>`);
  openScreen(scr);
  sfx.fanfare();
  confetti(50);
  setTimeout(() => speak(SAY.gift, { who: 'ruby' }), 1400);
  onTap($('.go', scr), () => {
    addMoney([25, 25, 25, 25]);
    state.welcomed = true;
    save();
    backToTown();
    setTimeout(() => toast('👆 Tap <b>COIN CHECK</b> to start!', 4000), 400);
  });
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
