// The challenges for each zone. Each challenge gets an `api` from the runner:
//   api.stage           element to draw into
//   api.prompt(html, spoken?)
//   api.say(text, spoken?)    buddy speech bubble
//   api.speak(lines)          say something in the buddy's voice
//   api.right(text?, spoken?) finished correctly (first-try is tracked by the runner)
//   api.miss(text, spoken?)   wrong answer: shows the right way, lets her try again
// Spoken words come from lines.js so recorded voice clips match exactly.
//   api.hint            2 = lots of help, 1 = some, 0 = none
//   api.tier            difficulty step inside the zone
import { INFO, coinSVG, fmtShort, sayAmount, sum } from './money.js';
import { h, $$, onTap, pick, shuffle, rand, wait } from './ui.js';
import { sfx } from './audio.js';
import { SAY, A } from './lines.js';
import { recordConfusion } from './progress.js';

// ============ COIN CHECK ============
function tapTheCoin(api) {
  const target = pick([1, 5, 5, 10, 10, 25]);
  const name = INFO[target].name;
  api.prompt(`Tap the <em>${name.toUpperCase()}</em>`, SAY.tapThe(target));
  const opts = shuffle([1, 5, 10, 25]);
  const grid = h(`<div class="coin-grid">${opts.map((d) => `<button class="coin-btn" data-d="${d}">${coinSVG(d, { px: 112, side: 'random' })}</button>`).join('')}</div>`);
  api.stage.appendChild(grid);
  for (const b of $$('.coin-btn', grid)) {
    onTap(b, () => {
      const d = +b.dataset.d;
      if (d === target) { b.classList.add('good'); api.right(); return; }
      recordConfusion(target, d);
      wiggle(b);
      api.miss(`That's a ${INFO[d].name}. Remember: ${INFO[target].clue}.`, [SAY.thatsA(d), SAY.remember(target)]);
      grid.querySelector(`[data-d="${target}"]`).classList.add('glow');
    }, { sound: false });
  }
}

function worthMore(api) {
  const pair = pick([[5, 10], [5, 10], [5, 10], [1, 10], [10, 25], [1, 5], [5, 25], [1, 25]]);
  const hi = Math.max(...pair), lo = Math.min(...pair);
  api.prompt('Which coin is worth <em>MORE</em>?', SAY.whichMore);
  const row = h(`<div class="coin-pair">${shuffle(pair).map((d) => `<button class="coin-btn" data-d="${d}">${coinSVG(d, { px: 140, side: 'random' })}<b class="val hidden">${d}¢</b></button>`).join('')}</div>`);
  api.stage.appendChild(row);
  const reveal = () => $$('.val', row).forEach((v) => v.classList.remove('hidden'));
  for (const b of $$('.coin-btn', row)) {
    onTap(b, () => {
      const d = +b.dataset.d;
      reveal();
      if (d === hi) { b.classList.add('good'); api.right(`Yes! A ${INFO[hi].name} is ${hi}¢. A ${INFO[lo].name} is only ${lo}¢.`, SAY.moreRight(hi, lo)); return; }
      recordConfusion('more:' + hi, lo);
      wiggle(b);
      const extra = lo === 5 && hi === 10 ? ' Dimes are tiny but MIGHTY!' : lo === 1 && hi === 10 ? ' Size doesn\'t tell you the value!' : '';
      api.miss(`A ${INFO[lo].name} is ${lo}¢. A ${INFO[hi].name} is ${hi}¢.${extra}`, SAY.moreMiss(hi, lo));
      row.querySelector(`[data-d="${hi}"]`).classList.add('glow');
    }, { sound: false });
  }
}

