import * as THREE from "three";
import { buildCity, roofAt, findWebAnchor, nearMissBonus, wallSide } from "./city.js";
import { createHero, updateTrail, updatePose, handPoint, createSpeedLines, updateSpeedLines } from "./hero.js";
import { createWeb, attachWeb, releaseWeb, swingStep, releaseFling } from "./web.js";
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
const ringsEl = document.getElementById("rings");
const timeEl = document.getElementById("time");
const toastEl = document.getElementById("toast");
const bestEl = document.getElementById("best-score");
const endBest = document.getElementById("end-best");
const endStars = document.getElementById("end-stars");
const missionEl = document.getElementById("mission");
const tricksEl = document.getElementById("tricks");

const keys = {};
const mouse = { x: 0.55, y: 0.38, down: false };
const audio = createAudio();
const BEST_KEY = "webline_best_v3";

let renderer, scene, camera, hero, web, city, speedFx;
let running = false;
let score = 0;
let combo = 1;
let comboTimer = 0;
let startX = 0;
let maxX = 0;
let ringsGot = 0;
let ringsTotal = 0;
let runTime = 0;
let clock = new THREE.Clock();
let particles = [];
let aimHelper = null;
let webPreview = null;
let shake = 0;
let nearMissCooldown = 0;
let perfectLanding = false;
let airTime = 0;
let lastToast = 0;
let tricks = 0;
let wallRunTime = 0;
let slowMo = 0;
let mission = null;

const MISSIONS = [
  { id: "rings", label: "Collect 8 rings", check: (s) => s.ringsGot >= 8, reward: 1500 },
  { id: "combo", label: "Hit a 6× combo", check: (s) => s.comboPeak >= 6, reward: 1200 },
  { id: "distance", label: "Travel 200m", check: (s) => s.dist >= 200, reward: 1000 },
  { id: "tricks", label: "Land 3 aerial tricks", check: (s) => s.tricks >= 3, reward: 1400 },
  { id: "finale", label: "Grab the tower gold ring", check: (s) => s.finale, reward: 2000 },
];

let runStats = { ringsGot: 0, comboPeak: 1, dist: 0, tricks: 0, finale: false };

window.__WEBLINE__ = {
  start: () => startGame(),
  get running() { return running; },
  get score() { return score; },
  get combo() { return combo; },
  get distance() { return Math.max(0, maxX - startX); },
  keys, mouse,
  press(code) { keys[code] = true; },
  release(code) { keys[code] = false; },
  aim(nx, ny) { mouse.x = nx; mouse.y = ny; },
  webDown() { mouse.down = true; tryShoot(); },
  webUp() { doRelease(); },
};

initWorld();
bindUI();
showBestOnTitle();

function initWorld() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03080f);
  scene.fog = new THREE.FogExp2(0x051018, 0.0098);

  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 700);
  camera.position.set(0, 12, 18);

  scene.add(new THREE.AmbientLight(0x3a4a66, 0.4));
  const moon = new THREE.DirectionalLight(0xc8d8ff, 0.48);
  moon.position.set(-40, 80, -20);
  scene.add(moon);

  const key = new THREE.DirectionalLight(0xffe6c8, 1.2);
  key.position.set(30, 60, 40);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 240;
  Object.assign(key.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80 });
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x4a6aaa, 0.42);
  rim.position.set(-20, 20, -30);
  scene.add(rim);

  const neonWash = new THREE.PointLight(0xe11d2e, 10, 90);
  neonWash.position.set(50, 28, 12);
  scene.add(neonWash);

  addStars();
  city = buildCity(scene, { length: 560, seed: 104 });
  ringsTotal = city.collectibles.length;
  city._rain = addRain();

  hero = createHero();
  scene.add(hero.root);
  scene.add(hero.trail);

  web = createWeb();
  scene.add(web.mesh);
  scene.add(web.mesh2);
  scene.add(web.flash);

  speedFx = createSpeedLines(scene);

  aimHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.75 })
  );
  aimHelper.visible = false;
  scene.add(aimHelper);

  const prevGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
  webPreview = new THREE.Line(prevGeo, new THREE.LineDashedMaterial({
    color: 0x5eead4, dashSize: 0.7, gapSize: 0.35, transparent: true, opacity: 0.6,
  }));
  webPreview.visible = false;
  scene.add(webPreview);

  spawnHero();
  resize();
  requestAnimationFrame(loop);
}

