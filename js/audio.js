import { lineKey } from './lines.js';

// Sound effects, background music (all synthesized, no audio files), and read-aloud voice.
//
// iPhone notes:
// - Web audio only starts after a real tap (touchend / click), not on touch-down.
// - navigator.audioSession 'playback' lets sound play even with the silent switch on.

let ctx = null, sfxBus = null, musicBus = null, noiseBuf = null, unlocked = false;
export const prefs = { sound: true, speech: true, music: true };

function setup() {
  if (ctx) return;
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) { /* older iOS */ }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
  sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function unlockAudio() {
  setup();
  if (!ctx) return;
  if (ctx.state !== 'running') ctx.resume();
  if (!unlocked) {
    // A silent blip fully wakes audio on iOS.
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination);
    s.start(0);
    unlocked = true;
  }
  if (musicMode && !timer) startScheduler();
}

// Listen on every event iOS counts as a real tap.
for (const ev of ['touchend', 'click', 'pointerup', 'keydown']) {
  document.addEventListener(ev, unlockAudio, { passive: true, capture: true });
}
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else if (unlocked) ctx.resume();
});

function tone(freq, at, dur, { type = 'sine', vol = 0.18, to = null, bus = sfxBus, t0 = null } = {}) {
  if (!ctx || !bus) return;
  const start = (t0 ?? ctx.currentTime) + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(bus);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(at, dur, vol, { t0 = null, hp = 1000, bus = sfxBus } = {}) {
  if (!ctx || !bus) return;
  const start = (t0 ?? ctx.currentTime) + at;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(start);
  s.stop(start + dur + 0.02);
}

const sfxOn = () => prefs.sound && ctx;
export const sfx = {
  tap()     { if (sfxOn()) tone(660, 0, 0.06, { type: 'triangle', vol: 0.14 }); },
  coin()    { if (sfxOn()) { tone(1568, 0, 0.07, { type: 'square', vol: 0.07 }); tone(2349, 0.06, 0.22, { type: 'square', vol: 0.07 }); } },
  back()    { if (sfxOn()) tone(900, 0, 0.08, { type: 'triangle', vol: 0.12, to: 500 }); },
  hop()     { if (sfxOn()) tone(320, 0, 0.22, { type: 'sine', vol: 0.25, to: 900 }); },
  land()    { if (sfxOn()) { tone(160, 0, 0.12, { type: 'triangle', vol: 0.25, to: 80 }); noise(0, 0.06, 0.08, { hp: 400 }); } },
  correct() { if (sfxOn()) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.25, { type: 'square', vol: 0.08 })); },
  wrong()   { if (sfxOn()) { tone(330, 0, 0.18, { type: 'triangle', vol: 0.2, to: 220 }); tone(247, 0.16, 0.25, { type: 'triangle', vol: 0.18, to: 196 }); } },
  kaching() { if (sfxOn()) { noise(0, 0.08, 0.15, { hp: 3000 }); tone(2093, 0.03, 0.12, { type: 'square', vol: 0.07 }); tone(2637, 0.1, 0.4, { type: 'square', vol: 0.07 }); } },
  fanfare() { if (sfxOn()) [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.28, { type: 'square', vol: 0.08 })); },
  locked()  { if (sfxOn()) { tone(200, 0, 0.12, { type: 'square', vol: 0.08 }); tone(150, 0.12, 0.18, { type: 'square', vol: 0.08 }); } },
  whoosh()  { if (sfxOn()) noise(0, 0.25, 0.08, { hp: 1500 }); },
};

// ---------------- music ----------------
// An original, bouncy 8-bar loop in C major (C C G G Am Am F G).
// 'town' = full band; 'lesson' = softer, no lead melody, so she can focus.
const BPM = 116;
const STEP = 60 / BPM / 2; // eighth notes
const _ = null;
const LEAD = [
  76, _, 79, _, 84, _, 79, 76,   77, 76, 74, _, 72, _, _, _,
  74, _, 79, _, 83, _, 79, 74,   76, 74, 71, _, 67, _, _, _,
  72, _, 76, _, 81, _, 79, 76,   77, 76, 72, _, 69, _, _, _,
  69, _, 72, _, 77, _, 76, 74,   72, _, 74, _, 71, _, 74, _,
];
const CHORDS = [[48, 52, 55], [48, 52, 55], [43, 47, 50], [43, 47, 50], [45, 48, 52], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

let musicMode = null, timer = null, step = 0, nextTime = 0, duck = 1;

function musicLevel() {
  if (!prefs.music || !musicMode) return 0;
  return (musicMode === 'lesson' ? 0.45 : 0.75) * duck;
}
function applyLevel(fade = 0.4) {
  if (!ctx || !musicBus) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(musicLevel(), t + fade);
}

function scheduleStep(s, t) {
  const bar = Math.floor(s / 8) % 8, beat = s % 8;
  const chord = CHORDS[bar];
  const v = 0.11;
  // bass
  if (beat === 0 || beat === 4) tone(midi(chord[0] - 12), 0, STEP * 1.8, { type: 'triangle', vol: v * 1.6, bus: musicBus, t0: t });
  if (beat === 6) tone(midi(chord[0]), 0, STEP * 0.9, { type: 'triangle', vol: v * 1.1, bus: musicBus, t0: t });
  // bouncy chord stabs on the off-beats
  if (beat === 2 || beat === 6) chord.forEach((n) => tone(midi(n + 12), 0, STEP * 0.8, { type: 'square', vol: v * 0.22, bus: musicBus, t0: t }));
  // drums
  if (beat === 0 || beat === 4) tone(150, 0, 0.14, { type: 'sine', vol: v * 2.4, to: 45, bus: musicBus, t0: t });
  if (beat === 2 || beat === 6) noise(0, 0.1, v * 0.7, { hp: 1800, bus: musicBus, t0: t });
  noise(0, 0.03, v * 0.25, { hp: 7000, bus: musicBus, t0: t });
  // lead (town only)
  if (musicMode === 'town') {
    const n = LEAD[s % 64];
    if (n) tone(midi(n), 0, STEP * 1.6, { type: 'square', vol: v * 0.45, bus: musicBus, t0: t });
  }
}

function startScheduler() {
  if (!ctx || timer) return;
  nextTime = ctx.currentTime + 0.1;
  timer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      step = (step + 1) % 64;
      nextTime += STEP;
    }
  }, 30);
  applyLevel(0.8);
}

