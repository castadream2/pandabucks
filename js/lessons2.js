// Zones 4-6: Bills, Dollar Up (Ruby's snack stand), Enough?
// Same challenge `api` as lessons.js. Spoken words come from lines.js.
import { INFO, moneySVG, fmt, fmtShort, sum, breakDown } from './money.js';
import { h, $$, onTap, pick, shuffle, rand, wait } from './ui.js';
import { sfx } from './audio.js';
import { SAY, A, GOODS, BILLS } from './lines.js';
import { recordConfusion } from './progress.js';

// "$7" for whole dollars, "$3.75" otherwise.
const money = (c) => (c % 100 === 0 ? '$' + c / 100 : fmt(c));

function wiggle(el) {
  el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
  setTimeout(() => el.classList.remove('bad'), 500);
}

const billsFor = (tier) => (tier === 1 ? [100, 500] : tier === 2 ? [100, 500, 1000] : BILLS);

// Random pile of bills (from `denoms`) adding up to exactly `cents`.
// Sometimes breaks a big bill into smaller ones so she has to really count.
function billsMaking(cents, denoms) {
  let list = breakDown(cents, [...denoms].sort((a, b) => b - a));
  for (let tries = 0; tries < 2; tries++) {
    const big = list.filter((d) => d > 100);
    if (!big.length || Math.random() < 0.65) break; // usually keep the bigger bills
    const d = pick(big);
    const smaller = denoms.filter((x) => x < d).sort((a, b) => b - a);
    list.splice(list.indexOf(d), 1, ...breakDown(d, smaller));
  }
  if (list.length > 9) list = breakDown(cents, [...denoms].sort((a, b) => b - a));
  return list;
}

function canMake(rem, counts, denoms) {
  if (rem === 0) return true;
  for (const d of denoms) {
    if ((counts[d] || 0) > 0 && d <= rem) {
      counts[d]--;
      const ok = canMake(rem - d, counts, denoms);
      counts[d]++;
      if (ok) return true;
    }
  }
  return false;
}

// A row of bills she can tap one by one to count (biggest first is the tip).
// Returns { reset, countAll } for the "let's count together" help.
function countable(api, bills, { px = 66 } = {}) {
  const row = h(`<div class="bill-row">${bills.map((d, i) => `<button class="bill-count" data-i="${i}" data-d="${d}"><b class="q-count"></b>${moneySVG(d, { px })}</button>`).join('')}</div>`);
  let total = 0;
  const glowNext = () => {
    $$('.bill-count', row).forEach((b) => b.classList.remove('pulse'));
    if (api.hint < 2) return;
    const left = $$('.bill-count:not(.counted)', row).sort((a, b) => b.dataset.d - a.dataset.d);
    if (left[0]) left[0].classList.add('pulse');
  };
  const countOne = (b) => {
    if (b.classList.contains('counted')) return;
    total += +b.dataset.d;
    b.classList.add('counted');
    if (api.hint >= 1) b.querySelector('.q-count').textContent = money(total);
    sfx.coin();
    api.speak(A(total));
    glowNext();
  };
  for (const b of $$('.bill-count', row)) onTap(b, () => countOne(b), { sound: false });
  glowNext();
  let busy = false;
  return {
    el: row,
    get busy() { return busy; },
    async countAll() {
      if (busy) return;
      busy = true;
      total = 0;
      for (const b of $$('.bill-count', row)) { b.classList.remove('counted', 'pulse'); b.querySelector('.q-count').textContent = ''; }
      const order = $$('.bill-count', row).sort((a, b) => b.dataset.d - a.dataset.d);
      for (const b of order) {
        await wait(750);
        total += +b.dataset.d;
        b.classList.add('counted');
        b.querySelector('.q-count').textContent = money(total);
        sfx.coin();
        api.speak(A(total));
      }
      busy = false;
    },
  };
}

