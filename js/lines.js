// Every sentence the game says out loud lives here. The voice-clip generator
// (tools/make-voices.mjs) reads this same file, so recorded clips always match
// what the game asks to say. No DOM code here: it also runs in Node.
import { INFO, sayAmount } from './money.js';
import { ITEMS } from './catalog.js';

export const A = (c) => sayAmount(c); // "75 cents", "one dollar and 25 cents"
const nm = (d) => INFO[d].name;

// Clip lookup key: the same sentence always maps to the same clip.
// Say any amount: a single clip when one exists, otherwise "12 dollars" + "and 40 cents".
export function amountLines(c, who = 'twinkle') {
  const full = who === 'ruby' ? 250 : 500;
  if (c <= full || c % 100 === 0 || GOODS.some((g) => g.price === c)) return [A(c)];
  const d = Math.floor(c / 100) * 100, r = c % 100;
  return [A(d), centsTail(r)];
}
export const centsTail = (r) => `and ${r === 1 ? '1 cent' : r + ' cents'}`;

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
  { e: '🍎', name: 'apple', price: 65, band: 'small', cat: 'snack' },
  { e: '🧃', name: 'juice box', price: 89, band: 'small', cat: 'drink' },
  { e: '🍩', name: 'donut', price: 115, band: 'small', cat: 'snack' },
  { e: '🍪', name: 'cookie', price: 125, band: 'small', cat: 'snack' },
  { e: '🍫', name: 'chocolate bar', price: 139, band: 'small', cat: 'snack' },
  { e: '🥤', name: 'soda', price: 175, band: 'small', cat: 'drink' },
  { e: '🧁', name: 'cupcake', price: 210, band: 'small', cat: 'snack' },
  { e: '🥨', name: 'pretzel', price: 249, band: 'small', cat: 'snack' },
  { e: '🍕', name: 'pizza slice', price: 275, band: 'small', cat: 'lunch' },
  { e: '🌮', name: 'taco', price: 329, band: 'small', cat: 'lunch' },
  { e: '🍿', name: 'popcorn', price: 350, band: 'small', cat: 'snack' },
  { e: '🍦', name: 'ice cream', price: 425, band: 'small', cat: 'snack' },
  { e: '📓', name: 'notebook', price: 499, band: 'small', cat: 'fun' },
  { e: '🧋', name: 'bubble tea', price: 535, band: 'mid', cat: 'drink' },
  { e: '🍔', name: 'burger', price: 579, band: 'mid', cat: 'lunch' },
  { e: '🍝', name: 'pasta bowl', price: 640, band: 'mid', cat: 'lunch' },
  { e: '🥗', name: 'salad', price: 649, band: 'mid', cat: 'lunch' },
  { e: '🧦', name: 'pair of fun socks', price: 699, band: 'mid', cat: 'fun' },
  { e: '🌯', name: 'burrito', price: 725, band: 'mid', cat: 'lunch' },
  { e: '🖍️', name: 'pack of markers', price: 789, band: 'mid', cat: 'fun' },
  { e: '🐼', name: 'panda keychain', price: 850, band: 'mid', cat: 'fun' },
  { e: '🍣', name: 'sushi box', price: 865, band: 'mid', cat: 'lunch' },
  { e: '🌻', name: 'bunch of flowers', price: 925, band: 'mid', cat: 'fun' },
  { e: '🎧', name: 'pair of earbuds', price: 949, band: 'mid', cat: 'fun' },
  { e: '🍌', name: 'banana bunch', price: 200, band: 'even', cat: 'snack' },
  { e: '🥯', name: 'bagel', price: 300, band: 'even', cat: 'snack' },
  { e: '🎀', name: 'hair bow', price: 400, band: 'even', cat: 'fun' },
  { e: '✨', name: 'sticker pack', price: 500, band: 'even', cat: 'fun' },
  { e: '🍓', name: 'smoothie', price: 600, band: 'even', cat: 'drink' },
  { e: '🃏', name: 'game card', price: 1150, band: 'big', cat: 'fun' },
  { e: '📚', name: 'book', price: 1299, band: 'big', cat: 'fun' },
  { e: '🧸', name: 'teddy bear', price: 1575, band: 'big', cat: 'fun' },
  { e: '🎨', name: 'art set', price: 1850, band: 'big', cat: 'fun' },
  { e: '🎒', name: 'backpack', price: 2249, band: 'big', cat: 'fun' },
  { e: '🎧', name: 'pair of headphones', price: 2499, band: 'big', cat: 'fun' },
  { e: '🎮', name: 'video game', price: 2999, band: 'big', cat: 'fun' },
  { e: '🛹', name: 'skateboard', price: 3500, band: 'big', cat: 'fun' },
  { e: '👟', name: 'pair of sneakers', price: 3999, band: 'big', cat: 'fun' },
];

