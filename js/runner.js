// One "run" = a short set of challenges in a zone, then a payout.
import { PLAN, BUDDY_FOR } from './lessons.js';
import { BUDDIES, h, $, $$, onTap, openScreen, buddyHTML, buddySay, pick, confetti, floatText, wait } from './ui.js';
import { sfx, speak } from './audio.js';
import { state, zone, recordRun, payoutCoins, addMoney, BADGES } from './progress.js';
import { moneySVG, fmtShort, sum } from './money.js';
import { QUIPS, SAY, A } from './lines.js';

export function startRun(zoneId, { onExit }) {
  const meta = zone(zoneId);
  const zs = state.zones[zoneId];
  const who = BUDDY_FOR[zoneId];
  const B = BUDDIES[who];
  const hello = pick(QUIPS[who].hello);

  const intro = h(`<div class="run intro" style="--zc:${meta.color}">
    <button class="x-btn" aria-label="Back">✕</button>
    <div class="intro-card">
      <div class="zone-chip">ZONE</div>
      <h1>${meta.name.toUpperCase()}</h1>
      <p class="blurb">${meta.blurb}</p>
      ${buddyHTML(who, hello)}
      <button class="btn big go">GO!</button>
    </div>
  </div>`);
  openScreen(intro);
  onTap($('.x-btn', intro), onExit);
  onTap($('.go', intro), () => play());
  speak([meta.name, hello], { who });

  function play() {
    const list = PLAN[zoneId]();
    const started = Date.now();
    let idx = 0, firstTryCount = 0;
    const root = h(`<div class="run playing" style="--zc:${meta.color}">
      <header class="run-top">
        <button class="x-btn" aria-label="Quit">✕</button>
        <div class="dots">${list.map(() => '<i></i>').join('')}</div>
        <div class="run-score"><span>⭐</span> <b>0</b></div>
      </header>
      ${buddyHTML(who, '')}
      <div class="prompt"></div>
      <div class="stage"></div>
      <div class="feedback" aria-live="polite">
        <div class="fb-row"><div class="fb-face"></div><div class="fb-words"><div class="fb-head"></div><div class="fb-text"></div></div></div>
        <button class="btn big fb-next">NEXT ➜</button>
      </div>
      <div class="quit-confirm hidden"><div class="card"><h2>Leave this run?</h2><p>You won't get the coins for this run.</p>
        <div class="choice-row"><button class="btn stay">Keep playing</button><button class="btn ghost leave">Leave</button></div></div></div>
    </div>`);
    openScreen(root);
    const stage = $('.stage', root), promptEl = $('.prompt', root), dots = $$('.dots i', root);
    const qc = $('.quit-confirm', root);
    onTap($('.x-btn', root), () => qc.classList.remove('hidden'));
    onTap($('.stay', root), () => qc.classList.add('hidden'));
    onTap($('.leave', root), onExit);
    const fb = $('.feedback', root);
    onTap($('.fb-next', root), () => {
      fb.classList.remove('show');
      setTimeout(next, 180);
    });

    function next() {
      if (idx >= list.length) return finish();
      dots.forEach((d, i) => d.className = i < idx ? (d.dataset.ok === '1' ? 'ok' : 'meh') : i === idx ? 'now' : '');
      stage.innerHTML = '';
      stage.style.pointerEvents = '';
      let first = true, done = false;
      const api = {
        stage,
        hint: zs.hint,
        tier: zs.tier,
        prompt(html, spoken) {
          promptEl.innerHTML = html;
          promptEl.classList.remove('pop'); void promptEl.offsetWidth; promptEl.classList.add('pop');
          if (spoken) speak(spoken, { who });
        },
        speak(lines) { speak(lines, { who }); },
        say(text, spoken) { buddySay(root, text); if (spoken) speak(spoken, { who }); },
        right(text, spoken) {
          if (done) return;
          done = true;
          stage.style.pointerEvents = 'none';
          sfx.correct();
          if (first) {
            firstTryCount++;
            $('.run-score b', root).textContent = firstTryCount;
            const r = promptEl.getBoundingClientRect();
            floatText('+10¢', r.left + r.width / 2, r.top, 'gold');
          }
          dots[idx].dataset.ok = first ? '1' : '0';
          const quip = pick(B.right);
          buddySay(root, `<i>${quip}</i>`);
          root.classList.add('flash-good');
          setTimeout(() => root.classList.remove('flash-good'), 500);
          idx++;
          // Feedback stays up until she taps NEXT, so there's time to read it.
          $('.fb-face', fb).innerHTML = B.svg;
          $('.fb-head', fb).innerHTML = first ? 'YOU GOT IT! <span class="fb-coin">+10¢</span>' : 'YOU GOT IT!';
          $('.fb-text', fb).innerHTML = text ? `${text} <i>${quip}</i>` : `<i>${quip}</i>`;
          $('.fb-next', fb).textContent = idx >= list.length ? 'FINISH ➜' : 'NEXT ➜';
          setTimeout(() => fb.classList.add('show'), 350);
          speak([spoken || '', quip], { who });
        },
        miss(text, spoken) {
          if (done) return;
          first = false;
          sfx.wrong();
          const oops = pick(B.wrong);
          buddySay(root, `<i>${oops}</i> ${text}`);
          speak([oops, spoken || text], { who });
        },
      };
      buddySay(root, pick(QUIPS[who].go));
      list[idx](api);
    }

    function finish() {
      const total = list.length;
      const res = recordRun(zoneId, { firstTry: firstTryCount, total, hint: zs.hint, tier: zs.tier, ms: Date.now() - started });
      const earned = firstTryCount * 10 + 25;
      const coins = payoutCoins(earned);
      addMoney(coins);
      showResults({ res, total, earned, coins });
    }

    function showResults({ res, total, earned, coins }) {
      const good = res.pct >= 0.8;
      const stars = res.pct >= 0.95 ? 3 : res.pct >= 0.8 ? 2 : res.pct >= 0.5 ? 1 : 0;
      const notes = [];
      if (res.unlocked) notes.push(`<div class="note unlock">🔓 <b>${zone(res.unlocked).name}</b> is unlocked!</div>`);
      if (res.masteredNow) notes.push(`<div class="note master">⭐ You MASTERED <b>${meta.name}</b>!</div>`);
      else if (res.hintDown) notes.push('<div class="note">💪 You\'re getting so good, the helpers are turning down!</div>');
      if (res.tierUp && zoneId === 'dollar') notes.push('<div class="note">🆕 New coins coming next time!</div>');
      for (const b of res.badges) notes.push(`<div class="note badge">${BADGES[b].icon} New badge: <b>${BADGES[b].name}</b></div>`);

      const scr = h(`<div class="run results" style="--zc:${meta.color}">
        <div class="results-card">
          <h1>${good ? 'AMAZING RUN!' : res.pct >= 0.5 ? 'NICE RUN!' : 'GOOD PRACTICE!'}</h1>
          <div class="stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">★</span>`).join('')}</div>
          <p class="score">${firstTryCount} of ${total} right on the first try</p>
          <div class="earned-label">You earned</div>
          <div class="earned">${coins.map((d, i) => `<span class="drop" style="animation-delay:${0.6 + i * 0.12}s">${moneySVG(d, { px: 54 })}</span>`).join('')}</div>
          <div class="earned-total">= ${fmtShort(earned)}</div>
          ${good ? `<button class="chest" aria-label="Open the bonus chest">🎁<small>Tap for a bonus!</small></button>` : ''}
          <div class="notes">${notes.join('')}</div>
          <div class="choice-row"><button class="btn again">PLAY AGAIN</button><button class="btn ghost home">PANDA TOWN</button></div>
        </div>
      </div>`);
      openScreen(scr);
      sfx.fanfare();
      if (good) confetti(60);
      setTimeout(() => speak([SAY.earned, A(earned)], { who }), 900);
      const chest = $('.chest', scr);
      if (chest) {
        onTap(chest, () => {
          const bonus = pick([[25], [10, 10], [25], [10, 5]]);
          addMoney(bonus);
          chest.outerHTML = `<div class="chest open">${bonus.map((d) => moneySVG(d, { px: 54 })).join('')}<small>Bonus ${fmtShort(sum(bonus))}!</small></div>`;
          sfx.kaching();
          speak([SAY.bonus, A(sum(bonus))], { who });
        }, { sound: false });
      }
      onTap($('.again', scr), () => startRun(zoneId, { onExit }));
      onTap($('.home', scr), onExit);
    }

    next();
  }
}
