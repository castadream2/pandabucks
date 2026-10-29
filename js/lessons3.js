// Zones 7-8: Card Mode (debit card skills) and Shopping Trip (Ruby's Market).
// Same challenge `api` as lessons.js. Spoken words come from lines.js.
import { moneySVG, fmt, fmtShort, sum, breakDown } from './money.js';
import { h, $, $$, onTap, pick, shuffle, rand, wait } from './ui.js';
import { sfx } from './audio.js';
import { SAY, A, GOODS, SAFETY, MISSIONS, amountLines } from './lines.js';

const money = (c) => (c % 100 === 0 ? '$' + c / 100 : fmt(c));
const split = (c) => `<span class="pt-dollars">$${Math.floor(c / 100)}</span><span class="pt-cents">.${String(c % 100).padStart(2, '0')}</span>`;
const amt = (c, who = 'twinkle') => amountLines(c, who);

function wiggle(el) {
  el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
  setTimeout(() => el.classList.remove('bad'), 500);
}

const cardHTML = (balance) => `<div class="debit-card">
  <div class="dc-top"><span class="dc-bank">🐼 PANDA BANK</span><span class="dc-type">DEBIT</span></div>
  <div class="dc-chip"></div>
  <div class="dc-num">•••• •••• •••• 2468</div>
  ${balance != null ? `<div class="dc-bal">Balance <b>${split(balance)}</b></div>` : ''}
</div>`;

// ============ CARD MODE ============
function cardEnough(api) {
  const yes = Math.random() < 0.5;
  let b, t;
  for (let tries = 0; tries < 100; tries++) {
    if (api.tier === 1) { t = (2 + rand(12)) * 100; b = yes ? t + (3 + rand(6)) * 100 : t - (2 + rand(Math.min(5, t / 100 - 1))) * 100; }
    else if (api.tier === 2) { t = 200 + rand(1500); b = yes ? t + 100 + rand(800) : t - 100 - rand(Math.max(1, t - 200)); }
    else {
      // Close calls: same dollars (compare cents), or "fewer cents but more dollars".
      t = 300 + rand(1600);
      const mode = rand(2);
      if (mode === 0) { const d = Math.floor(t / 100) * 100; b = d + rand(100); }
      else { b = yes ? Math.floor(t / 100) * 100 + 100 + rand(Math.max(1, t % 100)) : Math.floor(t / 100) * 100 - 100 + (t % 100) + 1 + rand(Math.max(1, 99 - (t % 100))); }
    }
    if (b > 0 && b !== t && (b >= t) === yes && b < 10000) break;
  }
  const enough = b >= t;
  api.prompt('Can you pay with your card?', [SAY.balanceIs, ...amt(b), SAY.totalIs, ...amt(t), SAY.canPayCard]);
  const hl = api.hint >= 2 ? 'hl-dollars' : '';
  const box = h(`<div class="center-stack">
    <div class="${hl}">${cardHTML(b)}</div>
    <div class="reader ${hl}"><div class="reader-screen"><small>TOTAL</small><b>${split(t)}</b></div></div>
    ${api.hint >= 1 ? '<div class="rule-card">🔍 Compare the <b>dollars</b> first. Same dollars? Then compare the <b>cents</b>.</div>' : ''}
    <div class="choice-row yesno"><button class="btn big yes" data-v="1">YES</button><button class="btn big no" data-v="0">NO</button></div>
  </div>`);
  api.stage.appendChild(box);
  for (const btn of $$('.yesno .btn', box)) {
    onTap(btn, () => {
      if (!!+btn.dataset.v === enough) {
        btn.classList.add('good');
        api.right(enough ? `Yes! ${money(b)} is more than ${money(t)}. You can pay!` : `Right! ${money(b)} is less than ${money(t)}. It would be declined.`, enough ? SAY.cardOk : SAY.cardNo);
        return;
      }
      wiggle(btn);
      $$('.debit-card, .reader', box).forEach((el) => el.parentElement.classList.add('hl-dollars'));
      box.querySelector('.reader').classList.add('hl-dollars');
      api.miss(`Compare the dollars first. ${money(b)} is ${enough ? 'more' : 'less'} than ${money(t)}.`, [SAY.compareRule, enough ? SAY.balanceMore : SAY.balanceLess]);
      box.querySelector(enough ? '.yes' : '.no').classList.add('glow');
    }, { sound: false });
  }
}