function howMuchCoin(api) {
  const d = pick([1, 5, 5, 10, 10, 25]);
  api.prompt('How much is this coin worth?', SAY.howMuchCoin);
  const box = h(`<div class="center-stack"><div class="one-coin">${coinSVG(d, { px: 160, side: 'random' })}</div>
    <div class="choice-row">${[1, 5, 10, 25].map((v) => `<button class="btn choice" data-v="${v}">${v}¢</button>`).join('')}</div></div>`);
  api.stage.appendChild(box);
  for (const b of $$('.choice', box)) {
    onTap(b, () => {
      const v = +b.dataset.v;
      if (v === d) { b.classList.add('good'); api.right(`Yes! A ${INFO[d].name} is worth ${d}¢.`, SAY.coinRight(d)); return; }
      recordConfusion('value:' + d, v);
      wiggle(b);
      api.miss(`This is a ${INFO[d].name}. It's worth ${d}¢.`, SAY.coinMiss(d));
      box.querySelector(`[data-v="${d}"]`).classList.add('glow');
    }, { sound: false });
  }
}

// ============ QUARTER HOP ============
function hopAlong(api) {
  const starts = api.tier === 1 ? [25] : api.tier === 2 ? [25, 50, 75] : [50, 75, 100, 125];
  const start = pick(starts);
  const values = [0, 1, 2, 3].map((i) => start + i * 25);
  let step = 1;
  api.prompt('Hop by quarters! What comes next?', [A(start), SAY.hopAsk]);
  const scene = h(`<div class="hop-scene">
    ${values.map((v, i) => `<div class="plat p${i}"><span class="plat-q">${coinSVG(25, { px: 40 })}</span><b class="plat-label ${i === 0 ? '' : api.hint >= 2 ? 'ghost' : 'hidden'}">${fmtShort(v)}</b></div>`).join('')}
    <div class="hop-panda">🐼</div>
  </div>`);
  const choices = h('<div class="choice-row"></div>');
  api.stage.append(scene, choices);
  $$('.plat', scene).forEach((p, i) => p.classList.toggle('reached', i === 0));
  movePanda(scene, 0, false);

  function ask() {
    const prev = values[step - 1], correct = values[step];
    const wrongs = shuffle([prev + 5, prev + 10, prev + 1, prev + 20].filter((v) => v !== correct)).slice(0, 2);
    const opts = shuffle([correct, ...wrongs]);
    choices.innerHTML = opts.map((v) => `<button class="btn choice" data-v="${v}">${fmtShort(v)}</button>`).join('');
    for (const b of $$('.choice', choices)) {
      onTap(b, () => {
        const v = +b.dataset.v;
        if (v !== correct) {
          wiggle(b);
          api.miss(`Quarters jump by 25! ${fmtShort(prev)} + 25 = ${fmtShort(correct)}.`, SAY.hopMiss(prev));
          choices.querySelector(`[data-v="${correct}"]`).classList.add('glow');
          return;
        }
        const plat = scene.querySelectorAll('.plat')[step];
        plat.classList.add('reached');
        plat.querySelector('.plat-label').className = 'plat-label';
        movePanda(scene, step, true);
        sfx.hop();
        api.speak(A(correct));
        step++;
        if (step >= values.length) {
          choices.innerHTML = '';
          api.right(values[3] === 100 ? '4 quarters = $1.00! Hop hop!' : `${fmtShort(values[3])}! Hop hop!`, SAY.hopDone(values[3]));
        } else ask();
      }, { sound: false });
    }
  }
  ask();
}

function movePanda(scene, i, hop) {
  const p = scene.querySelector('.hop-panda');
  p.style.left = `calc(${4 + i * 24}% + 6px)`;
  p.style.bottom = `calc(${10 + i * 15}% + 46px)`;
  if (hop) { p.classList.remove('jump'); void p.offsetWidth; p.classList.add('jump'); }
}

