import * as THREE from "three";
import { buildCity, roofAt, findWebAnchor } from "./city.js";
import { createHero, updateTrail, handPoint } from "./hero.js";
import { createWeb, attachWeb, releaseWeb, swingStep } from "./web.js";
import { createAudio } from "./audio.js";

const canvas = document.getElementById("game");
const titleScreen = document.getElementById("title-screen");
const endScreen = document.getElementById("end-screen");
const hud = document.getElementById("hud");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const statusEl = document.getElementById("status");
const distanceEl = document.getElementById("distance");
const speedFill = document.getElementById("speed-fill");
const endScore = document.getElementById("end-score");
const endDetail = document.getElementById("end-detail");

const keys = {};
const mouse = { x: 0.5, y: 0.4, down: false };
const audio = createAudio();

let renderer, scene, camera, hero, web, city;
let running = false;
let score = 0;
let combo = 1;
let comboTimer = 0;
let startX = 0;
let maxX = 0;
let clock = new THREE.Clock();
let particles = [];
let aimHelper = null;

// Expose for demo recorder / automation
window.__WEBLINE__ = {
  start: () => startGame(),
  get running() { return running; },
  get score() { return score; },
  get combo() { return combo; },
  get distance() { return Math.max(0, maxX - startX); },
  keys,
  mouse,
  press(code) { keys[code] = true; },
  release(code) { keys[code] = false; },
  aim(nx, ny) { mouse.x = nx; mouse.y = ny; },
  webDown() { mouse.down = true; tryShoot(); },
  webUp() {
    if (web.active) {
      releaseWeb(web);
      hero.velocity.y += 2;
      hero.velocity.x += hero.facing * 1.5;
    }
    mouse.down = false;
    aimHelper.visible = false;
  },
};

initWorld();
bindUI();

function initWorld() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050b12);
  scene.fog = new THREE.FogExp2(0x071018, 0.012);

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 600);
  camera.position.set(0, 12, 18);

  // Lighting
  scene.add(new THREE.AmbientLight(0x3a4a66, 0.45));
  const moon = new THREE.DirectionalLight(0xc8d8ff, 0.55);
  moon.position.set(-40, 80, -20);
  scene.add(moon);

  const key = new THREE.DirectionalLight(0xffe6c8, 1.1);
  key.position.set(30, 60, 40);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 200;
  key.shadow.camera.left = -60;
  key.shadow.camera.right = 60;
  key.shadow.camera.top = 60;
  key.shadow.camera.bottom = -60;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x4a6aaa, 0.35);
  rim.position.set(-20, 20, -30);
  scene.add(rim);

  // Stars
  addStars();

  city = buildCity(scene, { length: 480, seed: 77 });
  hero = createHero();
  scene.add(hero.root);
  scene.add(hero.trail);

  web = createWeb();
  scene.add(web.mesh);

  // Aim reticle in world (optional ghost)
  aimHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.55 })
  );
  aimHelper.visible = false;
  scene.add(aimHelper);

  spawnHero();
  resize();
  requestAnimationFrame(loop);
}

function addStars() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.2) * 500;
    positions[i * 3 + 1] = 40 + Math.random() * 120;
    positions[i * 3 + 2] = -80 - Math.random() * 120;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.45,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  })));
}

function spawnHero() {
  const x = 12;
  const y = roofAt(city.buildings, x, 0) + 1.3;
  hero.root.position.set(x, y, 0);
  hero.velocity.set(0, 0, 0);
  hero.grounded = true;
  startX = x;
  maxX = x;
  releaseWeb(web);
}

function bindUI() {
  document.getElementById("btn-play").addEventListener("click", () => {
    audio.start();
    startGame();
  });
  document.getElementById("btn-again").addEventListener("click", () => {
    audio.start();
    startGame();
  });

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  canvas.addEventListener("pointerdown", (e) => {
    if (!running) return;
    mouse.down = true;
    updateMouse(e);
    tryShoot();
  });
  window.addEventListener("pointerup", () => {
    if (mouse.down && web.active) {
      releaseWeb(web);
      audio.webRelease();
      // Release fling bonus
      hero.velocity.y += 2;
      hero.velocity.x += hero.facing * 1.5;
    }
    mouse.down = false;
    aimHelper.visible = false;
  });
  canvas.addEventListener("pointermove", (e) => {
    updateMouse(e);
    if (mouse.down && !web.active && running) tryShoot();
  });
}

