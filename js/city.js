import * as THREE from "three";

export function createRng(seed = 1337) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildCity(scene, { length = 560, seed = 104 } = {}) {
  const rnd = createRng(seed);
  const buildings = [];
  const collectibles = [];
  const neons = [];
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(length + 120, 150),
    new THREE.MeshStandardMaterial({ color: 0x070b13, roughness: 0.96, metalness: 0.1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(length * 0.45, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  for (let i = 0; i < 70; i++) {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x3e4654 })
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(6 + i * 8.5, 0.03, 16.5);
    group.add(mark);
  }

  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(length + 80, 36),
    new THREE.MeshStandardMaterial({
      color: 0x081624, roughness: 0.18, metalness: 0.8,
      emissive: 0x051018, emissiveIntensity: 0.55,
    })
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(length * 0.45, 0.02, 52);
  group.add(river);

  let x = -14;
  while (x < length - 80) {
    const lanes = rnd() > 0.62 ? 2 : 1;
    for (let lane = 0; lane < lanes; lane++) {
      const w = 7 + rnd() * 14;
      const d = 7 + rnd() * 12;
      const h = 14 + rnd() * 55 + (rnd() > 0.9 ? 40 : 0);
      const z = (lane === 0 ? -1 : 1) * (7 + rnd() * 16) + (rnd() - 0.5) * 3;
      const building = makeBuilding(w, d, h, rnd);
      building.position.set(x + w * 0.5, h * 0.5, z);
      group.add(building);

      const data = {
        mesh: building, minX: x, maxX: x + w,
        minZ: z - d * 0.5, maxZ: z + d * 0.5,
        roofY: h, cx: x + w * 0.5, cz: z, w, d, h,
      };
      buildings.push(data);

      if (rnd() > 0.55) {
        const neon = makeNeon(rnd);
        neon.mesh.position.set(0, -h * 0.12 + rnd() * h * 0.28, d * 0.5 + 0.08);
        building.add(neon.mesh);
        neons.push(neon);
      }

      if (h > 38 && rnd() > 0.5) {
        const board = makeBillboard(rnd);
        board.position.set(0, h * 0.5 + 2.2, 0);
        building.add(board);
      }

      if (rnd() > (h > 35 ? 0.3 : 0.55)) {
        const gold = rnd() > 0.82;
        const ring = makeRing(gold);
        ring.position.set(data.cx, h + 3.5 + rnd() * 6, z);
        group.add(ring);
        collectibles.push({ mesh: ring, taken: false, value: gold ? 400 : 120, gold });
      }
    }
    x += 8.5 + rnd() * 11;
  }

  // Landmark: bridge toward harbor end
  const bridge = makeBridge(length);
  group.add(bridge.group);
  buildings.push(...bridge.anchors);

  // Big finale tower
  const tower = makeFinaleTower();
  tower.mesh.position.set(length - 35, tower.h * 0.5, -6);
  group.add(tower.mesh);
  buildings.push({
    mesh: tower.mesh,
    minX: length - 45, maxX: length - 25,
    minZ: -14, maxZ: 2,
    roofY: tower.h, cx: length - 35, cz: -6, w: 20, d: 16, h: tower.h,
  });
  // Gold ring on tower top
  const finaleRing = makeRing(true);
  finaleRing.position.set(length - 35, tower.h + 5, -6);
  group.add(finaleRing);
  collectibles.push({ mesh: finaleRing, taken: false, value: 800, gold: true, finale: true });

  // Distant skyline
  let dx = 0;
  while (dx < length) {
    const w = 12 + rnd() * 22;
    const h = 48 + rnd() * 85;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, w),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.58, 0.14, 0.04 + rnd() * 0.03),
        transparent: true, opacity: 0.48,
      })
    );
    m.position.set(dx, h * 0.5, -65 - rnd() * 28);
    group.add(m);
    dx += w + 2 + rnd() * 6;
  }

  for (let i = 0; i < 40; i++) {
    const lamp = makeLamp();
    lamp.position.set(4 + i * (length / 40), 0, 17 + (i % 2) * 5);
    group.add(lamp);
  }

  const traffic = [];
  for (let i = 0; i < 14; i++) {
    const car = makeTaxi(rnd);
    car.position.set(rnd() * length, 0.6, 13 + rnd() * 7);
    group.add(car);
    traffic.push({ mesh: car, speed: 9 + rnd() * 16, dir: rnd() > 0.5 ? 1 : -1 });
  }

  // Helicopter
  const heli = makeHeli();
  heli.position.set(80, 55, -25);
  group.add(heli);
  const heliLight = new THREE.SpotLight(0xffffee, 40, 120, 0.35, 0.4, 1);
  heliLight.position.copy(heli.position);
  heliLight.target.position.set(80, 0, 0);
  group.add(heliLight);
  group.add(heliLight.target);

  scene.add(group);
  return {
    buildings, collectibles, neons, traffic, group, length,
    heli: { mesh: heli, light: heliLight, t: 0 },
  };
}

