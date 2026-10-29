// Makes the buddy voice clips with OpenAI text-to-speech.
//
//   node tools/make-voices.mjs --samples      a few test clips per candidate voice (voice/samples/)
//   node tools/make-voices.mjs                every line in js/lines.js (skips clips that already exist)
//   node tools/make-voices.mjs --limit 20     only the first 20 missing clips per buddy (a cheap test)
//
// The API key is read from OPENAI_API_KEY or from the private file .openai-key
// in the project folder (never served to the phone, never shown in chat).
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { allLines, lineKey, QUIPS, SAY } from '../js/lines.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'voice');
const MODEL = 'gpt-4o-mini-tts';

// Who sounds like what. Change `voice` after listening to the samples.
const CAST = {
  twinkle: {
    voice: 'coral',
    instructions: 'You are Twinkle, a giddy, starry-eyed cartoon bunny cheering on a 13-year-old girl who is learning about money. '
      + 'Voice: bright, bubbly, high-energy, smiling the whole time, sparkly and squeaky-excited like a hyped best friend. '
      + 'Pace: quick and bouncy. Big rising excitement on praise. When explaining, stay warm and clear and say numbers slowly and plainly.',
  },
  ruby: {
    voice: 'ballad',
    instructions: 'You are Ruby, a sassy, hard-to-impress cartoon red panda talking to a 13-year-old girl who is learning about money. '
      + 'Voice: dry, deadpan, a little eye-rolly and theatrical, comically unimpressed, but secretly warm and proud of her. '
      + 'Pace: relaxed with funny pauses. Say numbers and amounts clearly.',
  },
};
const CANDIDATES = { twinkle: ['coral', 'shimmer', 'nova'], ruby: ['sage', 'ballad', 'alloy'] };

const args = process.argv.slice(2);
const SAMPLES = args.includes('--samples');
const LIMIT = args.includes('--limit') ? +args[args.indexOf('--limit') + 1] : Infinity;

async function apiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  try {
    const txt = await readFile(join(ROOT, '.openai-key'), 'utf8');
    const line = txt.split('\n').map((l) => l.trim()).find((l) => l.startsWith('sk-'));
    if (line) return line;
  } catch { /* fall through */ }
  console.error('No API key found. Paste it into the .openai-key file in the PANDABUCKS folder (one line starting with sk-).');
  process.exit(1);
}

async function tts(key, { voice, instructions }, input) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice, input, instructions, response_format: 'mp3' }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = await res.text();
    const billing = /billing_not_active|insufficient_quota/.test(body);
    if (!billing && (res.status === 429 || res.status >= 500) && attempt < 6) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    throw new Error(`OpenAI said ${res.status}: ${body.slice(0, 300)}`);
  }
}

const exists = (p) => access(p).then(() => true, () => false);
const fileFor = (who, text) => `${who}/${createHash('sha1').update(who + '|' + lineKey(text)).digest('hex').slice(0, 12)}.mp3`;

async function pool(items, n, fn) {
  let i = 0, done = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
      done++;
      if (done % 25 === 0 || done === items.length) process.stdout.write(`  ${done}/${items.length}\n`);
    }
  });
  await Promise.all(workers);
}

const key = await apiKey();

if (SAMPLES) {
  const dir = join(OUT, 'samples');
  await mkdir(dir, { recursive: true });
  const lines = {
    twinkle: `${QUIPS.twinkle.right[0]} ${SAY.moreRight(10, 5)} ${QUIPS.twinkle.wrong[0]} ${SAY.hopMiss(50)}`,
    ruby: `${QUIPS.ruby.hello[0]} ${SAY.giveMe(75)} ${SAY.takeBack(10)} ${QUIPS.ruby.right[2]}`,
  };
  for (const who of Object.keys(CANDIDATES)) {
    for (const voice of CANDIDATES[who]) {
      const name = `${who}-${voice}.mp3`;
      if (await exists(join(dir, name))) { console.log('have', name); continue; }
      try {
        const mp3 = await tts(key, { ...CAST[who], voice }, lines[who]);
        await writeFile(join(dir, name), mp3);
        console.log('made', name);
      } catch (e) {
        console.log('failed', name, '-', e.message.slice(0, 120));
      }
    }
  }
  process.exit(0);
}

const manifestPath = join(OUT, 'manifest.json');
let manifest = {};
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* new */ }

const all = allLines();
for (const who of Object.keys(all)) {
  await mkdir(join(OUT, who), { recursive: true });
  manifest[who] = manifest[who] || {};
  const todo = [];
  for (const text of all[who]) {
    const file = fileFor(who, text);
    if (await exists(join(OUT, file))) manifest[who][lineKey(text)] = file;
    else todo.push({ text, file });
  }
  const batch = todo.slice(0, LIMIT);
  console.log(`${who}: ${all[who].length} lines, ${todo.length} missing, making ${batch.length} now (voice: ${CAST[who].voice})`);
  let failed = 0;
  await pool(batch, 6, async ({ text, file }) => {
    try {
      const mp3 = await tts(key, CAST[who], text);
      await writeFile(join(OUT, file), mp3);
      manifest[who][lineKey(text)] = file;
    } catch (e) {
      failed++;
      if (failed <= 3) console.error(`  failed: "${text}" -> ${e.message}`);
    }
  });
  await writeFile(manifestPath, JSON.stringify(manifest));
  if (failed) console.log(`  ${failed} clips failed; run again to retry just those.`);
}
console.log('Done. Clip list saved to voice/manifest.json');