function updateMouse(e) {
  mouse.x = e.clientX / innerWidth;
  mouse.y = e.clientY / innerHeight;
}

function startGame() {
  score = 0;
  combo = 1;
  comboTimer = 0;
  spawnHero();
  for (const c of city.collectibles) {
    c.taken = false;
    c.mesh.visible = true;
    c.mesh.scale.setScalar(1);
  }
  titleScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  running = true;
  clock.getDelta();
  statusEl.textContent = "Ready";
}

function endRun(reason) {
  if (!running) return;
  running = false;
  audio.fall();
  hud.classList.add("hidden");
  endScreen.classList.remove("hidden");
  endScore.textContent = String(Math.floor(score));
  const dist = Math.floor(Math.max(0, maxX - startX));
  endDetail.textContent = `${reason} · ${dist}m traveled · ${web.swings} webs`;
}

function tryShoot() {
  const hand = handPoint(hero);
  const aimDir = screenAimDir();
  const anchor = findWebAnchor(city.buildings, hand, aimDir);
  if (anchor) {
    attachWeb(web, anchor, hand);
    audio.webShoot();
    statusEl.textContent = "Swinging!";
    spawnAttachBurst(anchor);
    bumpCombo();
  }
}

function screenAimDir() {
  // Prefer forward-up relative to camera look
  const ndcX = mouse.x * 2 - 1;
  const ndcY = -(mouse.y * 2 - 1);
  const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
  return v.sub(camera.position).normalize();
}

function bumpCombo() {
  combo = Math.min(12, combo + 1);
  comboTimer = 3.2;
  comboEl.textContent = `×${combo}`;
  comboEl.classList.remove("pop");
  void comboEl.offsetWidth;
  comboEl.classList.add("pop");
  audio.combo();
  score += 25 * combo;
}

function spawnAttachBurst(pos) {
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    m.position.copy(pos);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      Math.random() * 6,
      (Math.random() - 0.5) * 8
    );
    scene.add(m);
    particles.push({ mesh: m, vel, life: 0.45 + Math.random() * 0.25 });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vel.y -= 12 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = Math.max(0, p.life * 2);
    p.mesh.material.transparent = true;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

function steerInput() {
  let s = 0;
  if (keys["KeyA"] || keys["ArrowLeft"]) s -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) s += 1;
  return s;
}

function freeMove(dt) {
  const steer = steerInput();
  hero.velocity.y += -22 * dt;

  if (Math.abs(steer) > 0.05) {
    hero.velocity.x += steer * 18 * dt;
    hero.velocity.z += steer * 5 * dt;
    hero.facing = steer > 0 ? 1 : -1;
  }

  // Jump
  if ((keys["Space"] || keys["KeyW"] || keys["ArrowUp"]) && hero.grounded) {
    hero.velocity.y = 12;
    hero.velocity.x += hero.facing * 3;
    hero.grounded = false;
    audio.jump();
    statusEl.textContent = "Airborne";
    keys["Space"] = false;
  }

  hero.velocity.x *= 0.9;
  hero.velocity.z *= 0.9;
  hero.root.position.addScaledVector(hero.velocity, dt);

  const roof = roofAt(city.buildings, hero.root.position.x, hero.root.position.z);
  hero.grounded = false;
  if (hero.root.position.y <= roof + 1.2) {
    hero.root.position.y = roof + 1.2;
    hero.velocity.y = 0;
    hero.grounded = true;
    if (!web.active) statusEl.textContent = "Ready";
  }

  // Soft Z recenter toward street
  hero.root.position.z += (0 - hero.root.position.z) * 0.8 * dt;
}