function makeBuilding(w, d, h, rnd) {
  const root = new THREE.Group();
  const hue = 0.54 + rnd() * 0.12;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.16, 0.08 + rnd() * 0.09),
    roughness: 0.78, metalness: 0.12,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.55, 0.45, d + 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.6, metalness: 0.25 })
  );
  ledge.position.y = h * 0.5 - 0.05;
  root.add(ledge);

  if (h > 50) {
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.14, d * 0.62), bodyMat);
    crown.position.y = h * 0.5 + h * 0.07;
    root.add(crown);
  }

  if (h > 40 && rnd() > 0.35) {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.11, 5 + rnd() * 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.85, roughness: 0.25 })
    );
    ant.position.y = h * 0.5 + 3.2;
    root.add(ant);
    const blink = new THREE.PointLight(0xff3344, 1.5, 22);
    blink.position.y = h * 0.5 + 6.5;
    root.add(blink);
  }

  const rows = Math.floor(h / 3.0);
  const cols = Math.floor(w / 2.1);
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() > 0.56) continue;
      const lit = rnd() > 0.36;
      const warm = rnd() > 0.62;
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.15),
        new THREE.MeshStandardMaterial({
          color: lit ? (warm ? 0xffcc77 : 0xaaccff) : 0x0a1018,
          emissive: lit ? (warm ? 0xffaa44 : 0x4488ff) : 0x000000,
          emissiveIntensity: lit ? 0.75 : 0,
          roughness: 0.35,
        })
      );
      pane.position.set(-w / 2 + 1.15 + c * 2.1, -h / 2 + r * 3.0, d / 2 + 0.02);
      root.add(pane);
    }
  }
  return root;
}

function makeBridge(length) {
  const g = new THREE.Group();
  const startX = length - 90;
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(55, 1.2, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a3344, metalness: 0.4, roughness: 0.5 })
  );
  deck.position.set(startX + 27, 18, 8);
  g.add(deck);

  for (const side of [-6, 6]) {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(3, 42, 3),
      new THREE.MeshStandardMaterial({ color: 0x3a4558, metalness: 0.5, roughness: 0.4 })
    );
    tower.position.set(startX + 12, 21, 8 + side);
    g.add(tower);
    const tower2 = tower.clone();
    tower2.position.x = startX + 42;
    g.add(tower2);
  }

  // Cable lines (simple)
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 28, 4),
      new THREE.MeshStandardMaterial({ color: 0xccd6e6, metalness: 0.8, roughness: 0.3 })
    );
    c.position.set(startX + 10 + i * 5, 28, 8);
    c.rotation.z = (i < 4 ? -1 : 1) * 0.45;
    g.add(c);
  }

  const anchors = [{
    mesh: deck, minX: startX, maxX: startX + 55,
    minZ: 1, maxZ: 15, roofY: 19, cx: startX + 27, cz: 8, w: 55, d: 14, h: 19,
  }];
  return { group: g, anchors };
}

function makeFinaleTower() {
  const h = 78;
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(18, h, 14),
    new THREE.MeshStandardMaterial({ color: 0x121a28, roughness: 0.7, metalness: 0.2 })
  );
  root.add(body);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(3, 12, 6),
    new THREE.MeshStandardMaterial({ color: 0xe11d2e, emissive: 0xaa1020, emissiveIntensity: 0.5 })
  );
  tip.position.y = h * 0.5 + 6;
  root.add(tip);
  const beacon = new THREE.PointLight(0xff3344, 8, 60);
  beacon.position.y = h * 0.5 + 12;
  root.add(beacon);
  return { mesh: root, h };
}

function makeNeon(rnd) {
  const colors = [0xff2d55, 0x00e5ff, 0xffcc00, 0x39ff14, 0xff6b00];
  const color = colors[Math.floor(rnd() * colors.length)];
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.6 + rnd() * 2.2, 0.75, 0.12),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, roughness: 0.3 })
  );
  const light = new THREE.PointLight(color, 2.2, 18);
  light.position.z = 0.45;
  mesh.add(light);
  return { mesh, light, base: 1.3, phase: rnd() * Math.PI * 2 };
}

function makeBillboard(rnd) {
  const g = new THREE.Group();
  const colors = [0xe11d2e, 0x1a6cff, 0xffaa00];
  const c = colors[Math.floor(rnd() * colors.length)];
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(5, 2.4, 0.22),
    new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 })
  );
  g.add(board);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 2.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x333844 })
  );
  post.position.y = -1.3;
  g.add(post);
  return g;
}