function goodCard(g, { tag = 'div', cls = '' } = {}) {
  const d = Math.floor(g.price / 100), c = String(g.price % 100).padStart(2, '0');
  return `<${tag} class="good-card ${cls}" data-price="${g.price}" data-name="${g.name}">
    <span class="good-emoji">${g.e}</span><span class="good-name">${g.name}</span>
    <span class="price-tag big"><span class="pt-dollars">$${d}</span><span class="pt-cents">.${c}</span></span></${tag}>`;
}

// ============ BILLS ============
function tapBill(api) {
  const target = pick(billsFor(api.tier));
  api.prompt(`Tap the <em>${money(target)} bill</em>`, SAY.tapBill(target));
  const grid = h(`<div class="bill-grid">${shuffle(BILLS).map((d) => `<button class="bill-btn" data-d="${d}">${moneySVG(d, { px: 84 })}</button>`).join('')}</div>`);
  api.stage.appendChild(grid);
  for (const b of $$('.bill-btn', grid)) {
    onTap(b, () => {
      const d = +b.dataset.d;
      if (d === target) { b.classList.add('good'); api.right(`Yes! That's the ${money(target)} bill.`, SAY.billRight(target)); return; }
      recordConfusion(target, d);
      wiggle(b);
      api.miss(`That's the ${money(d)} bill. Look at the corners: the ${money(target)} bill has a big ${target / 100} in each corner.`, [SAY.thatsBill(d), SAY.billClue(target)]);
      grid.querySelector(`[data-d="${target}"]`).classList.add('glow');
    }, { sound: false });
  }
}

function billValue(api) {
  const d = pick(billsFor(api.tier));
  api.prompt('How much is this bill worth?', SAY.howMuchBill);
  const box = h(`<div class="center-stack"><div class="one-bill">${moneySVG(d, { px: 150 })}</div>
    <div class="choice-row">${BILLS.map((v) => `<button class="btn choice" data-v="${v}">${money(v)}</button>`).join('')}</div></div>`);
  api.stage.appendChild(box);
  for (const b of $$('.choice', box)) {
    onTap(b, () => {
      const v = +b.dataset.v;
      if (v === d) { b.classList.add('good'); api.right(`Yes! It's worth ${money(d)}.`, SAY.billRight(d)); return; }
      recordConfusion(d, v);
      wiggle(b);
      api.miss(`This is the ${money(d)} bill. See the big ${d / 100} in the corners?`, [SAY.billMiss(d), SAY.billClue(d)]);
      box.querySelector(`[data-v="${d}"]`).classList.add('glow');
    }, { sound: false });
  }
}

function countBills(api) {
  const caps = [0, 1000, 2000, 3000, 5000];
  const denoms = billsFor(api.tier);
  let bills;
  do {
    const n = 2 + rand(api.tier + 2);
    bills = Array.from({ length: n }, () => pick(denoms));
  } while (sum(bills) > caps[api.tier] || new Set(bills).size < Math.min(2, denoms.length));
  bills = shuffle(bills);
  const total = sum(bills);
  api.prompt('How much money is this?', SAY.howMuchMoney);
  const counter = countable(api, bills);
  const tip = h(`<div class="tip">${api.hint >= 1 ? 'Tap each bill to count. Start with the BIGGEST!' : 'Tap the bills to count them'}</div>`);
  const wrongs = shuffle([bills.length * 100, total + 100, total - 100, total + 500].filter((v) => v > 0 && v !== total)).slice(0, 2);
  const choices = h(`<div class="choice-row">${shuffle([total, ...wrongs]).map((v) => `<button class="btn choice" data-v="${v}">${money(v)}</button>`).join('')}</div>`);
  api.stage.append(counter.el, tip, choices);
  for (const b of $$('.choice', choices)) {
    onTap(b, async () => {
      if (counter.busy) return;
      const v = +b.dataset.v;
      if (v === total) { b.classList.add('good'); api.right(`Yes! That's ${money(total)}.`, SAY.billsRight(total)); return; }
      wiggle(b);
      api.miss(v === bills.length * 100 ? `Careful! There are ${bills.length} bills, but they're worth different amounts.` : 'Let\'s count together. Biggest bills first!',
        v === bills.length * 100 ? SAY.billsNotCount(bills.length) : SAY.biggestFirst);
      await wait(1500);
      await counter.countAll();
      choices.querySelector(`[data-v="${total}"]`).classList.add('glow');
    }, { sound: false });
  }
}

