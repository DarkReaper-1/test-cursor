import * as THREE from "three";
import { INTERACTABLES, PICKUPS, STUDY_LOCK } from "./data.js";
import {
  woodTexture, wallpaperTexture, carpetTexture, stoneTexture, metalTexture,
} from "./textures.js";

const ACCENT = 0xc9a14a;

const TEX = {
  wood: woodTexture(),
  wall: wallpaperTexture(),
  carpet: carpetTexture(),
  stone: stoneTexture(),
  metal: metalTexture(),
};

function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function boxMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
}

function box(w, h, d, color, x, y, z, matOpts = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), boxMat(color, matOpts), x, y, z);
}

function texturedBox(w, h, d, tex, color, x, y, z, repeat = 2) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  const mat = boxMat(color);
  mat.map = t;
  return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
}

function roomFloor(x0, z0, x1, z1, y, tex, color, repeat = 3) {
  const w = x1 - x0;
  const d = z1 - z0;
  return texturedBox(w, 0.2, d, tex, color, (x0 + x1) / 2, y, (z0 + z1) / 2, repeat);
}

function wallSeg(x0, z0, x1, z1, h = 4) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const m = texturedBox(len, h, 0.35, TEX.wall, 0x2a3340, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, len / 2);
  m.rotation.y = Math.atan2(dz, dx);
  return m;
}

