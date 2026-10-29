// Blocky low-poly panda built from boxes, plus wearable accessories.
import * as THREE from 'three';
import { item } from './catalog.js';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, flatShading: true, ...opts }));
  }
  return mats.get(key);
}

export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function mesh(geo, color, x = 0, y = 0, z = 0, opts) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

const WHITE = '#f7f7f2', BLACK = '#22222a', PINK = '#ff9ec7';

function shapeGeo(shape, depth = 0.08) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.center();
  return g;
}
function starShape(r = 0.2) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  return s;
}
function heartShape(r = 0.2) {
  const s = new THREE.Shape();
  s.moveTo(0, -r);
  s.bezierCurveTo(r * 1.4, r * 0.1, r * 0.6, r * 1.1, 0, r * 0.45);
  s.bezierCurveTo(-r * 0.6, r * 1.1, -r * 1.4, r * 0.1, 0, -r);
  return s;
}

// ---------- accessories ----------
const BUILD = {
  hat_party() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.ConeGeometry(0.36, 0.85, 6), '#ff5fa2', 0, 0.42, 0));
    g.add(mesh(new THREE.IcosahedronGeometry(0.14, 0), '#ffe14d', 0, 0.9, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 6), '#49d3ff', 0, 0.05, 0));
    g.rotation.z = -0.25;
    g.position.x = 0.15;
    return g;
  },
  hat_cap() {
    const g = new THREE.Group();
    g.add(box(1.42, 0.32, 1.18, '#ff4d4d', 0, 0.12, 0));
    g.add(box(1.0, 0.07, 0.6, '#ff4d4d', 0, 0.0, 0.8));
    g.add(box(0.2, 0.12, 0.2, '#ffffff', 0, 0.33, 0));
    return g;
  },
  hat_cone() {
    const g = new THREE.Group();
    g.add(box(1.1, 0.12, 1.1, '#ff7a1a', 0, 0.06, 0));
    g.add(mesh(new THREE.ConeGeometry(0.46, 1.25, 8), '#ff7a1a', 0, 0.72, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.27, 0.33, 0.2, 8), '#ffffff', 0, 0.7, 0));
    g.rotation.z = 0.12;
    return g;
  },
  hat_bunny() {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.add(box(0.26, 0.95, 0.14, WHITE, 0, 0.47, 0));
      ear.add(box(0.14, 0.75, 0.04, PINK, 0, 0.47, 0.08));
      ear.position.set(s * 0.32, 0, 0);
      ear.rotation.z = -s * 0.22;
      g.add(ear);
    }
    return g;
  },
  hat_top() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.07, 10), BLACK, 0, 0.03, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.9, 10), BLACK, 0, 0.5, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.16, 10), '#ff4d8d', 0, 0.16, 0));
    return g;
  },
  hat_cowboy() {
    const g = new THREE.Group();
    const brim = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.07, 10), '#c98a4b', 0, 0.04, 0);
    brim.scale.set(1, 1, 0.85);
    g.add(brim);
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.5, 8), '#c98a4b', 0, 0.3, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.1, 8), '#ff5fa2', 0, 0.12, 0));
    return g;
  },
  hat_crown() {
    const g = new THREE.Group();
    const gold = '#ffd23f';
    g.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 8, 1, true), gold, 0, 0.15, 0, { side: THREE.DoubleSide, metalness: 0.4, roughness: 0.35 }));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = mesh(new THREE.ConeGeometry(0.13, 0.32, 4), gold, Math.sin(a) * 0.56, 0.44, Math.cos(a) * 0.56, { metalness: 0.4, roughness: 0.35 });
      g.add(spike);
    }
    g.add(mesh(new THREE.OctahedronGeometry(0.11), '#ff3b6b', 0, 0.16, 0.63));
    g.add(mesh(new THREE.OctahedronGeometry(0.09), '#3bc9ff', 0.45, 0.16, 0.45));
    g.add(mesh(new THREE.OctahedronGeometry(0.09), '#3bc9ff', -0.45, 0.16, 0.45));
    return g;
  },
  glasses_sun() {
    const g = new THREE.Group();
    g.add(box(0.44, 0.26, 0.06, BLACK, -0.3, 0, 0));
    g.add(box(0.44, 0.26, 0.06, BLACK, 0.3, 0, 0));
    g.add(box(0.2, 0.06, 0.06, BLACK, 0, 0.06, 0));
    g.add(box(0.1, 0.06, 0.04, '#ffffff', -0.4, 0.06, 0.04));
    return g;
  },
  glasses_heart() {
    const g = new THREE.Group();
    const geo = shapeGeo(heartShape(0.24));
    g.add(mesh(geo, '#ff4d9d', -0.3, 0, 0));
    g.add(mesh(geo, '#ff4d9d', 0.3, 0, 0));
    g.add(box(0.16, 0.05, 0.05, '#ff4d9d', 0, 0.05, 0));
    return g;
  },
  glasses_star() {
    const g = new THREE.Group();
    const geo = shapeGeo(starShape(0.3));
    g.add(mesh(geo, '#ffd23f', -0.32, 0, 0, { metalness: 0.3 }));
    g.add(mesh(geo, '#ffd23f', 0.32, 0, 0, { metalness: 0.3 }));
    return g;
  },
  back_bamboo() {
    const g = new THREE.Group();
    g.add(box(0.8, 0.8, 0.36, '#7a5a2e', 0, 0, -0.18));
    g.add(box(0.6, 0.3, 0.06, '#9b7a42', 0, -0.1, -0.38));
    for (const [x, h] of [[-0.22, 1.1], [0.0, 1.4], [0.22, 0.95]]) {
      const b = mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 6), '#5fcf4a', x, h / 2 - 0.1, -0.2);
      g.add(b);
      g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 6), '#3e9a33', x, h * 0.45, -0.2));
    }
    return g;
  },
  back_jet() {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.85, 8), '#b8c2d0', s * 0.24, 0, -0.25, { metalness: 0.5, roughness: 0.3 }));
      g.add(mesh(new THREE.ConeGeometry(0.2, 0.3, 8), '#ff4d4d', s * 0.24, 0.57, -0.25));
      const flame = mesh(new THREE.ConeGeometry(0.15, 0.45, 6), '#ffb21a', s * 0.24, -0.66, -0.25, { emissive: '#ff7a00', emissiveIntensity: 0.9 });
      flame.rotation.x = Math.PI;
      flame.userData.flame = true;
      g.add(flame);
    }
    return g;
  },
  // Rawlf: a brown labradoodle with a curly coat, floppy ears and a fluffy tail.
  pet_rawlf() {
    const g = new THREE.Group();
    const BROWN = '#8a5a30', CURL = '#a46c3c', SNOUT = '#c08a58';
    const curl = (x, y, z, r = 0.17, c = CURL) => g.add(mesh(new THREE.IcosahedronGeometry(r, 0), c, x, y, z));
    for (const [x, z] of [[-0.28, 0.42], [0.28, 0.42], [-0.28, -0.42], [0.28, -0.42]]) {
      g.add(box(0.22, 0.5, 0.22, BROWN, x, 0.25, z));
      curl(x, 0.08, z + 0.04, 0.14, BROWN);
    }
    g.add(box(0.85, 0.6, 1.2, BROWN, 0, 0.78, 0));
    // curly coat (fixed spots, so Rawlf always looks the same)
    [[-0.35, 1.05, 0.3], [0, 1.1, 0.35], [0.35, 1.05, 0.3], [-0.3, 1.1, -0.1], [0.05, 1.12, -0.05], [0.33, 1.08, -0.15],
     [-0.32, 1.05, -0.45], [0.02, 1.08, -0.5], [0.34, 1.04, -0.45], [-0.45, 0.8, 0.2], [0.45, 0.8, 0.2], [-0.45, 0.78, -0.3],
     [0.45, 0.78, -0.3], [-0.42, 0.6, 0.45], [0.42, 0.6, 0.45]].forEach(([x, y, z]) => curl(x, y, z));
    const head = new THREE.Group();
    head.position.set(0, 1.28, 0.68);
    head.add(box(0.62, 0.58, 0.58, BROWN, 0, 0, 0));
    for (const [x, y, z] of [[-0.2, 0.32, 0], [0.02, 0.36, 0.05], [0.22, 0.32, -0.02], [-0.1, 0.3, -0.22], [0.12, 0.3, -0.2]]) {
      head.add(mesh(new THREE.IcosahedronGeometry(0.17, 0), CURL, x, y, z));
    }
    head.add(box(0.34, 0.26, 0.3, SNOUT, 0, -0.12, 0.38));
    head.add(box(0.13, 0.09, 0.06, '#1d1b26', 0, -0.03, 0.55));
    head.add(box(0.1, 0.03, 0.14, '#ff7fa8', 0, -0.27, 0.5));
    for (const s of [-1, 1]) {
      head.add(box(0.11, 0.11, 0.04, '#1d1b26', s * 0.16, 0.08, 0.3));
      head.add(box(0.04, 0.04, 0.02, '#ffffff', s * 0.14, 0.11, 0.32));
      const ear = new THREE.Group();
      ear.position.set(s * 0.36, 0.12, 0);
      ear.add(box(0.16, 0.48, 0.32, CURL, 0, -0.2, 0));
      ear.add(mesh(new THREE.IcosahedronGeometry(0.14, 0), CURL, 0, -0.45, 0.02));
      ear.rotation.z = s * 0.15;
      head.add(ear);
    }
    g.add(head);
    g.add(box(0.66, 0.08, 0.62, '#e8333f', 0, 1.0, 0.62));
    g.add(mesh(new THREE.OctahedronGeometry(0.07), '#ffd23f', 0, 0.9, 0.96));
    const tail = new THREE.Group();
    tail.position.set(0, 1.0, -0.62);
    [[0, 0.1, -0.05, 0.16], [0, 0.32, -0.1, 0.17], [0, 0.52, -0.02, 0.18]].forEach(([x, y, z, r]) => tail.add(mesh(new THREE.IcosahedronGeometry(r, 0), CURL, x, y, z)));
    g.add(tail);
    g.userData.tail = tail;
    g.userData.wag = 14;
    g.scale.setScalar(0.58);
    return g;
  },
  // Peanut: a small white cat with a pink collar and a bell.
  pet_peanut() {
    const g = new THREE.Group();
    const WHITE = '#f6f5f0', PINKY = '#ffb3cf';
    for (const [x, z] of [[-0.18, 0.32], [0.18, 0.32], [-0.18, -0.32], [0.18, -0.32]]) g.add(box(0.16, 0.4, 0.16, WHITE, x, 0.2, z));
    g.add(box(0.55, 0.45, 0.9, WHITE, 0, 0.6, 0));
    const head = new THREE.Group();
    head.position.set(0, 1.0, 0.5);
    head.add(box(0.56, 0.48, 0.48, WHITE, 0, 0, 0));
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.14, 0.26, 4), WHITE, s * 0.17, 0.34, 0);
      ear.rotation.y = Math.PI / 4;
      head.add(ear);
      const inner = mesh(new THREE.ConeGeometry(0.08, 0.16, 4), PINKY, s * 0.17, 0.31, 0.06);
      inner.rotation.y = Math.PI / 4;
      head.add(inner);
      head.add(box(0.11, 0.13, 0.03, '#5fcf6a', s * 0.13, 0.05, 0.25));
      head.add(box(0.03, 0.11, 0.02, '#1d1b26', s * 0.13, 0.05, 0.27));
      for (const tilt of [0.12, -0.08]) {
        const wh = box(0.3, 0.015, 0.015, '#9aa0ad', s * 0.3, -0.07 + tilt * 0.3, 0.22);
        wh.rotation.z = s * tilt;
        head.add(wh);
      }
    }
    head.add(box(0.08, 0.06, 0.03, '#ff8fb5', 0, -0.05, 0.26));
    g.add(head);
    g.add(box(0.5, 0.06, 0.46, '#ff5fa2', 0, 0.8, 0.5));
    g.add(mesh(new THREE.IcosahedronGeometry(0.07, 0), '#ffd23f', 0, 0.73, 0.75));
    const tail = new THREE.Group();
    tail.position.set(0, 0.75, -0.45);
    [[0, 0.05, -0.05], [0, 0.25, -0.15], [0, 0.47, -0.17], [0, 0.66, -0.1]].forEach(([x, y, z]) => tail.add(box(0.1, 0.24, 0.1, WHITE, x, y, z)));
    g.add(tail);
    g.userData.tail = tail;
    g.userData.wag = 3;
    g.scale.setScalar(0.5);
    return g;
  },
  pet_baby() {
    const p = buildPandaBody();
    p.group.scale.setScalar(0.42);
    return p.group;
  },
};