function tapToPay(api) {
  const g = pick(GOODS.filter((x) => x.price < 2000));
  const declined = api.tier >= 3 && Math.random() < 0.35;
  const usePin = api.tier >= 2;
  const PIN = '2468';
  const steps = ['total', 'card', ...(usePin ? ['cover', 'pin'] : []), 'take'];
  const say = { total: SAY.stepTotal, card: SAY.stepCard, cover: SAY.stepCover, pin: SAY.stepPin, take: SAY.stepTake };
  const text = { total: 'Look at the total. Tap it!', card: 'Tap your card on the reader', cover: 'Cover the keypad with your hand', pin: `Type your pretend PIN: ${PIN}`, take: 'Take your card AND your receipt' };
  let step = 0, typed = '', covered = false, took = new Set(), wasDeclined = false;

  const ui = h(`<div class="center-stack pay-scene">
    <div class="good-card small">${`<span class="good-emoji">${g.e}</span><span class="good-name">${g.name}</span>`}</div>
    <div class="reader big">
      <button class="reader-screen tap-total"><small>TOTAL</small><b>${split(g.price)}</b></button>
      <div class="reader-msg"></div>
      <div class="keypad hidden">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, ''].map((k) => `<button class="key" ${k === '' ? 'disabled' : ''} data-k="${k}">${k}</button>`).join('')}</div>
      <div class="hand hidden">🤚</div>
    </div>
    <div class="pay-row">
      <button class="card-btn">${cardHTML(null)}</button>
      <button class="btn cover-btn hidden">🤚 Cover</button>
      <button class="receipt hidden">🧾<small>Receipt</small></button>
    </div>
    <div class="decline-choices choice-row hidden"></div>
  </div>`);
  api.stage.appendChild(ui);
  const msg = $('.reader-msg', ui), keypad = $('.keypad', ui), coverBtn = $('.cover-btn', ui), receipt = $('.receipt', ui), cardBtn = $('.card-btn', ui), totalBtn = $('.tap-total', ui);

  function show() {
    const s = steps[step];
    api.prompt(text[s], say[s]);
    $$('.glow', ui).forEach((e) => e.classList.remove('glow'));
    if (api.hint >= 2) {
      if (s === 'take') {
        // Only glow what she still needs to take.
        if (!took.has('card')) cardBtn.classList.add('glow');
        if (!took.has('receipt')) receipt.classList.add('glow');
      } else {
        const target = { total: totalBtn, card: cardBtn, cover: coverBtn, pin: keypad.querySelector(`[data-k="${PIN[typed.length]}"]`) }[s];
        target && target.classList.add('glow');
      }
    }
  }
  function wrong(line = SAY.notYet, txt = 'Not yet! Follow the steps in order.') { wiggle(ui.querySelector('.reader')); api.miss(txt, line); show(); }
  function next() { step++; if (step < steps.length) show(); }

  onTap(totalBtn, () => { if (steps[step] !== 'total') return wrong(); totalBtn.classList.add('seen'); next(); }, { sound: false });
  onTap(cardBtn, () => {
    const s = steps[step];
    if (s === 'take') { took.add('card'); cardBtn.classList.add('taken'); return finishCheck(); }
    if (wasDeclined) {
      // Trying the card again and again is the habit to break.
      wiggle(cardBtn);
      api.miss('Declined means it didn\'t work. Don\'t keep trying it.', [SAY.notQuite, SAFETY[3].why]);
      $('.decline-choices [data-ok="1"]', ui)?.classList.add('glow');
      return;
    }
    if (s !== 'card') return wrong();
    sfx.tap();
    cardBtn.classList.add('tapped');
    if (declined) {
      wasDeclined = true;
      sfx.wrong();
      $$('.glow', ui).forEach((e) => e.classList.remove('glow'));
      msg.innerHTML = '<span class="declined">DECLINED</span>';
      api.prompt('DECLINED! What should you do?', SAY.declined);
      const opts = shuffle([['Put something back, or ask a parent', 1], ['Tap the card again and again', 0], ['Walk out with the stuff', 0]]);
      const dc = $('.decline-choices', ui);
      dc.innerHTML = opts.map(([t, ok]) => `<button class="btn choice wide" data-ok="${ok}">${t}</button>`).join('');
      dc.classList.remove('hidden');
      if (api.hint >= 2) dc.querySelector('[data-ok="1"]').classList.add('glow');
      for (const b of $$('button', dc)) onTap(b, () => {
        if (+b.dataset.ok) { b.classList.add('good'); api.right('Yes! Put something back, or ask a parent.', SAY.declineRight); }
        else { wiggle(b); api.miss('Not quite. Declined means it didn\'t work. Don\'t keep trying it.', [SAY.notQuite, SAFETY[3].why]); dc.querySelector('[data-ok="1"]').classList.add('glow'); }
      }, { sound: false });
      return;
    }
    if (usePin) { keypad.classList.remove('hidden'); coverBtn.classList.remove('hidden'); msg.textContent = 'ENTER PIN'; }
    else approve();
    next();
  }, { sound: false });
  onTap(coverBtn, () => { if (steps[step] !== 'cover') return wrong(); covered = true; ui.querySelector('.hand').classList.remove('hidden'); coverBtn.classList.add('hidden'); next(); }, { sound: false });
  for (const k of $$('.key', keypad)) {
    onTap(k, () => {
      if (!covered) return wrong(SAY.coverFirst, 'Cover the keypad first, so nobody sees your PIN!');
      if (steps[step] !== 'pin') return wrong();
      if (k.dataset.k !== PIN[typed.length]) { wiggle(k); api.miss(`Oops! Your pretend PIN is ${PIN}.`, SAY.wrongDigit); typed = ''; msg.textContent = 'ENTER PIN'; show(); return; }
      typed += k.dataset.k;
      msg.textContent = '•'.repeat(typed.length);
      if (typed.length === 4) { approve(); next(); } else show();
    }, { sound: false });
  }
  function approve() {
    sfx.kaching();
    keypad.classList.add('hidden');
    ui.querySelector('.hand').classList.add('hidden');
    msg.innerHTML = '<span class="approved">APPROVED ✓</span>';
    receipt.classList.remove('hidden');
  }
  onTap(receipt, () => { if (steps[step] !== 'take') return wrong(); took.add('receipt'); receipt.classList.add('taken'); finishCheck(); }, { sound: false });
  function finishCheck() {
    show();
    if (took.has('card') && took.has('receipt')) api.right('You paid with your card! Card back in your wallet.', SAY.cardPaid);
  }
  show();
}

