import * as THREE from "three";
import { INTERACTABLES, ENEMY_SPAWNS } from "./data.js";

const WALL = 0x1a1f28;
const FLOOR = 0x12161c;
const WOOD = 0x2a2118;
const ACCENT = 0xc9a14a;
const TRIM = 0x3a3028;

function box(w, h, d, color, x, y, z, matOpts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...matOpts });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function roomFloor(x0, z0, x1, z1, y = 0, color = FLOOR) {
  const w = x1 - x0;
  const d = z1 - z0;
  return box(w, 0.2, d, color, (x0 + x1) / 2, y, (z0 + z1) / 2);
}

function wallSeg(x0, z0, x1, z1, h = 4) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const m = box(len, h, 0.35, WALL, (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  m.rotation.y = Math.atan2(dz, dx);
  return m;
}

export function buildWorld(scene) {
  const colliders = [];
  const interactables = [];
  const enemies = [];
  const lights = [];

  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.FogExp2(0x080c12, 0.045);

  const hemi = new THREE.HemisphereLight(0x4a5568, 0x0a0806, 0.35);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0x8aa0c0, 0.35);
  moon.position.set(-20, 30, 10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  scene.add(moon);

  // Floors
  const floors = [
    roomFloor(-6, -4, 6, 6, 0, 0x161b22),      // entrance
    roomFloor(-18, -4, -6, 8, 0, 0x14100c),    // library
    roomFloor(6, -4, 18, 6, 0, 0x14120e),      // study
    roomFloor(-10, 6, 2, 18, 0, 0x181410),     // kitchen
    roomFloor(2, 6, 16, 18, 0, 0x1a1420),      // ballroom
    roomFloor(-4, 18, 12, 30, 0, 0x0e1410),    // garden
  ];
  floors.forEach((f) => scene.add(f));

  // Outer / room walls with door gaps (~2 units)
  const wallSpecs = [
    // Entrance: south wall, east wall with door to study, west wall with door to library, north partial
    [-6, -4, 6, -4],
    [6, -4, 6, 1], [6, 3, 6, 6],
    [-6, -4, -6, 1], [-6, 3, -6, 6],
    [-6, 6, -2, 6], [2, 6, 6, 6],
    // Library outer
    [-18, -4, -6, -4], [-18, -4, -18, 8], [-18, 8, -6, 8], [-6, 6, -6, 8],
    // Study outer
    [6, -4, 18, -4], [18, -4, 18, 6], [6, 6, 18, 6],
    // Kitchen (door from entrance north, door to garden)
    [-10, 6, -10, 18], [-10, 18, -1, 18], [1, 18, 2, 18],
    [-10, 6, -6, 6],
    [2, 6, 2, 10], [2, 14, 2, 18],
    // Ballroom (door from entrance, door to garden)
    [16, 6, 16, 18], [2, 18, 5, 18], [7, 18, 16, 18],
  ];

  wallSpecs.forEach(([x0, z0, x1, z1]) => {
    const w = wallSeg(x0, z0, x1, z1, 4);
    scene.add(w);
    colliders.push(w);
  });

  // Low garden hedges
  [[-4, 18, -4, 30], [12, 18, 12, 30], [-4, 30, 12, 30]].forEach(([x0, z0, x1, z1]) => {
    const h = wallSeg(x0, z0, x1, z1, 1.4);
    h.material.color.setHex(0x1a2820);
    scene.add(h);
    colliders.push(h);
  });

  // Ceilings for indoor rooms
  [
    [-6, -4, 6, 6],
    [-18, -4, -6, 8],
    [6, -4, 18, 6],
    [-10, 6, 2, 18],
    [2, 6, 16, 18],
  ].forEach(([x0, z0, x1, z1]) => {
    const c = roomFloor(x0, z0, x1, z1, 4.1, 0x0c0e12);
    c.castShadow = false;
    scene.add(c);
  });

  // Furniture / set dressing
  const props = [
    // Entrance pillars
    box(0.5, 3.5, 0.5, TRIM, -4, 1.75, -2),
    box(0.5, 3.5, 0.5, TRIM, 4, 1.75, -2),
    // Library shelves + chair
    box(0.6, 3.2, 6, WOOD, -16.5, 1.6, 2),
    box(0.6, 3.2, 5, WOOD, -10, 1.6, -1.5),
    box(1.4, 1.1, 1.4, 0x3a2a1a, -12, 0.55, 2),
    box(0.6, 0.8, 0.6, ACCENT, -10.5, 0.9, -1),
    // Study desk + safe
    box(2.5, 1, 1.2, WOOD, 12, 0.5, 0),
    box(0.8, 1.2, 0.6, 0x222830, 15, 0.6, 2),
    box(1.6, 2.2, 0.15, 0x4a3828, 10, 2, -3.5),
    // Kitchen counters
    box(6, 1, 1.2, 0x2a2420, -5, 0.5, 8.5),
    box(1.2, 2.2, 3, 0x2a2420, -8.5, 1.1, 14),
    box(0.5, 0.5, 0.5, 0x6a5040, -6, 1.35, 12),
    // Ballroom piano + table
    box(2.2, 1.1, 1.2, 0x1a1218, 5, 0.55, 10),
    box(1.5, 1, 1.5, TRIM, 12, 0.5, 10),
    // Garden bench / beds
    box(2, 0.5, 0.7, WOOD, 2, 0.25, 24),
    box(3, 0.4, 1.5, 0x1a2820, 6, 0.2, 26),
  ];
  props.forEach((p) => {
    scene.add(p);
    colliders.push(p);
  });

  // Room lights
  const lampPoints = [
    [0, 3.2, 0, 0xffd8a0, 5],
    [-12, 3.2, 2, 0xffcc88, 6],
    [12, 3.2, 0, 0xffd0a0, 5],
    [-4, 3.2, 12, 0xffaa66, 5],
    [8, 3.4, 12, 0xffe0b0, 7],
    [4, 2.5, 24, 0x88aacc, 4],
  ];
  lampPoints.forEach(([x, y, z, color, dist]) => {
    const l = new THREE.PointLight(color, 1.2, dist, 2);
    l.position.set(x, y, z);
    scene.add(l);
    lights.push(l);
    const bulb = box(0.15, 0.15, 0.15, color, x, y, z, { emissive: color, emissiveIntensity: 0.8, roughness: 0.2 });
    scene.add(bulb);
  });

  // Interactable markers
  INTERACTABLES.forEach((item) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({
        color: ACCENT,
        emissive: ACCENT,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.85,
      })
    );
    marker.position.set(...item.pos);
    marker.userData = { ...item, kind: "clue" };
    scene.add(marker);
    interactables.push(marker);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.35, 24),
      new THREE.MeshBasicMaterial({ color: ACCENT, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(item.pos[0], 0.05, item.pos[2]);
    scene.add(ring);
    marker.userData.ring = ring;
  });

  // Enemies
  ENEMY_SPAWNS.forEach((spawn, i) => {
    const group = new THREE.Group();
    const body = box(0.7, 1.4, 0.5, 0x1a1014, 0, 1.0, 0);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a1818, roughness: 0.7 })
    );
    head.position.set(0, 1.95, 0);
    const eyeL = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3344 })
    );
    eyeL.position.set(-0.1, 2.0, 0.22);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    group.add(body, head, eyeL, eyeR);
    group.position.set(spawn.x, 0, spawn.z);
    group.userData = {
      kind: "enemy",
      hp: 3,
      speed: 2.2 + Math.random() * 0.6,
      cooldown: 0,
      alive: true,
      bob: Math.random() * Math.PI,
    };
    scene.add(group);
    enemies.push(group);
  });

  // Weapon viewmodel (camera child)
  const weapon = new THREE.Group();
  const grip = box(0.12, 0.35, 0.18, 0x1a1410, 0.22, -0.22, -0.45);
  const slide = box(0.14, 0.14, 0.45, 0x2a3038, 0.22, -0.08, -0.55);
  const barrel = box(0.06, 0.06, 0.25, 0x111418, 0.22, -0.08, -0.85);
  weapon.add(grip, slide, barrel);
  weapon.userData = { recoil: 0 };

  return { colliders, interactables, enemies, lights, weapon };
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
