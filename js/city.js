import * as THREE from "three";

/** Deterministic PRNG */
export function createRng(seed = 1337) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Procedural night city — denser blocks, neon signs, billboards, traffic.
 */
export function buildCity(scene, { length = 520, seed = 91 } = {}) {
  const rnd = createRng(seed);
  const buildings = [];
  const collectibles = [];
  const neons = [];
  const group = new THREE.Group();
  group.name = "city";

  // Asphalt
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(length + 100, 140),
    new THREE.MeshStandardMaterial({ color: 0x080c14, roughness: 0.96, metalness: 0.08 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(length * 0.45, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // Lane markings
  for (let i = 0; i < 60; i++) {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x3a4250 })
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(8 + i * 9, 0.03, 16);
    group.add(mark);
  }

  // River
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(length + 60, 32),
    new THREE.MeshStandardMaterial({
      color: 0x0a1828,
      roughness: 0.2,
      metalness: 0.75,
      emissive: 0x061420,
      emissiveIntensity: 0.5,
    })
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(length * 0.45, 0.02, 48);
  group.add(river);

  let x = -12;
  while (x < length) {
    const lanes = rnd() > 0.65 ? 2 : 1;
    for (let lane = 0; lane < lanes; lane++) {
      const w = 7 + rnd() * 14;
      const d = 7 + rnd() * 12;
      const h = 14 + rnd() * 52 + (rnd() > 0.9 ? 36 : 0);
      const z = (lane === 0 ? -1 : 1) * (7 + rnd() * 16) + (rnd() - 0.5) * 3;
      const building = makeBuilding(w, d, h, rnd);
      building.position.set(x + w * 0.5, h * 0.5, z);
      group.add(building);

      const data = {
        mesh: building,
        minX: x, maxX: x + w,
        minZ: z - d * 0.5, maxZ: z + d * 0.5,
        roofY: h, cx: x + w * 0.5, cz: z, w, d, h,
      };
      buildings.push(data);

      // Neon sign on street-facing facade
      if (rnd() > 0.62) {
        const neon = makeNeon(rnd);
        neon.mesh.position.set(0, -h * 0.15 + rnd() * h * 0.3, d * 0.5 + 0.08);
        building.add(neon.mesh);
        neons.push(neon);
      }

      // Billboard on tall roofs
      if (h > 40 && rnd() > 0.55) {
        const board = makeBillboard(rnd);
        board.position.set(0, h * 0.5 + 2.2, 0);
        building.add(board);
      }

      // Collectible rings — denser on taller roofs
      if (rnd() > (h > 35 ? 0.35 : 0.6)) {
        const ring = makeRing(rnd() > 0.85);
        const gold = ring.userData.gold;
        ring.position.set(data.cx, h + 3.2 + rnd() * 5, z);
        group.add(ring);
        collectibles.push({
          mesh: ring,
          taken: false,
          value: gold ? 350 : 100,
          gold,
        });
      }
    }
    x += 9 + rnd() * 12;
  }

  // Distant skyline
  let dx = 0;
  while (dx < length) {
    const w = 12 + rnd() * 20;
    const h = 45 + rnd() * 80;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, w),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.58, 0.14, 0.045 + rnd() * 0.035),
        transparent: true,
        opacity: 0.5,
      })
    );
    m.position.set(dx, h * 0.5, -60 - rnd() * 25);
    group.add(m);
    dx += w + 2 + rnd() * 7;
  }

  // Street lamps
  for (let i = 0; i < 36; i++) {
    const lx = 4 + i * (length / 36);
    const lamp = makeLamp();
    lamp.position.set(lx, 0, 17 + (i % 2) * 5);
    group.add(lamp);
  }

  // Moving taxi lights (simple)
  const traffic = [];
  for (let i = 0; i < 10; i++) {
    const car = makeTaxi(rnd);
    car.position.set(rnd() * length, 0.6, 14 + rnd() * 6);
    group.add(car);
    traffic.push({ mesh: car, speed: 8 + rnd() * 14, dir: rnd() > 0.5 ? 1 : -1 });
  }

  scene.add(group);
  return { buildings, collectibles, neons, traffic, group, length };
}

