import * as THREE from "three";
import { City } from "./city.js";
import { CombatSystem, Player } from "./player.js";
import { PhysicsSystem } from "./physics.js";
import { Controls } from "./controls.js";

// ---------------------------------------------------------------------------
// DOM and renderer setup
// ---------------------------------------------------------------------------

const canvas = document.querySelector("#game");
const startScreen = document.querySelector("#start-screen");
const pauseScreen = document.querySelector("#pause-screen");
const loadingScreen = document.querySelector("#loading-screen");
const startButton = document.querySelector("#start-button");
const resumeButton = document.querySelector("#resume-button");
const reticle = document.querySelector("#reticle");
const toast = document.querySelector("#action-toast");
const healthFill = document.querySelector("#health-fill");
const healthValue = document.querySelector("#health-value");
const momentumFill = document.querySelector("#momentum-fill");
const speedValue = document.querySelector("#speed-value");
const altitudeValue = document.querySelector("#altitude-value");
const timeValue = document.querySelector("#time-value");
const comboValue = document.querySelector("#combo-value");
const objectiveText = document.querySelector("#objective-text");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071321);
scene.fog = new THREE.FogExp2(0x071321, 0.0044);

const camera = new THREE.PerspectiveCamera(
  66,
  window.innerWidth / window.innerHeight,
  0.08,
  520,
);

// ---------------------------------------------------------------------------
// Dynamic sky and lighting
// ---------------------------------------------------------------------------

const hemisphere = new THREE.HemisphereLight(0x8dcfff, 0x132126, 1.1);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(0xffe1b0, 2.8);
sun.name = "Sun";
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -72;
sun.shadow.camera.right = 72;
sun.shadow.camera.top = 72;
sun.shadow.camera.bottom = -72;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 190;
sun.shadow.bias = -0.00035;
scene.add(sun, sun.target);

const moon = new THREE.DirectionalLight(0x7fa8ff, 0.35);
moon.name = "Moon";
scene.add(moon);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(3.2, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0xffd094, toneMapped: false }),
);
sunDisc.name = "Sun disc";
scene.add(sunDisc);

const stars = createStars();
scene.add(stars);

function createStars() {
  const positions = new Float32Array(1100 * 3);
  for (let index = 0; index < 1100; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const y = Math.random() * 190 + 25;
    const radius = 180 + Math.random() * 130;
    positions[index * 3] = Math.cos(theta) * radius;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(theta) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xb9d8ff,
      size: 0.65,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}

// ---------------------------------------------------------------------------
// Game systems
// ---------------------------------------------------------------------------

let toastTimer = 0;
function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = 1.15;
}

const city = new City(scene);
const player = new Player(scene);
player.setPosition(city.getSpawnPoint());
player.grounded = true;

const physics = new PhysicsSystem(city, notify);
const combat = new CombatSystem(scene, city, notify);
const aimRaycaster = new THREE.Raycaster();
const cameraRaycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

let started = false;
let paused = true;
const controls = new Controls(canvas, (shouldPause) => {
  if (!started) return;
  paused = shouldPause;
  pauseScreen.classList.toggle("hidden", !paused);
  if (paused) controls.reset();
});

startButton.addEventListener("click", () => {
  started = true;
  paused = false;
  controls.enabled = true;
  startScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  controls.requestPointerLock();
  notify("PATROL ACTIVE");
});

