// Panda Town: floating low-poly platforms in the sky, like an obby course.
// Tap a platform and the panda hops there; drag up/down to scroll the course.
import * as THREE from 'three';
import { createPanda, mat, box } from './avatar.js';
import { ZONES, SOON, state } from './progress.js';
import { sfx } from './audio.js';

const INK = '#1d1b3a';

function layout() {
  const pads = [
    { id: 'home', name: 'PANDA HOME', x: 0, z: 10.2, r: 2.2, color: '#ffb3d9' },
    { id: 'shop', name: 'PANDA SHOP', x: 2.6, z: 6.6, r: 1.8, color: '#ff5fa2' },
  ];
  // Zones zig-zag away from the camera like an obstacle course.
  ZONES.forEach((zd, i) => {
    pads.push({ id: zd.id, name: zd.name.toUpperCase(), color: zd.color, x: i % 2 ? 2.5 : -2.5, z: 2.2 - 5.8 * i, r: 2.0 });
  });
  SOON.forEach((name, i) => {
    const k = ZONES.length + i;
    pads.push({ id: 'soon' + i, soon: true, name: name.toUpperCase(), x: k % 2 ? 2.5 : -2.5, z: 2.2 - 5.8 * k, r: 1.9, color: '#b9bfd0' });
  });
  return pads;
}

function labelTexture(lines, { bg = '#ffffff', fg = INK, accent = '#ff5fa2', w = 512, h = 220 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const r = 36;
  g.fillStyle = INK;
  roundRect(g, 4, 14, w - 8, h - 18, r); g.fill();
  g.fillStyle = bg;
  roundRect(g, 4, 4, w - 8, h - 22, r); g.fill();
  g.lineWidth = 10; g.strokeStyle = INK;
  roundRect(g, 8, 8, w - 16, h - 30, r - 4); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (lines.length === 1) {
    fit(g, lines[0], w - 60, 92);
    g.fillStyle = fg; g.fillText(lines[0], w / 2, h / 2 - 8);
  } else {
    g.fillStyle = accent; g.font = '48px "Lilita One", sans-serif';
    g.fillText(lines[0], w / 2, 62);
    fit(g, lines[1], w - 60, 76);
    g.fillStyle = fg; g.fillText(lines[1], w / 2, 132);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function fit(g, text, maxW, size) {
  do { g.font = `${size}px "Lilita One", sans-serif`; size -= 4; } while (g.measureText(text).width > maxW && size > 20);
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function darker(hex, k = 0.75) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return '#' + c.getHexString();
}

const texLoader = new THREE.TextureLoader();
const texCache = {};
function tex(url, flip = false) {
  const key = url + flip;
  if (!texCache[key]) {
    const t = texLoader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (flip) { t.center.set(0.5, 0.5); t.rotation = Math.PI; }
    texCache[key] = t;
  }
  return texCache[key];
}

// A big coin standing on its edge. `name` (quarter, penny...) puts the real
// heads/tails pictures on its two faces (flat discs, so the art is upright).
function bigCoin(color, edge, r = 0.9, name = null) {
  const g = new THREE.Group();
  const edgeMat = mat(edge, { metalness: 0.1, roughness: 0.35 });
  if (name) {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.2, 32, 1, true), edgeMat);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    g.add(rim);
    for (const [side, z, ry] of [['heads', 0.1, 0], ['tails', -0.1, Math.PI]]) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40),
        new THREE.MeshStandardMaterial({ map: tex(`img/${name}-${side}.png`), roughness: 0.45 }));
      disc.position.z = z;
      disc.rotation.y = ry;
      disc.castShadow = true;
      g.add(disc);
    }
    return g;
  }
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.2, 28), [edgeMat, mat(color, { metalness: 0.1, roughness: 0.35 }), mat(color, { metalness: 0.1, roughness: 0.35 })]);
  m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  g.add(m);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.05, 4, 20), mat(edge, { metalness: 0.1 }));
  ring.position.z = 0.11;
  g.add(ring);
  const ring2 = ring.clone(); ring2.position.z = -0.11; g.add(ring2);
  return g;
}