// Card safety questions (Card Mode). The first option is always the right one; the game shuffles them.
export const SAFETY = [
  { q: 'Who can know your PIN?', opts: ['Only you and your parents', 'Your best friend', 'The cashier', 'Anyone who asks nicely'],
    why: 'Your PIN is a secret. Only you and your parents should know it.' },
  { q: 'A text says you won a prize and asks for your card number. What do you do?', opts: ['Don\'t answer. Show a parent.', 'Send the number fast', 'Send just half the number'],
    why: 'Never send your card number in a text or online. Show a parent instead.' },
  { q: 'You lost your card. What do you do?', opts: ['Tell a parent right away', 'Wait and hope it turns up', 'Keep it a secret'],
    why: 'Tell a parent right away so they can lock the card.' },
  { q: 'The card reader says DECLINED. What does that mean?', opts: ['The card didn\'t work. Maybe not enough money.', 'You won a prize!', 'Tap it ten more times'],
    why: 'Declined means the card didn\'t work. Usually there isn\'t enough money. Don\'t keep trying. Put something back or ask a parent.' },
  { q: 'You are typing your PIN. What should your other hand do?', opts: ['Cover the keypad', 'Wave at people', 'Nothing'],
    why: 'Cover the keypad so nobody can see your PIN.' },
  { q: 'You just paid. Where does your card go?', opts: ['Right back in your wallet', 'Leave it on the counter', 'Loose in your pocket'],
    why: 'Put your card right back in your wallet so it doesn\'t get lost.' },
  { q: 'A friend asks to borrow your card. What do you say?', opts: ['No, it\'s just for me', 'Sure, here you go', 'Only if they\'re nice'],
    why: 'Your card is only for you. Don\'t lend it to anyone.' },
];