function makeBuilding(w, d, h, rnd) {
  const root = new THREE.Group();
  const hue = 0.54 + rnd() * 0.12;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.16, 0.09 + rnd() * 0.09),
    roughness: 0.8,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  // Ledge
  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.55, 0.45, d + 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.65, metalness: 0.2 })
  );
  ledge.position.y = h * 0.5 - 0.05;
  root.add(ledge);

  // Setback crown on tall towers
  if (h > 48) {
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.65, h * 0.12, d * 0.65),
      bodyMat
    );
    crown.position.y = h * 0.5 + h * 0.06;
    root.add(crown);
  }

  if (h > 42 && rnd() > 0.4) {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.11, 5 + rnd() * 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.85, roughness: 0.25 })
    );
    ant.position.y = h * 0.5 + 3;
    root.add(ant);
    const blink = new THREE.PointLight(0xff3344, 1.4, 20);
    blink.position.y = h * 0.5 + 6;
    root.add(blink);
  }

  // Windows — batched as fewer meshes via grid of planes
  const rows = Math.floor(h / 3.0);
  const cols = Math.floor(w / 2.1);
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() > 0.58) continue;
      const lit = rnd() > 0.38;
      const warm = rnd() > 0.65;
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.15),
        new THREE.MeshStandardMaterial({
          color: lit ? (warm ? 0xffcc77 : 0xaaccff) : 0x0a1018,
          emissive: lit ? (warm ? 0xffaa44 : 0x4488ff) : 0x000000,
          emissiveIntensity: lit ? 0.7 : 0,
          roughness: 0.35,
        })
      );
      pane.position.set(-w / 2 + 1.15 + c * 2.1, -h / 2 + r * 3.0, d / 2 + 0.02);
      root.add(pane);
    }
  }

  return root;
}

function makeNeon(rnd) {
  const colors = [0xff2d55, 0x00e5ff, 0xffcc00, 0x39ff14, 0xff6b00];
  const color = colors[Math.floor(rnd() * colors.length)];
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.4 + rnd() * 2, 0.7, 0.12),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    })
  );
  const light = new THREE.PointLight(color, 1.8, 16);
  light.position.z = 0.4;
  mesh.add(light);
  return { mesh, light, base: 1.2, phase: rnd() * Math.PI * 2 };
}

function makeBillboard(rnd) {
  const g = new THREE.Group();
  const colors = [0xe11d2e, 0x1a6cff, 0xffaa00];
  const c = colors[Math.floor(rnd() * colors.length)];
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2.2, 0.2),
    new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55 })
  );
  g.add(board);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 2.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x333844 })
  );
  post.position.y = -1.2;
  g.add(post);
  return g;
}

function makeRing(gold = false) {
  const color = gold ? 0xffd166 : 0x5eead4;
  const emissive = gold ? 0xffaa00 : 0x2dd4bf;
  const tor = new THREE.Mesh(
    new THREE.TorusGeometry(gold ? 1.35 : 1.1, gold ? 0.16 : 0.12, 12, 32),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 1.1,
      metalness: 0.45,
      roughness: 0.2,
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
  const hl = new THREE.PointLight(0xffeeaa, 1.5, 10);
  hl.position.set(1.3, 0.4, 0);
  g.add(hl);
  g.rotation.y = rnd() > 0.5 ? 0 : Math.PI;
  return g;
}

export function roofAt(buildings, x, z) {
  let y = 0;
  for (const b of buildings) {
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      y = Math.max(y, b.roofY);
    }
  }
  return y;
}

export function findWebAnchor(buildings, origin, aimDir, maxRange = 68) {
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
      new THREE.Vector3(b.maxX, b.roofY * 0.7, b.cz),
      new THREE.Vector3(b.minX, b.roofY * 0.7, b.cz),
    ];
    for (const p of pts) {
      const to = p.clone().sub(origin);
      const dist = to.length();
      if (dist < 8 || dist > maxRange) continue;
      // Prefer forward and upward
      if (to.x < -5) continue;
      const align = 1 - Math.max(0, to.clone().normalize().dot(dir));
      const heightBonus = Math.max(0, (p.y - origin.y) * 0.2);
      const forwardBonus = Math.max(0, to.x) * 0.08;
      const score = dist + align * 48 - heightBonus - forwardBonus;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
  }
  return best;
}

export function nearMissBonus(buildings, pos, vel) {
  // Bonus when skimming close to a building facade at speed
  if (vel.length() < 12) return 0;
  let closest = Infinity;
  for (const b of buildings) {
    const dx = Math.max(b.minX - pos.x, 0, pos.x - b.maxX);
    const dz = Math.max(b.minZ - pos.z, 0, pos.z - b.maxZ);
    const dy = pos.y < b.roofY ? 0 : pos.y - b.roofY;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < closest) closest = dist;
  }
  if (closest > 0.4 && closest < 2.2) return Math.floor(40 + vel.length());
  return 0;
}