function countQuarters(api) {
  const [lo, hi] = api.tier === 1 ? [2, 4] : api.tier === 2 ? [3, 6] : [4, 8];
  const n = lo + rand(hi - lo + 1);
  const total = n * 25;
  let counted = 0;
  api.prompt('How much money is this?', SAY.howMuchMoney);
  const row = h(`<div class="q-row">${Array.from({ length: n }, (_, i) => `<button class="q-btn" data-i="${i}"><b class="q-count"></b>${coinSVG(25, { px: 68, side: 'random' })}</button>`).join('')}</div>`);
  const tip = h(`<div class="tip">${api.hint >= 1 ? 'Tap each quarter to count: 25, 50, 75...' : 'Tap the quarters to count them'}</div>`);
  const wrongs = shuffle([n, total + 25, total - 25, n * 10].filter((v) => v > 0 && v !== total)).slice(0, 2);
  const opts = shuffle([total, ...wrongs]);
  const choices = h(`<div class="choice-row">${opts.map((v) => `<button class="btn choice" data-v="${v}">${fmtShort(v)}</button>`).join('')}</div>`);
  api.stage.append(row, tip, choices);
  if (api.hint >= 2) row.querySelector('.q-btn').classList.add('pulse');

  const countOne = (b) => {
    if (b.classList.contains('counted')) return;
    counted++;
    b.classList.add('counted');
    b.classList.remove('pulse');
    const lbl = b.querySelector('.q-count');
    if (api.hint >= 1) lbl.textContent = fmtShort(counted * 25);
    sfx.coin();
    api.speak(A(counted * 25));
    const next = row.querySelector('.q-btn:not(.counted)');
    if (next && api.hint >= 2) next.classList.add('pulse');
  };
  for (const b of $$('.q-btn', row)) onTap(b, () => countOne(b), { sound: false });

  for (const b of $$('.choice', choices)) {
    onTap(b, async () => {
      const v = +b.dataset.v;
      if (v === total) { b.classList.add('good'); api.right(`Yes! ${n} quarters = ${fmtShort(total)}.`, SAY.countRight(n)); return; }
      wiggle(b);
      api.miss(v === n ? `Careful! There are ${n} coins, but each quarter is worth 25¢. Let's count by 25s!` : 'Let\'s count by 25s together!', v === n ? SAY.countMissCoins(n) : SAY.countTogether);
      // Count them all out loud, slowly.
      for (const q of $$('.q-btn', row)) { q.classList.remove('counted'); q.querySelector('.q-count').textContent = ''; }
      counted = 0;
      for (const q of $$('.q-btn', row)) {
        await wait(650);
        counted++;
        q.classList.add('counted');
        q.querySelector('.q-count').textContent = fmtShort(counted * 25);
        sfx.coin();
        api.speak(A(counted * 25));
      }
      choices.querySelector(`[data-v="${total}"]`).classList.add('glow');
    }, { sound: false });
  }
}

function howManyQuarters(api) {
  const targets = api.tier === 1 ? [50, 75, 100] : api.tier === 2 ? [75, 100, 125, 150] : [100, 125, 150, 200];
  const t = pick(targets);
  const correct = t / 25;
  api.prompt(`How many quarters make <em>${fmtShort(t)}</em>?`, SAY.howMany(t));
  const wrongs = shuffle([correct - 1, correct + 1, correct + 2].filter((v) => v > 0)).slice(0, 2);
  const opts = shuffle([correct, ...wrongs]);
  const box = h(`<div class="center-stack">
    <div class="price-tag big">${fmtShort(t)}</div>
    <div class="q-row show"></div>
    <div class="choice-row">${opts.map((v) => `<button class="btn choice num" data-v="${v}">${v}</button>`).join('')}</div></div>`);
  api.stage.appendChild(box);
  const show = box.querySelector('.q-row');
  for (const b of $$('.choice', box)) {
    onTap(b, async () => {
      const v = +b.dataset.v;
      if (v === correct) {
        b.classList.add('good');
        api.right(`Yes! ${correct} quarters = ${fmtShort(t)}.`, SAY.howManyRight(t));
        return;
      }
      wiggle(b);
      api.miss('Let\'s count quarters until we get there!', SAY.countUntil);
      show.innerHTML = '';
      for (let i = 1; i <= correct; i++) {
        await wait(600);
        show.appendChild(h(`<span class="q-btn counted"><b class="q-count">${fmtShort(i * 25)}</b>${coinSVG(25, { px: 56 })}</span>`));
        sfx.coin();
        api.speak(A(i * 25));
      }
      box.querySelector(`.choice[data-v="${correct}"]`).classList.add('glow');
    }, { sound: false });
  }
}