// Shopping Trip missions by level.
export const MISSIONS = {
  1: { need: { snack: 1 }, text: 'Buy one snack.' },
  2: { need: { snack: 1, drink: 1 }, text: 'Buy a snack and a drink.' },
  3: { need: { lunch: 1, drink: 1, snack: 1 }, text: 'Buy a lunch, a drink, and a snack.' },
  4: { need: { lunch: 1, drink: 1, snack: 1 }, text: 'Buy a lunch, a drink, and a snack. Pay with your card.' },
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

  // ---- Card Mode (Twinkle) ----
  balanceIs: 'Your card balance is',
  totalIs: 'The total is',
  canPayCard: 'Can you pay with your card?',
  compareRule: 'Compare the dollars first. If the dollars are the same, compare the cents.',
  cardOk: 'Yes! Your balance is more than the total. You can pay!',
  cardNo: 'Right! Your balance is less than the total. The card would be declined.',
  balanceMore: 'Your balance is more than the total, so you can pay.',
  balanceLess: 'Your balance is less than the total, so the card would be declined.',
  stepTotal: 'First, look at the total. Tap the total on the screen.',
  stepCard: 'Now tap your card on the reader.',
  stepCover: 'Cover the keypad with your other hand.',
  stepPin: 'Type your pretend PIN.',
  stepTake: 'Approved! Take your card and your receipt.',
  declined: 'Declined. That means there isn\'t enough money on the card. What should you do?',
  declineRight: 'Yes! Put something back, or ask a parent. Don\'t keep trying the card.',
  notYet: 'Not yet! Follow the steps in order.',
  coverFirst: 'Cover the keypad first, so nobody sees your PIN!',
  wrongDigit: 'Oops, that\'s not the PIN. Try again.',
  cardPaid: 'You paid with your card! Card back in your wallet!',
  yes: 'Yes!',
  notQuite: 'Not quite.',
  youPay: 'You pay',
  howMuchLeft: 'How much is left on your card?',
  yesLeft: 'Yes! You have this much left:',
  countUpRule: 'Start at the price, and count up to your balance.',

  // ---- Shopping Trip (Ruby's Market) ----
  shopIntro: 'Tap what you want. Then tap checkout.',
  yourTotal: 'Your total is',
  overBudget: 'That\'s more than you have. Put something back!',
  wrongItems: 'Check your list!',
  addBill: 'Not enough yet. Add another bill!',
  extraBill: 'You gave me more bills than you need. Take one back.',
  payCard: 'Tap your card on the reader.',
  approved: 'Approved! Thanks for shopping at Ruby\'s Market.',
  tripDone: ['Nice shopping. I\'m almost impressed.', 'You did it. Come back anytime. Or don\'t. Kidding.', 'Smart shopper. Ruby approves.'],

  // ---- Game Room (Twinkle) ----
  gameRoom: 'Welcome to the Game Room! Every game costs money to play. Pick one!',
  ddIntro: 'Collect 5 donuts. Don\'t let Bandit the raccoon catch you!',
  ddWin: 'You got all 5 donuts! You win! Bandit is so jealous.',
  ddCaught: 'Oh no, Bandit caught you! So close! Want to try again?',
  pgIntro: 'Draw a slide for the penguin, then press play!',
  pgFall: 'Whoops! The penguin slid off. Fix your track and try again!',
  pgOut: 'Out of tries! What a slide!',

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
    SAY.youHave, ...range(1, 99).map(centsTail),
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
    'Bills', 'Enough?', 'Card Mode',
    SAY.balanceIs, SAY.totalIs, SAY.canPayCard, SAY.compareRule, SAY.cardOk, SAY.cardNo, SAY.balanceMore, SAY.balanceLess,
    SAY.stepTotal, SAY.stepCard, SAY.stepCover, SAY.stepPin, SAY.stepTake, SAY.declined, SAY.declineRight,
    SAY.notYet, SAY.coverFirst, SAY.wrongDigit, SAY.cardPaid, SAY.yes, SAY.notQuite,
    SAY.youPay, SAY.howMuchLeft, SAY.yesLeft, SAY.countUpRule,
    ...SAFETY.flatMap((s) => [s.q, s.why]),
    SAY.gameRoom, SAY.ddIntro, SAY.ddWin, SAY.ddCaught, SAY.pgIntro, SAY.pgFall, SAY.pgOut,
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
    ...dollars(1, 50).map(A), ...GOODS.map((g) => A(g.price)),
    'Shopping Trip', ...Object.values(MISSIONS).map((m) => m.text), SAY.shopIntro, SAY.yourTotal, SAY.overBudget, SAY.wrongItems,
    SAY.payCard, SAY.approved, ...SAY.tripDone, SAY.balanceIs, SAY.addBill, SAY.extraBill,
    ...shared,
  ];
  return { twinkle: [...new Set(twinkle)], ruby: [...new Set(ruby)] };
}

function dollars(a, b) { return range(a, b).map((n) => n * 100); }
export const BILLS = [100, 500, 1000, 2000];
function range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; }
