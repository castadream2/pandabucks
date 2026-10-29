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

// Things to buy, with fixed prices so every line can have a recorded clip.
// band: small (< $5), mid ($5-$10), even (whole dollars), big ($10+)
export const GOODS = [
  { e: '🍎', name: 'apple', price: 65, band: 'small' },
  { e: '🧃', name: 'juice box', price: 89, band: 'small' },
  { e: '🍩', name: 'donut', price: 115, band: 'small' },
  { e: '🍪', name: 'cookie', price: 125, band: 'small' },
  { e: '🍫', name: 'chocolate bar', price: 139, band: 'small' },
  { e: '🥤', name: 'soda', price: 175, band: 'small' },
  { e: '🧁', name: 'cupcake', price: 210, band: 'small' },
  { e: '🥨', name: 'pretzel', price: 249, band: 'small' },
  { e: '🍕', name: 'pizza slice', price: 275, band: 'small' },
  { e: '🌮', name: 'taco', price: 329, band: 'small' },
  { e: '🍿', name: 'popcorn', price: 350, band: 'small' },
  { e: '🍦', name: 'ice cream', price: 425, band: 'small' },
  { e: '📓', name: 'notebook', price: 499, band: 'small' },
  { e: '🧋', name: 'bubble tea', price: 535, band: 'mid' },
  { e: '🍔', name: 'burger', price: 579, band: 'mid' },
  { e: '🍝', name: 'pasta bowl', price: 640, band: 'mid' },
  { e: '🥗', name: 'salad', price: 649, band: 'mid' },
  { e: '🧦', name: 'pair of fun socks', price: 699, band: 'mid' },
  { e: '🌯', name: 'burrito', price: 725, band: 'mid' },
  { e: '🖍️', name: 'pack of markers', price: 789, band: 'mid' },
  { e: '🐼', name: 'panda keychain', price: 850, band: 'mid' },
  { e: '🍣', name: 'sushi box', price: 865, band: 'mid' },
  { e: '🌻', name: 'bunch of flowers', price: 925, band: 'mid' },
  { e: '🎧', name: 'pair of earbuds', price: 949, band: 'mid' },
  { e: '🍌', name: 'banana bunch', price: 200, band: 'even' },
  { e: '🥯', name: 'bagel', price: 300, band: 'even' },
  { e: '🎀', name: 'hair bow', price: 400, band: 'even' },
  { e: '✨', name: 'sticker pack', price: 500, band: 'even' },
  { e: '🍓', name: 'smoothie', price: 600, band: 'even' },
  { e: '🃏', name: 'game card', price: 1150, band: 'big' },
  { e: '📚', name: 'book', price: 1299, band: 'big' },
  { e: '🧸', name: 'teddy bear', price: 1575, band: 'big' },
  { e: '🎨', name: 'art set', price: 1850, band: 'big' },
  { e: '🎒', name: 'backpack', price: 2249, band: 'big' },
  { e: '🎧', name: 'pair of headphones', price: 2499, band: 'big' },
  { e: '🎮', name: 'video game', price: 2999, band: 'big' },
  { e: '🛹', name: 'skateboard', price: 3500, band: 'big' },
  { e: '👟', name: 'pair of sneakers', price: 3999, band: 'big' },
];

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

  // ---- Bills (Twinkle) ----
  tapBill: (d) => `Tap the ${nm(d)}.`,
  thatsBill: (d) => `That's the ${nm(d)}.`,
  billClue: (d) => `Look at the corners! The ${nm(d)} has a big ${d / 100} in each corner.`,
  howMuchBill: 'How much is this bill worth?',
  billRight: (d) => `Yes! That's the ${nm(d)}. It's worth ${A(d)}.`,
  billMiss: (d) => `This is the ${nm(d)}. It's worth ${A(d)}.`,
  billsRight: (c) => `Yes! That's ${A(c)}.`,
  biggestFirst: 'Let\'s count together. Biggest bills first!',
  billsNotCount: (k) => `Careful! There are ${k} bills, but they're worth different amounts. Let's count them!`,
  showMe: (c) => `Show me ${A(c)}.`,
  showRight: (c) => `Yes! That's exactly ${A(c)}.`,

  // ---- Dollar Up (Ruby's snack stand) ----
  goodCosts: (g) => `The ${g.name} costs ${A(g.price)}.`,
  howManyDollars: 'How many dollars do you give?',
  dollarUpRule: (n) => (n === 0
    ? 'There are no dollars, just cents. Give one more. That\'s one dollar!'
    : `Look at the dollars: ${n}. Give one more. That's ${A((n + 1) * 100)}!`),
  evenRule: (n) => `It's exactly ${A(n * 100)}. No cents! So give exactly ${A(n * 100)}.`,
  dollarUpRight: (n) => `Yes! ${A(n * 100)} is enough. You'll get change back.`,
  evenRight: (n) => `Yes! Exactly ${A(n * 100)}. No change needed.`,
  payWith: 'Tap your money to pay me. Dollar up!',
  notEnoughDollar: 'Not enough! Give me one more dollar.',
  tooManyDollars: (n) => `That's more than you need. Just give me ${A(n * 100)}.`,
  changeIs: 'Here\'s your change:',

  // ---- Enough? (Twinkle) ----
  enoughAsk: 'Do you have enough money to buy it?',
  youHave: 'You have',
  itCosts: 'It costs',
  isEnough: 'You have enough!',
  notEnough: 'That\'s not enough.',
  canBuyAsk: 'Which ONE can you buy?',
  canBuyRight: (g) => `Yes! You can buy the ${g.name}.`,
  tooPricey: (g) => `The ${g.name} costs ${A(g.price)}. That's more than you have.`,

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
    // Bills + Enough?
    ...BILLS.map(SAY.tapBill), ...BILLS.map(SAY.thatsBill), ...BILLS.map(SAY.billClue), SAY.howMuchBill,
    ...BILLS.map(SAY.billRight), ...BILLS.map(SAY.billMiss), SAY.biggestFirst,
    ...range(2, 8).map(SAY.billsNotCount),
    ...dollars(1, 50).map(SAY.billsRight), ...dollars(1, 50).map(SAY.showMe), ...dollars(1, 50).map(SAY.showRight),
    ...dollars(1, 50).map(SAY.needMore), ...dollars(1, 50).map(SAY.takeBack), ...dollars(1, 50).map(A),
    SAY.enoughAsk, SAY.youHave, SAY.itCosts, SAY.isEnough, SAY.notEnough, SAY.canBuyAsk,
    ...GOODS.map(SAY.canBuyRight), ...GOODS.map(SAY.tooPricey), ...GOODS.map((g) => A(g.price)),
    'Bills', 'Enough?',
    ...shared,
  ];
  const ruby = [
    ...Object.values(QUIPS.ruby).flat(),
    'Make a Dollar',
    ...[50, 75, 100].map(SAY.giveMe), ...SAY.dollarRight, SAY.emptyPaw,
    ...range(1, 100).map(SAY.needMore), ...range(1, 150).map(SAY.takeBack),
    ...range(1, 250).map(A),
    // Dollar Up
    'Dollar Up', ...GOODS.map(SAY.goodCosts), SAY.howManyDollars, SAY.payWith, SAY.notEnoughDollar, SAY.changeIs,
    ...range(0, 14).map(SAY.dollarUpRule), ...range(1, 15).map(SAY.dollarUpRight),
    ...range(1, 15).map(SAY.evenRule), ...range(1, 15).map(SAY.evenRight), ...range(1, 15).map(SAY.tooManyDollars),
    ...dollars(1, 20).map(A), ...GOODS.map((g) => A(g.price)),
    ...shared,
  ];
  return { twinkle: [...new Set(twinkle)], ruby: [...new Set(ruby)] };
}

function dollars(a, b) { return range(a, b).map((n) => n * 100); }
export const BILLS = [100, 500, 1000, 2000];
function range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; }
