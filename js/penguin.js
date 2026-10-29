// Penguin Line Race: draw icy lines, press play, and the penguin slides along them
// with gravity and momentum. No finish line; slide as far as you can.
// If he drops off the bottom of the track, that uses one try. The track is saved.
import { state, save, award, BADGES } from './progress.js';
import { sfx, speak } from './audio.js';
import { SAY } from './lines.js';
import { toast } from './ui.js';

const R = 19;            // penguin radius (world px)
const GRAV = 950;        // px/s²
const SUBSTEPS = 8;
const FRICTION = 0.99996; // per substep: very slippery ice (about 1% speed lost per second)
const MAX_SPEED = 2600;
const START = { x: 120, y: 120 };
const PX_PER_M = 30;
const STARTER = [[50, 165], [140, 190], [230, 225], [320, 268], [400, 300], [470, 318]];

export function startPenguinRace({ tries = 3, useTry, price = 50, onEnd }) {
  const wrap = document.createElement('div');
  wrap.className = 'pg';
  wrap.innerHTML = `
    <canvas class="pg-canvas"></canvas>
    <div class="pg-top">
      <button class="pg-btn round pg-quit" aria-label="Leave game">✕</button>
      <div class="pg-stats"><span>🐧 <b class="pg-dist">0</b> m</span><span>Best <b class="pg-best">0</b> m</span><span>🎟️ <b class="pg-tries">${tries}</b></span></div>
      <button class="pg-btn round pg-clear" aria-label="Clear track">🗑️</button>
    </div>
    <div class="pg-hint">Draw a slide for the penguin, then press ▶️</div>
    <div class="pg-tools">
      <button class="pg-btn tool on" data-tool="draw">✏️<small>Draw</small></button>
      <button class="pg-btn tool" data-tool="erase">🧽<small>Erase</small></button>
      <button class="pg-btn tool" data-tool="move">✋<small>Move</small></button>
      <button class="pg-btn pg-undo">↩️<small>Undo</small></button>
      <button class="pg-btn pg-reset">🔄<small>Start</small></button>
      <button class="pg-btn pg-play">▶️<small>Play</small></button>
    </div>
    <div class="pg-panel"></div>`;
  document.body.appendChild(wrap);
  const canvas = wrap.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const panel = wrap.querySelector('.pg-panel');
  const hint = wrap.querySelector('.pg-hint');
  const $ = (s) => wrap.querySelector(s);

  // ---- track (saved between visits) ----
  let lines = Array.isArray(state.penguinTrack) && state.penguinTrack.length ? state.penguinTrack.map((l) => l.map((p) => [...p])) : [STARTER.map((p) => [...p])];
  const saveTrack = () => { state.penguinTrack = lines.map((l) => l.map(([x, y]) => [Math.round(x), Math.round(y)])); save(); };

  // ---- penguin ----
  const pen = { x: START.x, y: START.y, vx: 0, vy: 0, angle: 0, face: 1, touching: false };
  let playing = false, fallen = false, dist = 0, triesLeft = tries;
  let best = state.stats.penguinBest || 0;
  $('.pg-best').textContent = best;

  // ---- camera / screen ----
  let W = 0, H = 0, dpr = 1;
  const cam = { x: 0, y: 0 };
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  // Background bits (screen space)
  const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.7, r: Math.random() * 1.4 + 0.3, tw: Math.random() * 6 }));
  const snow = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 0.7, r: 1 + Math.random() * 2 }));

  // ---- physics ----
  function lowestY() {
    let m = START.y;
    for (const l of lines) for (const [, y] of l) if (y > m) m = y;
    return m;
  }
  let fallY = lowestY() + 700;

  function collide() {
    pen.touching = false;
    for (const l of lines) {
      for (let i = 0; i < l.length - 1; i++) {
        const [ax, ay] = l[i], [bx, by] = l[i + 1];
        // quick bounds check
        if (pen.x < Math.min(ax, bx) - R || pen.x > Math.max(ax, bx) + R || pen.y < Math.min(ay, by) - R || pen.y > Math.max(ay, by) + R) continue;
        const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
        let t = ((pen.x - ax) * dx + (pen.y - ay) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const qx = ax + t * dx, qy = ay + t * dy;
        let nx = pen.x - qx, ny = pen.y - qy;
        const d = Math.hypot(nx, ny);
        if (d >= R) continue;
        if (d < 0.0001) { const l2 = Math.sqrt(len2); nx = dy / l2; ny = -dx / l2; if (ny > 0) { nx = -nx; ny = -ny; } } // sit on top
        else { nx /= d; ny /= d; }
        pen.x = qx + nx * R; pen.y = qy + ny * R;
        const vn = pen.vx * nx + pen.vy * ny;
        if (vn < 0) {
          const s0 = Math.hypot(pen.vx, pen.vy);
          pen.vx -= nx * vn; pen.vy -= ny * vn;
          // Forgiving ice: sliding into a slope at a moderate angle keeps most of the speed
          // (redirect instead of losing it). Only a near head-on hit, like a wall, really stops him.
          const s1 = Math.hypot(pen.vx, pen.vy);
          if (s1 > 1 && s0 > 0 && s1 / s0 > 0.35) {
            const keep = s1 + (s0 - s1) * 0.85;
            pen.vx *= keep / s1; pen.vy *= keep / s1;
          }
        }
        pen.touching = true;
      }
    }
  }

  function stepPhysics(dt) {
    const h = dt / SUBSTEPS;
    for (let s = 0; s < SUBSTEPS; s++) {
      pen.vy += GRAV * h;
      pen.x += pen.vx * h; pen.y += pen.vy * h;
      collide();
      if (pen.touching) { pen.vx *= FRICTION; pen.vy *= FRICTION; }
      const sp = Math.hypot(pen.vx, pen.vy);
      if (sp > MAX_SPEED) { pen.vx *= MAX_SPEED / sp; pen.vy *= MAX_SPEED / sp; }
    }
    const sp = Math.hypot(pen.vx, pen.vy);
    dist += sp * dt;
    // Lean into the direction of travel when sliding.
    // Face the way he's sliding, and lean with the slope (never fully upside down).
    if (Math.abs(pen.vx) > 40) pen.face = pen.vx > 0 ? 1 : -1;
    const lean = sp > 30 ? Math.max(-1.2, Math.min(1.2, Math.atan2(pen.vy, Math.abs(pen.vx)))) : 0;
    const want = lean * pen.face;
    pen.angle += wrapAngle(want - pen.angle) * Math.min(1, dt * 10);
    const m = Math.floor(dist / PX_PER_M);
    $('.pg-dist').textContent = m;
    if (m > best) { best = m; $('.pg-best').textContent = best; }
    if (pen.y > fallY) fall();
  }

  // ---- input ----
  let tool = 'draw', drawing = null, panFrom = null, pointerId = null;
  const toWorld = (e) => [e.clientX + cam.x, e.clientY + cam.y];
  canvas.addEventListener('pointerdown', (e) => {
    if (pointerId !== null || fallen) return;
    if (playing) { setPlaying(false); return; } // tapping the track while sliding pauses
    pointerId = e.pointerId;
    canvas.setPointerCapture?.(e.pointerId);
    hint.classList.add('hidden');
    const [x, y] = toWorld(e);
    if (tool === 'draw') { drawing = [[x, y]]; lines.push(drawing); }
    else if (tool === 'erase') eraseAt(x, y);
    else panFrom = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const [x, y] = toWorld(e);
    if (tool === 'draw' && drawing) {
      const [lx, ly] = drawing[drawing.length - 1];
      if (Math.hypot(x - lx, y - ly) >= 10) drawing.push([x, y]);
    } else if (tool === 'erase') eraseAt(x, y);
    else if (panFrom) { cam.x = panFrom.cx - (e.clientX - panFrom.x); cam.y = panFrom.cy - (e.clientY - panFrom.y); }
  });
  const up = (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    if (drawing) {
      if (drawing.length < 2) lines.splice(lines.indexOf(drawing), 1);
      else { sfx.tap(); saveTrack(); }
      drawing = null;
      fallY = lowestY() + 700;
    }
    panFrom = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  function eraseAt(x, y) {
    const before = lines.length;
    lines = lines.filter((l) => !l.some((p, i) => i < l.length - 1 && segDist(x, y, p, l[i + 1]) < 18));
    if (lines.length !== before) { sfx.back(); saveTrack(); fallY = lowestY() + 700; }
  }

  for (const b of wrap.querySelectorAll('.tool')) {
    b.addEventListener('click', () => {
      sfx.tap();
      tool = b.dataset.tool;
      wrap.querySelectorAll('.tool').forEach((x) => x.classList.toggle('on', x === b));
      if (playing) setPlaying(false);
    });
  }
  $('.pg-undo').addEventListener('click', () => { sfx.back(); if (lines.length) lines.pop(); saveTrack(); fallY = lowestY() + 700; });
  $('.pg-reset').addEventListener('click', () => { sfx.tap(); resetPenguin(); });
  $('.pg-play').addEventListener('click', () => { sfx.tap(); setPlaying(!playing); });
  $('.pg-clear').addEventListener('click', () => {
    sfx.tap();
    showPanel(`<div class="pg-big">Clear the whole track?</div>
      <div class="pg-row"><button class="pg-btn wide pg-yes">Yes, clear it</button><button class="pg-btn wide ghost pg-no">Keep it</button></div>`);
    panel.querySelector('.pg-yes').addEventListener('click', () => { lines = [STARTER.map((p) => [...p])]; saveTrack(); resetPenguin(); hidePanel(); });
    panel.querySelector('.pg-no').addEventListener('click', hidePanel);
  });
  $('.pg-quit').addEventListener('click', () => { sfx.tap(); finish({ again: false }); });

  function setPlaying(on) {
    if (fallen) return;
    playing = on;
    const b = $('.pg-play');
    b.innerHTML = on ? '⏸<small>Pause</small>' : '▶️<small>Play</small>';
    b.classList.toggle('playing', on);
    hint.classList.add('hidden');
  }
  function resetPenguin() {
    setPlaying(false);
    Object.assign(pen, { x: START.x, y: START.y, vx: 0, vy: 0, angle: 0, face: 1 });
    dist = 0;
    $('.pg-dist').textContent = 0;
    cam.x = 0; cam.y = 0;
  }

  function fall() {
    if (fallen) return;
    fallen = true; playing = false;
    sfx.wrong();
    const m = Math.floor(dist / PX_PER_M);
    if (m > (state.stats.penguinBest || 0)) state.stats.penguinBest = m;
    if (best >= 100 && award('penguin_pro')) toast(`${BADGES.penguin_pro.icon} New badge: <b>${BADGES.penguin_pro.name}</b>`, 3000);
    save();
    triesLeft = useTry ? useTry() : Math.max(0, triesLeft - 1);
    $('.pg-tries').textContent = triesLeft;
    if (triesLeft > 0) {
      speak(SAY.pgFall);
      showPanel(`<div class="pg-big">Whoops! 🐧💨</div><div>The penguin slid off the track after <b>${m} m</b>.</div>
        <div>🎟️ ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left. Fix your track and go again!</div>
        <div class="pg-row"><button class="pg-btn wide pg-fix">FIX MY TRACK</button><button class="pg-btn wide ghost pg-out">GAME ROOM</button></div>`);
      panel.querySelector('.pg-fix').addEventListener('click', () => { sfx.tap(); fallen = false; hidePanel(); resetPenguin(); });
    } else {
      speak(SAY.pgOut);
      showPanel(`<div class="pg-big">Out of tries! 🐧</div><div>Best slide: <b>${best} m</b></div>
        <div class="pg-row"><button class="pg-btn wide pg-again">PLAY AGAIN · ${price < 100 ? price + '¢' : '$' + (price / 100).toFixed(2)}</button><button class="pg-btn wide ghost pg-out">GAME ROOM</button></div>`);
      panel.querySelector('.pg-again').addEventListener('click', () => { sfx.tap(); finish({ again: true }); });
    }
    panel.querySelector('.pg-out').addEventListener('click', () => { sfx.tap(); finish({ again: false }); });
  }
  function showPanel(html) { panel.innerHTML = html; panel.classList.add('show'); }
  function hidePanel() { panel.classList.remove('show'); }

  // ---- drawing ----
  function drawPenguin() {
    ctx.save();
    ctx.translate(pen.x - cam.x, pen.y - cam.y);
    ctx.rotate(pen.angle);
    const s = R / 15;
    ctx.scale(s * pen.face, s);
    // feet
    ctx.fillStyle = '#ff9f1a';
    ctx.beginPath(); ctx.ellipse(-6, 13, 6, 3, 0, 0, Math.PI * 2); ctx.ellipse(7, 13, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = '#1d2433';
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(3, 3, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
    // scarf
    ctx.fillStyle = '#ff3b6b';
    ctx.fillRect(-12, -5, 24, 5);
    ctx.fillRect(-12 + Math.sin(performance.now() / 120) * 2, -3, 5, 12);
    // eyes + beak
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(5, -9, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(6.3, -9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9f1a';
    ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(19, -4); ctx.lineTo(10, -2); ctx.closePath(); ctx.fill();
    // cheek
    ctx.fillStyle = 'rgba(255,140,180,.8)';
    ctx.beginPath(); ctx.arc(3, -3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function render(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#07112b'); sky.addColorStop(0.6, '#123a5a'); sky.addColorStop(1, '#1f6a7a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (const st of stars) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + st.tw);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // northern lights (drift slowly with the camera for depth)
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      const base = H * (0.18 + k * 0.07);
      for (let x = 0; x <= W; x += 16) {
        const y = base + Math.sin(x / 90 + t * 0.6 + k + cam.x / 400) * 22 + Math.sin(x / 37 + t * 0.9) * 6;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath();
      ctx.fillStyle = ['rgba(80,255,180,.10)', 'rgba(120,180,255,.09)', 'rgba(255,120,220,.07)'][k];
      ctx.fill();
    }
    // start flag
    const fx = START.x - 40 - cam.x, fy = START.y - cam.y;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(fx, fy + 40); ctx.lineTo(fx, fy - 20); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(fx, fy - 20); ctx.lineTo(fx + 22, fy - 12); ctx.lineTo(fx, fy - 4); ctx.fill();
    // track
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [{ w: 12, c: 'rgba(111,224,255,.25)' }, { w: 6, c: '#c9f6ff' }]) {
      ctx.strokeStyle = pass.c; ctx.lineWidth = pass.w;
      for (const l of lines) {
        ctx.beginPath();
        l.forEach(([x, y], i) => (i ? ctx.lineTo(x - cam.x, y - cam.y) : ctx.moveTo(x - cam.x, y - cam.y)));
        ctx.stroke();
      }
    }
    // "danger" floor far below the lowest line
    const dy = fallY - cam.y;
    if (dy < H + 40) {
      ctx.fillStyle = 'rgba(255,80,120,.18)'; ctx.fillRect(0, dy, W, H - dy + 40);
    }
    drawPenguin();
    // snow
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const f of snow) {
      f.y += f.s * 0.0015; f.x += Math.sin(t + f.s * 10) * 0.0004;
      if (f.y > 1) { f.y = 0; f.x = Math.random(); }
      ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- loop ----
  let raf = 0, last = performance.now(), t = 0;
  function step(dt) {
    t += dt;
    if (playing) {
      stepPhysics(dt);
      // camera follows the penguin
      const tx = pen.x - W * 0.4, ty = pen.y - H * 0.45;
      cam.x += (tx - cam.x) * Math.min(1, dt * 4);
      cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    }
  }
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    step(dt);
    render(t);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  speak(SAY.pgIntro);

  let done = false;
  function finish({ again }) {
    if (done) return;
    done = true;
    saveTrack();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    wrap.remove();
    onEnd({ won: false, again });
  }

  // For automated checks (also reachable as startPenguinRace.last).
  return startPenguinRace.last = {
    pen, get lines() { return lines; }, set lines(v) { lines = v; fallY = lowestY() + 700; },
    get playing() { return playing; }, get fallen() { return fallen; }, get dist() { return Math.floor(dist / PX_PER_M); },
    get triesLeft() { return triesLeft; }, _step: step, play: () => setPlaying(true),
  };
}

function segDist(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}
function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