function cardSafety(api) {
  const s = pick(SAFETY);
  api.prompt(s.q, s.q);
  const box = h(`<div class="center-stack"><div class="safety-icon">🔒</div>
    <div class="safety-opts">${shuffle(s.opts.map((t, i) => [t, i])).map(([t, i]) => `<button class="btn choice wide" data-i="${i}">${t}</button>`).join('')}</div></div>`);
  api.stage.appendChild(box);
  for (const b of $$('.choice', box)) {
    onTap(b, () => {
      if (b.dataset.i === '0') { b.classList.add('good'); api.right(s.why, [SAY.yes, s.why]); return; }
      wiggle(b);
      api.miss(s.why, [SAY.notQuite, s.why]);
      box.querySelector('[data-i="0"]').classList.add('glow');
    }, { sound: false });
  }
}

function balanceLeft(api) {
  const b = (6 + rand(15)) * 100;
  const p = api.tier >= 4 ? (2 + rand(b / 100 - 3)) * 100 + pick([25, 50, 75]) : (2 + rand(b / 100 - 3)) * 100;
  const left = b - p;
  api.prompt('How much is left on your card?', [SAY.balanceIs, ...amt(b), SAY.youPay, ...amt(p), SAY.howMuchLeft]);
  const opts = shuffle([...new Set([left, left + 100, Math.max(25, left - 100), left + (api.tier >= 4 ? 50 : 200)])].filter((v) => v > 0 && v !== b)).slice(0, 3);
  if (!opts.includes(left)) opts[0] = left;
  const box = h(`<div class="center-stack">
    <div class="bank-app"><div class="ba-row"><span>Balance</span><b>${money(b)}</b></div><div class="ba-row minus"><span>You pay</span><b>− ${money(p)}</b></div><div class="ba-row total"><span>Left</span><b>?</b></div></div>
    ${api.hint >= 1 ? `<div class="rule-card">🧮 Start at <b>${money(p)}</b>. Count up to <b>${money(b)}</b>.</div>` : ''}
    <div class="choice-row">${shuffle(opts).map((v) => `<button class="btn choice" data-v="${v}">${money(v)}</button>`).join('')}</div></div>`);
  api.stage.appendChild(box);
  for (const btn of $$('.choice', box)) {
    onTap(btn, () => {
      if (+btn.dataset.v === left) { btn.classList.add('good'); box.querySelector('.total b').textContent = money(left); api.right(`Yes! ${money(left)} is left.`, [SAY.yesLeft, ...amt(left)]); return; }
      wiggle(btn);
      api.miss(`Start at ${money(p)} and count up to ${money(b)}. That's ${money(left)}.`, SAY.countUpRule);
      box.querySelector(`[data-v="${left}"]`).classList.add('glow');
    }, { sound: false });
  }
}

