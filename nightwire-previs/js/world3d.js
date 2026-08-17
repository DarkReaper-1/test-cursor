import * as THREE from "three";

/**
 * Lightweight 3D previs stages for the concept trailer.
 * Stylized neo-noir blocks — announcement quality, not final art.
 */

const NEON = 0xff2a6d;
const CYAN = 0x05d9e8;
const AMBER = 0xd4a017;

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.15,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createPrevisWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  scene.fog = new THREE.FogExp2(0x080b14, 0.035);

  const stages = {};

  // Shared lights
  scene.add(new THREE.HemisphereLight(0x6a7a9a, 0x1a1018, 0.45));
  const moon = new THREE.DirectionalLight(0xa0b8d8, 0.35);
  moon.position.set(-20, 40, 10);
  scene.add(moon);

  // --- CITY AERIAL ---
  {
    const g = new THREE.Group();
    g.name = "city-aerial";
    // Wet ground plane
    const ground = box(80, 0.2, 80, 0x12161e, 0, 0, 0, { roughness: 0.25, metalness: 0.6 });
    g.add(ground);
    for (let i = 0; i < 40; i++) {
      const h = 3 + Math.random() * 14;
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const b = box(2 + Math.random() * 3, h, 2 + Math.random() * 3, 0x1a1e28, x, h / 2, z);
      g.add(b);
      if (Math.random() > 0.55) {
        const neon = box(2.2, 0.25, 0.15, NEON, x, h * 0.6, z + 1.2, {
          emissive: NEON, emissiveIntensity: 1.2, roughness: 0.3,
        });
        g.add(neon);
        const light = new THREE.PointLight(NEON, 1.2, 8);
        light.position.set(x, h * 0.6, z + 1.5);
        g.add(light);
      }
      if (Math.random() > 0.7) {
        const cyan = box(1.8, 0.2, 0.12, CYAN, x, h * 0.4, z - 1.1, {
          emissive: CYAN, emissiveIntensity: 1, roughness: 0.3,
        });
        g.add(cyan);
      }
    }
    // Street neon strips
    for (let i = -3; i <= 3; i++) {
      g.add(box(0.15, 0.05, 40, CYAN, i * 8, 0.15, 0, { emissive: CYAN, emissiveIntensity: 0.8 }));
    }
    g.visible = false;
    scene.add(g);
    stages["city-aerial"] = g;
    stages["city-cycle"] = g;
    stages["neon-street"] = g;
  }

  // --- ALLEY ---
  {
    const g = new THREE.Group();
    g.add(box(20, 0.2, 40, 0x10141a, 0, 0, 0, { roughness: 0.3, metalness: 0.5 }));
    g.add(box(1.5, 8, 40, 0x181c24, -4, 4, 0));
    g.add(box(1.5, 8, 40, 0x181c24, 4, 4, 0));
    g.add(box(0.8, 0.3, 0.1, NEON, -3.2, 3.2, -2, { emissive: NEON, emissiveIntensity: 1.4 }));
    g.add(box(0.6, 0.25, 0.1, AMBER, 3.2, 2.8, 4, { emissive: AMBER, emissiveIntensity: 1 }));
    const pl = new THREE.PointLight(NEON, 2, 12);
    pl.position.set(-3, 3, -2);
    g.add(pl);
    // Dumpsters / barrels
    g.add(box(1.2, 1.1, 0.9, 0x2a3038, -2.2, 0.55, 3));
    g.add(box(0.7, 1.0, 0.7, 0x3a2818, 2, 0.5, -1));
    // Detective silhouette block
    const det = box(0.5, 1.7, 0.35, 0x1a1520, 0, 0.85, 2);
    det.name = "detective";
    g.add(det);
    g.visible = false;
    scene.add(g);
    stages.alley = g;
  }

  // --- MOTEL ROOM ---
  {
    const g = new THREE.Group();
    g.add(box(10, 0.2, 8, 0x1a1410, 0, 0, 0, { roughness: 0.85 }));
    g.add(box(10, 3.5, 0.25, 0x2a2220, 0, 1.75, -4));
    g.add(box(0.25, 3.5, 8, 0x2a2220, -5, 1.75, 0));
    g.add(box(0.25, 3.5, 8, 0x2a2220, 5, 1.75, 0));
    // Bed
    g.add(box(2.4, 0.5, 3.2, 0x3a2a28, -1.5, 0.35, -1));
    // Window glow
    const win = box(2.2, 1.6, 0.08, CYAN, 0, 2.2, -3.9, {
      emissive: CYAN, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3,
    });
    win.material.transparent = true;
    win.material.opacity = 0.55;
    g.add(win);
    const neonOut = new THREE.PointLight(NEON, 1.5, 10);
    neonOut.position.set(0, 2.2, -5);
    g.add(neonOut);
    // Evidence markers
    const m1 = box(0.15, 0.02, 0.15, 0xffee44, 1.2, 0.12, 0.5, { emissive: 0xffee44, emissiveIntensity: 0.8 });
    const m2 = box(0.15, 0.02, 0.15, 0xffee44, -0.5, 0.12, -2.2, { emissive: 0xffee44, emissiveIntensity: 0.8 });
    const m3 = box(0.15, 0.02, 0.15, 0xffee44, 2.5, 0.85, -3.5, { emissive: 0xffee44, emissiveIntensity: 0.8 });
    m1.name = "clue"; m2.name = "clue"; m3.name = "clue";
    g.add(m1, m2, m3);
    // Blood-ish stain (dark, not gorey)
    g.add(box(0.6, 0.01, 0.35, 0x4a1018, 1.0, 0.11, 0.4));
    const lamp = new THREE.PointLight(0xffcc88, 1.2, 8);
    lamp.position.set(-2, 2.2, 1);
    g.add(lamp);
    g.visible = false;
    scene.add(g);
    stages.motel = g;
    stages["motel-vision"] = g;
  }

  // --- INTERROGATION ---
  {
    const g = new THREE.Group();
    g.add(box(8, 0.2, 6, 0x141820, 0, 0, 0));
    g.add(box(8, 3, 0.2, 0x1a2030, 0, 1.5, -3));
    g.add(box(2.2, 0.08, 1.2, 0x2a3038, 0, 0.9, 0));
    g.add(box(0.45, 1.1, 0.45, 0x222830, -1.2, 0.55, 0.8));
    g.add(box(0.45, 1.1, 0.45, 0x222830, 1.2, 0.55, -0.6));
    // Figures
    g.add(box(0.5, 1.5, 0.35, 0x1a1520, -1.2, 1.65, 0.8));
    g.add(box(0.5, 1.5, 0.35, 0x2a2030, 1.2, 1.65, -0.6));
    const fl = new THREE.SpotLight(0xffeecc, 3, 12, Math.PI / 5, 0.4);
    fl.position.set(0, 3.2, 1);
    fl.target.position.set(0, 0.9, 0);
    g.add(fl, fl.target);
    g.visible = false;
    scene.add(g);
    stages.interrogation = g;
  }

  // --- DRIVE / CHASE ---
  {
    const g = new THREE.Group();
    g.add(box(12, 0.2, 60, 0x10141a, 0, 0, 0, { roughness: 0.2, metalness: 0.7 }));
    for (let i = 0; i < 12; i++) {
      const z = -25 + i * 5;
      g.add(box(2, 6 + (i % 3), 2, 0x1a1e28, -5, 3, z));
      g.add(box(2, 5 + (i % 4), 2, 0x1a1e28, 5, 2.5, z));
      if (i % 2 === 0) {
        g.add(box(1.5, 0.2, 0.1, NEON, -3.8, 3, z, { emissive: NEON, emissiveIntensity: 1 }));
      }
    }
    // Car
    const car = box(1.8, 0.7, 3.6, 0x1a222c, 0, 0.55, 4, { metalness: 0.7, roughness: 0.35 });
    car.name = "car";
    g.add(car);
    g.add(box(1.6, 0.45, 1.4, 0x88aacc, 0, 1.0, 3.6, { metalness: 0.4, roughness: 0.15 }));
    const hl = new THREE.SpotLight(0xffeecc, 2.5, 20, Math.PI / 7, 0.5);
    hl.position.set(0, 0.6, 2);
    hl.target.position.set(0, 0, -10);
    g.add(hl, hl.target);
    g.visible = false;
    scene.add(g);
    stages.drive = g;
    stages.chase = g;
  }

  // --- ROOFTOP ---
  {
    const g = new THREE.Group();
    g.add(box(16, 0.3, 16, 0x161a22, 0, 8, 0));
    g.add(box(1, 2, 1, 0x222830, -6, 9, -5));
    g.add(box(0.5, 1.6, 0.35, 0x1a1520, 0, 8.9, 2));
    const city = box(40, 12, 0.5, 0x0e1218, 0, 6, -20);
    g.add(city);
    for (let i = 0; i < 8; i++) {
      g.add(box(0.8, 0.15, 0.1, i % 2 ? NEON : CYAN, -10 + i * 2.5, 4 + Math.random() * 4, -19.7, {
        emissive: i % 2 ? NEON : CYAN, emissiveIntensity: 1,
      }));
    }
    const pl = new THREE.PointLight(CYAN, 1.5, 15);
    pl.position.set(2, 10, 0);
    g.add(pl);
    g.visible = false;
    scene.add(g);
    stages.rooftop = g;
  }

  // --- LOCKPICK MACRO ---
  {
    const g = new THREE.Group();
    g.add(box(4, 4, 0.3, 0x2a3038, 0, 1.5, -1));
    g.add(box(0.8, 1.4, 0.4, 0x3a4048, 0, 1.5, -0.7, { metalness: 0.8, roughness: 0.3 }));
    g.add(box(0.08, 0.08, 1.2, 0xc0c8d0, 0.15, 1.5, 0, { metalness: 0.9, roughness: 0.2 }));
    const spot = new THREE.SpotLight(0xffeecc, 4, 8, Math.PI / 6, 0.3);
    spot.position.set(1, 3, 2);
    spot.target.position.set(0, 1.5, -0.7);
    g.add(spot, spot.target);
    g.visible = false;
    scene.add(g);
    stages.lockpick = g;
  }

  // --- BAR ---
  {
    const g = new THREE.Group();
    g.add(box(12, 0.2, 8, 0x1a1210, 0, 0, 0));
    g.add(box(8, 1.1, 1.2, 0x2a1e18, 0, 0.55, -2));
    g.add(box(0.15, 0.5, 0.15, AMBER, -2, 1.3, -2, { emissive: AMBER, emissiveIntensity: 0.8 }));
    g.add(box(0.15, 0.5, 0.15, AMBER, 2, 1.3, -2, { emissive: AMBER, emissiveIntensity: 0.8 }));
    g.add(box(0.5, 1.5, 0.35, 0x1a1520, -1.5, 0.85, 0.5));
    g.add(box(0.5, 1.5, 0.35, 0x2a2030, 1, 0.85, 0.2));
    const pl = new THREE.PointLight(AMBER, 1.8, 10);
    pl.position.set(0, 2.5, -1);
    g.add(pl);
    g.visible = false;
    scene.add(g);
    stages.bar = g;
  }

  // --- BOARD / LOGO / UI empty stages ---
  {
    const g = new THREE.Group();
    g.add(box(10, 0.2, 8, 0x0c1016, 0, 0, 0));
    const board = box(6, 3.5, 0.15, 0x1a1e24, 0, 2.2, -2);
    g.add(board);
    // Pins
    [[-2, 2.8], [-0.5, 3.2], [1.5, 2.6], [0.2, 1.8], [-1.2, 1.5]].forEach(([x, y], i) => {
      g.add(box(0.5, 0.65, 0.02, i % 2 ? 0xd4c4a0 : 0xc0d0e0, x, y, -1.9));
      g.add(box(0.08, 0.08, 0.08, NEON, x, y + 0.3, -1.85, { emissive: NEON, emissiveIntensity: 1 }));
    });
    const pl = new THREE.PointLight(0xffeecc, 1.5, 12);
    pl.position.set(0, 3, 2);
    g.add(pl);
    g.visible = false;
    scene.add(g);
    stages.board = g;
  }

  {
    const g = new THREE.Group();
    g.visible = false;
    scene.add(g);
    stages.logo = g;
    stages.end = g;
    stages.black = g;
    stages["ui-focus"] = g;
  }

  // Rain particles
  const rainCount = 1200;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 50;
    rainPos[i * 3 + 1] = Math.random() * 30;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({ color: 0x88aacc, size: 0.05, transparent: true, opacity: 0.45 })
  );
  scene.add(rain);

  return { scene, stages, rain };
}

