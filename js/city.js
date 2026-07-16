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
 * Procedural night city: streets, lit towers, waterfront, landmarks.
 */
export function buildCity(scene, { length = 420, seed = 42 } = {}) {
  const rnd = createRng(seed);
  const buildings = [];
  const collectibles = [];
  const group = new THREE.Group();
  group.name = "city";

  // Ground / asphalt
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(length + 80, 120),
    new THREE.MeshStandardMaterial({ color: 0x0a0e16, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(length * 0.45, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // River strip
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(length + 40, 28),
    new THREE.MeshStandardMaterial({
      color: 0x0b1a2a,
      roughness: 0.25,
      metalness: 0.6,
      emissive: 0x06101a,
      emissiveIntensity: 0.4,
    })
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(length * 0.45, 0.02, 42);
  group.add(river);

  let x = -10;
  while (x < length) {
    const lanes = rnd() > 0.7 ? 2 : 1;
    for (let lane = 0; lane < lanes; lane++) {
      const w = 8 + rnd() * 12;
      const d = 8 + rnd() * 10;
      const h = 16 + rnd() * 48 + (rnd() > 0.88 ? 30 : 0);
      const z = (lane === 0 ? -1 : 1) * (8 + rnd() * 14) + (rnd() - 0.5) * 4;
      const building = makeBuilding(w, d, h, rnd);
      building.position.set(x + w * 0.5, h * 0.5, z);
      group.add(building);

      const data = {
        mesh: building,
        minX: x,
        maxX: x + w,
        minZ: z - d * 0.5,
        maxZ: z + d * 0.5,
        roofY: h,
        cx: x + w * 0.5,
        cz: z,
      };
      buildings.push(data);

      // Collectible ring above some roofs
      if (rnd() > 0.55) {
        const ring = makeRing();
        ring.position.set(data.cx, h + 3.5 + rnd() * 4, z);
        group.add(ring);
        collectibles.push({ mesh: ring, taken: false, value: 100 });
      }
    }
    x += 10 + rnd() * 14;
  }

  // Distant silhouette
  let dx = 0;
  while (dx < length) {
    const w = 12 + rnd() * 18;
    const h = 40 + rnd() * 70;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.58, 0.15, 0.05 + rnd() * 0.04),
      transparent: true,
      opacity: 0.45,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    m.position.set(dx, h * 0.5, -55 - rnd() * 20);
    group.add(m);
    dx += w + 3 + rnd() * 8;
  }

  // Street lamps
  for (let i = 0; i < 28; i++) {
    const lx = 5 + i * (length / 28);
    const lamp = makeLamp();
    lamp.position.set(lx, 0, 18 + (i % 2) * 4);
    group.add(lamp);
  }

  scene.add(group);
  return { buildings, collectibles, group, length };
}

function makeBuilding(w, d, h, rnd) {
  const root = new THREE.Group();
  const hue = 0.55 + rnd() * 0.1;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.18, 0.1 + rnd() * 0.08),
    roughness: 0.82,
    metalness: 0.08,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  // Roof parapet
  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.7 })
  );
  ledge.position.y = h * 0.5 - 0.05;
  root.add(ledge);

  // Antenna on tall buildings
  if (h > 45 && rnd() > 0.5) {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 4 + rnd() * 5, 6),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.8, roughness: 0.3 })
    );
    ant.position.y = h * 0.5 + 2.5;
    root.add(ant);
    const blink = new THREE.PointLight(0xff3344, 1.2, 18);
    blink.position.y = h * 0.5 + 5;
    root.add(blink);
  }

  // Windows
  const rows = Math.floor(h / 3.1);
  const cols = Math.floor(w / 2.2);
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() > 0.62) continue;
      const lit = rnd() > 0.42;
      const warm = rnd() > 0.7;
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 1.2),
        new THREE.MeshStandardMaterial({
          color: lit ? (warm ? 0xffcc77 : 0xaaccff) : 0x0c121c,
          emissive: lit ? (warm ? 0xffaa44 : 0x4488ff) : 0x000000,
          emissiveIntensity: lit ? 0.65 : 0,
          roughness: 0.4,
        })
      );
      pane.position.set(-w / 2 + 1.2 + c * 2.2, -h / 2 + r * 3.1, d / 2 + 0.02);
      root.add(pane);
    }
  }

  return root;
}

function makeRing() {
  const tor = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.12, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.25,
    })
  );
  tor.rotation.x = Math.PI / 2;
  return tor;
}

function makeLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 5, 6),
    new THREE.MeshStandardMaterial({ color: 0x222833 })
  );
  pole.position.y = 2.5;
  g.add(pole);
  const light = new THREE.PointLight(0xffe0a0, 2.5, 22);
  light.position.y = 5.1;
  g.add(light);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffcc66, emissiveIntensity: 1 })
  );
  bulb.position.y = 5.1;
  g.add(bulb);
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

export function findWebAnchor(buildings, origin, aimDir, maxRange = 62) {
  let best = null;
  let bestScore = Infinity;
  const dir = aimDir.clone().normalize();

  for (const b of buildings) {
    const pts = [
      new THREE.Vector3(b.minX, b.roofY, b.cz),
      new THREE.Vector3(b.maxX, b.roofY, b.cz),
      new THREE.Vector3(b.cx, b.roofY, b.minZ),
      new THREE.Vector3(b.cx, b.roofY, b.maxZ),
      new THREE.Vector3(b.minX, b.roofY + 2, b.cz),
      new THREE.Vector3(b.maxX, b.roofY + 2, b.cz),
      new THREE.Vector3(b.cx, b.roofY + 3, b.cz),
    ];
    for (const p of pts) {
      const to = p.clone().sub(origin);
      const dist = to.length();
      if (dist < 9 || dist > maxRange) continue;
      const align = 1 - Math.max(0, to.normalize().dot(dir));
      const heightBonus = Math.max(0, (p.y - origin.y) * 0.15);
      const score = dist + align * 55 - heightBonus;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
  }
  return best;
}