export function buildWorld(scene) {
  const colliders = [];
  const interactables = [];
  const lights = [];
  const pickups = [];
  const fx = [];

  scene.background = new THREE.Color(0x0a1018);
  scene.fog = new THREE.FogExp2(0x0c1420, 0.016);

  scene.add(new THREE.HemisphereLight(0x9aabb8, 0x2a2018, 0.75));
  scene.add(new THREE.AmbientLight(0x3a4555, 0.4));

  const moon = new THREE.DirectionalLight(0xc0d0e8, 0.65);
  moon.position.set(-20, 30, 10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  scene.add(moon);

  // Floors
  [
    [-6, -4, 6, 6, TEX.stone, 0x222830, 2],
    [-18, -4, -6, 8, TEX.carpet, 0x1a1410, 2],
    [6, -4, 18, 6, TEX.wood, 0x2a2218, 2.5],
    [-10, 6, 2, 18, TEX.stone, 0x1e1a16, 2],
    [2, 6, 16, 18, TEX.carpet, 0x1a1420, 2.5],
    [-4, 18, 12, 30, TEX.stone, 0x121810, 2],
  ].forEach(([x0, z0, x1, z1, tex, color, rep]) => {
    scene.add(roomFloor(x0, z0, x1, z1, 0, tex, color, rep));
  });

  const wallSpecs = [
    [-6, -4, 6, -4],
    [6, -4, 6, 1], [6, 3, 6, 6],
    [-6, -4, -6, 1], [-6, 3, -6, 6],
    [-6, 6, -2, 6], [2, 6, 6, 6],
    [-18, -4, -6, -4], [-18, -4, -18, 8], [-18, 8, -6, 8], [-6, 6, -6, 8],
    [6, -4, 18, -4], [18, -4, 18, 6], [6, 6, 18, 6],
    [-10, 6, -10, 18], [-10, 18, -1, 18], [1, 18, 2, 18],
    [-10, 6, -6, 6],
    [2, 6, 2, 10], [2, 14, 2, 18],
    [16, 6, 16, 18], [2, 18, 5, 18], [7, 18, 16, 18],
  ];
  wallSpecs.forEach(([x0, z0, x1, z1]) => {
    const w = wallSeg(x0, z0, x1, z1, 4);
    scene.add(w);
    colliders.push(w);
  });

  // Door frames
  const doors = [
    [-6, 2, Math.PI / 2], [6, 2, Math.PI / 2], [0, 6, 0], [2, 12, Math.PI / 2], [6, 18, 0],
  ];
  doors.forEach(([x, z, rot]) => {
    const frame = new THREE.Group();
    const postL = texturedBox(0.2, 2.4, 0.2, TEX.wood, 0x3a2e22, -1.1, 1.2, 0, 1);
    const postR = texturedBox(0.2, 2.4, 0.2, TEX.wood, 0x3a2e22, 1.1, 1.2, 0, 1);
    const lintel = texturedBox(2.4, 0.2, 0.2, TEX.wood, 0x3a2e22, 0, 2.5, 0, 1);
    frame.add(postL, postR, lintel);
    frame.position.set(x, 0, z);
    frame.rotation.y = rot;
    scene.add(frame);
  });

  // Garden hedges
  [[-4, 18, -4, 30], [12, 18, 12, 30], [-4, 30, 12, 30]].forEach(([x0, z0, x1, z1]) => {
    const h = wallSeg(x0, z0, x1, z1, 1.4);
    h.material.color.setHex(0x1a3020);
    if (h.material.map) h.material.map = null;
    scene.add(h);
    colliders.push(h);
  });

  // Ceilings
  [
    [-6, -4, 6, 6], [-18, -4, -6, 8], [6, -4, 18, 6], [-10, 6, 2, 18], [2, 6, 16, 18],
  ].forEach(([x0, z0, x1, z1]) => {
    const c = roomFloor(x0, z0, x1, z1, 4.1, TEX.wood, 0x121418, 2);
    c.castShadow = false;
    scene.add(c);
  });

  // Windows with emissive glow (storm light)
  const windows = [
    [-17.8, 2.2, 1, 0], [17.8, 2.2, 1, Math.PI], [-4, 2.2, -3.8, Math.PI / 2],
    [8, 2.2, 17.8, 0], [-8, 2.2, 17.8, 0],
  ];
  windows.forEach(([x, y, z, rot]) => {
    const pane = mesh(
      new THREE.PlaneGeometry(1.6, 1.8),
      new THREE.MeshStandardMaterial({
        color: 0x88aacc, emissive: 0x335566, emissiveIntensity: 0.35,
        transparent: true, opacity: 0.45, roughness: 0.15, metalness: 0.2,
      }),
      x, y, z
    );
    pane.rotation.y = rot;
    scene.add(pane);
    const frame = texturedBox(1.8, 2.0, 0.12, TEX.wood, 0x2a2218, x, y, z, 1);
    frame.rotation.y = rot;
    scene.add(frame);
  });

  // Furniture
  const props = [
    texturedBox(0.55, 3.5, 0.55, TEX.wood, 0x3a3028, -4, 1.75, -2, 1),
    texturedBox(0.55, 3.5, 0.55, TEX.wood, 0x3a3028, 4, 1.75, -2, 1),
    // Library
    texturedBox(0.7, 3.2, 6.5, TEX.wood, 0x3a2e22, -16.5, 1.6, 2, 2),
    texturedBox(0.7, 3.2, 5, TEX.wood, 0x3a2e22, -10, 1.6, -1.5, 2),
    texturedBox(1.5, 1.15, 1.5, TEX.wood, 0x3a2a1a, -12, 0.55, 2, 1),
    texturedBox(0.7, 0.85, 0.7, TEX.wood, ACCENT, -10.5, 0.9, -1, 1),
    // Study
    texturedBox(2.6, 1.05, 1.3, TEX.wood, 0x3a2e22, 12, 0.52, 0, 1.5),
    texturedBox(0.85, 1.25, 0.65, TEX.metal, 0x222830, 15, 0.62, 2, 1),
    texturedBox(1.7, 2.3, 0.12, TEX.wood, 0x4a3828, 10, 2, -3.5, 1),
    // Kitchen
    texturedBox(6.2, 1.05, 1.3, TEX.wood, 0x2a2420, -5, 0.52, 8.5, 2),
    texturedBox(1.3, 2.3, 3.2, TEX.wood, 0x2a2420, -8.5, 1.15, 14, 1.5),
    box(0.45, 0.55, 0.45, 0x6a5040, -6, 1.35, 12, { emissive: 0x221800, emissiveIntensity: 0.2 }),
    // Ballroom
    texturedBox(2.4, 1.15, 1.3, TEX.wood, 0x1a1218, 5, 0.55, 10, 1),
    texturedBox(1.6, 1.05, 1.6, TEX.wood, 0x3a3028, 12, 0.5, 10, 1),
    // Chandelier base
    box(0.3, 0.4, 0.3, ACCENT, 8, 3.7, 12, { emissive: ACCENT, emissiveIntensity: 0.5 }),
    // Garden
    texturedBox(2.2, 0.5, 0.75, TEX.wood, 0x3a2e22, 2, 0.25, 24, 1),
    box(3.2, 0.45, 1.6, 0x1a3020, 6, 0.22, 26),
  ];
  props.forEach((p) => { scene.add(p); colliders.push(p); });

  // Book accents on shelves
  for (let i = 0; i < 12; i++) {
    const b = box(0.15, 0.35 + Math.random() * 0.2, 0.25, [0x6a2030, 0x204060, 0x3a5020, ACCENT][i % 4],
      -16.2, 1.2 + (i % 4) * 0.55, -0.5 + Math.floor(i / 4) * 1.2);
    scene.add(b);
  }

  // Lights
  [
    [0, 3.2, 0, 0xffd8a0, 7],
    [-12, 3.2, 2, 0xffcc88, 8],
    [12, 3.2, 0, 0xffd0a0, 7],
    [-4, 3.2, 12, 0xffaa66, 7],
    [8, 3.5, 12, 0xffe0b0, 10],
    [4, 2.5, 24, 0x88aacc, 6],
  ].forEach(([x, y, z, color, dist]) => {
    const l = new THREE.PointLight(color, 2.6, dist + 3, 1.3);
    l.position.set(x, y, z);
    scene.add(l);
    lights.push(l);
    scene.add(box(0.18, 0.18, 0.18, color, x, y, z, { emissive: color, emissiveIntensity: 1.4, roughness: 0.2 }));
  });

  const flashlight = new THREE.SpotLight(0xffe6c0, 2.8, 20, Math.PI / 5.2, 0.4, 1);
  flashlight.position.set(0.15, -0.05, 0);
  flashlight.target.position.set(0.15, -0.05, -1);
  lights.push(flashlight);

  // Evidence props (readable silhouette + beacon)
  INTERACTABLES.forEach((item) => {
    const group = new THREE.Group();
    const accent = new THREE.MeshStandardMaterial({
      color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.35,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x2a2218, emissive: ACCENT, emissiveIntensity: 0.2, roughness: 0.7,
    });
    let prop;
    switch (item.clue) {
      case "body":
        prop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 1.05), dark);
        prop.position.y = 0.08;
        break;
      case "letter":
      case "will":
      case "ledger":
        prop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.48), accent);
        prop.rotation.x = -0.55;
        prop.position.y = 0.18;
        break;
      case "safe":
        prop = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.32), dark);
        prop.position.y = 0.24;
        break;
      case "extract":
        prop = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.36, 10), accent);
        prop.position.y = 0.2;
        break;
      case "prints":
        prop = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), accent);
        prop.rotation.x = -Math.PI / 2;
        prop.position.y = 0.04;
        break;
      case "champagne":
        prop = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.42, 8), accent);
        prop.position.y = 0.24;
        break;
      default:
        prop = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), accent);
        prop.position.y = 0.2;
    }
    prop.castShadow = true;
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), accent.clone());
    beacon.position.y = 0.45;
    group.add(prop, beacon);
    group.position.set(item.pos[0], item.pos[1], item.pos[2]);
    group.userData = { ...item, kind: "clue", beacon, baseY: item.pos[1] };
    scene.add(group);
    interactables.push(group);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.42, 28),
      new THREE.MeshBasicMaterial({ color: ACCENT, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(item.pos[0], 0.06, item.pos[2]);
    scene.add(ring);
    group.userData.ring = ring;
  });

  // Field notes (detective atmosphere pickups)
  PICKUPS.forEach((p) => {
    const color = 0x3a3428;
    const m = box(0.32, 0.04, 0.42, color, p.x, 0.35, p.z, {
      emissive: ACCENT, emissiveIntensity: 0.35,
    });
    const tab = box(0.12, 0.02, 0.16, ACCENT, p.x, 0.4, p.z);
    scene.add(m, tab);
    pickups.push({
      type: p.type,
      amount: p.amount,
      text: p.text,
      meshes: [m, tab],
      position: new THREE.Vector3(p.x, 0.35, p.z),
      taken: false,
    });
  });

  // Locked study door (removed when library body is examined)
  const lock = STUDY_LOCK.block;
  const studyDoor = texturedBox(lock.w, lock.h, lock.d, TEX.wood, 0x4a3828, lock.x, lock.h / 2, lock.z, 1);
  const seal = box(lock.w + 0.05, 0.15, lock.d + 0.05, ACCENT, lock.x, lock.h - 0.3, lock.z, {
    emissive: ACCENT, emissiveIntensity: 0.4,
  });
  scene.add(studyDoor, seal);
  colliders.push(studyDoor);

  return {
    colliders, interactables, lights,
    flashlight, pickups, fx,
    studyDoor, studySeal: seal,
  };
}

export function playerCollides(pos, colliders, radius = 0.35) {
  for (const c of colliders) {
    const box3 = new THREE.Box3().setFromObject(c);
    const expanded = box3.clone().expandByScalar(radius);
    if (
      pos.x > expanded.min.x && pos.x < expanded.max.x &&
      pos.z > expanded.min.z && pos.z < expanded.max.z &&
      pos.y < expanded.max.y && pos.y + 1.6 > expanded.min.y
    ) {
      return true;
    }
  }
  return false;
}