function addStars() {
  const count = 1200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.12) * 600;
    positions[i * 3 + 1] = 30 + Math.random() * 150;
    positions[i * 3 + 2] = -70 - Math.random() * 150;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.9,
  })));
}

function addRain() {
  const count = 1400;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = Math.random() * 220;
    positions[i * 3 + 1] = Math.random() * 90;
    positions[i * 3 + 2] = -25 + Math.random() * 70;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x88aacc, size: 0.13, transparent: true, opacity: 0.38,
  }));
  scene.add(rain);
  return rain;
}

function spawnHero() {
  const x = 14;
  const y = roofAt(city.buildings, x, 0) + 1.3;
  hero.root.position.set(x, y, 0);
  hero.velocity.set(0, 0, 0);
  hero.grounded = true;
  hero.airJumps = 1;
  hero.wallRunning = false;
  hero.trickSpin = 0;
  startX = x;
  maxX = x;
  releaseWeb(web);
}

function pickMission() {
  mission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
  if (missionEl) missionEl.textContent = `Mission: ${mission.label}`;
}

function bindUI() {
  document.getElementById("btn-play").addEventListener("click", () => { audio.start(); startGame(); });
  document.getElementById("btn-again").addEventListener("click", () => { audio.start(); startGame(); });

  const btnJump = document.getElementById("btn-jump");
  const btnZip = document.getElementById("btn-zip");
  const btnTrick = document.getElementById("btn-trick");
  if (btnJump) {
    btnJump.addEventListener("pointerdown", (e) => { e.preventDefault(); keys["Space"] = true; });
    btnJump.addEventListener("pointerup", () => { keys["Space"] = false; });
  }
  if (btnZip) {
    btnZip.addEventListener("pointerdown", (e) => { e.preventDefault(); keys["ShiftLeft"] = true; });
    btnZip.addEventListener("pointerup", () => { keys["ShiftLeft"] = false; });
    btnZip.addEventListener("pointerleave", () => { keys["ShiftLeft"] = false; });
  }
  if (btnTrick) {
    btnTrick.addEventListener("pointerdown", (e) => { e.preventDefault(); tryTrick(); });
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
    if (e.code === "KeyQ" || e.code === "KeyE" || e.code === "KeyF") tryTrick();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  canvas.addEventListener("pointerdown", (e) => {
    if (!running) return;
    mouse.down = true;
    updateMouse(e);
    tryShoot();
  });
  window.addEventListener("pointerup", () => doRelease());
  canvas.addEventListener("pointermove", (e) => {
    updateMouse(e);
    if (mouse.down && !web.active && running) tryShoot();
  });
}

function doRelease() {
  if (mouse.down && web.active) {
    releaseFling(web, hero);
    releaseWeb(web);
    audio.webRelease();
    toast("Fling!", "#ff6b6b");
    shake = 0.22;
    hero.airJumps = 1;
  }
  mouse.down = false;
  aimHelper.visible = false;
  if (webPreview) webPreview.visible = false;
}

function updateMouse(e) {
  mouse.x = e.clientX / innerWidth;
  mouse.y = e.clientY / innerHeight;
}

function showBestOnTitle() {
  const best = Number(localStorage.getItem(BEST_KEY) || 0);
  if (bestEl) bestEl.textContent = best > 0 ? `Best ${best}` : "New run";
}

function startGame() {
  score = 0;
  combo = 1;
  comboTimer = 0;
  ringsGot = 0;
  runTime = 0;
  airTime = 0;
  tricks = 0;
  nearMissCooldown = 0;
  wallRunTime = 0;
  slowMo = 0;
  web.swings = 0;
  runStats = { ringsGot: 0, comboPeak: 1, dist: 0, tricks: 0, finale: false };
  pickMission();
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
  toast(mission.label, "#5eead4");
}

function endRun(reason) {
  if (!running) return;
  running = false;
  audio.fall();
  audio.setSpeed(0);
  hud.classList.add("hidden");
  endScreen.classList.remove("hidden");

  // Mission reward
  runStats.ringsGot = ringsGot;
  runStats.dist = Math.max(0, maxX - startX);
  runStats.tricks = tricks;
  if (mission?.check(runStats)) {
    score += mission.reward;
    reason = `Mission complete! +${mission.reward}`;
  }

  const final = Math.floor(score);
  endScore.textContent = String(final);
  const dist = Math.floor(runStats.dist);
  endDetail.textContent = `${reason} · ${dist}m · ${ringsGot}/${ringsTotal} rings · ${tricks} tricks · ${runTime.toFixed(1)}s`;

  // Stars
  let stars = 1;
  if (final >= 5000) stars = 2;
  if (final >= 12000) stars = 3;
  if (final >= 20000) stars = 4;
  if (final >= 30000) stars = 5;
  if (endStars) endStars.textContent = "★".repeat(stars) + "☆".repeat(5 - stars);

  const prev = Number(localStorage.getItem(BEST_KEY) || 0);
  if (final > prev) {
    localStorage.setItem(BEST_KEY, String(final));
    if (endBest) endBest.textContent = "New personal best!";
  } else if (endBest) {
    endBest.textContent = prev ? `Best ${prev}` : "";
  }
  showBestOnTitle();
}

function tryShoot() {
  const hand = handPoint(hero);
  const anchor = findWebAnchor(city.buildings, hand, screenAimDir());
  if (anchor) {
    attachWeb(web, anchor, hand);
    audio.webShoot();
    statusEl.textContent = "Swinging!";
    spawnBurst(anchor);
    bumpCombo();
    shake = 0.12;
    hero.wallRunning = false;
  }
}

function tryTrick() {
  if (!running || hero.grounded || hero.trickSpin > 0) return;
  if (airTime < 0.25 && !web.active) return;
  hero.trickSpin = Math.PI * 2;
  tricks += 1;
  runStats.tricks = tricks;
  const names = ["Aerial Flip", "Web Twist", "Sky Roll", "Corkscrew"];
  const name = names[Math.floor(Math.random() * names.length)];
  const pts = 200 * combo;
  score += pts;
  bumpCombo();
  audio.trick();
  toast(`${name} +${pts}`, "#c4b5fd");
  if (tricksEl) tricksEl.textContent = String(tricks);
  slowMo = 0.18;
}

function screenAimDir() {
  const ndcX = mouse.x * 2 - 1;
  const ndcY = -(mouse.y * 2 - 1);
  return new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
}

function bumpCombo() {
  combo = Math.min(20, combo + 1);
  comboTimer = 3.8;
  runStats.comboPeak = Math.max(runStats.comboPeak, combo);
  comboEl.textContent = `×${combo}`;
  comboEl.classList.remove("pop");
  void comboEl.offsetWidth;
  comboEl.classList.add("pop");
  audio.combo();
  score += 35 * combo;
  if (combo >= 5) toast(`${combo}× COMBO`, "#ff3b4a");
}

function toast(msg, color = "#5eead4") {
  if (!toastEl) return;
  const now = performance.now();
  if (now - lastToast < 350) return;
  lastToast = now;
  toastEl.textContent = msg;
  toastEl.style.color = color;
  toastEl.classList.remove("show");
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
}

function spawnBurst(pos, color = 0xffffff, count = 16) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.06 + Math.random() * 0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    );
    m.position.copy(pos);
    scene.add(m);
    particles.push({
      mesh: m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 11, Math.random() * 9, (Math.random() - 0.5) * 11),
      life: 0.4 + Math.random() * 0.3,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vel.y -= 14 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = Math.max(0, p.life * 2.2);
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
  }
}