// ============ SHOPPING TRIP (Ruby's Market) ============
const CAT_ICON = { snack: '🍪', drink: '🥤', lunch: '🍔', fun: '🎀' };
const CAT_NAME = { snack: 'snack', drink: 'drink', lunch: 'lunch', fun: 'fun stuff' };

function shopTrip(api) {
  const mission = MISSIONS[api.tier];
  const cats = Object.keys(mission.need);
  const byCat = (c) => GOODS.filter((g) => g.cat === c && g.price < 1000);
  // Shelf: 3 choices per needed category + 1 fun distractor.
  let shelf, budget;
  for (let tries = 0; tries < 100; tries++) {
    shelf = cats.flatMap((c) => shuffle(byCat(c)).slice(0, 3));
    shelf.push(pick(byCat('fun')));
    const cheapest = sum(cats.map((c) => Math.min(...shelf.filter((g) => g.cat === c).map((g) => g.price))));
    const priciest = sum(cats.map((c) => Math.max(...shelf.filter((g) => g.cat === c).map((g) => g.price))));
    // Budget fits the cheap picks but not the priciest ones, so she has to check.
    const lo = Math.ceil(cheapest / 100) + 1, hi = Math.floor((priciest - 1) / 100);
    if (hi >= lo) { budget = (lo + rand(hi - lo + 1)) * 100; break; }
    budget = (Math.ceil(cheapest / 100) + 1) * 100;
  }
  shelf = shuffle(shelf);
  const byCard = api.tier >= 4;
  const balance = byCard ? budget + rand(100) : null;
  const wallet = byCard ? [] : billsFor(budget);
  const cart = new Set();
  let misses = 0;

  api.prompt(`${mission.text.replace(' Pay with your card.', '')}`, [mission.text, SAY.youHave, ...amt(byCard ? balance : budget, 'ruby'), SAY.shopIntro]);
  const ui = h(`<div class="trip">
    <div class="mission">
      <div class="m-list">${cats.map((c) => `<span class="m-item" data-c="${c}">${CAT_ICON[c]} 1 ${CAT_NAME[c]}</span>`).join('')}</div>
      <div class="m-money">${byCard ? `💳 Card balance <b>${money(balance)}</b>` : `💵 You have <b>${money(budget)}</b>`}</div>
    </div>
    <div class="goods-grid shelf">${shelf.map((g) => `<button class="good-card pick" data-name="${g.name}"><span class="good-emoji">${g.e}</span><span class="good-name">${g.name}</span><span class="price-tag big">${split(g.price)}</span></button>`).join('')}</div>
    <div class="cart-bar"><div class="cart-items">🛒 <span class="ci"></span></div><div class="cart-total"></div><button class="btn checkout">CHECKOUT</button></div>
  </div>`);
  api.stage.appendChild(ui);
  const items = () => shelf.filter((g) => cart.has(g.name));
  const total = () => sum(items().map((g) => g.price));

  function render() {
    $$('.shelf .glow', ui).forEach((b) => b.classList.remove('glow')); // the "put this back" hint is done once the cart changes
    $$('.shelf .good-card', ui).forEach((b) => b.classList.toggle('in-cart', cart.has(b.dataset.name)));
    $('.ci', ui).textContent = items().map((g) => g.e).join(' ') || 'empty';
    $('.cart-total', ui).innerHTML = `Total <b>${money(total())}</b>`;
    const have = byCard ? balance : budget;
    $('.cart-total', ui).classList.toggle('over', total() > have);
    $$('.m-item', ui).forEach((m) => m.classList.toggle('done', items().filter((g) => g.cat === m.dataset.c).length === 1));
  }
  for (const b of $$('.shelf .good-card', ui)) {
    onTap(b, () => {
      const n = b.dataset.name;
      cart.has(n) ? (cart.delete(n), sfx.back()) : (cart.add(n), sfx.coin());
      render();
    }, { sound: false });
  }
  onTap($('.checkout', ui), () => {
    const its = items();
    const okList = cats.every((c) => its.filter((g) => g.cat === c).length === 1) && its.length === cats.length;
    if (!okList) {
      misses++;
      api.miss(`Check your list! You need: ${cats.map((c) => `1 ${CAT_NAME[c]}`).join(' + ')}.`, [SAY.wrongItems, mission.text]);
      return;
    }
    const t = total();
    const have = byCard ? balance : budget;
    if (t > have) {
      misses++;
      api.miss(`Your total is ${money(t)}, but you have ${money(have)}. Put something back!`, [SAY.yourTotal, ...amt(t, 'ruby'), SAY.overBudget]);
      // Errorless help: glow the cart item where picking a cheaper one of the same kind saves the most.
      const saving = (g) => g.price - Math.min(...shelf.filter((x) => x.cat === g.cat).map((x) => x.price));
      const best = [...its].sort((a, b) => saving(b) - saving(a))[0];
      if (best && saving(best) > 0) ui.querySelector(`.shelf [data-name="${best.name}"]`).classList.add('glow');
      return;
    }
    checkout(t);
  }, { sound: false });

  function checkout(t) {
    ui.innerHTML = '';
    if (byCard) {
      api.prompt('Tap your card to pay', [SAY.yourTotal, ...amt(t, 'ruby'), SAY.payCard]);
      const pay = h(`<div class="center-stack">
        <div class="reader big"><div class="reader-screen"><small>TOTAL</small><b>${split(t)}</b></div><div class="reader-msg"></div></div>
        <button class="card-btn ${api.hint >= 1 ? 'glow' : ''}">${cardHTML(balance)}</button></div>`);
      ui.appendChild(pay);
      onTap($('.card-btn', pay), () => {
        sfx.kaching();
        $('.reader-msg', pay).innerHTML = '<span class="approved">APPROVED ✓</span>';
        $('.card-btn', pay).classList.add('tapped');
        setTimeout(() => api.right(`Approved! You bought it all for ${money(t)}.`, [SAY.approved, pick(SAY.tripDone)]), 500);
      }, { sound: false });
      return;
    }
    // Best way to pay: the smallest amount she can hand over that covers the total
    // (Dollar Up with $1s, or the $5/$10 when she doesn't have enough $1s).
    const best = bestPay(wallet, t);
    const counts = {};
    for (const d of wallet) counts[d] = (counts[d] || 0) + 1;
    const placed = [];
    api.prompt(`Total ${money(t)}. Pay with Dollar Up!`, [SAY.yourTotal, ...amt(t, 'ruby'), SAY.payWith]);
    const pay = h(`<div class="center-stack">
      <div class="reader"><div class="reader-screen"><small>TOTAL</small><b>${split(t)}</b></div></div>
      ${api.hint >= 1 ? '<div class="rule-card">⬆️ <b>Dollar Up:</b> look at the dollars, then give <b>ONE MORE</b>.<br><small>Not enough $1s? Use a bigger bill.</small></div>' : ''}
      <div class="tray"><div class="tray-label">Ruby's counter</div><div class="tray-coins"></div><div class="tray-total"></div></div>
      <div class="stacks"></div><div class="change hidden"></div>
      <div class="choice-row"><button class="btn big give">PAY</button></div></div>`);
    ui.appendChild(pay);
    const trayEl = $('.tray-coins', pay), stacks = $('.stacks', pay), btn = $('.give', pay);
    const extraBills = () => placed.some((d, i) => sum(placed) - d >= t); // could hand back a bill and still cover it
    function nextHint() {
      // Next bill from the best plan that she hasn't put down yet.
      const left = [...best.bills];
      for (const d of placed) { const k = left.indexOf(d); if (k >= 0) left.splice(k, 1); }
      return left.sort((a, b) => b - a)[0];
    }
    function draw() {
      stacks.innerHTML = '';
      const hintBill = (api.hint >= 2 || misses >= 2) && sum(placed) < t ? nextHint() : null;
      for (const d of [1000, 500, 100]) {
        if (!counts[d]) continue;
        const s = h(`<button class="stack">${moneySVG(d, { px: 50 })}<b class="count">×${counts[d]}</b></button>`);
        if (d === hintBill) s.classList.add('glow');
        onTap(s, () => { counts[d]--; placed.push(d); sfx.coin(); if (api.hint >= 1) api.speak(A(sum(placed))); draw(); }, { sound: false });
        stacks.appendChild(s);
      }
      trayEl.innerHTML = '';
      placed.forEach((d, i) => {
        const b = h(`<button class="pile-bill">${moneySVG(d, { px: 44 })}</button>`);
        if ((api.hint >= 2 || misses >= 2) && sum(placed) >= t && extraBills() && sum(placed) - d >= t) b.classList.add('glow', 'remove');
        onTap(b, () => { placed.splice(i, 1); counts[d]++; sfx.back(); draw(); }, { sound: false });
        trayEl.appendChild(b);
      });
      $('.tray-total', pay).textContent = api.hint >= 1 && placed.length ? money(sum(placed)) : '';
      btn.classList.toggle('glow', (api.hint >= 2 || misses >= 2) && sum(placed) >= t && !extraBills());
    }
    onTap(btn, () => {
      const paid = sum(placed);
      if (!paid) return;
      if (paid < t) { misses++; api.miss(`That's ${money(paid)}. Not enough yet. Add another bill!`, SAY.addBill); draw(); return; }
      if (extraBills()) { misses++; api.miss('You gave more bills than you need. Take one back.', SAY.extraBill); draw(); return; }
      const change = paid - t;
      if (change) {
        const ch = $('.change', pay);
        ch.innerHTML = `<div class="change-label">Your change:</div><div class="change-coins">${breakDown(change, [500, 100, 25, 10, 5, 1]).map((d) => moneySVG(d, { px: 44 })).join('')}</div>`;
        ch.classList.remove('hidden');
      }
      sfx.kaching();
      api.right(change ? `Paid! Your change is ${money(change)}.` : 'Paid! Exact!', change ? [SAY.changeIs, ...amt(change, 'ruby'), pick(SAY.tripDone)] : pick(SAY.tripDone));
    }, { sound: false });
    draw();
  }
  render();
}