export function showStage(stages, id) {
  Object.values(stages).forEach((g) => { g.visible = false; });
  // city-cycle / neon-street share city-aerial group — already aliased
  const stage = stages[id];
  if (stage) stage.visible = true;
}

export function updateRain(rain, dt, cam) {
  if (!rain) return;
  const pos = rain.geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] -= (10 + (i % 5)) * dt;
    pos[i] -= 2 * dt;
    if (pos[i + 1] < 0) {
      pos[i + 1] = 20 + Math.random() * 8;
      pos[i] = cam.position.x + (Math.random() - 0.5) * 40;
      pos[i + 2] = cam.position.z + (Math.random() - 0.5) * 40;
    }
  }
  rain.geometry.attributes.position.needsUpdate = true;
}

/** Camera choreography keyed by shot type */
export function applyCameraShot(camera, shot, t, beatProgress) {
  const p = beatProgress; // 0..1
  switch (shot) {
    case "crane-down":
      camera.position.set(8 - p * 4, 18 - p * 10, 14 - p * 4);
      camera.lookAt(0, 1, 0);
      break;
    case "follow":
      camera.position.set(Math.sin(p * 0.5) * 1.5, 1.6, 6 - p * 3);
      camera.lookAt(0, 1.2, 2 - p);
      break;
    case "dolly-in":
      camera.position.set(0.5, 1.5, 5 - p * 2.5);
      camera.lookAt(0, 1.2, -1);
      break;
    case "orbit-slow":
      camera.position.set(Math.cos(p * Math.PI) * 4, 1.8, Math.sin(p * Math.PI) * 4 + 1);
      camera.lookAt(0, 1.2, -1);
      break;
    case "pov":
      camera.position.set(0.2, 1.55, 2.5);
      camera.lookAt(1.2, 0.3, 0.5);
      break;
    case "board-push":
      camera.position.set(0, 2.0, 4 - p * 1.5);
      camera.lookAt(0, 2.2, -2);
      break;
    case "two-shot":
      camera.position.set(0, 1.6, 3.5);
      camera.lookAt(0, 1.4, 0);
      break;
    case "hood-chase":
      camera.position.set(0.3, 1.2, 7 - p * 8);
      camera.lookAt(0, 0.8, -5);
      break;
    case "telephoto":
      camera.position.set(1, 9.5, 6);
      camera.lookAt(-2, 5, -15);
      camera.fov = 28 + p * 8;
      camera.updateProjectionMatrix();
      break;
    case "macro":
      camera.position.set(0.8, 1.7, 1.5 - p * 0.4);
      camera.lookAt(0, 1.5, -0.7);
      break;
    case "timelapse":
      camera.position.set(12 * Math.cos(p * Math.PI * 2), 10 + Math.sin(p * 4) * 2, 12 * Math.sin(p * Math.PI * 2));
      camera.lookAt(0, 2, 0);
      break;
    case "handheld":
      camera.position.set(
        Math.sin(t * 8) * 0.15,
        1.3 + Math.sin(t * 11) * 0.08,
        6 - p * 10 + Math.sin(t * 6) * 0.1
      );
      camera.lookAt(0, 0.8, -2);
      break;
    case "portrait":
      camera.position.set(-0.5, 1.5, 2.8);
      camera.lookAt(-1.2, 1.4, 0.5);
      break;
    case "low-angle":
      camera.position.set(2, 0.6, 8 - p * 2);
      camera.lookAt(0, 4, 0);
      break;
    default:
      camera.position.set(0, 2, 6);
      camera.lookAt(0, 1, 0);
  }
}