function steerInput() {
  let s = 0;
  if (keys["KeyA"] || keys["ArrowLeft"]) s -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) s += 1;
  return s;
}

function wantJump() {
  return keys["Space"] || keys["KeyW"] || keys["ArrowUp"];
}

function freeMove(dt) {
  const steer = steerInput();
  const wasGrounded = hero.grounded;
  const side = wallSide(city.buildings, hero.root.position);

  // Wall run
  if (!hero.grounded && side !== 0 && hero.velocity.y > -8 && Math.abs(hero.velocity.x) > 4) {
    if (!hero.wallRunning) audio.wallRun();
    hero.wallRunning = true;
    wallRunTime += dt;
    hero.velocity.y = Math.max(hero.velocity.y, -2);
    hero.velocity.y += 6 * dt; // slight climb
    hero.velocity.x += -side * 2 * dt;
    hero.root.position.x += side * 0.02; // press into wall visually opposite... keep close
    statusEl.textContent = "Wall run!";
    if (wantJump()) {
      hero.velocity.y = 12;
      hero.velocity.x = side * 14;
      hero.wallRunning = false;
      hero.airJumps = 1;
      audio.jump();
      toast("Wall Jump!", "#ff9f1c");
      keys["Space"] = false;
      score += 120 * combo;
    }
    if (wallRunTime > 1.8) hero.wallRunning = false;
  } else {
    hero.wallRunning = false;
    wallRunTime = 0;
    hero.velocity.y += -23 * dt;
  }

  if (Math.abs(steer) > 0.05) {
    hero.velocity.x += steer * 21 * dt;
    hero.velocity.z += steer * 6 * dt;
    hero.facing = steer > 0 ? 1 : -1;
  }

  // Jump / double jump
  if (wantJump()) {
    if (hero.grounded) {
      hero.velocity.y = 13.5;
      hero.velocity.x += hero.facing * 4;
      hero.grounded = false;
      hero.airJumps = 1;
      audio.jump();
      statusEl.textContent = "Airborne";
      perfectLanding = true;
      keys["Space"] = false;
    } else if (hero.airJumps > 0 && !web.active && !hero.wallRunning) {
      hero.velocity.y = 11;
      hero.airJumps = 0;
      audio.doubleJump();
      toast("Double Jump!", "#5eead4");
      spawnBurst(hero.root.position.clone().add(new THREE.Vector3(0, 0.2, 0)), 0x5eead4, 10);
      keys["Space"] = false;
    }
  }

  hero.velocity.x *= 0.91;
  hero.velocity.z *= 0.91;
  hero.root.position.addScaledVector(hero.velocity, dt);

  const roof = roofAt(city.buildings, hero.root.position.x, hero.root.position.z);
  hero.grounded = false;
  if (hero.root.position.y <= roof + 1.2) {
    const impact = Math.abs(hero.velocity.y);
    hero.root.position.y = roof + 1.2;
    hero.velocity.y = 0;
    hero.grounded = true;
    hero.airJumps = 1;
    if (!wasGrounded && impact > 8 && perfectLanding && airTime > 0.85) {
      score += 180 * combo;
      toast("Perfect Landing!", "#ffd166");
      audio.collect();
      shake = 0.28;
    }
    perfectLanding = false;
    airTime = 0;
    if (!web.active) statusEl.textContent = "Ready";
  } else {
    airTime += dt;
  }

  hero.root.position.z += (0 - hero.root.position.z) * 1.15 * dt;
}