// mode: 'town' | 'lesson' | null
export function setMusic(mode) {
  musicMode = mode;
  if (!mode) { applyLevel(0.3); return; }
  if (unlocked) startScheduler();
  applyLevel(0.6);
}
export function refreshMusic() { applyLevel(0.3); }

// ---------------- voice ----------------
// speak(lines, { who }) plays recorded clips for that buddy when they exist
// (voice/manifest.json, made by tools/make-voices.mjs), one after another.
// Any line without a clip is read by the phone's built-in voice instead.
let manifest = {};
fetch('voice/manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => { manifest = m || {}; }).catch(() => {});
const clipCache = new Map();
let voiceBus = null, clipSource = null, speakToken = 0, unduckTimer = null;

function loadClip(file) {
  if (!clipCache.has(file)) {
    const p = fetch('voice/' + file).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b));
    p.catch(() => clipCache.delete(file));
    clipCache.set(file, p);
  }
  return clipCache.get(file);
}

function playClip(file, token) {
  return loadClip(file).then((buf) => new Promise((resolve) => {
    if (token !== speakToken) return resolve();
    if (!voiceBus) { voiceBus = ctx.createGain(); voiceBus.gain.value = 1; voiceBus.connect(ctx.destination); }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(voiceBus);
    src.onended = resolve;
    clipSource = src;
    src.start();
  })).catch(() => null);
}

let voice = null;
function pickVoice() {
  if (voice || !window.speechSynthesis) return voice;
  const vs = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.startsWith('en'));
  voice = vs.find((v) => /Samantha|Karen|Moira|Tessa|Google US/.test(v.name)) || vs.find((v) => v.lang === 'en-US') || vs[0] || null;
  return voice;
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { voice = null; pickVoice(); };

function deviceSay(text, who, token) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis || token !== speakToken) return resolve();
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = who === 'ruby' ? 0.95 : 1.05;
      u.pitch = who === 'ruby' ? 0.95 : 1.3;
      const v = pickVoice();
      if (v) u.voice = v;
      const t = setTimeout(resolve, 1500 + text.length * 80); // backup if onend never fires
      u.onend = () => { clearTimeout(t); resolve(); };
      speechSynthesis.speak(u);
    } catch (e) { resolve(); }
  });
}

// Recorded sound effects in the voice/ folder (like Dad's "I'm going to get you!").
// They follow the Sound effects setting, not the read-aloud voice setting.
export function preloadVoiceFile(file) { setup(); if (ctx) loadClip(file); }
export function playVoiceFile(file, { volume = 1 } = {}) {
  if (!prefs.sound || !ctx || !unlocked) return;
  loadClip(file).then((buf) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(ctx.destination);
    duck = 0.35; applyLevel(0.1); // music dips under the voice
    src.onended = () => { duck = 1; applyLevel(0.5); };
    src.start();
  }).catch(() => {});
}

export function stopSpeaking() {
  speakToken++;
  try { clipSource && clipSource.stop(); } catch (e) { /* already stopped */ }
  clipSource = null;
  if (window.speechSynthesis) speechSynthesis.cancel();
}

export const hasClip = (text, who = 'twinkle') => !!(manifest[who] && manifest[who][lineKey(text)]);

export async function speak(lines, { who = 'twinkle' } = {}) {
  if (!prefs.speech) return;
  const list = [lines].flat(Infinity).map((s) => String(s ?? '').replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  if (!list.length) return;
  stopSpeaking();
  const token = speakToken;
  // Turn the music down while talking.
  duck = 0.3; applyLevel(0.15);
  clearTimeout(unduckTimer);
  for (const text of list) {
    if (token !== speakToken) return;
    const file = manifest[who] && manifest[who][lineKey(text)];
    if (file && ctx && unlocked) await playClip(file, token);
    else await deviceSay(text, who, token);
  }
  if (token === speakToken) unduckTimer = setTimeout(() => { duck = 1; applyLevel(0.6); }, 150);
}

// For checking from the console: is audio awake and is music playing?
export function audioStatus() {
  return { context: ctx ? ctx.state : 'none', unlocked, music: musicMode, musicVolume: musicBus ? +musicBus.gain.value.toFixed(2) : 0, playing: !!timer };
}