// Smallest amount she can hand over that covers `t` (fewest bills on ties).
function bestPay(wallet, t) {
  const have = {};
  for (const d of wallet) have[d] = (have[d] || 0) + 1;
  let best = null;
  for (let a = 0; a <= (have[1000] || 0); a++) for (let b = 0; b <= (have[500] || 0); b++) for (let c = 0; c <= (have[100] || 0); c++) {
    const s = a * 1000 + b * 500 + c * 100, n = a + b + c;
    if (s >= t && (!best || s < best.sum || (s === best.sum && n < best.n))) best = { sum: s, n, bills: [...Array(a).fill(1000), ...Array(b).fill(500), ...Array(c).fill(100)] };
  }
  return best;
}

// Bills for a shopping budget: a $5 or $10 when it fits, the rest in $1s so Dollar Up works.
function billsFor(cents) {
  const d = cents / 100;
  if (d >= 12) return [1000, ...Array(d - 10).fill(100)];
  if (d >= 6) return [500, ...Array(d - 5).fill(100)];
  return Array(d).fill(100);
}

export const PLAN3 = {
  card: (tier = 1) => (tier >= 3
    ? [cardEnough, tapToPay, cardSafety, cardEnough, tapToPay, balanceLeft]
    : [cardEnough, tapToPay, cardSafety, cardEnough, tapToPay, cardSafety]),
  shopping: () => [shopTrip, shopTrip, shopTrip],
};
export const BUDDY3 = { card: 'twinkle', shopping: 'ruby' };
