/* =============================================================================
   main.js — bootstrap, renderer, lighting, day/night cycle and the game loop
   -----------------------------------------------------------------------------
   Wires together the modules:
     • Creates the Three.js renderer / scene / camera.
     • Generates the procedural city (city.js).
     • Spawns the player (player.js) and third-person camera (controls.js).
     • Runs a dynamic sun + hemisphere light with a day/night cycle that also
       toggles building window glow.
     • Drives the fixed-timestep-ish update loop and updates the HUD.

   Performance choices for desktop browsers:
     • Single directional (sun) shadow map sized to the action, not the map.
     • Pixel ratio capped at 2.
     • Fog hides the far city so we can keep the draw distance modest.
   ============================================================================= */

import * as THREE from 'three';
import { generateCity } from './city.js';
import { Player } from './player.js';
import {
  initControls, sampleInput, endFrameInput, input, ThirdPersonCamera,
} from './controls.js';
import { raycastBoxes } from './physics.js';

/* ---- DOM handles --------------------------------------------------------- */
const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const crosshair = document.getElementById('crosshair');
const hud = document.getElementById('hud');
const elSpeed = document.getElementById('stat-speed');
const elState = document.getElementById('stat-state');
const elHeight = document.getElementById('stat-height');
const elCombo = document.getElementById('stat-combo');
const elTime = document.getElementById('stat-time');

/* ---- Renderer ------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ---- Scene & camera ------------------------------------------------------ */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8fb0d8, 220, 720);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 3000,
);
camera.position.set(0, 90, 30);

/* ---- Sky dome ------------------------------------------------------------ */
// A large inverted sphere with a vertical gradient shader. Cheap and colour is
// driven each frame by the day/night cycle.
const skyUniforms = {
  topColor: { value: new THREE.Color(0x2a5cff) },
  bottomColor: { value: new THREE.Color(0xffd9a0) },
  offset: { value: 33 },
  exponent: { value: 0.7 },
};
const skyGeo = new THREE.SphereGeometry(2000, 24, 12);
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  vertexShader: /* glsl */`
    varying vec3 vWorldPosition;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPosition = wp.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
      float t = pow(max(h, 0.0), exponent);
      gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
    }`,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

/* ---- Lighting ------------------------------------------------------------ */
const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x2a2f3a, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe6bf, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 600;
const S = 160; // shadow frustum half-size (follows the player)
sun.shadow.camera.left = -S;
sun.shadow.camera.right = S;
sun.shadow.camera.top = S;
sun.shadow.camera.bottom = -S;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);

/* A subtle blue rim/fill from the opposite side keeps night readable. */
const fill = new THREE.DirectionalLight(0x4066aa, 0.35);
fill.position.set(-1, 0.5, -1);
scene.add(fill);

/* ---- World --------------------------------------------------------------- */
const city = generateCity(scene, { seed: 7, blocks: 9, blockSize: 62, street: 22 });
const world = { hash: city.hash, boxes: city.boxes, bounds: city.bounds };

/* ---- Player & camera rig ------------------------------------------------- */
const player = new Player(scene, world);
// Spawn on top of a tall-ish building near the centre for an immediate view.
player.pos.set(20, 130, 20);
player.vel.set(6, 0, 10);

const tpCam = new ThirdPersonCamera(camera);
tpCam.pos.copy(camera.position);

/* ---- Bird flock (cheap ambient life) ------------------------------------ */
const birds = [];
{
  const g = new THREE.ConeGeometry(0.6, 2.4, 3);
  g.rotateX(Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({ color: 0x222833 });
  const flock = new THREE.InstancedMesh(g, m, 40);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 40; i++) {
    birds.push({
      angle: Math.random() * Math.PI * 2,
      radius: 120 + Math.random() * 260,
      y: 120 + Math.random() * 120,
      speed: 0.15 + Math.random() * 0.2,
      dummy,
      i,
    });
  }
  flock.dummyObj = dummy;
  scene.add(flock);
  world.flock = flock;
}

/* ---- Day/night cycle ----------------------------------------------------- */
// `dayTime` runs 0..1 across a full cycle. We start near sunset for the mood
// described in the concept art.
let dayTime = 0.12;
const DAY_LENGTH = 90; // seconds for a full cycle

const dayTop = new THREE.Color(0x2a5cff);
const dayBottom = new THREE.Color(0xffd9a0);
const nightTop = new THREE.Color(0x060a1a);
const nightBottom = new THREE.Color(0x101830);
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();

