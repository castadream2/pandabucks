// Panda Shop (pay with your own counted money, get change back) and Wallet
// (see your money, trade coins for a $1 bill).
import { ITEMS, SLOTS, item } from './catalog.js';
import { state, save, walletTotal, addMoney, removeMoney, award } from './progress.js';
import { moneySVG, fmt, fmtShort, sayAmount, breakDown, sum, INFO, isBill } from './money.js';
import { h, $, $$, onTap, openScreen, closeScreen, toast, confetti, buddyHTML } from './ui.js';
import { sfx, speak } from './audio.js';
import { SAY, A } from './lines.js';

// Wallet stacks on top, a counter below. Tap a stack to put one on the counter;
// tap the counter to take it back.
export function moneyCounter(root, { coinsOnly = false, onChange = () => {}, showTotal = true, counterLabel = 'Counter' } = {}) {
  const counts = { ...state.wallet };
  const placed = [];
  const el = h(`<div class="counter-ui">
    <div class="counter"><div class="counter-label">${counterLabel}</div><div class="counter-money"></div><div class="counter-total"></div></div>
    <div class="stacks-label">Your money (tap to use)</div>
    <div class="stacks"></div>
  </div>`);
  root.appendChild(el);
  const stacks = $('.stacks', el), counter = $('.counter-money', el), totalEl = $('.counter-total', el);

  function render() {
    stacks.innerHTML = '';
    const denoms = (coinsOnly ? [25, 10, 5, 1] : [2000, 1000, 500, 100, 25, 10, 5, 1]).filter((d) => counts[d] > 0);
    if (!denoms.length) stacks.innerHTML = '<div class="empty">No more money here!</div>';
    for (const d of denoms) {
      const b = h(`<button class="stack">${moneySVG(d, { px: 58 })}<b class="count">×${counts[d]}</b></button>`);
      onTap(b, () => { counts[d]--; placed.push(d); sfx.coin(); render(); }, { sound: false });
      stacks.appendChild(b);
    }
    counter.innerHTML = '';
    placed.forEach((d, i) => {
      const b = h(`<button class="placed">${moneySVG(d, { px: 54 })}</button>`);
      onTap(b, () => { placed.splice(i, 1); counts[d]++; sfx.back(); render(); }, { sound: false });
      counter.appendChild(b);
    });
    if (!placed.length) counter.innerHTML = '<div class="empty">Tap your money below to put it here</div>';
    totalEl.textContent = showTotal ? fmt(sum(placed)) : '';
    onChange(sum(placed));
  }
  render();
  return { placed: () => [...placed], total: () => sum(placed), el };
}

function walletPill() {
  return `<div class="wallet-pill">${moneySVG(25, { px: 22 })}<b>${fmt(walletTotal())}</b></div>`;
}