// ============ MAKE A DOLLAR ============
// Random set of coins (from `denoms`) adding up to exactly `target`.
function composition(target, denoms) {
  const ds = [...denoms].sort((a, b) => b - a);
  for (let tries = 0; tries < 300; tries++) {
    let rem = target;
    const list = [];
    let ok = true;
    ds.forEach((d, i) => {
      if (!ok) return;
      const last = i === ds.length - 1;
      let n;
      if (last) {
        if (rem % d) { ok = false; return; }
        n = rem / d;
      } else {
        const max = Math.floor(rem / d);
        n = rand(max + 1);
        if (i === 0 && ds.length > 1 && d === 25) n = Math.min(max, 1 + rand(3)); // always some quarters, never all
        if (i === 0 && ds.length > 1 && n === Math.floor(target / d) && target % d === 0) n = Math.max(0, n - 1);
      }
      for (let k = 0; k < n; k++) list.push(d);
      rem -= n * d;
    });
    if (!ok || rem !== 0) continue;
    if (list.length > 11) continue;
    if (ds.length > 1 && new Set(list).size < Math.min(2, ds.length)) continue;
    return list;
  }
  return Array(Math.round(target / 25)).fill(25);
}

function canMake(rem, counts, memo = new Map()) {
  if (rem === 0) return true;
  if (rem < 0) return false;
  const key = rem + '|' + [25, 10, 5, 1].map((d) => counts[d] || 0).join(',');
  if (memo.has(key)) return memo.get(key);
  let ok = false;
  for (const d of [25, 10, 5, 1]) {
    if ((counts[d] || 0) > 0 && d <= rem) {
      counts[d]--;
      ok = canMake(rem - d, counts, memo);
      counts[d]++;
      if (ok) break;
    }
  }
  memo.set(key, ok);
  return ok;
}