function updateCamera(dt) {
  const speed = hero.velocity.length();
  const swinging = web.active;
  const target = new THREE.Vector3(
    hero.root.position.x - 1.5 + Math.min(6, speed * 0.08),
    hero.root.position.y + (swinging ? 6.5 : 4.8) + Math.min(3, speed * 0.04),
    hero.root.position.z + (swinging ? 15 : 12) + Math.min(4, speed * 0.05)
  );
  camera.position.lerp(target, 1 - Math.exp(-5 * dt));

  const look = new THREE.Vector3(
    hero.root.position.x + hero.velocity.x * 0.35,
    hero.root.position.y + 1.2,
    hero.root.position.z + hero.velocity.z * 0.2
  );
  camera.lookAt(look);

  // FOV kick with speed
  const desiredFov = 58 + Math.min(14, speed * 0.35);
  camera.fov += (desiredFov - camera.fov) * 0.08;
  camera.updateProjectionMatrix();
}

function updateCollectibles(dt) {
  const heroPos = hero.root.position;
  for (const c of city.collectibles) {
    if (c.taken) continue;
    c.mesh.rotation.z += dt * 2.2;
    c.mesh.position.y += Math.sin(performance.now() * 0.004 + c.mesh.position.x) * 0.01;
    if (heroPos.distanceTo(c.mesh.position) < 2.4) {
      c.taken = true;
      c.mesh.visible = false;
      score += c.value * combo;
      audio.collect();
      statusEl.textContent = "Ring!";
      spawnAttachBurst(c.mesh.position);
    }
  }
}

function updateHUD() {
  scoreEl.textContent = String(Math.floor(score));
  const dist = Math.max(0, maxX - startX);
  distanceEl.textContent = `${Math.floor(dist)}m`;
  const speed = hero.velocity.length();
  speedFill.style.width = `${Math.min(100, speed * 3.5)}%`;

  if (comboTimer > 0) {
    /* keep */
  } else if (combo > 1) {
    combo = 1;
    comboEl.textContent = "×1";
  }
}

function updateAimHelper() {
  if (!running || !mouse.down || web.active) {
    aimHelper.visible = false;
    return;
  }
  const hand = handPoint(hero);
  const anchor = findWebAnchor(city.buildings, hand, screenAimDir());
  if (anchor) {
    aimHelper.visible = true;
    aimHelper.position.copy(anchor);
  } else {
    aimHelper.visible = false;
  }
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.033);

  // Spin collectibles even on title
  for (const c of city.collectibles) {
    if (!c.taken) c.mesh.rotation.z += dt * 1.5;
  }

  if (running) {
    comboTimer -= dt;
    maxX = Math.max(maxX, hero.root.position.x);
    score += hero.velocity.length() * 0.35 * dt * combo;

    const zip = keys["ShiftLeft"] || keys["ShiftRight"] || keys["KeyS"];
    if (web.active) {
      swingStep(web, hero, dt, steerInput(), zip);
      if (Math.abs(steerInput()) > 0.05) hero.facing = steerInput() > 0 ? 1 : -1;
    } else {
      freeMove(dt);
    }

    hero.root.rotation.y = hero.facing > 0 ? 0 : Math.PI;
    // lean into motion
    hero.root.rotation.z = THREE.MathUtils.clamp(-hero.velocity.x * 0.02, -0.35, 0.35);

    updateTrail(hero);
    updateCollectibles(dt);
    updateParticles(dt);
    updateAimHelper();
    updateCamera(dt);
    updateHUD();

    if (hero.root.position.y < -15) endRun("Fell from the skyline");
    if (hero.root.position.x > city.length - 20) endRun("Reached the harbor");
  } else {
    // Idle camera orbit on title / end
    const t = performance.now() * 0.00015;
    camera.position.set(
      hero.root.position.x + Math.cos(t) * 18,
      hero.root.position.y + 8,
      hero.root.position.z + 14 + Math.sin(t) * 4
    );
    camera.lookAt(hero.root.position.x + 4, hero.root.position.y + 2, 0);
  }

  renderer.render(scene, camera);
}

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