function makeBills(api) {
  const ranges = [0, [2, 9], [6, 19], [11, 35], [21, 50]];
  const [lo, hi] = ranges[api.tier];
  const denoms = billsFor(api.tier);
  const target = (lo + rand(hi - lo + 1)) * 100;
  const comp = billsMaking(target, denoms);
  const extras = Array.from({ length: 2 + rand(2) }, () => pick(denoms.filter((d) => d <= target)));
  const notes = shuffle([...comp, ...extras]).map((d, id) => ({ id, d, tray: false, order: 0 }));
  let order = 0, misses = 0, showTotal = api.hint >= 1;
  api.prompt(`Show me <em>${money(target)}</em>`, SAY.showMe(target));
  const ui = h(`<div class="dollar-game">
    <div class="tray"><div class="tray-label">Twinkle's paws</div><div class="tray-coins"></div><div class="tray-total"></div></div>
    <div class="tip">${api.hint >= 2 ? 'Tip: start with the BIGGEST bills, then count on!' : 'Tap bills to give them to Twinkle'}</div>
    <div class="pile bills"></div>
    <div class="choice-row"><button class="btn big give">GIVE</button></div>
  </div>`);
  api.stage.appendChild(ui);
  const trayEl = ui.querySelector('.tray-coins'), pileEl = ui.querySelector('.pile'), totalEl = ui.querySelector('.tray-total'), give = ui.querySelector('.give');
  const inTray = () => notes.filter((c) => c.tray).sort((a, b) => a.order - b.order);
  const total = () => sum(inTray().map((c) => c.d));
  const sorted = [...denoms].sort((a, b) => b - a);

  function suggestion() {
    const rem = target - total();
    if (rem === 0) return { give: true };
    if (rem < 0) return { remove: inTray().slice(-1)[0] };
    const counts = {};
    for (const c of notes) if (!c.tray) counts[c.d] = (counts[c.d] || 0) + 1;
    for (const d of sorted) {
      if (!counts[d] || d > rem) continue;
      counts[d]--;
      const ok = canMake(rem - d, counts, sorted);
      counts[d]++;
      if (ok) return { add: notes.find((c) => !c.tray && c.d === d) };
    }
    return { remove: inTray().slice(-1)[0] };
  }
  function render() {
    trayEl.innerHTML = ''; pileEl.innerHTML = '';
    for (const c of inTray()) trayEl.appendChild(btn(c));
    for (const c of notes.filter((c) => !c.tray)) pileEl.appendChild(btn(c));
    const t = total();
    totalEl.className = 'tray-total' + (t > target ? ' over' : t === target ? ' exact' : '');
    totalEl.innerHTML = showTotal ? `${money(t)}${t > target ? ' <small>too much!</small>' : t === target ? ' <small>exactly!</small>' : ''}` : (t ? '?' : '');
    give.classList.remove('glow');
    if (api.hint >= 2 || misses >= 2) {
      const s = suggestion();
      if (s.give) give.classList.add('glow');
      else if (s.add) pileEl.querySelector(`[data-id="${s.add.id}"]`)?.classList.add('glow');
      else if (s.remove) trayEl.querySelector(`[data-id="${s.remove.id}"]`)?.classList.add('glow', 'remove');
    }
  }
  function btn(c) {
    const b = h(`<button class="pile-bill" data-id="${c.id}">${moneySVG(c.d, { px: 58 })}</button>`);
    onTap(b, () => {
      c.tray = !c.tray;
      if (c.tray) { c.order = ++order; sfx.coin(); if (showTotal) api.speak(A(total())); } else sfx.back();
      render();
    }, { sound: false });
    return b;
  }
  onTap(give, () => {
    const t = total();
    if (t === 0) { api.say('Tap some bills first!'); return; }
    if (t === target) { trayEl.classList.add('given'); api.right(`Yes! That's exactly ${money(target)}.`, SAY.showRight(target)); return; }
    misses++; showTotal = true;
    api.miss(t < target ? `That's ${money(t)}. You need ${money(target - t)} more!` : `That's ${money(t)}. Too much! Take ${money(t - target)} back.`,
      t < target ? SAY.needMore(target - t) : SAY.takeBack(t - target));
    render();
  }, { sound: false });
  render();
}