resumeButton.addEventListener("click", () => {
  controls.requestPointerLock();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Third-person camera
// ---------------------------------------------------------------------------

const cameraTarget = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();
const cameraForward = new THREE.Vector3(0, 0, 1);
const cameraRight = new THREE.Vector3(-1, 0, 0);
let cameraReady = false;

function updateCamera(dt) {
  const speed = player.horizontalSpeed;
  const distance = THREE.MathUtils.lerp(7.2, 9.2, THREE.MathUtils.clamp(speed / 34, 0, 1));
  const pitchCos = Math.cos(controls.pitch);

  cameraTarget.copy(player.position);
  cameraTarget.y += player.webAttached ? 1.3 : 1.15;
  cameraTarget.addScaledVector(player.velocity, Math.min(0.12, dt * 5));

  cameraOffset.set(
    Math.sin(controls.yaw) * pitchCos * distance,
    2.25 - Math.sin(controls.pitch) * distance,
    Math.cos(controls.yaw) * pitchCos * distance,
  );
  desiredCameraPosition.copy(cameraTarget).add(cameraOffset);

  // Pull the camera forward when a building would otherwise block the hero.
  const obstructionDirection = desiredCameraPosition.clone().sub(cameraTarget);
  const desiredDistance = obstructionDirection.length();
  obstructionDirection.normalize();
  cameraRaycaster.set(cameraTarget, obstructionDirection);
  const obstruction = city.raycastBuildings(cameraRaycaster, desiredDistance);
  if (obstruction && obstruction.distance < desiredDistance) {
    desiredCameraPosition
      .copy(cameraTarget)
      .addScaledVector(obstructionDirection, Math.max(1.1, obstruction.distance - 0.35));
  }

  if (!cameraReady) {
    camera.position.copy(desiredCameraPosition);
    cameraReady = true;
  } else {
    camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-dt * 8.5));
  }
  camera.lookAt(cameraTarget);

  const targetFov = THREE.MathUtils.lerp(66, 76, THREE.MathUtils.clamp(speed / 38, 0, 1));
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-dt * 4));
  camera.updateProjectionMatrix();

  // Movement vectors come from camera yaw rather than player facing, allowing
  // immediate directional air control after a swing release.
  cameraForward.set(-Math.sin(controls.yaw), 0, -Math.cos(controls.yaw)).normalize();
  cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
}

function getAimHit() {
  aimRaycaster.setFromCamera(screenCenter, camera);
  return city.raycastBuildings(aimRaycaster, 95);
}

// ---------------------------------------------------------------------------
// Input actions and fixed-step simulation
// ---------------------------------------------------------------------------

let currentAimHit = null;
let elapsed = 0;

function processActions() {
  if (controls.wasMousePressed(0) && currentAimHit) {
    physics.attachWeb(player, currentAimHit);
  }
  if (controls.wasMouseReleased(0)) physics.releaseWeb(player);
  if (controls.wasMousePressed(2) && currentAimHit) {
    physics.startZip(player, currentAimHit);
  }

  if (controls.wasPressed("KeyE")) {
    if (player.grounded) {
      if (player.startPunch(elapsed)) notify(`PUNCH CHAIN ${player.comboStep}`);
    } else {
      physics.beginAirAttack(player);
    }
  }

  if (controls.wasPressed("KeyQ")) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const origin = player.position.clone().add(new THREE.Vector3(0, 1.25, 0));
    combat.fireWebProjectile(origin, direction);
  }
}

function fixedUpdate(dt) {
  elapsed += dt;
  currentAimHit = getAimHit();
  processActions();
  physics.update(player, controls, cameraForward, cameraRight, dt);
  player.update(dt);

  const strike = player.consumeStrike();
  if (strike) combat.melee(player, strike);
  combat.update(dt, player);

  if (player.health <= 0) {
    physics.respawn(player);
    notify("SUIT REBOOTED");
  }

  controls.endFrame();
}

// ---------------------------------------------------------------------------
// Presentation updates
// ---------------------------------------------------------------------------

let dayPhase = 0.71;
let shadowTimer = 0;
const skyNight = new THREE.Color(0x020817);
const skyDay = new THREE.Color(0x65a9c5);
const skySunset = new THREE.Color(0xd86548);
const skyCurrent = new THREE.Color();