function makeDollar(api) {
  const tier = api.tier;
  const denoms = tier === 1 ? [25] : tier === 2 ? [25, 10] : tier === 3 ? [25, 10, 5] : [25, 10, 5, 1];
  const target = tier >= 3 && Math.random() < 0.35 ? pick([50, 75]) : 100;
  const comp = composition(target, denoms);
  const extras = tier === 1 ? Array(1 + rand(2)).fill(25) : Array.from({ length: 2 + rand(2) }, () => pick(denoms));
  const coins = shuffle([...comp, ...extras]).map((d, id) => ({ id, d, tray: false, order: 0, side: Math.random() < 0.5 ? 'heads' : 'tails' }));
  let order = 0, misses = 0, showTotal = api.hint >= 1;

  const label = target === 100 ? '$1.00' : fmtShort(target);
  api.prompt(`Give Ruby exactly <em>${label}</em>`, SAY.giveMe(target));
  api.say(pick([
    `Can I have ${target === 100 ? 'a dollar' : sayAmount(target)}? EXACTLY. I'm picky.`,
    `I need exactly ${label}. Not a penny more. Not a penny less.`,
    `${label}, please. And make it snappy.`,
  ]));

  const ui = h(`<div class="dollar-game">
    <div class="tray"><div class="tray-label">Ruby's paw</div><div class="tray-coins"></div><div class="tray-total"></div></div>
    <div class="tip"></div>
    <div class="pile"></div>
    <div class="choice-row"><button class="btn big give">GIVE</button></div>
  </div>`);
  api.stage.appendChild(ui);
  const trayEl = ui.querySelector('.tray-coins'), pileEl = ui.querySelector('.pile');
  const totalEl = ui.querySelector('.tray-total'), tipEl = ui.querySelector('.tip'), give = ui.querySelector('.give');
  tipEl.textContent = api.hint >= 2 ? 'Tip: start with the BIGGEST coins, then count on!' : 'Tap coins to give them to Ruby';

  const trayCoins = () => coins.filter((c) => c.tray).sort((a, b) => a.order - b.order);
  const total = () => sum(trayCoins().map((c) => c.d));

  function suggestion() {
    const rem = target - total();
    if (rem === 0) return { give: true };
    if (rem < 0) return { remove: trayCoins().slice(-1)[0] };
    const counts = {};
    for (const c of coins) if (!c.tray) counts[c.d] = (counts[c.d] || 0) + 1;
    for (const d of [25, 10, 5, 1]) {
      if (!counts[d] || d > rem) continue;
      counts[d]--;
      const ok = canMake(rem - d, counts);
      counts[d]++;
      if (ok) return { add: coins.find((c) => !c.tray && c.d === d) };
    }
    return { remove: trayCoins().slice(-1)[0] };
  }

  function render() {
    trayEl.innerHTML = '';
    pileEl.innerHTML = '';
    for (const c of trayCoins()) trayEl.appendChild(coinButton(c));
    for (const c of coins.filter((c) => !c.tray)) pileEl.appendChild(coinButton(c));
    const t = total();
    totalEl.className = 'tray-total' + (t > target ? ' over' : t === target ? ' exact' : '');
    totalEl.innerHTML = showTotal ? `${fmtShort(t)}${t > target ? ' <small>too much!</small>' : t === target ? ' <small>exactly!</small>' : ''}` : (t ? '?' : '');
    give.classList.remove('glow');
    if (api.hint >= 2 || misses >= 2) {
      const s = suggestion();
      if (s.give) give.classList.add('glow');
      else if (s.add) pileEl.querySelector(`[data-id="${s.add.id}"]`)?.classList.add('glow');
      else if (s.remove) trayEl.querySelector(`[data-id="${s.remove.id}"]`)?.classList.add('glow', 'remove');
    }
  }

  function coinButton(c) {
    const b = h(`<button class="pile-coin" data-id="${c.id}" style="--r:${(c.id * 47) % 30 - 15}deg">${coinSVG(c.d, { px: 70, side: c.side })}</button>`);
    onTap(b, () => {
      c.tray = !c.tray;
      if (c.tray) {
        c.order = ++order;
        sfx.coin();
        if (showTotal) api.speak(A(total()));
      } else sfx.back();
      render();
    }, { sound: false });
    return b;
  }

  onTap(give, () => {
    const t = total();
    if (t === 0) { api.say(SAY.emptyPaw, SAY.emptyPaw); return; }
    if (t === target) {
      trayEl.classList.add('given');
      const line = pick(SAY.dollarRight);
      api.right(line, line);
      return;
    }
    misses++;
    showTotal = true;
    api.miss(t < target
      ? `That's only ${fmtShort(t)}. You need ${fmtShort(target - t)} more!`
      : `That's ${fmtShort(t)}. Too much! Take ${fmtShort(t - target)} back.`,
    t < target ? SAY.needMore(target - t) : SAY.takeBack(t - target));
    render();
  }, { sound: false });

  render();
}

function wiggle(el) {
  el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
  setTimeout(() => el.classList.remove('bad'), 500);
}

// Build a run: list of challenge functions, in order.
export const PLAN = {
  coins: () => shuffle([tapTheCoin, tapTheCoin, tapTheCoin, worthMore, worthMore, worthMore, howMuchCoin, howMuchCoin]),
  hop: () => [hopAlong, ...shuffle([countQuarters, countQuarters, howManyQuarters, howManyQuarters]), hopAlong],
  dollar: () => [makeDollar, makeDollar, makeDollar, makeDollar, makeDollar],
};

export const BUDDY_FOR = { coins: 'twinkle', hop: 'twinkle', dollar: 'ruby' };