function mesh(geo, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function cardTexture() {
  const c = document.createElement('canvas');
  c.width = 380; c.height = 240;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 380, 240);
  grad.addColorStop(0, '#9b6bff'); grad.addColorStop(0.7, '#ff5fa2'); grad.addColorStop(1, '#ffb3d9');
  g.fillStyle = grad; g.fillRect(0, 0, 380, 240);
  g.fillStyle = '#fff'; g.font = '34px "Lilita One", sans-serif'; g.fillText('PANDA BANK', 22, 50);
  g.fillStyle = '#ffd23f'; g.fillRect(24, 82, 62, 46);
  g.fillStyle = '#fff'; g.font = '26px "Fredoka", sans-serif'; g.fillText('•••• •••• •••• 2468', 22, 175);
  g.font = '22px "Lilita One", sans-serif'; g.fillText('DEBIT', 290, 215);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// A thin floating bill with the real picture on both sides. width in world units.
function billMesh(n, width) {
  const face = new THREE.MeshStandardMaterial({ map: tex(`img/bill-${n}.png`), roughness: 0.7 });
  const edge = mat('#c9d9bf');
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, width / 2.35, 0.05), [edge, edge, edge, edge, face, face]);
  m.castShadow = true;
  return m;
}

function billTexture() {
  const c = document.createElement('canvas');
  c.width = 472; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#cfe6c2'; g.fillRect(0, 0, 472, 200);
  g.strokeStyle = '#2f5d34'; g.lineWidth = 10; g.strokeRect(14, 14, 444, 172);
  g.fillStyle = '#2f5d34'; g.font = '70px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('1', 60, 62); g.fillText('1', 412, 62); g.fillText('1', 60, 142); g.fillText('1', 412, 142);
  g.beginPath(); g.ellipse(236, 100, 56, 70, 0, 0, Math.PI * 2); g.globalAlpha = 0.25; g.fill(); g.globalAlpha = 1;
  g.font = '28px "Lilita One", sans-serif'; g.fillText('ONE DOLLAR', 236, 168);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class World {
  constructor(canvas, { onPad }) {
    this.canvas = canvas;
    this.onPad = onPad;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.clock = new THREE.Clock();
    this.t = 0;
    this.spinners = [];
    this.bobbers = [];
    this.clouds = [];
    this.padObjs = {};
    this.focusZ = 3;
    this.camPos = new THREE.Vector3(0, 12, 22);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.pandaMode = false;
    this.happy = 0;
    this.hop = null;
    this.running = false;

    this.buildLights();
    this.buildPads();
    this.minZ = Math.min(...this.pads.map((p) => p.z)) - 3; // don't scroll past the last platform
    this.buildDecor();

    this.panda = createPanda();
    this.scene.add(this.panda.root);
    const home = this.pads.find((p) => p.id === 'home');
    this.panda.root.position.set(home.x, 0, home.z);
    this.currentPad = 'home';
    this.setOutfit(state.equipped);

    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.refresh();
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight('#d6f1ff', '#ffd6b0', 1.25));
    const sun = new THREE.DirectionalLight('#ffffff', 1.7);
    sun.position.set(7, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const s = sun.shadow.camera;
    s.left = -12; s.right = 12; s.top = 14; s.bottom = -14; s.near = 1; s.far = 50;
    sun.shadow.bias = -0.002;
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);
  }

  buildPads() {
    this.pads = layout();
    this.padTargets = [];
    for (const p of this.pads) {
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      g.userData.padId = p.id;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.02, 0.6, 8), mat(p.color));
      top.position.y = -0.3; top.receiveShadow = true; top.castShadow = true;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 1.04, p.r * 1.04, 0.16, 8), mat(darker(p.color, 0.7)));
      band.position.y = -0.62;
      const dirt = new THREE.Mesh(new THREE.ConeGeometry(p.r * 0.98, 2.6, 8), mat('#b0723f'));
      dirt.rotation.x = Math.PI; dirt.position.y = -2.0; dirt.castShadow = true;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), mat('#8a5a33'));
      rock.position.set(p.r * 0.4, -2.6, 0.3);
      g.add(top, band, dirt, rock);

      // sign
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture([p.name], { fg: INK }), transparent: true }));
      sign.scale.set(3.2, 3.2 * 220 / 512, 1);
      sign.position.set(0, 2.9, -p.r * 0.8);
      sign.renderOrder = 2;
      g.add(sign);
      p.sign = sign;
      if (p.id === 'home') sign.visible = false;

      // marker above (star / arrow / lock) - filled in refresh()
      const marker = new THREE.Group();
      marker.position.set(0, 4.3, -p.r * 0.8);
      g.add(marker);
      p.marker = marker;

      this.decoratePad(p, g);
      this.scene.add(g);
      this.padObjs[p.id] = g;
      this.padTargets.push(g);
    }
    // stepping blocks between platforms, obby style
    const order = ['home', ...ZONES.map((z) => z.id), ...SOON.map((_, i) => 'soon' + i)];
    const colors = ['#ff5fa2', '#ffcf3f', '#4fd1ff', '#7be36b', '#9b6bff'];
    for (let i = 0; i < order.length - 1; i++) {
      const a = this.pads.find((p) => p.id === order[i]);
      const b = this.pads.find((p) => p.id === order[i + 1]);
      for (let k = 1; k <= 2; k++) {
        const f = k / 3;
        const blk = box(0.8, 0.5, 0.8, colors[(i + k) % colors.length], a.x + (b.x - a.x) * f, -0.35, a.z + (b.z - a.z) * f);
        blk.rotation.y = (i + k) * 0.6;
        this.bobbers.push({ o: blk, base: -0.35, amp: 0.15, sp: 1.5, ph: i + k });
        this.scene.add(blk);
      }
    }
    const home = this.pads.find((p) => p.id === 'home');
    const shop = this.pads.find((p) => p.id === 'shop');
    for (let k = 1; k <= 1; k++) {
      const blk = box(0.8, 0.5, 0.8, '#ffcf3f', (home.x + shop.x) / 2 + 0.4, -0.35, (home.z + shop.z) / 2);
      this.bobbers.push({ o: blk, base: -0.35, amp: 0.15, sp: 1.5, ph: 3 });
      this.scene.add(blk);
    }
  }

  decoratePad(p, g) {
    if (p.id === 'home') {
      for (const [x, z, h] of [[-1.5, -0.6, 2.6], [-1.1, -1.2, 3.4], [1.6, -0.8, 2.2]]) {
        const stalk = new THREE.Group();
        for (let i = 0; i < h / 0.6; i++) {
          stalk.add(box(0.22, 0.56, 0.22, i % 2 ? '#5fcf4a' : '#4cb83a', 0, 0.3 + i * 0.6, 0));
        }
        const leaf = box(0.7, 0.06, 0.25, '#7be36b', 0.3, h - 0.2, 0); leaf.rotation.z = 0.5;
        stalk.add(leaf);
        stalk.position.set(x, 0, z);
        g.add(stalk);
      }
      g.add(box(1.2, 0.3, 1.0, '#ff8fc7', 1.2, 0.15, 0.6));
    } else if (p.id === 'shop') {
      g.add(box(2.2, 0.9, 0.9, '#ffffff', 0, 0.45, -0.3));
      g.add(box(2.3, 0.12, 1.0, '#ff5fa2', 0, 0.95, -0.3));
      for (const x of [-1.0, 1.0]) g.add(box(0.14, 1.6, 0.14, INK, x, 1.75, -0.65));
      for (let i = 0; i < 6; i++) {
        const a = box(0.4, 0.14, 1.1, i % 2 ? '#ffffff' : '#ff4d8d', -1.0 + i * 0.4, 2.55, -0.3);
        a.rotation.x = 0.35;
        g.add(a);
      }
      const coin = bigCoin('#ffd23f', '#d19a00', 0.45);
      coin.position.set(1.35, 3.1, -0.3);
      g.add(coin);
      this.spinners.push({ o: coin, sp: 1.6 });
    } else if (p.id === 'coins') {
      const q = bigCoin('#dfe4ec', '#8c96a8', 0.85, 'quarter');
      q.position.set(-0.4, 1.4, -0.2);
      const pn = bigCoin('#e08a52', '#9a4a1e', 0.68, 'penny');
      pn.position.set(1.1, 1.0, 0.4);
      g.add(q, pn);
      this.spinners.push({ o: q, sp: 1.2 }, { o: pn, sp: -1.6 });
      this.bobbers.push({ o: q, base: 1.4, amp: 0.2, sp: 2, ph: 0 }, { o: pn, base: 1.0, amp: 0.2, sp: 2, ph: 1.5 });
    } else if (p.id === 'hop') {
      for (let i = 0; i < 4; i++) {
        const q = bigCoin('#dfe4ec', '#8c96a8', 0.38, 'quarter');
        q.rotation.x = Math.PI / 2;
        q.position.set(-1.2 + i * 0.8, 0.5 + i * 0.45, 0.2);
        g.add(q);
        this.bobbers.push({ o: q, base: q.position.y, amp: 0.25, sp: 4, ph: i * 0.7 });
      }
    } else if (p.id === 'dollar') {
      const bill = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.02, 0.08), [mat('#a8cf98'), mat('#a8cf98'), mat('#a8cf98'), mat('#a8cf98'),
        new THREE.MeshStandardMaterial({ map: tex('img/bill-1.png'), roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: tex('img/bill-1.png'), roughness: 0.7 })]);
      bill.position.set(0, 1.5, -0.2);
      bill.castShadow = true;
      g.add(bill);
      this.bobbers.push({ o: bill, base: 1.5, amp: 0.18, sp: 1.6, ph: 0 });
      this.spinners.push({ o: bill, sp: 0.6, wobble: true });
    } else if (p.id === 'bills') {
      // A fan of $5, $10 and $20 bills.
      [[5, -0.9, 0.35], [10, 0, 0], [20, 0.9, -0.35]].forEach(([n, x, rz], i) => {
        const b = billMesh(n, 1.7);
        b.position.set(x, 1.35 + i * 0.25, -0.2 + i * 0.05);
        b.rotation.z = rz;
        g.add(b);
        this.bobbers.push({ o: b, base: b.position.y, amp: 0.15, sp: 1.8, ph: i });
      });
    } else if (p.id === 'dollarup') {
      // Ruby's snack stand with a giant donut.
      g.add(box(2.0, 0.85, 0.8, '#ffffff', 0, 0.42, -0.4));
      g.add(box(2.1, 0.12, 0.9, '#ff9a3c', 0, 0.9, -0.4));
      for (const x of [-0.95, 0.95]) g.add(box(0.12, 1.4, 0.12, INK, x, 1.6, -0.75));
      for (let i = 0; i < 5; i++) {
        const a = box(0.42, 0.14, 1.0, i % 2 ? '#ffffff' : '#3bb8ff', -0.84 + i * 0.42, 2.3, -0.45);
        a.rotation.x = 0.35;
        g.add(a);
      }
      const donut = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.2, 6, 12), mat('#c98a4b'));
      const icing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 6, 12), mat('#ff8fc7'));
      icing.position.z = 0.06;
      donut.add(ring, icing);
      donut.position.set(1.25, 1.25, 0.5);
      g.add(donut);
      this.spinners.push({ o: donut, sp: 1.4 });
      this.bobbers.push({ o: donut, base: 1.25, amp: 0.2, sp: 2, ph: 1 });
    } else if (p.id === 'enough') {
      // A big wallet with a dollar peeking out, and a bouncing question mark.
      const wallet = new THREE.Group();
      wallet.add(box(1.6, 1.1, 0.35, '#8a5a33', 0, 0, 0));
      wallet.add(box(1.62, 0.5, 0.37, '#6e4527', 0, 0.3, 0.01));
      wallet.add(box(0.22, 0.22, 0.4, '#ffd23f', 0.62, 0.3, 0.02));
      const b = billMesh(1, 1.3);
      b.position.set(-0.1, 0.65, -0.05);
      b.rotation.z = 0.15;
      wallet.add(b);
      wallet.position.set(-0.3, 0.75, -0.1);
      wallet.rotation.y = 0.25;
      g.add(wallet);
      const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(['?'], { bg: '#b98cff', fg: '#ffffff' }), transparent: true }));
      q.scale.set(1.5, 1.5 * 220 / 512, 1);
      q.position.set(1.15, 1.5, 0.3);
      g.add(q);
      this.bobbers.push({ o: q, base: 1.5, amp: 0.25, sp: 3, ph: 0 });
    } else if (p.id === 'card') {
      // A giant Panda Bank card hovering over a card reader.
      const face = new THREE.MeshStandardMaterial({ map: cardTexture(), roughness: 0.5 });
      const edge = mat('#9b6bff');
      const card = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 0.08), [edge, edge, edge, edge, face, face]);
      card.position.set(-0.2, 1.7, -0.1);
      card.rotation.z = -0.15;
      card.castShadow = true;
      g.add(card);
      this.bobbers.push({ o: card, base: 1.7, amp: 0.2, sp: 1.7, ph: 0 });
      this.spinners.push({ o: card, sp: 0.8, wobble: true });
      g.add(box(0.8, 0.5, 0.6, '#2b2d42', 0.9, 0.25, 0.5));
      g.add(box(0.6, 0.06, 0.4, '#c9f7c1', 0.9, 0.52, 0.5));
    } else if (p.id === 'shopping') {
      // A chunky red shopping cart full of goodies.
      const cart = new THREE.Group();
      cart.add(box(1.4, 0.08, 0.9, '#ff4d6b', 0, 0.55, 0));
      for (const [x, z] of [[-0.7, 0], [0.7, 0]]) cart.add(box(0.08, 0.6, 0.9, '#ff4d6b', x, 0.85, z));
      for (const z of [-0.45, 0.45]) cart.add(box(1.4, 0.6, 0.08, '#ff4d6b', 0, 0.85, z));
      cart.add(box(0.08, 0.08, 0.9, INK, 0.95, 1.25, 0));
      cart.add(box(0.3, 0.08, 0.08, INK, 0.8, 1.2, 0));
      for (const [x, z] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) {
        const wh = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), INK, x, 0.14, z);
        wh.rotation.x = Math.PI / 2;
        cart.add(wh);
      }
      cart.add(mesh(new THREE.IcosahedronGeometry(0.28, 0), '#ff3b3b', -0.35, 1.05, 0));
      cart.add(box(0.35, 0.5, 0.35, '#3bb8ff', 0.15, 1.1, -0.1));
      cart.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 8), '#ffd23f', 0.45, 1.1, 0.15));
      cart.position.set(-0.2, 0, -0.1);
      cart.rotation.y = 0.5;
      g.add(cart);
      this.bobbers.push({ o: cart, base: 0, amp: 0.08, sp: 4, ph: 0 });
    } else if (p.soon) {
      g.add(box(0.9, 0.9, 0.9, '#9aa1b5', -0.6, 0.45, -0.2));
      g.add(box(0.7, 0.7, 0.7, '#aab1c4', 0.5, 0.35, 0.3));
    }
  }

  buildDecor() {
    const cloudMat = mat('#ffffff', { roughness: 0.9 });
    for (let i = 0; i < 30; i++) {
      const c = new THREE.Group();
      const n = 3 + (i % 3);
      for (let k = 0; k < n; k++) {
        const s = 0.9 + Math.random() * 1.1;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), cloudMat);
        m.position.set(k * 1.3 - n * 0.6, Math.random() * 0.5, Math.random() * 0.8);
        c.add(m);
      }
      const side = i % 2 ? 1 : -1;
      c.position.set(side * (6 + Math.random() * 8), -5 - Math.random() * 6, 12 - i * 2.2);
      c.userData.sp = 0.2 + Math.random() * 0.3;
      this.clouds.push(c);
      this.scene.add(c);
    }
    const cols = ['#ff5fa2', '#ffcf3f', '#4fd1ff', '#9b6bff', '#7be36b'];
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1;
      const b = box(0.6 + Math.random() * 0.6, 0.6 + Math.random() * 0.6, 0.6 + Math.random() * 0.6, cols[i % cols.length],
        side * (5 + Math.random() * 3), 1 + Math.random() * 4, 10 - i * 2.4);
      b.rotation.set(Math.random(), Math.random(), Math.random());
      this.spinners.push({ o: b, sp: 0.3 + Math.random() * 0.5, tumble: true });
      this.bobbers.push({ o: b, base: b.position.y, amp: 0.4, sp: 1, ph: i });
      this.scene.add(b);
    }
  }

  // Update locks / stars / "play next" arrow and sign text.
  refresh() {
    const next = [...ZONES].reverse().find((z) => state.zones[z.id].unlocked && !state.zones[z.id].mastered);
    for (const p of this.pads) {
      while (p.marker.children.length) p.marker.remove(p.marker.children[0]);
      const zs = state.zones[p.id];
      let locked = p.soon || (zs && !zs.unlocked);
      const lines = p.soon ? ['COMING SOON', p.name] : locked ? ['LOCKED', p.name] : [p.name];
      p.sign.material.map = labelTexture(lines, { bg: locked ? '#e7e9f2' : '#ffffff', fg: locked ? '#6b7088' : INK, accent: locked ? '#9aa1b5' : '#ff5fa2' });
      p.sign.material.needsUpdate = true;
      p.locked = locked;
      const top = this.padObjs[p.id].children[0];
      top.material = mat(locked ? '#c5c9d6' : p.color);
      if (zs && zs.mastered) {
        const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.55), { depth: 0.2, bevelEnabled: false }), mat('#ffd23f', { metalness: 0.4, roughness: 0.3, emissive: '#7a5a00', emissiveIntensity: 0.3 }));
        star.geometry.center();
        p.marker.add(star);
      } else if (next && p.id === next.id) {
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 4), mat('#ff3b6b', { emissive: '#ff3b6b', emissiveIntensity: 0.3 }));
        arrow.rotation.x = Math.PI;
        p.marker.add(arrow);
      }
    }
  }

  setOutfit(equipped) {
    this.panda.setOutfit(equipped);
  }

  cheer(sec = 1.5) { this.happy = sec; }

  bindInput() {
    let start = null, moved = 0, lastY = 0;
    const el = this.canvas;
    el.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; lastY = e.clientY; moved = 0; });
    el.addEventListener('pointermove', (e) => {
      if (!start || this.pandaMode) return;
      const dy = e.clientY - lastY;
      lastY = e.clientY;
      moved += Math.abs(dy);
      this.focusZ = Math.max(this.minZ, Math.min(5, this.focusZ - dy * 0.05));
    });
    el.addEventListener('pointerup', (e) => {
      if (start && moved < 10) this.tap(e.clientX, e.clientY);
      start = null;
    });
    el.addEventListener('pointercancel', () => { start = null; });
  }

  tap(x, y) {
    if (this.hop || this.pandaMode) return;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    // Platforms win over signs, so a sign floating in front of a platform
    // doesn't steal the tap.
    const all = ray.intersectObjects(this.padTargets, true);
    const hits = [...all.filter((h) => !h.object.isSprite), ...all.filter((h) => h.object.isSprite)];
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.padId) o = o.parent;
      if (o) { this.selectPad(o.userData.padId); return; }
    }
  }

  selectPad(id) {
    const p = this.pads.find((q) => q.id === id);
    if (!p) return;
    if (p.locked) {
      sfx.locked();
      const g = this.padObjs[id];
      const x0 = p.x;
      let n = 0;
      const shake = () => { n++; g.position.x = x0 + Math.sin(n * 2) * 0.15 * (1 - n / 16); if (n < 16) requestAnimationFrame(shake); else g.position.x = x0; };
      shake();
      this.onPad(id, { locked: true, soon: !!p.soon });
      return;
    }
    if (id === this.currentPad) { this.onPad(id, {}); return; }
    this.hopTo(id, () => this.onPad(id, {}));
  }

  hopTo(id, done) {
    const p = this.pads.find((q) => q.id === id);
    const from = this.panda.root.position.clone();
    const to = new THREE.Vector3(p.x, 0, p.z + 0.4);
    const dist = from.distanceTo(to);
    const n = Math.max(1, Math.ceil(dist / 4.2));
    this.panda.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    this.focusZ = Math.max(this.minZ, Math.min(5, p.z - 3));
    this.hop = { from, to, n, i: 0, t: 0, dur: 0.42, done, id };
    sfx.hop();
  }

  setPandaMode(on) {
    this.pandaMode = on;
    if (on) this.panda.root.rotation.y = 0;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    this.renderer.setAnimationLoop(() => this.frame());
  }
  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.t += dt;
    const t = this.t;
    const pr = this.panda.root;

    // hop animation
    let hopping = false;
    if (this.hop) {
      const H = this.hop;
      H.t += dt;
      const k = Math.min(1, H.t / H.dur);
      const a = H.i / H.n, b = (H.i + 1) / H.n;
      const f = a + (b - a) * k;
      pr.position.lerpVectors(H.from, H.to, f);
      pr.position.y = Math.sin(k * Math.PI) * 2.0;
      hopping = true;
      if (k >= 1) {
        H.i++; H.t = 0;
        sfx.land();
        if (H.i >= H.n) {
          this.hop = null;
          this.currentPad = H.id;
          pr.position.copy(H.to);
          pr.rotation.y = 0;
          this.cheer(0.8);
          setTimeout(() => H.done && H.done(), 250);
        } else sfx.hop();
      }
    }
    if (!hopping) pr.rotation.y *= 0.9;
    this.happy = Math.max(0, this.happy - dt);
    this.panda.update(t, dt, { hopping, happy: this.happy });

    for (const s of this.spinners) {
      if (s.tumble) { s.o.rotation.x += s.sp * dt; s.o.rotation.y += s.sp * dt * 0.7; }
      else if (s.wobble) s.o.rotation.y = Math.sin(t * s.sp) * 0.5;
      else s.o.rotation.y += s.sp * dt;
    }
    for (const b of this.bobbers) b.o.position.y = b.base + Math.sin(t * b.sp + b.ph) * b.amp;
    for (const c of this.clouds) { c.position.x += c.userData.sp * dt; if (c.position.x > 16) c.position.x = -16; }
    for (const p of this.pads) { p.marker.position.y = 4.3 + Math.sin(t * 3) * 0.2; p.marker.rotation.y += dt * 1.5; }

    // camera
    const aspect = this.camera.aspect;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    let wantPos, wantLook;
    if (this.pandaMode) {
      const d = Math.max(7, 2.6 / (tanH * Math.min(aspect, 1)));
      wantLook = pr.position.clone().add(new THREE.Vector3(0, -0.9, 0));
      wantPos = pr.position.clone().add(new THREE.Vector3(0, 2.2, d));
    } else {
      const dist = Math.max(14, Math.min(30, 4.6 / (tanH * aspect)));
      wantLook = new THREE.Vector3(0, 0, this.focusZ);
      wantPos = wantLook.clone().add(new THREE.Vector3(0, 0.55, 0.84).normalize().multiplyScalar(dist));
    }
    const k = 1 - Math.pow(0.002, dt);
    this.camPos.lerp(wantPos, k);
    this.camLook.lerp(wantLook, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.sun.position.set(this.camLook.x + 7, 16, this.camLook.z + 9);
    this.sun.target.position.copy(this.camLook);

    this.renderer.render(this.scene, this.camera);
  }
}

function starShape(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return s;
}