function makeRing(gold = false) {
  const color = gold ? 0xffd166 : 0x5eead4;
  const emissive = gold ? 0xffaa00 : 0x2dd4bf;
  const tor = new THREE.Mesh(
    new THREE.TorusGeometry(gold ? 1.4 : 1.15, gold ? 0.17 : 0.13, 12, 36),
    new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: 1.2, metalness: 0.5, roughness: 0.18,
    })
  );
  tor.rotation.x = Math.PI / 2;
  tor.userData.gold = gold;
  return tor;
}

function makeLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 5.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x222833 })
  );
  pole.position.y = 2.6;
  g.add(pole);
  const light = new THREE.PointLight(0xffe0a0, 2.8, 24);
  light.position.y = 5.3;
  g.add(light);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffcc66, emissiveIntensity: 1.1 })
  );
  bulb.position.y = 5.3;
  g.add(bulb);
  return g;
}

function makeTaxi(rnd) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.45, metalness: 0.2 })
  );
  body.position.y = 0.35;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.55, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x223044, roughness: 0.3 })
  );
  cabin.position.set(-0.15, 0.85, 0);
  g.add(cabin);
  const hl = new THREE.PointLight(0xffeeaa, 1.6, 11);
  hl.position.set(1.3, 0.4, 0);
  g.add(hl);
  g.rotation.y = rnd() > 0.5 ? 0 : Math.PI;
  return g;
}

function makeHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.8, 2.2, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a3344, metalness: 0.5, roughness: 0.4 })
  );
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.08, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x8899aa })
  );
  rotor.position.y = 1.1;
  rotor.name = "rotor";
  g.add(rotor);
  return g;
}

export function roofAt(buildings, x, z) {
  let y = 0;
  for (const b of buildings) {
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) y = Math.max(y, b.roofY);
  }
  return y;
}

export function findWebAnchor(buildings, origin, aimDir, maxRange = 72) {
  let best = null;
  let bestScore = Infinity;
  const dir = aimDir.clone().normalize();

  for (const b of buildings) {
    const pts = [
      new THREE.Vector3(b.minX, b.roofY, b.cz),
      new THREE.Vector3(b.maxX, b.roofY, b.cz),
      new THREE.Vector3(b.cx, b.roofY, b.minZ),
      new THREE.Vector3(b.cx, b.roofY, b.maxZ),
      new THREE.Vector3(b.minX, b.roofY + 2.5, b.cz),
      new THREE.Vector3(b.maxX, b.roofY + 2.5, b.cz),
      new THREE.Vector3(b.cx, b.roofY + 4, b.cz),
      new THREE.Vector3(b.maxX, b.roofY * 0.65, b.cz),
      new THREE.Vector3(b.minX, b.roofY * 0.65, b.cz),
    ];
    for (const p of pts) {
      const to = p.clone().sub(origin);
      const dist = to.length();
      if (dist < 7 || dist > maxRange || to.x < -6) continue;
      const align = 1 - Math.max(0, to.clone().normalize().dot(dir));
      const score = dist + align * 45 - Math.max(0, p.y - origin.y) * 0.22 - Math.max(0, to.x) * 0.1;
      if (score < bestScore) { bestScore = score; best = p; }
    }
  }
  return best;
}

export function nearMissBonus(buildings, pos, vel) {
  if (vel.length() < 14) return 0;
  let closest = Infinity;
  for (const b of buildings) {
    const dx = Math.max(b.minX - pos.x, 0, pos.x - b.maxX);
    const dz = Math.max(b.minZ - pos.z, 0, pos.z - b.maxZ);
    const dy = pos.y < b.roofY && pos.y > 0 ? 0 : Math.abs(pos.y - Math.min(b.roofY, Math.max(0, pos.y)));
    const dist = Math.hypot(dx, dy * 0.5, dz);
    if (dist < closest) closest = dist;
  }
  if (closest > 0.35 && closest < 2.0) return Math.floor(55 + vel.length() * 1.2);
  return 0;
}

/** Wall contact for wall-run: returns side normal x sign or 0 */
export function wallSide(buildings, pos, radius = 1.1) {
  for (const b of buildings) {
    if (pos.y < 1 || pos.y > b.roofY - 1) continue;
    // Near left or right face
    if (pos.z >= b.minZ - 0.5 && pos.z <= b.maxZ + 0.5) {
      if (Math.abs(pos.x - b.maxX) < radius && pos.x >= b.maxX - radius) return -1;
      if (Math.abs(pos.x - b.minX) < radius && pos.x <= b.minX + radius) return 1;
    }
  }
  return 0;
}