function updateCamera(dt) {
  const speed = hero.velocity.length();
  const swinging = web.active;
  const target = new THREE.Vector3(
    hero.root.position.x - 1 + Math.min(8, speed * 0.1),
    hero.root.position.y + (swinging ? 7.2 : 5.2) + Math.min(4, speed * 0.05),
    hero.root.position.z + (swinging ? 16.5 : 13) + Math.min(5, speed * 0.06)
  );
  if (shake > 0) {
    target.x += (Math.random() - 0.5) * shake * 2.2;
    target.y += (Math.random() - 0.5) * shake * 2.2;
    shake = Math.max(0, shake - dt * 1.9);
  }
  camera.position.lerp(target, 1 - Math.exp(-5.8 * dt));
  camera.lookAt(
    hero.root.position.x + hero.velocity.x * 0.45,
    hero.root.position.y + 1.35,
    hero.root.position.z + hero.velocity.z * 0.2
  );
  const desiredFov = 55 + Math.min(18, speed * 0.4);
  camera.fov += (desiredFov - camera.fov) * 0.12;
  camera.updateProjectionMatrix();
}

function updateCollectibles(dt) {
  const heroPos = hero.root.position;
  for (const c of city.collectibles) {
    if (c.taken) continue;
    c.mesh.rotation.z += dt * (c.gold ? 3.4 : 2.3);
    c.mesh.position.y += Math.sin(performance.now() * 0.004 + c.mesh.position.x) * 0.012;
    if (heroPos.distanceTo(c.mesh.position) < 2.7) {
      c.taken = true;
      c.mesh.visible = false;
      ringsGot += 1;
      runStats.ringsGot = ringsGot;
      if (c.finale) runStats.finale = true;
      const pts = c.value * combo;
      score += pts;
      audio.collect();
      statusEl.textContent = c.gold ? "GOLD RING!" : "Ring!";
      toast(c.gold ? `Gold +${pts}` : `+${pts}`, c.gold ? "#ffd166" : "#5eead4");
      spawnBurst(c.mesh.position, c.gold ? 0xffd166 : 0x5eead4, c.gold ? 26 : 14);
      shake = c.gold ? 0.35 : 0.15;
      if (c.gold) slowMo = 0.22;
      bumpCombo();
    }
  }
}