// ================= SHOP =================
export function openShop({ world, onClose }) {
  let tab = 'hat';
  let preview = null;
  world.setPandaMode(true);

  const sheet = h(`<div class="sheet shop">
    <div class="sheet-head"><h2>PANDA SHOP</h2>${walletPill()}<button class="x-btn" aria-label="Close">✕</button></div>
    <div class="tabs">${SLOTS.map((s) => `<button class="tab" data-s="${s.id}">${s.name}</button>`).join('')}</div>
    <div class="items"></div>
    <div class="buybar hidden"></div>
  </div>`);
  openScreen(sheet, 'sheet-mode');

  const close = () => {
    world.setOutfit(state.equipped);
    world.setPandaMode(false);
    closeScreen();
    onClose();
  };
  onTap($('.x-btn', sheet), close);
  for (const t of $$('.tab', sheet)) onTap(t, () => { tab = t.dataset.s; preview = null; world.setOutfit(state.equipped); renderItems(); });

  function renderItems() {
    $$('.tab', sheet).forEach((t) => t.classList.toggle('on', t.dataset.s === tab));
    const box = $('.items', sheet);
    box.innerHTML = '';
    $('.buybar', sheet).classList.add('hidden');
    for (const it of ITEMS.filter((i) => i.slot === tab)) {
      const owned = state.owned.includes(it.id);
      const wearing = state.equipped[it.slot] === it.id;
      const icon = it.slot === 'shirt'
        ? `<span class="swatch" style="background:${it.color === 'rainbow' ? 'linear-gradient(90deg,#ff4d4d,#ff9a1a,#ffe14d,#5fdc4a,#3bb8ff,#9b6bff)' : it.color}"></span>`
        : `<span class="emoji">${it.icon}</span>`;
      const card = h(`<button class="item ${owned ? 'owned' : ''} ${wearing ? 'wearing' : ''} ${preview === it.id ? 'previewing' : ''}">
        ${icon}<span class="item-name">${it.name}</span>
        ${owned ? `<span class="owned-tag">${wearing ? 'WEARING' : 'WEAR'}</span>` : `<span class="price-tag">${fmt(it.price)}</span>`}
      </button>`);
      onTap(card, () => {
        if (owned) {
          state.equipped[it.slot] = wearing ? null : it.id;
          save();
          world.setOutfit(state.equipped);
          world.cheer();
          renderItems();
        } else {
          preview = it.id;
          world.setOutfit({ ...state.equipped, [it.slot]: it.id });
          world.cheer();
          renderItems();
          showBuyBar(it);
        }
      });
      box.appendChild(card);
    }
  }

  function showBuyBar(it) {
    const bar = $('.buybar', sheet);
    bar.classList.remove('hidden');
    bar.innerHTML = `<div class="buy-text">${it.name} <span class="price-tag">${fmt(it.price)}</span></div>
      <button class="btn buy">BUY IT</button>`;
    onTap($('.buy', bar), () => {
      const have = walletTotal();
      if (have < it.price) {
        sfx.wrong();
        bar.innerHTML = `<div class="buy-text small">You have <b>${fmt(have)}</b>. It costs <b>${fmt(it.price)}</b>.<br>You need <b>${fmtShort(it.price - have)}</b> more. Play a zone to earn it!</div>
          <button class="btn ghost ok">OK</button>`;
        speak(SAY.needMore(it.price - have));
        onTap($('.ok', bar), () => { preview = null; world.setOutfit(state.equipped); renderItems(); });
        return;
      }
      payScreen(it);
    });
  }

  function payScreen(it) {
    const pay = h(`<div class="sheet shop pay">
      <div class="sheet-head"><h2>PAY</h2>${walletPill()}<button class="x-btn" aria-label="Back">✕</button></div>
      <div class="pay-top"><div class="pay-item">${it.name}</div><div class="price-tag big">${fmt(it.price)}</div></div>
      <div class="pay-body"></div>
      <div class="pay-msg"></div>
      <div class="choice-row"><button class="btn big paybtn">PAY</button></div>
    </div>`);
    openScreen(pay, 'sheet-mode tall');
    speak(SAY.costs(it.price));
    const mc = moneyCounter($('.pay-body', pay), { showTotal: state.settings.shopHint, counterLabel: 'Counter' });
    const msg = $('.pay-msg', pay);
    onTap($('.x-btn', pay), () => { openScreen(sheet, 'sheet-mode'); renderItems(); showBuyBar(it); });
    onTap($('.paybtn', pay), () => {
      const t = mc.total();
      if (t < it.price) {
        sfx.wrong();
        msg.innerHTML = t === 0 ? 'Tap your money to put it on the counter!' :
          `That's <b>${fmt(t)}</b> on the counter. The price is <b>${fmt(it.price)}</b>. Add <b>${fmtShort(it.price - t)}</b> more!`;
        speak(t === 0 ? SAY.tapMoney : SAY.needMore(it.price - t));
        return;
      }
      const change = t - it.price;
      removeMoney(mc.placed());
      const changeList = breakDown(change, [100, 25, 10, 5, 1]);
      addMoney(changeList);
      state.owned.push(it.id);
      state.equipped[it.slot] = it.id;
      state.stats.purchases++;
      const newBadges = [];
      if (award('shop1')) newBadges.push('🛍️ First Buy');
      if (state.owned.length >= 5 && award('fashion')) newBadges.push('👑 Fashion Panda');
      save();
      world.setOutfit(state.equipped);
      world.cheer(2.5);
      sfx.kaching();
      confetti(40);
      const done = h(`<div class="sheet shop pay done">
        <div class="sheet-head"><h2>YOU GOT IT!</h2>${walletPill()}</div>
        <div class="bought">${it.name}</div>
        ${change > 0
          ? `<div class="change-label">Your change:</div><div class="change">${changeList.map((d) => moneySVG(d, { px: 54 })).join('')}</div><div class="change-total">= ${fmtShort(change)}</div>`
          : '<div class="change-label">Exact change! Nice counting!</div>'}
        ${newBadges.map((b) => `<div class="note badge">New badge: <b>${b}</b></div>`).join('')}
        <div class="choice-row"><button class="btn big ok">YAY!</button></div>
      </div>`);
      openScreen(done, 'sheet-mode');
      speak(change > 0 ? [SAY.gotChange, A(change)] : SAY.exactChange);
      onTap($('.ok', done), () => {
        preview = null;
        openScreen(sheet, 'sheet-mode');
        sheet.querySelector('.wallet-pill').outerHTML = walletPill();
        renderItems();
      });
    });
  }

  renderItems();
}

