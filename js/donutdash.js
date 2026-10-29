// Donut Dash: collect 5 donuts before Bandit the raccoon catches you.
// A big room with stairs up to a wraparound balcony. Thumbstick + JUMP on phones,
// arrow keys / WASD + space on a computer.
import * as THREE from 'three';
import { createPanda, box, mat } from './avatar.js';
import { sfx, speak } from './audio.js';
import { SAY } from './lines.js';

const R = 12;          // room half-size
const LAND = 4;        // balcony height
const STEP = 0.7;      // how high a body can step up
const GRAV = 26, JUMP_V = 9.5;
const PLAYER_SPEED = 6.2;
const GOAL = 5;

// ---- level shape ----
// Balcony runs along the back wall and both side walls (not the camera side).
const inRing = (x, z) => z <= -9 || ((x >= 9 || x <= -9) && z <= 9);
// Stairs climb from the floor (z = 3) straight into the back balcony (z = -9), beside the west balcony.
const inStairs = (x, z) => x >= -9 && x <= -6 && z >= -9 && z <= 3;
const stairH = (z) => LAND * Math.min(1, Math.max(0, (3 - z) / 12));

function groundAt(x, z, y) {
  let g = 0;
  if (inStairs(x, z)) g = Math.max(g, stairH(z));
  if (inRing(x, z) && y >= LAND - STEP) g = Math.max(g, LAND);
  return g;
}

// The balcony is a U shape (back, east, west). To get from one side to another, go via a back corner.
const segOf = (x, z) => (z <= -9 ? 'back' : x >= 9 ? 'east' : x <= -9 ? 'west' : 'mid');
const onSeg = (x, z, s) => (s === 'back' ? z <= -9 : s === 'east' ? x >= 9 && z <= 9 : s === 'west' ? x <= -9 && z <= 9 : false);
function ringWaypoint(fx, fz, tx, tz) {
  const a = segOf(fx, fz), b = segOf(tx, tz);
  if (b === 'mid' || onSeg(fx, fz, b)) return [tx, tz]; // same side (corners count as both)
  if (a === 'east') return [10.5, -10.5];
  if (a === 'west') return [-10.5, -10.5];
  return b === 'east' ? [10.5, -10.5] : [-10.5, -10.5];
}

function makeBody(obj, speed) {
  return { obj, x: 0, y: 0, z: 0, vy: 0, grounded: true, speed, fx: 0, fz: 1 };
}

// Move a body by (dx, dz) with walls, stairs and the balcony edge.
function moveBody(b, dx, dz, dt) {
  const lim = R - 0.6;
  for (const [ax, d] of [['x', dx], ['z', dz]]) {
    if (!d) continue;
    const nx = ax === 'x' ? Math.max(-lim, Math.min(lim, b.x + d)) : b.x;
    const nz = ax === 'z' ? Math.max(-lim, Math.min(lim, b.z + d)) : b.z;
    const g = groundAt(nx, nz, b.y);
    if (g > b.y + STEP) continue; // a wall of stairs: blocked
    b.x = nx; b.z = nz;
  }
  b.vy -= GRAV * dt;
  let ny = b.y + b.vy * dt;
  // Don't bump your head through the balcony from underneath.
  if (inRing(b.x, b.z) && b.y < LAND - STEP && ny + 2.6 > LAND - 0.4) { ny = Math.min(ny, LAND - 3.0); b.vy = Math.min(b.vy, 0); }
  const g = groundAt(b.x, b.z, Math.max(b.y, ny));
  if (ny <= g) { ny = g; b.vy = 0; b.grounded = true; } else b.grounded = false;
  b.y = ny;
  b.obj.position.set(b.x, b.y, b.z);
}