function updateCityLife(dt) {
  for (const n of city.neons) {
    n.mesh.material.emissiveIntensity = n.base + Math.sin(performance.now() * 0.008 + n.phase) * 0.4;
  }
  for (const t of city.traffic) {
    t.mesh.position.x += t.speed * t.dir * dt;
    if (t.mesh.position.x > city.length) t.mesh.position.x = -10;
    if (t.mesh.position.x < -10) t.mesh.position.x = city.length;
  }
  if (city.heli) {
    city.heli.t += dt;
    const hx = 60 + Math.sin(city.heli.t * 0.15) * 100 + hero.root.position.x * 0.15;
    const hz = -20 + Math.cos(city.heli.t * 0.12) * 18;
    city.heli.mesh.position.set(hx, 50 + Math.sin(city.heli.t * 0.5) * 4, hz);
    const rotor = city.heli.mesh.getObjectByName("rotor");
    if (rotor) rotor.rotation.y += dt * 28;
    city.heli.light.position.copy(city.heli.mesh.position);
    city.heli.light.target.position.set(hx, 0, hero.root.position.z);
  }
  if (city._rain) {
    const pos = city._rain.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= 48 * dt;
      if (pos[i + 1] < 0) {
        pos[i] = hero.root.position.x + (Math.random() - 0.3) * 90;
        pos[i + 1] = 45 + Math.random() * 45;
        pos[i + 2] = hero.root.position.z + (Math.random() - 0.5) * 55;
      }
    }
    city._rain.geometry.attributes.position.needsUpdate = true;
  }
}

function updateHUD() {
  scoreEl.textContent = String(Math.floor(score));
  distanceEl.textContent = `${Math.floor(Math.max(0, maxX - startX))}m`;
  if (ringsEl) ringsEl.textContent = `${ringsGot}/${ringsTotal}`;
  if (timeEl) timeEl.textContent = `${runTime.toFixed(1)}s`;
  if (tricksEl) tricksEl.textContent = String(tricks);
  const speed = hero.velocity.length();
  speedFill.style.width = `${Math.min(100, speed * 3)}%`;
  if (comboTimer <= 0 && combo > 1) { combo = 1; comboEl.textContent = "×1"; }
  if (missionEl && mission) {
    const done = mission.check(runStats);
    missionEl.classList.toggle("done", done);
  }
}

