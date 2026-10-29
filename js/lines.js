// Every sentence the game says out loud lives here. The voice-clip generator
// (tools/make-voices.mjs) reads this same file, so recorded clips always match
// what the game asks to say. No DOM code here: it also runs in Node.
import { INFO, sayAmount } from './money.js';
import { ITEMS } from './catalog.js';

export const A = (c) => sayAmount(c); // "75 cents", "one dollar and 25 cents"
const nm = (d) => INFO[d].name;

// Clip lookup key: the same sentence always maps to the same clip.
export const lineKey = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

export const QUIPS = {
  ruby: {
    right: ['Hmph. Fine. That was actually good.', 'Okay, okay. Not bad.', 'Ugh, you\'re kind of amazing.', 'I wasn\'t impressed. Now I am.', 'Correct. Obviously.', 'You make it look easy. Rude.'],
    wrong: ['Nope. Watch closely.', 'Not quite. Let me show you.', 'Close. But no.', 'Hmm. Try that again.'],
    hello: ['Oh. It\'s you. Ready to impress me?', 'I need change. Exact change. Let\'s go.'],
    go: ['Let\'s see what you got.', 'Go on.', 'I\'m watching.'],
  },
  twinkle: {
    right: ['OMG YES!! You\'re SO good at this!', 'WOW WOW WOW!', 'That was SPARKLY perfect!', 'You\'re a money GENIUS!', 'I want to be just like you!', 'Best. Answer. EVER!'],
    wrong: ['Oopsie! Let\'s look together!', 'Almost!! Here\'s a trick!', 'That\'s okay! Watch this!', 'Ooh, tricky one! Let me help!'],
    hello: ['YAY you\'re here!! Let\'s DO this!', 'This is gonna be SO fun!!'],
    go: ['You got this!!', 'Ooh, this one\'s fun!', 'Ready? GO!'],
  },
};

const MORE_EXTRA = { '5>10': ' Dimes are tiny but MIGHTY!', '1>10': ' Size doesn\'t tell you the value!' };

export const SAY = {
  // ---- Coin Check (Twinkle) ----
  tapThe: (d) => `Tap the ${nm(d)}.`,
  whichMore: 'Which coin is worth more?',
  howMuchCoin: 'How much is this coin worth?',
  thatsA: (d) => `That's a ${nm(d)}.`,
  remember: (d) => `Remember: ${INFO[d].clue}.`,
  moreRight: (hi, lo) => `Yes! A ${nm(hi)} is ${A(hi)}. A ${nm(lo)} is only ${A(lo)}.`,
  moreMiss: (hi, lo) => `A ${nm(lo)} is ${A(lo)}. A ${nm(hi)} is ${A(hi)}.${MORE_EXTRA[lo + '>' + hi] || ''}`,
  coinRight: (d) => `Yes! A ${nm(d)} is worth ${A(d)}.`,
  coinMiss: (d) => `This is a ${nm(d)}. It's worth ${A(d)}.`,

  // ---- Quarter Hop (Twinkle) ----
  hopAsk: 'Hop by quarters! What comes next?',
  hopMiss: (prev) => `Quarters jump by 25! ${A(prev)} plus 25 is ${A(prev + 25)}.`,
  hopDone: (v) => (v === 100 ? 'Four quarters is one dollar! Hop hop!' : `${A(v)}! Hop hop!`),
  howMuchMoney: 'How much money is this?',
  countRight: (k) => `Yes! ${k} quarters is ${A(k * 25)}.`,
  countMissCoins: (k) => `Careful! There are ${k} coins, but each quarter is worth 25 cents. Let's count by 25s!`,
  countTogether: 'Let\'s count by 25s together!',
  howMany: (t) => `How many quarters make ${A(t)}?`,
  howManyRight: (t) => `Yes! ${t / 25} quarters is ${A(t)}.`,
  countUntil: 'Let\'s count quarters until we get there!',

  // ---- Make a Dollar (Ruby) ----
  giveMe: (t) => `Give me exactly ${A(t)}.`,
  dollarRight: ['Hmph. Exactly right. I\'m impressed.', 'EXACTLY. Finally, someone who gets me.', 'Perfect change. Not bad, panda.'],
  needMore: (c) => `You need ${A(c)} more!`,
  takeBack: (c) => `Too much! Take ${A(c)} back.`,
  emptyPaw: 'Um. My paw is empty. Tap some coins first!',

  // ---- Shared bits (both buddies) ----
  earned: 'You earned',
  bonus: 'Bonus!',
  costs: (p) => `That costs ${A(p)}. Put your money on the counter.`,
  tapMoney: 'Tap your money to put it on the counter!',
  gotChange: 'You got it! Your change is',
  exactChange: 'You got it! Exact change!',
  machineEmpty: 'Put some coins in the machine first!',
  breakDollar: 'One dollar equals four quarters!',
  traded: 'Ka-ching! You made exactly one dollar!',
  gift: 'Four quarters equals one dollar!',
  locked: (zoneName) => `Do great in ${zoneName} to unlock this!`,
};

// Everything each buddy might say, for the clip generator.
export function allLines() {
  const COINS = [1, 5, 10, 25];
  const PAIRS = [[10, 5], [10, 1], [25, 10], [5, 1], [25, 5], [25, 1]];
  const shared = [
    SAY.earned, SAY.bonus, SAY.tapMoney, SAY.gotChange, SAY.exactChange, SAY.machineEmpty,
    SAY.breakDollar, SAY.traded, SAY.gift,
    ...ITEMS.map((i) => SAY.costs(i.price)),
  ];
  const twinkle = [
    ...Object.values(QUIPS.twinkle).flat(),
    'Coin Check', 'Quarter Hop', 'Make a Dollar',
    ...COINS.map(SAY.tapThe), SAY.whichMore, SAY.howMuchCoin,
    ...COINS.map(SAY.thatsA), ...COINS.map(SAY.remember),
    ...PAIRS.map(([hi, lo]) => SAY.moreRight(hi, lo)), ...PAIRS.map(([hi, lo]) => SAY.moreMiss(hi, lo)),
    ...COINS.map(SAY.coinRight), ...COINS.map(SAY.coinMiss),
    SAY.hopAsk, SAY.howMuchMoney, SAY.countTogether, SAY.countUntil,
    ...[25, 50, 75, 100, 125, 150, 175].map(SAY.hopMiss),
    ...[100, 125, 150, 175, 200].map(SAY.hopDone),
    ...[2, 3, 4, 5, 6, 7, 8].map(SAY.countRight), ...[2, 3, 4, 5, 6, 7, 8].map(SAY.countMissCoins),
    ...[50, 75, 100, 125, 150, 200].map(SAY.howMany), ...[50, 75, 100, 125, 150, 200].map(SAY.howManyRight),
    SAY.locked('Coin Check'), SAY.locked('Quarter Hop'),
    ...range(1, 400).map(SAY.needMore),
    ...range(1, 500).map(A),
    ...shared,
  ];
  const ruby = [
    ...Object.values(QUIPS.ruby).flat(),
    'Make a Dollar',
    ...[50, 75, 100].map(SAY.giveMe), ...SAY.dollarRight, SAY.emptyPaw,
    ...range(1, 100).map(SAY.needMore), ...range(1, 150).map(SAY.takeBack),
    ...range(1, 250).map(A),
    ...shared,
  ];
  return { twinkle: [...new Set(twinkle)], ruby: [...new Set(ruby)] };
}

function range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; }
