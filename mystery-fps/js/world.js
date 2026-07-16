import * as THREE from "three";
import { INTERACTABLES, ENEMY_SPAWNS, PICKUPS } from "./data.js";
import {
  woodTexture, wallpaperTexture, carpetTexture, stoneTexture, metalTexture, applyMap,
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

function makeEnemy() {
  const g = new THREE.Group();
  const coat = boxMat(0x1a1218);
  const skin = boxMat(0x2a1a1a);
  const body = mesh(new THREE.BoxGeometry(0.65, 1.1, 0.4), coat, 0, 1.15, 0);
  const hips = mesh(new THREE.BoxGeometry(0.55, 0.35, 0.35), boxMat(0x121018), 0, 0.5, 0);
  const head = mesh(new THREE.SphereGeometry(0.26, 14, 14), skin, 0, 1.95, 0);
  const armL = mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), coat, -0.45, 1.15, 0);
  const armR = mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), coat, 0.45, 1.15, 0);
  const legL = mesh(new THREE.BoxGeometry(0.2, 0.55, 0.22), boxMat(0x101018), -0.16, 0.2, 0);
  const legR = mesh(new THREE.BoxGeometry(0.2, 0.55, 0.22), boxMat(0x101018), 0.16, 0.2, 0);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2233 });
  const eyeL = mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat, -0.09, 2.0, 0.2);
  const eyeR = mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat.clone(), 0.09, 2.0, 0.2);
  const glow = new THREE.PointLight(0xff2233, 0.45, 3);
  glow.position.set(0, 1.9, 0.3);
  g.add(body, hips, head, armL, armR, legL, legR, eyeL, eyeR, glow);
  g.userData = { armL, armR, legL, legR, eyes: [eyeL, eyeR] };
  return g;
}

function makeWeapon() {
  const w = new THREE.Group();
  const metal = applyMap(boxMat(0x2a3038, { metalness: 0.6, roughness: 0.35 }), TEX.metal, 1);
  const dark = boxMat(0x111418, { metalness: 0.5, roughness: 0.4 });
  const wood = applyMap(boxMat(0x2a1e14), TEX.wood, 1);

  const slide = mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), metal, 0, 0, 0);
  const barrel = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 10), dark, 0, 0, -0.36);
  barrel.rotation.x = Math.PI / 2;
  const grip = mesh(new THREE.BoxGeometry(0.12, 0.38, 0.16), wood, 0, -0.22, 0.06);
  grip.rotation.x = 0.25;
  const trigger = mesh(new THREE.BoxGeometry(0.04, 0.1, 0.08), dark, 0, -0.12, -0.02);
  const sight = mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), metal, 0, 0.1, -0.18);
  const muzzle = new THREE.PointLight(0xffaa55, 0, 2.5);
  muzzle.position.set(0, 0, -0.5);

  w.add(slide, barrel, grip, trigger, sight, muzzle);
  w.userData = { recoil: 0, muzzle, baseY: -0.22 };
  return w;
}

export function buildWorld(scene) {
  const colliders = [];
  const interactables = [];
  const enemies = [];
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

  // Evidence markers
  INTERACTABLES.forEach((item) => {
    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({
        color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.85,
        transparent: true, opacity: 0.9, roughness: 0.3, metalness: 0.4,
      })
    );
    marker.position.set(...item.pos);
    marker.userData = { ...item, kind: "clue" };
    scene.add(marker);
    interactables.push(marker);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.42, 28),
      new THREE.MeshBasicMaterial({ color: ACCENT, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(item.pos[0], 0.06, item.pos[2]);
    scene.add(ring);
    marker.userData.ring = ring;
  });

  // Pickups (medkits / ammo)
  PICKUPS.forEach((p) => {
    const isHealth = p.type === "health";
    const m = box(
      0.35, 0.25, 0.35,
      isHealth ? 0x2a6a40 : 0x3a3a20,
      p.x, 0.35, p.z,
      { emissive: isHealth ? 0x114422 : 0x332200, emissiveIntensity: 0.5 }
    );
    const cross = box(0.25, 0.06, 0.06, isHealth ? 0xff4444 : ACCENT, p.x, 0.5, p.z);
    const group = new THREE.Group();
    group.add(m, cross);
    group.position.set(0, 0, 0);
    // Keep meshes in world; store ref
    scene.add(m, cross);
    const pickup = {
      type: p.type,
      amount: p.amount,
      meshes: [m, cross],
      position: new THREE.Vector3(p.x, 0.35, p.z),
      taken: false,
    };
    pickups.push(pickup);
  });

  // Enemies
  ENEMY_SPAWNS.forEach((spawn) => {
    const e = makeEnemy();
    e.position.set(spawn.x, 0, spawn.z);
    e.userData = {
      ...e.userData,
      kind: "enemy",
      hp: 4,
      maxHp: 4,
      speed: 2.0 + Math.random() * 0.7,
      cooldown: 0,
      alive: true,
      bob: Math.random() * Math.PI,
      hurtFlash: 0,
      stagger: 0,
    };
    scene.add(e);
    enemies.push(e);
  });

  const weapon = makeWeapon();

  return { colliders, interactables, enemies, lights, weapon, flashlight, pickups, fx };
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

export function spawnHitSparks(scene, point) {
  const group = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xff6644 })
    );
    p.position.copy(point);
    p.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 2,
      (Math.random() - 0.5) * 3
    );
    p.userData.life = 0.35;
    group.add(p);
  }
  scene.add(group);
  return group;
}