function buildRaccoon() {
  const g = new THREE.Group();
  const GREY = '#8d8f9e', DARK = '#3a3a48', LIGHT = '#e9e9f0';
  for (const s of [-1, 1]) g.add(box(0.32, 0.4, 0.4, DARK, s * 0.24, 0.2, 0));
  g.add(box(0.95, 0.8, 1.2, GREY, 0, 0.8, 0));
  g.add(box(0.7, 0.4, 0.9, LIGHT, 0, 0.62, 0.12));
  const head = new THREE.Group();
  head.position.set(0, 1.35, 0.45);
  head.add(box(1.1, 0.85, 0.9, GREY, 0, 0.3, 0));
  head.add(box(1.12, 0.26, 0.3, DARK, 0, 0.38, 0.35)); // bandit mask
  for (const s of [-1, 1]) {
    head.add(box(0.14, 0.14, 0.05, '#ffffff', s * 0.24, 0.4, 0.51));
    head.add(box(0.07, 0.07, 0.04, '#111111', s * 0.24, 0.4, 0.54));
    head.add(box(0.3, 0.32, 0.16, GREY, s * 0.4, 0.84, -0.05));
    head.add(box(0.16, 0.18, 0.06, DARK, s * 0.4, 0.84, 0.03));
  }
  head.add(box(0.4, 0.3, 0.3, LIGHT, 0, 0.12, 0.55));
  head.add(box(0.14, 0.1, 0.08, '#111111', 0, 0.2, 0.72));
  g.add(head);
  const tail = new THREE.Group();
  tail.position.set(0, 1.0, -0.62);
  for (let i = 0; i < 5; i++) tail.add(box(0.3, 0.3, 0.32, i % 2 ? DARK : GREY, 0, i * 0.1, -i * 0.3));
  tail.rotation.x = -0.5;
  g.add(tail);
  g.userData.tail = tail;
  g.scale.setScalar(1.15);
  return g;
}