function updateDayNight(dt) {
  dayTime = (dayTime + dt / DAY_LENGTH) % 1;

  // Sun angle sweeps a semicircle; below horizon => night.
  const sunAngle = dayTime * Math.PI * 2;
  const sunH = Math.sin(sunAngle);               // -1..1 height factor
  const daylight = THREE.MathUtils.clamp(sunH * 1.4 + 0.35, 0, 1);
  const night = 1 - daylight;

  // Position the sun relative to the player so shadows are always crisp nearby.
  const cx = player.pos.x, cz = player.pos.z;
  sun.position.set(cx + Math.cos(sunAngle) * 300, 60 + sunH * 320, cz + Math.sin(sunAngle) * 200);
  sun.target.position.set(cx, 0, cz);
  sun.intensity = 0.15 + daylight * 2.4;
  sun.color.setHSL(0.09 + 0.02 * daylight, 0.6, 0.55 + 0.1 * daylight);
  hemi.intensity = 0.15 + daylight * 0.55;

  // Sky gradient interpolates day<->night.
  _c1.copy(nightTop).lerp(dayTop, daylight);
  _c2.copy(nightBottom).lerp(dayBottom, daylight);
  skyUniforms.topColor.value.copy(_c1);
  skyUniforms.bottomColor.value.copy(_c2);
  scene.fog.color.copy(_c2);

  // Window glow ramps up at night.
  city.setNight(night);

  // HUD label.
  elTime.textContent = daylight > 0.55 ? 'day' : daylight > 0.2 ? 'dusk' : 'night';
}

/* ---- Crosshair lock-on feedback ----------------------------------------- */
const _aim = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _lockBoxes = [];
function updateCrosshair() {
  tpCam.getAim(_aim);
  _origin.copy(player.pos); _origin.y += 2.4;
  world.hash.query(player.pos.x, player.pos.z, 4, _lockBoxes);
  const hit = raycastBoxes(_origin, _aim, 220, _lockBoxes);
  crosshair.classList.toggle('locked-on', !!hit && hit.point.y > player.pos.y - 4);
}

/* ---- Birds animation ----------------------------------------------------- */
function updateBirds(dt) {
  const flock = world.flock;
  const dummy = flock.dummyObj;
  for (const b of birds) {
    b.angle += b.speed * dt;
    const x = player.pos.x * 0.2 + Math.cos(b.angle) * b.radius;
    const z = player.pos.z * 0.2 + Math.sin(b.angle) * b.radius;
    dummy.position.set(x, b.y + Math.sin(b.angle * 3) * 6, z);
    dummy.rotation.y = -b.angle + Math.PI / 2;
    dummy.updateMatrix();
    flock.setMatrixAt(b.i, dummy.matrix);
  }
  flock.instanceMatrix.needsUpdate = true;
}

/* ---- HUD ----------------------------------------------------------------- */
function updateHUD() {
  elSpeed.textContent = Math.round(player.speed);
  elState.textContent = player.state;
  elHeight.textContent = Math.round(player.pos.y);
  elCombo.textContent = player.comboCount;
}

/* ---- Resize -------------------------------------------------------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---- Game loop ----------------------------------------------------------- */
let running = false;
let manualStep = false;   // when true, the rAF loop stops advancing; step() drives it
let last = performance.now();

/**
 * Advance and render a single frame by `dt` seconds. Factored out of the rAF
 * loop so an automated recorder can drive the simulation deterministically at a
 * fixed timestep (smooth video regardless of render speed).
 */
function frame(dt) {
  sampleInput();

  // Optional scripted driver (used by the automated demo recorder). It runs
  // after sampleInput so it can override the input snapshot for the frame. It
  // is undefined during normal play, so this costs nothing then.
  if (typeof window.__AUTOPILOT__ === 'function') window.__AUTOPILOT__(dt, input, player, world, tpCam);

  // Extra camera pull-back while moving fast for a sense of speed.
  const extra = Math.min(player.speed * 0.12, 5);

  player.update(dt, input, tpCam);
  tpCam.update(player.pos, dt, world.hash, extra);

  updateDayNight(dt);
  updateBirds(dt);
  updateCrosshair();
  updateHUD();

  endFrameInput();

  renderer.render(scene, camera);
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!running || manualStep) return;
  frame(dt);
}

/* ---- Start --------------------------------------------------------------- */
initControls({ canvas, overlay, startBtn, crosshair }, () => {
  running = true;
  hud.classList.add('visible');
  last = performance.now();
});

// Render one frame immediately so the city is visible behind the overlay.
renderer.render(scene, camera);
requestAnimationFrame(loop);

/* Expose a tiny hook so an automated demo/recorder can drive input & sample
   the world without touching the DOM. Harmless in normal play. */
window.__SKYLINE__ = { player, camera, scene, input, world, tpCam,
  setRunning: (v) => { running = v; last = performance.now(); if (v) hud.classList.add('visible'); },
  // Deterministic stepping for the recorder: freeze the rAF loop and advance by
  // a fixed dt on demand so captured frames are evenly spaced in sim time.
  setManual: (v) => { manualStep = v; running = true; },
  step: (dt) => frame(dt) };