// ============ DOLLAR UP (Ruby's snack stand) ============
function goodsFor(tier, zone) {
  const by = (...bands) => GOODS.filter((g) => bands.includes(g.band));
  if (zone === 'dollarup') {
    if (tier === 1) return by('small');
    if (tier === 2) return by('small', 'mid');
    if (tier === 3) return by('small', 'mid', 'even');
    return [...by('mid'), ...GOODS.filter((g) => g.band === 'even' && g.price >= 500), ...GOODS.filter((g) => g.price <= 1299 && g.band === 'big')];
  }
  if (tier === 1) return by('small', 'even').filter((g) => g.price <= 600);
  if (tier === 2) return by('small', 'mid', 'even');
  if (tier === 3) return by('small', 'mid');
  return by('mid', 'big');
}

const dollarUpRuleHTML = (api) => (api.hint >= 1
  ? `<div class="rule-card">⬆️ <b>Dollar Up:</b> look at the dollars, then give <b>ONE MORE</b>.${api.tier >= 3 ? '<br><small>Ends in .00? Give exactly that many.</small>' : ''}</div>`
  : '');

function howManyDollars(api) {
  const g = pick(goodsFor(api.tier, 'dollarup'));
  const n = Math.floor(g.price / 100), even = g.price % 100 === 0;
  const correct = even ? n : n + 1;
  api.prompt('How many dollars do you give?', [SAY.goodCosts(g), SAY.howManyDollars]);
  const opts = shuffle([...new Set([correct, even ? n + 1 : n, correct + 1, Math.max(1, correct - 1)])].filter((v) => v > 0)).slice(0, 3);
  if (!opts.includes(correct)) opts[0] = correct;
  const box = h(`<div class="center-stack">${goodCard(g, { cls: api.hint >= 2 ? 'hl-dollars' : '' })}${dollarUpRuleHTML(api)}
    <div class="choice-row">${shuffle(opts).map((v) => `<button class="btn choice" data-v="${v}">$${v}</button>`).join('')}</div></div>`);
  api.stage.appendChild(box);
  for (const b of $$('.choice', box)) {
    onTap(b, () => {
      const v = +b.dataset.v;
      if (v === correct) {
        b.classList.add('good');
        api.right(even ? `Yes! Exactly $${n}. No change needed.` : `Yes! $${correct} is enough. You'll get change back.`, even ? SAY.evenRight(n) : SAY.dollarUpRight(correct));
        return;
      }
      wiggle(b);
      api.miss(even ? `It's exactly $${n}.00. No cents, so give exactly $${n}.` : `Look at the dollars: ${n}. Give one more. That's $${correct}!`, even ? SAY.evenRule(n) : SAY.dollarUpRule(n));
      box.querySelector('.good-card').classList.add('hl-dollars');
      box.querySelector(`[data-v="${correct}"]`).classList.add('glow');
    }, { sound: false });
  }
}