function buildDonut() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.22, 8, 16), mat('#d39150'));
  const icing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.17, 8, 16), mat('#ff7fbf', { emissive: '#ff4fa3', emissiveIntensity: 0.25 }));
  icing.position.z = 0.08;
  g.add(ring, icing);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const sp = box(0.12, 0.04, 0.04, ['#ffe14d', '#4fd1ff', '#ffffff', '#7be36b'][i % 4], Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.26);
    sp.rotation.z = a * 2;
    g.add(sp);
  }
  return g;
}

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    x.fillStyle = (i + j) % 2 ? '#ffd6ea' : '#fff3f9';
    x.fillRect(i * 32, j * 32, 32, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Possible donut spots: [x, z, y]. Always at least 2 on the balcony.
const FLOOR_SPOTS = [[6, -4], [3, 5], [-2, -5], [6, 7]];
const UP_SPOTS = [[10.5, -4], [0, -10.5], [-10.5, 5], [10.5, 6], [-7.5, -3, 'stair']];

export function startDonutDash({ equipped, onEnd }) {
  const wrap = document.createElement('div');
  wrap.className = 'dd';
  wrap.innerHTML = `<canvas class="dd-canvas"></canvas>
    <div class="dd-hud"><button class="x-btn dd-quit" aria-label="Leave game">✕</button><div class="dd-count">🍩 <b>0</b>/${GOAL}</div></div>
    <div class="dd-stick hidden"><div class="dd-knob"></div></div>
    <div class="dd-stick-hint">👆 Drag here to move</div>
    <button class="dd-jump" aria-label="Jump">JUMP</button>
    <div class="dd-center"></div>`;
  document.body.appendChild(wrap);
  const canvas = wrap.querySelector('canvas');
  const center = wrap.querySelector('.dd-center');
  const countEl = wrap.querySelector('.dd-count b');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe8ff');
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffd6b0', 1.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.4);
  sun.position.set(6, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  scene.add(sun);

  // ---- room ----
  const floor = new THREE.Mesh(new THREE.BoxGeometry(R * 2, 0.4, R * 2), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.8 }));
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);
  const WALL = '#9b6bff';
  scene.add(box(R * 2, 9, 0.4, WALL, 0, 4.5, -R - 0.2));
  scene.add(box(0.4, 9, R * 2, '#ff8fc7', -R - 0.2, 4.5, 0));
  scene.add(box(0.4, 9, R * 2, '#ff8fc7', R + 0.2, 4.5, 0));
  scene.add(box(R * 2, 0.8, 0.4, '#ffcf3f', 0, 0.4, R + 0.2)); // low wall on the camera side

  // Balcony slabs (fade out when you're under them so you can still see yourself).
  const balconyMat = new THREE.MeshStandardMaterial({ color: '#4fd1ff', roughness: 0.6, transparent: true, opacity: 1 });
  const slabs = [
    [R * 2, 3, 0, -10.5],          // back
    [3, 18, 10.5, 0],              // east (z -9..9)
    [3, 18, -10.5, 0],             // west
  ];
  for (const [w, d, x, z] of slabs) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), balconyMat);
    s.position.set(x, LAND - 0.2, z);
    s.castShadow = true; s.receiveShadow = true;
    scene.add(s);
  }
  for (const [x, z] of [[9.2, -9.2], [-9.2, -9.2], [9.2, 8.8], [-9.2, 8.8]]) scene.add(box(0.4, LAND - 0.4, 0.4, '#ffffff', x, (LAND - 0.4) / 2, z));
  // Stairs: 12 chunky steps up to the back balcony.
  for (let i = 0; i < 12; i++) {
    const h = LAND * (i + 1) / 12;
    scene.add(box(3, h, 1, i % 2 ? '#ffcf3f' : '#ffb21a', -7.5, h / 2, 2.5 - i));
  }

  // ---- characters ----
  const panda = createPanda();
  scene.add(panda.root);
  panda.setOutfit(equipped || {});
  const player = makeBody(panda.root, PLAYER_SPEED);
  player.z = 7; player.x = 3;

  // Arrow by the panda pointing at the nearest donut.
  const arrow = new THREE.Group();
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), new THREE.MeshBasicMaterial({ color: '#ff3b8d' }));
  arrowHead.rotation.x = Math.PI / 2;
  arrowHead.position.z = 1.6;
  arrow.add(arrowHead);
  scene.add(arrow);

  const raccoonObj = buildRaccoon();
  scene.add(raccoonObj);
  const bandit = makeBody(raccoonObj, 2.2);
  bandit.x = 8; bandit.z = -6;

  // ---- donuts ----
  const spots = [...shuffle(UP_SPOTS).slice(0, 2), ...shuffle([...FLOOR_SPOTS, ...UP_SPOTS.slice(0, 3)]).slice(0, 5)];
  const chosen = [];
  for (const s of spots) if (chosen.length < GOAL && !chosen.includes(s)) chosen.push(s);
  const donuts = chosen.map(([x, z, kind]) => {
    const d = buildDonut();
    const y = kind === 'stair' ? stairH(z) : (inRing(x, z) ? LAND : 0);
    d.position.set(x, y + 1.1, z);
    d.userData.baseY = y + 1.1;
    // A soft glowing beam so donuts are easy to spot from far away.
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(x, y + 3.5, z);
    scene.add(beam);
    d.userData.beam = beam;
    scene.add(d);
    return d;
  });
  let got = 0;

  // ---- input ----
  const input = { x: 0, z: 0, jump: false };
  const keys = new Set();
  const stick = wrap.querySelector('.dd-stick'), knob = wrap.querySelector('.dd-knob'), stickHint = wrap.querySelector('.dd-stick-hint');
  let stickId = null, sx = 0, sy = 0;
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (e.clientX > window.innerWidth * 0.6 || stickId !== null) return;
    stickId = e.pointerId; sx = e.clientX; sy = e.clientY;
    stick.style.left = sx + 'px'; stick.style.top = sy + 'px';
    stick.classList.remove('hidden');
    stickHint.classList.add('hidden');
  });
  wrap.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - sx, dy = e.clientY - sy;
    const len = Math.hypot(dx, dy), max = 55;
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.x = dx / max; input.z = dy / max;
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null; input.x = 0; input.z = 0;
    knob.style.transform = '';
    stick.classList.add('hidden');
  };
  wrap.addEventListener('pointerup', endStick);
  wrap.addEventListener('pointercancel', endStick);
  const jumpBtn = wrap.querySelector('.dd-jump');
  jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); input.jump = true; });
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') { keys.add(k); if (k === ' ') input.jump = true; } else keys.delete(k);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  // ---- game state ----
  let state = 'countdown', t = 0, startAt = 0, raf = 0, last = performance.now();
  const camPos = new THREE.Vector3(0, 16, 22), look = new THREE.Vector3();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function say(html, cls = '') { center.innerHTML = html; center.className = 'dd-center show ' + cls; }
  function hideCenter() { center.className = 'dd-center'; }

  // Countdown
  speak(SAY.ddIntro);
  say('<div class="dd-big">Collect 5 🍩</div><div>Don\'t let Bandit the raccoon catch you!</div>');
  setTimeout(() => { if (state === 'countdown') say('<div class="dd-big">3</div>'); sfx.tap(); }, 2200);
  setTimeout(() => { if (state === 'countdown') say('<div class="dd-big">2</div>'); sfx.tap(); }, 3000);
  setTimeout(() => { if (state === 'countdown') say('<div class="dd-big">1</div>'); sfx.tap(); }, 3800);
  setTimeout(() => {
    if (state !== 'countdown') return;
    say('<div class="dd-big">GO!</div>'); sfx.hop();
    state = 'play'; startAt = t;
    setTimeout(hideCenter, 700);
  }, 4600);

  // Bandit's route up to the balcony: front of the stairs, up, then onto the west balcony.
  const ROUTE_UP = [[-7.5, 6], [-7.5, 1], [-7.5, -8.6], [-7.5, -10.5]];
  let routeStep = 0, stuckT = 0, lastBX = 0, lastBZ = 0;

  function moveBandit(dt) {
    const pUp = player.y > LAND - 1 || inStairs(player.x, player.z);
    const bUp = bandit.y > LAND - 0.3 && inRing(bandit.x, bandit.z); // only once he's really on the balcony
    let tx = player.x, tz = player.z;
    if (pUp && !bUp) {
      // Follow the route to the stairs.
      const [wx, wz] = ROUTE_UP[routeStep];
      if (Math.hypot(bandit.x - wx, bandit.z - wz) < 0.8 && routeStep < ROUTE_UP.length - 1) routeStep++;
      if (!inStairs(bandit.x, bandit.z) && routeStep > 1 && bandit.y < 0.5) routeStep = 0; // fell off: start over
      [tx, tz] = ROUTE_UP[routeStep];
    } else {
      routeStep = 0;
      if (bUp && pUp) [tx, tz] = ringWaypoint(bandit.x, bandit.z, player.x, player.z);
    }
    // Dizzy after a fall: stand still for a moment.
    if (bandit.wasUp && !bUp && bandit.y < 0.2) { bandit.dizzy = 1.6; say('<div>💫 Bandit is dizzy!</div>'); setTimeout(() => { if (state === 'play') hideCenter(); }, 900); }
    bandit.wasUp = bUp || (bandit.wasUp && bandit.y > 0.2);
    if (bandit.dizzy > 0) { bandit.dizzy -= dt; raccoonObj.rotation.y += dt * 12; moveBody(bandit, 0, 0, dt); return; }
    const dx = tx - bandit.x, dz = tz - bandit.z, d = Math.hypot(dx, dz) || 1;
    const speed = bandit.speed + got * 0.2;
    moveBody(bandit, (dx / d) * speed * dt, (dz / d) * speed * dt, dt);
    bandit.obj.rotation.y = Math.atan2(dx, dz);
    // Stuck on something? Hop.
    stuckT += dt;
    if (stuckT > 0.5) {
      if (Math.hypot(bandit.x - lastBX, bandit.z - lastBZ) < 0.3 && bandit.grounded) bandit.vy = JUMP_V * 0.9;
      lastBX = bandit.x; lastBZ = bandit.z; stuckT = 0;
    }
    raccoonObj.userData.tail.rotation.y = Math.sin(t * 10) * 0.5;
  }

  function end(won) {
    state = won ? 'won' : 'caught';
    input.x = input.z = 0;
    if (won) {
      sfx.fanfare();
      speak(SAY.ddWin);
      say(`<div class="dd-big">YOU WIN! 🏆</div><div>All ${GOAL} donuts! Bandit is SO jealous.</div>
        <div class="dd-btns"><button class="btn big dd-again">PLAY AGAIN · 50¢</button><button class="btn ghost dd-out">GAME ROOM</button></div>`, 'win');
    } else {
      sfx.wrong();
      speak(SAY.ddCaught);
      say(`<div class="dd-big">CAUGHT! 🦝</div><div>You got ${got} of ${GOAL} donuts. So close!</div>
        <div class="dd-btns"><button class="btn big dd-again">TRY AGAIN · 50¢</button><button class="btn ghost dd-out">GAME ROOM</button></div>`, 'lose');
    }
    center.querySelector('.dd-again').addEventListener('click', () => { sfx.tap(); cleanup(); onEnd({ won, again: true }); });
    center.querySelector('.dd-out').addEventListener('click', () => { sfx.tap(); cleanup(); onEnd({ won, again: false }); });
  }

  wrap.querySelector('.dd-quit').addEventListener('click', () => { sfx.tap(); cleanup(); onEnd({ won: false, again: false, quit: true }); });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  // One tick of game logic (also used by automated tests).
  function step(dt) {
    t += dt;

    // Player
    let ix = input.x, iz = input.z;
    if (keys.has('arrowleft') || keys.has('a')) ix -= 1;
    if (keys.has('arrowright') || keys.has('d')) ix += 1;
    if (keys.has('arrowup') || keys.has('w')) iz -= 1;
    if (keys.has('arrowdown') || keys.has('s')) iz += 1;
    const il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; }
    if (state !== 'play') { ix = 0; iz = 0; input.jump = false; }
    if (input.jump && player.grounded) { player.vy = JUMP_V; sfx.hop(); }
    input.jump = false;
    moveBody(player, ix * player.speed * dt, iz * player.speed * dt, dt);
    if (il > 0.1) panda.root.rotation.y = Math.atan2(ix, iz);
    panda.update(t, dt, { hopping: !player.grounded, happy: state === 'won' ? 1 : 0 });

    // Bandit
    if (state === 'play' && t - startAt > 3) moveBandit(dt);
    else raccoonObj.userData.tail.rotation.y = Math.sin(t * 4) * 0.3;

    // Donuts
    for (const d of donuts) {
      if (!d.visible) continue;
      d.rotation.y += dt * 2;
      d.position.y = d.userData.baseY + Math.sin(t * 3 + d.position.x) * 0.2;
      if (state === 'play' && Math.hypot(d.position.x - player.x, d.position.z - player.z) < 1.3 && Math.abs(d.position.y - 1.1 - player.y) < 1.8) {
        d.visible = false;
        d.userData.beam.visible = false;
        got++;
        countEl.textContent = got;
        sfx.coin();
        if (got >= GOAL) end(true);
      }
    }

    // Caught?
    if (state === 'play' && Math.hypot(bandit.x - player.x, bandit.z - player.z) < 0.95 && Math.abs(bandit.y - player.y) < 1.5) end(false);

    // See-through balcony when you're under it.
    const under = inRing(player.x, player.z) && player.y < LAND - 1;
    balconyMat.opacity += ((under ? 0.3 : 1) - balconyMat.opacity) * Math.min(1, dt * 8);

    // Arrow toward the nearest donut.
    const left = donuts.filter((d) => d.visible);
    if (left.length && state === 'play') {
      const near = left.reduce((a, b) => (Math.hypot(a.position.x - player.x, a.position.z - player.z) < Math.hypot(b.position.x - player.x, b.position.z - player.z) ? a : b));
      arrow.visible = Math.hypot(near.position.x - player.x, near.position.z - player.z) > 2.5;
      arrow.position.set(player.x, player.y + 0.3, player.z);
      arrow.rotation.y = Math.atan2(near.position.x - player.x, near.position.z - player.z);
    } else arrow.visible = false;

    // Camera follows from high above and behind, pulled back more on tall phone screens.
    const back = camera.aspect < 0.8 ? 1.35 : 1;
    const want = new THREE.Vector3(player.x * 0.8, player.y + 15 * back, player.z + 11 * back);
    camPos.lerp(want, 1 - Math.pow(0.001, dt));
    look.lerp(new THREE.Vector3(player.x, player.y + 1, player.z - 1), 1 - Math.pow(0.001, dt));
    camera.position.copy(camPos);
    camera.lookAt(look);
  }
  raf = requestAnimationFrame(frame);

  function cleanup() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('resize', resize);
    renderer.dispose();
    wrap.remove();
  }

  // For automated checks.
  return {
    get state() { return state; }, get got() { return got; }, player, bandit, donuts, _input: input,
    _step: step,
    _go() { state = 'play'; startAt = t; hideCenter(); },
  };
}

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