function buildShirt(color) {
  const g = new THREE.Group();
  if (color === 'rainbow') {
    const cols = ['#ff4d4d', '#ff9a1a', '#ffe14d', '#5fdc4a', '#3bb8ff', '#9b6bff'];
    cols.forEach((c, i) => g.add(box(1.07, 0.75 / cols.length + 0.005, 0.82, c, 0, 0.45 + (i + 0.5) * (0.75 / cols.length), 0)));
  } else {
    g.add(box(1.07, 0.75, 0.82, color, 0, 0.82, 0));
  }
  return g;
}

// ---------- panda ----------
function buildPandaBody() {
  const group = new THREE.Group();
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = box(0.4, 0.42, 0.44, BLACK, s * 0.26, 0.21, 0);
    legs.push(leg);
    group.add(leg);
  }
  const body = new THREE.Group();
  body.add(box(1.0, 0.95, 0.75, WHITE, 0, 0.88, 0));
  body.add(box(1.04, 0.3, 0.79, BLACK, 0, 1.22, 0)); // shoulder band
  group.add(body);

  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.62, 1.25, 0);
    pivot.add(box(0.3, 0.72, 0.36, BLACK, 0, -0.3, 0));
    arms.push(pivot);
    group.add(pivot);
  }

  const head = new THREE.Group();
  head.position.y = 1.35;
  head.add(box(1.4, 1.12, 1.12, WHITE, 0, 0.56, 0));
  for (const s of [-1, 1]) {
    head.add(box(0.4, 0.4, 0.22, BLACK, s * 0.56, 1.16, -0.05));
    const patch = box(0.36, 0.44, 0.06, BLACK, s * 0.3, 0.6, 0.57);
    patch.rotation.z = -s * 0.4;
    head.add(patch);
    head.add(box(0.15, 0.17, 0.04, '#ffffff', s * 0.29, 0.64, 0.61));
    head.add(box(0.08, 0.09, 0.03, BLACK, s * 0.27, 0.62, 0.635));
    head.add(box(0.2, 0.09, 0.03, PINK, s * 0.52, 0.34, 0.57));
  }
  head.add(box(0.24, 0.14, 0.1, BLACK, 0, 0.4, 0.6));
  head.add(box(0.2, 0.05, 0.03, '#5a2a3a', 0, 0.24, 0.57));
  group.add(head);

  const hatAnchor = new THREE.Group(); hatAnchor.position.y = 1.12; head.add(hatAnchor);
  const glassesAnchor = new THREE.Group(); glassesAnchor.position.set(0, 0.63, 0.64); head.add(glassesAnchor);
  const shirtAnchor = new THREE.Group(); group.add(shirtAnchor);
  const backAnchor = new THREE.Group(); backAnchor.position.set(0, 0.95, -0.38); group.add(backAnchor);

  return { group, head, body, arms, legs, anchors: { hat: hatAnchor, glasses: glassesAnchor, shirt: shirtAnchor, back: backAnchor } };
}