function payDollarUp(api) {
  const g = pick(goodsFor(api.tier, 'dollarup'));
  const n = Math.floor(g.price / 100), even = g.price % 100 === 0;
  const need = even ? n : n + 1; // dollars to hand over
  const wallet = api.tier >= 4 ? [500, ...Array(Math.max(need - 5, 0) + 3).fill(100)] : Array(Math.min(need + 3, 15)).fill(100);
  const counts = {};
  for (const d of wallet) counts[d] = (counts[d] || 0) + 1;
  const placed = [];
  let misses = 0;
  api.prompt(`Pay for the ${g.name}`, [SAY.goodCosts(g), SAY.payWith]);
  const ui = h(`<div class="center-stack">
    ${goodCard(g, { cls: 'small' + (api.hint >= 2 ? ' hl-dollars' : '') })}
    ${dollarUpRuleHTML(api)}
    <div class="tray"><div class="tray-label">Ruby's counter</div><div class="tray-coins"></div><div class="tray-total"></div></div>
    <div class="stacks"></div>
    <div class="change hidden"></div>
    <div class="choice-row"><button class="btn big give">PAY</button></div>
  </div>`);
  api.stage.appendChild(ui);
  const trayEl = ui.querySelector('.tray-coins'), totalEl = ui.querySelector('.tray-total'), stacks = ui.querySelector('.stacks'), pay = ui.querySelector('.give');
  function render() {
    stacks.innerHTML = '';
    for (const d of [500, 100]) {
      if (!counts[d]) continue;
      const b = h(`<button class="stack">${moneySVG(d, { px: 50 })}<b class="count">×${counts[d]}</b></button>`);
      onTap(b, () => { counts[d]--; placed.push(d); sfx.coin(); if (api.hint >= 1) api.speak(A(sum(placed))); render(); }, { sound: false });
      if ((api.hint >= 2 || misses >= 2) && sum(placed) < need * 100) {
        // Hint: use the $5 first when it fits, then count on with $1s.
        const useFive = counts[500] > 0 && sum(placed) + 500 <= need * 100;
        if ((d === 500) === useFive) b.classList.add('glow');
      }
      stacks.appendChild(b);
    }
    trayEl.innerHTML = '';
    placed.forEach((d, i) => {
      const b = h(`<button class="pile-bill">${moneySVG(d, { px: 44 })}</button>`);
      onTap(b, () => { placed.splice(i, 1); counts[d]++; sfx.back(); render(); }, { sound: false });
      trayEl.appendChild(b);
    });
    totalEl.textContent = api.hint >= 1 && placed.length ? money(sum(placed)) : '';
    pay.classList.toggle('glow', (api.hint >= 2 || misses >= 2) && sum(placed) === need * 100);
  }
  onTap(pay, () => {
    const t = sum(placed);
    if (!t) { api.say('Tap your money to pay me.'); return; }
    if (t < g.price) { misses++; api.miss(`That's ${money(t)}. Not enough! Give me one more dollar.`, SAY.notEnoughDollar); render(); return; }
    if (t - g.price >= 100) { misses++; api.miss(`That's more than you need. Just give me $${need}.`, SAY.tooManyDollars(need)); render(); return; }
    const change = t - g.price;
    const ch = ui.querySelector('.change');
    if (change > 0) {
      ch.innerHTML = `<div class="change-label">Your change:</div><div class="change-coins">${breakDown(change, [25, 10, 5, 1]).map((d) => moneySVG(d, { px: 46 })).join('')}</div>`;
      ch.classList.remove('hidden');
    }
    sfx.kaching();
    api.right(change > 0 ? `Perfect! Here's your change: ${fmtShort(change)}.` : `Exactly $${need}. Perfect!`,
      change > 0 ? [SAY.dollarUpRight(need), SAY.changeIs, A(change)] : SAY.evenRight(need));
  }, { sound: false });
  render();
}

// ============ ENOUGH? ============
function walletFor(tier, dollars) {
  const denoms = tier === 1 ? [100] : tier === 2 ? [500, 100] : tier === 3 ? [500, 100] : [2000, 1000, 500, 100];
  return shuffle(billsMaking(dollars * 100, denoms));
}