function updateDayNight(dt) {
  // A full day lasts three minutes, long enough to notice while remaining
  // visually dynamic during a normal play session.
  dayPhase = (dayPhase + dt / 180) % 1;
  const angle = (dayPhase - 0.25) * Math.PI * 2;
  const sunHeight = Math.sin(angle);
  const sunDirection = new THREE.Vector3(Math.cos(angle), sunHeight, Math.sin(angle) * 0.55).normalize();
  const dayFactor = THREE.MathUtils.smoothstep(sunHeight, -0.12, 0.48);
  const nightFactor = 1 - dayFactor;
  const sunsetFactor = Math.max(0, 1 - Math.abs(sunHeight) * 3.1) * 0.72;

  skyCurrent.lerpColors(skyNight, skyDay, dayFactor);
  skyCurrent.lerp(skySunset, sunsetFactor);
  scene.background.copy(skyCurrent);
  scene.fog.color.copy(skyCurrent);

  sun.position.copy(player.position).addScaledVector(sunDirection, 105);
  sun.target.position.copy(player.position);
  sun.intensity = THREE.MathUtils.lerp(0.03, 2.9, dayFactor);
  sun.color.setRGB(1, THREE.MathUtils.lerp(0.57, 0.91, dayFactor), THREE.MathUtils.lerp(0.42, 0.72, dayFactor));
  moon.position.copy(player.position).addScaledVector(sunDirection, -100);
  moon.intensity = THREE.MathUtils.lerp(0.62, 0.05, dayFactor);
  hemisphere.intensity = THREE.MathUtils.lerp(0.28, 1.22, dayFactor);
  sunDisc.position.copy(player.position).addScaledVector(sunDirection, 230);
  sunDisc.visible = sunHeight > -0.16;
  stars.material.opacity = THREE.MathUtils.lerp(0.9, 0, dayFactor);
  city.updateDayNight(nightFactor);

  shadowTimer -= dt;
  if (shadowTimer <= 0) {
    renderer.shadowMap.needsUpdate = true;
    shadowTimer = 0.45;
  }

  const totalMinutes = Math.floor(dayPhase * 24 * 60);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  timeValue.textContent = `${hours}:${minutes}`;
}

function updateHud(dt) {
  toastTimer -= dt;
  if (toastTimer <= 0) toast.classList.remove("show");

  const speed = player.velocity.length();
  healthFill.style.transform = `scaleX(${player.health / 100})`;
  healthValue.textContent = String(Math.ceil(player.health));
  momentumFill.style.transform = `scaleX(${THREE.MathUtils.clamp(speed / 42, 0.02, 1)})`;
  speedValue.textContent = String(Math.round(speed));
  altitudeValue.textContent = `ALT ${Math.max(0, Math.round(player.position.y))}m`;
  comboValue.textContent = `COMBO x${combat.combo}`;

  reticle.classList.toggle("valid", Boolean(currentAimHit));
  reticle.classList.toggle("zip", Boolean(physics.zip));

  if (physics.web) {
    objectiveText.textContent = "Release at the apex to preserve momentum";
  } else if (player.wallMode) {
    objectiveText.textContent = "Hold Shift + W to climb · Space to wall kick";
  } else if (speed > 25) {
    objectiveText.textContent = "High momentum — chain the next filament";
  } else {
    objectiveText.textContent = "Build momentum across Neon Harbor";
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
const FIXED_STEP = 1 / 60;
let accumulator = 0;

function animate() {
  requestAnimationFrame(animate);
  const frameTime = Math.min(clock.getDelta(), 0.08);

  updateCamera(frameTime);
  updateDayNight(frameTime);

  if (started && !paused) {
    accumulator += frameTime;
    while (accumulator >= FIXED_STEP) {
      fixedUpdate(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
  } else if (!started) {
    // Idle animation keeps the title screen backdrop alive.
    player.update(frameTime);
    controls.yaw += frameTime * 0.025;
  }

  currentAimHit = getAimHit();
  updateHud(frameTime);
  renderer.render(scene, camera);
}

// Render one complete frame before dismissing the loading overlay.
scene.updateMatrixWorld(true);
updateCamera(1 / 60);
renderer.render(scene, camera);
requestAnimationFrame(() => {
  loadingScreen.classList.add("done");
  window.setTimeout(() => loadingScreen.remove(), 700);
});
animate();
