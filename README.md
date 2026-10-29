# PANDABUCKS

A money-learning game for iPhone. It's a web app that you add to the home screen; there's no build step.

## Play it

**https://castadream2.github.io/pandabucks/** (hosted free on GitHub Pages; works anywhere and offline after the first visit).
On the iPhone: open it in Safari, then **Share → Add to Home Screen**.

## Update it

After changing anything, save a checkpoint and upload it. The live site updates about a minute later:

```bash
git add -A && git commit -m "what changed" && git push
```

When game files change, bump `VERSION` in `sw.js` so phones drop their old saved copy.

## Test on the home Wi-Fi (optional)

```bash
cd path/to/PANDABUCKS && node serve.mjs
```

It prints the address to open. On the iPhone (same Wi-Fi), open Safari and go to that address. Use `http://`, not `https://`.
If macOS asks whether "node" may accept incoming connections, click **Allow**.
Tap **Share → Add to Home Screen**. The Mac has to stay on while she plays.

## What's in the slice

- **Panda Town**: a 3D obstacle-course hub (Three.js). Tap a platform and the panda hops there.
- **Zones**: Coin Check → Quarter Hop → Make a Dollar → Bills → Dollar Up → Enough? → Card Mode → Shopping Trip.
  They unlock in order.
- **Shop**: she pays for avatar items with her earned coins and gets change back.
- **Game Room**: side games that cost 50¢ to play (paid by counting coins). First game: **Donut Dash**,
  collect 5 donuts before Bandit the raccoon catches you (thumbstick + JUMP, or arrow keys + space).
- **Wallet**: a trade machine turns exactly $1.00 in coins into a $1 bill.
- **Parent screen**: the ⚙️ button, behind a PIN. It shows mastery, mix-ups and settings.

## Teaching rules (`js/progress.js`)

- A good run is 80%+ right on the first try. It unlocks the next zone and turns the helpers down one step.
- A run under 50% turns the helpers back up.
- A zone is mastered after good runs on 2 different days with low or no helpers.

## Files

`js/lessons.js` holds the challenges, `js/runner.js` the run flow and payout, `js/world.js` the 3D town,
`js/avatar.js` the panda and outfits, `js/shop.js` the shop and wallet, and `js/parent.js` the parent screen.
Progress is saved in the phone's browser storage, so it stays on that phone only.

## Money pictures

`img/` holds the real coin art (heads and tails for each coin), cut from `img/src/money-sheet.png`, and the
$1, $5, $10 and $20 bills (`bill-1.png` ... `bill-20.png`, originals in `img/src/`).
Challenges show heads or tails at random so she learns both sides. To swap in sharper art, replace the files
with the same names (`quarter-heads.png`, `dime-tails.png`, `bill-1.png`...). Transparent square PNGs work best.