function enoughYesNo(api) {
  let g, w;
  const yes = Math.random() < 0.5;
  for (let tries = 0; tries < 50; tries++) {
    g = pick(goodsFor(api.tier, 'enough'));
    const need = Math.ceil(g.price / 100);
    if (api.tier === 3) w = yes ? need : need - 1; // close calls
    else w = yes ? need + rand(3) : need - 1 - rand(2);
    const cap = api.tier === 1 ? 6 : api.tier === 2 ? 12 : api.tier === 3 ? 12 : 45;
    if (w >= 1 && w <= cap) break;
  }
  const enough = w * 100 >= g.price;
  api.prompt('Do you have enough money?', [SAY.itCosts, A(g.price), SAY.enoughAsk]);
  const counter = countable(api, walletFor(api.tier, w), { px: 58 });
  const box = h(`<div class="center-stack">${goodCard(g, { cls: 'small' })}
    <div class="wallet-label">Your money ${api.hint >= 1 ? '<small>(tap to count)</small>' : ''}</div></div>`);
  const yn = h('<div class="choice-row yesno"><button class="btn big yes" data-v="1">YES</button><button class="btn big no" data-v="0">NO</button></div>');
  box.appendChild(counter.el);
  api.stage.append(box, yn);
  const explain = `You have ${money(w * 100)}. It costs ${money(g.price)}. ${enough ? 'That\'s enough!' : 'Not enough.'}`;
  const spoken = [SAY.youHave, A(w * 100), SAY.itCosts, A(g.price), enough ? SAY.isEnough : SAY.notEnough];
  for (const b of $$('button', yn)) {
    onTap(b, async () => {
      if (counter.busy) return;
      if (!!+b.dataset.v === enough) { b.classList.add('good'); api.right(explain, spoken); return; }
      wiggle(b);
      api.miss(`Let's count it! ${explain}`, spoken);
      await counter.countAll();
      yn.querySelector(enough ? '.yes' : '.no').classList.add('glow');
    }, { sound: false });
  }
}

function whichCanBuy(api) {
  const pool = goodsFor(api.tier, 'enough');
  let w, good, bad;
  for (let tries = 0; tries < 80; tries++) {
    const ranges = [0, [2, 5], [4, 10], [3, 10], [10, 40]];
    const [lo, hi] = ranges[api.tier];
    w = lo + rand(hi - lo + 1);
    const ok = pool.filter((g) => g.price <= w * 100);
    let over = pool.filter((g) => g.price > w * 100);
    if (api.tier === 3) over = over.filter((g) => g.price - w * 100 <= 200);
    if (ok.length && over.length >= 2) { good = pick(ok); bad = shuffle(over).slice(0, 2); break; }
  }
  api.prompt('Which ONE can you buy?', [SAY.youHave, A(w * 100), SAY.canBuyAsk]);
  const counter = countable(api, walletFor(api.tier, w), { px: 50 });
  const wl = h(`<div class="wallet-label">Your money ${api.hint >= 1 ? '<small>(tap to count)</small>' : ''}</div>`);
  const items = [good, ...bad];
  const grid = h(`<div class="goods-grid">${shuffle(items).map((g) => goodCard(g, { tag: 'button', cls: 'pick' })).join('')}</div>`);
  api.stage.append(wl, counter.el, grid);
  for (const b of $$('.good-card', grid)) {
    onTap(b, async () => {
      if (counter.busy) return;
      const g = items.find((x) => x.name === b.dataset.name);
      if (g === good) { b.classList.add('good'); api.right(`Yes! You have ${money(w * 100)}, and the ${g.name} costs ${money(g.price)}.`, SAY.canBuyRight(g)); return; }
      wiggle(b);
      api.miss(`The ${g.name} costs ${money(g.price)}. That's more than you have.`, SAY.tooPricey(g));
      b.classList.add('nope');
      if (api.hint >= 1) await counter.countAll();
      grid.querySelector(`[data-name="${good.name}"]`).classList.add('glow');
    }, { sound: false });
  }
}

export const PLAN2 = {
  bills: () => [...shuffle([tapBill, tapBill, billValue, billValue]), countBills, countBills, makeBills],
  dollarup: () => [howManyDollars, payDollarUp, howManyDollars, payDollarUp, howManyDollars, payDollarUp],
  enough: () => shuffle([enoughYesNo, enoughYesNo, enoughYesNo, enoughYesNo, whichCanBuy, whichCanBuy, whichCanBuy]),
};
export const BUDDY2 = { bills: 'twinkle', dollarup: 'ruby', enough: 'twinkle' };