// ================= WALLET =================
export function openWallet({ onClose }) {
  const scr = h(`<div class="panel-screen wallet">
    <div class="sheet-head"><h2>MY WALLET</h2><button class="x-btn" aria-label="Close">✕</button></div>
    <div class="wallet-total"></div>
    <div class="wallet-groups"></div>
    <div class="trade-box">
      <h3>💵 Trade Machine</h3>
      <p>Put exactly <b>$1.00</b> in coins in the machine to get a <b>$1 bill</b>!</p>
      <div class="trade-body"></div>
      <div class="pay-msg"></div>
      <div class="choice-row"><button class="btn big trade">TRADE</button></div>
      <div class="break-row"></div>
    </div>
  </div>`);
  openScreen(scr);
  onTap($('.x-btn', scr), () => { closeScreen(); onClose(); });

  let mc;
  function render() {
    $('.wallet-total', scr).innerHTML = `You have <b>${fmt(walletTotal())}</b>`;
    const groups = $('.wallet-groups', scr);
    groups.innerHTML = '';
    for (const d of [2000, 1000, 500, 100, 25, 10, 5, 1]) {
      const n = state.wallet[d] || 0;
      if (!n) continue;
      const shown = Math.min(n, 10);
      groups.appendChild(h(`<div class="wgroup"><div class="wmoney">${Array.from({ length: shown }, () => moneySVG(d, { px: isBill(d) ? 82 : 50 })).join('')}${n > shown ? `<b class="more">+${n - shown}</b>` : ''}</div>
        <div class="wlabel">${n} ${n === 1 ? INFO[d].name : INFO[d].plural} = <b>${fmtShort(n * d)}</b></div></div>`));
    }
    if (!groups.children.length) groups.innerHTML = '<div class="empty">Your wallet is empty. Play a zone to earn money!</div>';
    const body = $('.trade-body', scr);
    body.innerHTML = '';
    mc = moneyCounter(body, { coinsOnly: true, counterLabel: 'Machine' });
    const br = $('.break-row', scr);
    br.innerHTML = state.wallet[100] > 0 ? '<button class="btn ghost small break">Break a $1 bill into 4 quarters</button>' : '';
    const bb = $('.break', scr);
    if (bb) onTap(bb, () => { removeMoney([100]); addMoney([25, 25, 25, 25]); sfx.kaching(); speak(SAY.breakDollar); render(); });
  }
  render();

  onTap($('.trade', scr), () => {
    const t = mc.total();
    const msg = $('.pay-msg', scr);
    if (t !== 100) {
      sfx.wrong();
      msg.innerHTML = t === 0 ? 'Put some coins in the machine first!' : t < 100
        ? `That's <b>${fmtShort(t)}</b>. You need <b>${fmtShort(100 - t)}</b> more to make a dollar.`
        : `That's <b>${fmt(t)}</b>. Too much! Take <b>${fmtShort(t - 100)}</b> out.`;
      speak(t === 0 ? SAY.machineEmpty : t < 100 ? SAY.needMore(100 - t) : SAY.takeBack(t - 100));
      return;
    }
    removeMoney(mc.placed());
    addMoney([100]);
    state.stats.trades++;
    const nb = award('trade1');
    save();
    sfx.kaching();
    confetti(30);
    msg.innerHTML = 'Ka-ching! You made exactly <b>$1.00</b>!' + (nb ? ' New badge: <b>🔁 Big Trader</b>' : '');
    speak(SAY.traded);
    render();
  });
}