export function createPanda() {
  const p = buildPandaBody();
  const root = new THREE.Group();
  root.add(p.group);
  let pet = null;
  let flames = [];

  function setOutfit(equipped) {
    for (const slot of ['hat', 'glasses', 'shirt', 'back']) {
      const a = p.anchors[slot];
      while (a.children.length) a.remove(a.children[0]);
      const id = equipped[slot];
      if (!id) continue;
      const it = item(id);
      if (!it) continue;
      a.add(slot === 'shirt' ? buildShirt(it.color) : BUILD[id]());
    }
    if (pet) { root.parent && root.parent.remove(pet); pet = null; }
    if (equipped.pet && BUILD[equipped.pet]) {
      pet = BUILD[equipped.pet]();
      pet.userData.isPet = true;
      pet.position.copy(root.position).add(new THREE.Vector3(1.3, 0, 0.4));
      if (root.parent) root.parent.add(pet);
    }
    flames = [];
    p.anchors.back.traverse((o) => { if (o.userData.flame) flames.push(o); });
  }

  // Called each frame. `hopping` = mid-air.
  function update(t, dt, { hopping = false, happy = 0 } = {}) {
    const bob = hopping ? 0 : Math.abs(Math.sin(t * 3)) * 0.06;
    p.group.position.y = bob;
    const squash = hopping ? 1.08 : 1 + Math.sin(t * 6) * 0.015;
    p.group.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    p.head.rotation.z = Math.sin(t * 1.7) * 0.06;
    if (hopping) {
      p.arms[0].rotation.z = -2.6; p.arms[1].rotation.z = 2.6;
    } else if (happy > 0) {
      p.arms[0].rotation.z = -0.2; p.arms[1].rotation.z = 2.4 + Math.sin(t * 18) * 0.5;
    } else {
      const s = Math.sin(t * 3) * 0.08;
      p.arms[0].rotation.z = -0.1 - s; p.arms[1].rotation.z = 0.1 + s;
    }
    for (const f of flames) f.scale.y = 0.8 + Math.random() * 0.5;
    if (pet) {
      const target = root.position.clone().add(new THREE.Vector3(1.3, 0, 0.4));
      pet.position.lerp(target, Math.min(1, dt * 3));
      pet.position.y = root.position.y + Math.abs(Math.sin(t * 5)) * 0.25;
      pet.rotation.y = root.rotation.y;
      if (pet.userData.tail) pet.userData.tail.rotation.y = Math.sin(t * pet.userData.wag) * 0.5; // dog wags fast, cat swishes slow
    }
  }

  return { root, parts: p, setOutfit, update, get pet() { return pet; } };
}