function updateAimHelper() {
  if (!running || web.active) {
    aimHelper.visible = false;
    webPreview.visible = false;
    return;
  }
  const hand = handPoint(hero);
  const anchor = findWebAnchor(city.buildings, hand, screenAimDir());
  if (anchor) {
    aimHelper.visible = true;
    aimHelper.position.copy(anchor);
    aimHelper.scale.setScalar(0.9 + Math.sin(performance.now() * 0.01) * 0.15);
    webPreview.visible = true;
    const a = webPreview.geometry.attributes.position.array;
    a[0] = hand.x; a[1] = hand.y; a[2] = hand.z;
    a[3] = anchor.x; a[4] = anchor.y; a[5] = anchor.z;
    webPreview.geometry.attributes.position.needsUpdate = true;
    webPreview.computeLineDistances();
  } else {
    aimHelper.visible = false;
    webPreview.visible = false;
  }
}

function loop() {
  requestAnimationFrame(loop);
  let dt = Math.min(clock.getDelta(), 0.033);
  if (slowMo > 0) {
    slowMo -= dt;
    dt *= 0.45;
  }

  for (const c of city.collectibles) {
    if (!c.taken) c.mesh.rotation.z += dt * 1.5;
  }
  updateCityLife(dt);

  if (running) {
    comboTimer -= dt;
    runTime += dt / (slowMo > 0 ? 0.45 : 1);
    maxX = Math.max(maxX, hero.root.position.x);
    runStats.dist = Math.max(0, maxX - startX);
    score += hero.velocity.length() * 0.42 * dt * combo;

    const zip = keys["ShiftLeft"] || keys["ShiftRight"] || keys["KeyS"];
    if (web.active) {
      const result = swingStep(web, hero, dt, steerInput(), zip);
      if (result.attached) toast("Attached!", "#aaccff");
      if (Math.abs(steerInput()) > 0.05) hero.facing = steerInput() > 0 ? 1 : -1;
      if (zip) statusEl.textContent = "Zipping!";
    } else {
      freeMove(dt);
    }

    // Trick spin animation
    if (hero.trickSpin > 0) {
      const step = Math.min(hero.trickSpin, dt * 14);
      hero.root.rotation.x += step;
      hero.trickSpin -= step;
    }

    nearMissCooldown -= dt;
    if (nearMissCooldown <= 0 && !hero.grounded) {
      const bonus = nearMissBonus(city.buildings, hero.root.position, hero.velocity);
      if (bonus > 0) {
        score += bonus * combo;
        toast(`Near miss +${bonus}`, "#ff9f1c");
        audio.combo();
        nearMissCooldown = 1.1;
      }
    }

    if (hero.trickSpin <= 0) {
      hero.root.rotation.y = hero.facing > 0 ? 0 : Math.PI;
      hero.root.rotation.z = THREE.MathUtils.clamp(-hero.velocity.x * 0.018, -0.42, 0.42);
      if (!hero.wallRunning) {
        hero.root.rotation.x = THREE.MathUtils.clamp(-hero.velocity.y * 0.01, -0.35, 0.35);
      } else {
        hero.root.rotation.z = hero.facing * 0.5;
      }
    }

    updatePose(hero, web.active);
    updateTrail(hero);
    updateCollectibles(dt);
    updateParticles(dt);
    updateAimHelper();
    updateCamera(dt);
    updateSpeedLines(speedFx, camera, hero.velocity.length());
    audio.setSpeed(hero.velocity.length());
    updateHUD();

    if (hero.root.position.y < -15) endRun("Fell from the skyline");
    if (hero.root.position.x > city.length - 18) endRun("Reached the harbor");
    if (ringsGot >= ringsTotal && ringsTotal > 0) {
      score += 2500;
      endRun("All rings collected!");
    }
  } else {
    const t = performance.now() * 0.00018;
    camera.position.set(
      hero.root.position.x + Math.cos(t) * 22,
      hero.root.position.y + 10,
      hero.root.position.z + 16 + Math.sin(t) * 5
    );
    camera.lookAt(hero.root.position.x + 6, hero.root.position.y + 2, 0);
  }

  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
