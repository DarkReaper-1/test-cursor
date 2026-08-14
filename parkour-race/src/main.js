import * as THREE from 'three';
import { Input } from './input.js';
import { AudioFX } from './audio.js';
import { buildLevel, buildTrackMeshes } from './track.js';
import { Runner } from './runner.js';
import { Stickman } from './stickman.js';
import { AIBrain } from './ai.js';
import { Effects } from './effects.js';
import { ChaseCamera } from './camera.js';
import { UI, ordinal } from './ui.js';

// ---------------------------------------------------------------------------

const AI_NAMES = ['Blaze', 'Kiko', 'Rex', 'Nova', 'Juno', 'Dash', 'Milo', 'Zippy', 'Ace', 'Piper'];
const AI_COLORS = [0xff5d73, 0x51e08a, 0x35d0ff, 0xc490ff, 0xffa94d, 0x6bd4c3, 0xff8ac2];
const PLAYER_COLOR = 0xffd93b;
const NUM_AI = 7;
const SAVE_KEY = 'parkour-dash-save-v1';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c4ff);
scene.fog = new THREE.Fog(0x87c4ff, 60, 150);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
const chase = new ChaseCamera(camera);

// lights
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x8a7a66, 0.95));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.35);
sun.position.set(-14, 30, -10);
scene.add(sun);

// simple sun disc + clouds for depth
{
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(9, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6cc, fog: false }));
  sunDisc.position.set(-70, 65, 120);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
}

const input = new Input(document.body);
const audio = new AudioFX();
const ui = new UI();
const fx = new Effects(scene);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.level === 'number') return s;
  } catch (_) { /* fresh save */ }
  return { level: 0, wins: 0 };
}
function persistSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }
const save = loadSave();

// ---------------------------------------------------------------------------
// Race setup
// ---------------------------------------------------------------------------

let state = 'menu';          // menu | countdown | race | results
let track = null;
let trackGroup = null;
let runners = [];            // [player, ...ai]
let rigs = new Map();        // runner -> Stickman
let brains = [];             // AIBrain[]
let player = null;
let finishOrder = [];
let countdownT = 0;
let countdownStep = 0;
let resultsShown = false;
let finishCamTimer = 0;

function clearLevel() {
  if (trackGroup) {
    scene.remove(trackGroup);
    trackGroup.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
  }
  for (const rig of rigs.values()) scene.remove(rig.root);
  rigs.clear();
  runners = []; brains = []; finishOrder = [];
  fx.reset();
}

function setupLevel(levelIndex) {
  clearLevel();
  track = buildLevel(levelIndex);
  trackGroup = buildTrackMeshes(track);
  scene.add(trackGroup);

  // player
  player = new Runner(track, { color: PLAYER_COLOR, name: 'You', isPlayer: true });
  player.onEvent = onPlayerEvent;
  runners.push(player);

  // AI — skill scales with level, still beatable
  const difficulty = Math.min(1, 0.35 + levelIndex * 0.09);
  for (let i = 0; i < NUM_AI; i++) {
    const skill = Math.max(0.1, Math.min(1, difficulty + (i / NUM_AI - 0.5) * 0.5));
    const r = new Runner(track, {
      color: AI_COLORS[i % AI_COLORS.length],
      name: AI_NAMES[(levelIndex * 3 + i) % AI_NAMES.length],
      maxSpeed: 9.6 + skill * 2.1,
    });
    r.baseMaxSpeed = r.maxSpeed;
    r.onEvent = (type) => onAIEvent(r, type);
    runners.push(r);
    brains.push(new AIBrain(r, track, { skill, seed: levelIndex * 31 + i }));
  }
  player.baseMaxSpeed = player.maxSpeed;

  // grid start: 2 rows of 4
  runners.forEach((r, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    r.reset((col - 1.5) * 2.2, row * -1.6);
    const rig = new Stickman(r.color, { nameTag: r.isPlayer ? null : r.name });
    rigs.set(r, rig);
    scene.add(rig.root);
    rig.update(0.016, r, 'idle');
  });

  ui.initProgress(runners);
  chase.snapTo(player);
}

// ---------------------------------------------------------------------------
// Events -> FX + audio (player gets the full treatment, AI just dust)
// ---------------------------------------------------------------------------

function onPlayerEvent(type, data) {
  const { x, y, z } = player;
  switch (type) {
    case 'step': audio.footstep(data); break;
    case 'jump':
      audio.jump(); rigs.get(player).jumpStretch();
      if (data?.big) fx.dust(x, y, z);
      break;
    case 'rampLaunch': audio.jump(); audio.boost(); fx.dust(x, y, z, true); rigs.get(player).jumpStretch(); break;
    case 'tramp': audio.spring(); fx.trampBurst(x, y, z); rigs.get(player).jumpStretch(); break;
    case 'vault': audio.vault(); fx.dust(x, y, z); break;
    case 'bumper': audio.bumper(); audio.boost(); fx.boostBurst(x, y, z); ui.toast('BOOST!', '#ffe36b'); break;
    case 'perfect':
      audio.perfect(); audio.boost(); fx.boostBurst(x, y, z);
      ui.toast('PERFECT!', '#7dff6b'); rigs.get(player).landSquash(false);
      chase.addShake(0.25);
      break;
    case 'goodLanding': audio.land(false); fx.dust(x, y, z); rigs.get(player).landSquash(false); break;
    case 'badLanding':
      audio.thud(); fx.dust(x, y, z, true); rigs.get(player).landSquash(true);
      ui.toast('OUCH!', '#ff9d9d'); chase.addShake(0.5);
      break;
    case 'land':
      audio.land(data?.impact > 9); fx.dust(x, y, z, data?.impact > 9);
      rigs.get(player).landSquash(data?.impact > 9);
      if (data?.impact > 9) chase.addShake(0.3);
      break;
    case 'wallBump': audio.thud(); chase.addShake(0.55); ui.toast('BONK!', '#ff9d9d'); break;
    case 'grindStart': audio.grindStart(); break;
    case 'grindEnd': audio.grindStop(); break;
    case 'fall': audio.fall(); audio.grindStop(); break;
    case 'respawn': ui.flashFade(() => chase.snapTo(player)); break;
    case 'finish': onRunnerFinish(player); break;
  }
}

function onAIEvent(r, type) {
  switch (type) {
    case 'rampLaunch': case 'tramp': fx.dust(r.x, r.y, r.z); break;
    case 'perfect': fx.boostBurst(r.x, r.y, r.z); break;
    case 'finish': onRunnerFinish(r); break;
  }
}

function onRunnerFinish(r) {
  if (!finishOrder.includes(r)) {
    finishOrder.push(r);
    r.place = finishOrder.length;
    if (r === player) {
      audio.fanfare(r.place <= 3);
      if (r.place === 1) fx.confetti(r.x, r.y, r.z);
      finishCamTimer = 1.4;
    }
  }
}

// ---------------------------------------------------------------------------
// Race flow
// ---------------------------------------------------------------------------

function startRace() {
  setupLevel(save.level);
  ui.showHud(save.level);
  state = 'countdown';
  countdownT = 0;
  countdownStep = -1;
  resultsShown = false;
}

function beginRunning() {
  for (const r of runners) r.running = true;
}

function currentStandings() {
  return [...runners].sort((a, b) => b.progress() - a.progress());
}

function playerPlace() {
  if (player.finished) return player.place;
  const standings = currentStandings();
  return standings.indexOf(player) + 1;
}

ui.onNext = () => {
  audio.click();
  if (playerFinalPlace() <= 3) { save.level += 1; persistSave(); }
  ui.showMenu(save.level);
  state = 'menu';
};
ui.onRetry = () => {
  audio.click();
  ui.showMenu(save.level);
  state = 'menu';
};

function playerFinalPlace() { return player.place || playerPlace(); }

// ---------------------------------------------------------------------------
// Main loop — fixed timestep simulation, variable render
// ---------------------------------------------------------------------------

const SIM_DT = 1 / 120;
let accum = 0;
let lastTime = performance.now();

ui.showMenu(save.level);
setupLevel(save.level);   // build the level behind the menu

function simulate(dt) {
  if (state === 'countdown') {
    countdownT += dt;
    const step = Math.floor(countdownT);
    if (step !== countdownStep) {
      countdownStep = step;
      if (step < 3) { ui.countdown(3 - step); audio.beep(false); }
      else if (step === 3) { ui.countdown(0); audio.beep(true); beginRunning(); state = 'race'; }
    }
  }

  if (state === 'race' || state === 'results') {
    input.update(dt);
    player.update(dt, state === 'race' ? input.steer : 0);
    brains.forEach((b) => b.runner.update(dt, b.update(dt, player.z)));

    if (player.boosted && player.grounded && Math.random() < dt * 40) {
      fx.trail(player.x, player.y, player.z);
    }
    if (player.grindRail && Math.random() < dt * 50) {
      fx.sparks(player.x, player.y, player.z);
    }
  }
}

function render(dt) {
  // rigs
  for (const r of runners) {
    const rig = rigs.get(r);
    let mode = null;
    if (state === 'menu' || state === 'countdown') mode = 'idle';
    else if (r.finished) mode = (r.place === 1 || (r.isPlayer && r.place <= 3)) ? 'win' : (r.speed < 0.5 ? 'lose' : null);
    rig.update(dt, r, mode);
  }

  fx.update(dt);
  chase.update(dt, player, player.boosted && state === 'race');

  if (state === 'race') {
    ui.setPosition(playerPlace(), runners.length);
    ui.updateProgress(runners, track.finishZ);
    ui.setSpeedlines(player.boosted);

    if (player.finished) {
      finishCamTimer -= dt;
      if (finishCamTimer <= 0 && !resultsShown) {
        resultsShown = true;
        state = 'results';
        ui.setSpeedlines(false);
        // freeze final standings: finished runners by order, others by progress
        const rest = currentStandings().filter((r) => !finishOrder.includes(r));
        const finalStandings = [...finishOrder, ...rest];
        finalStandings.forEach((r, i) => { if (!r.place) r.place = i + 1; });
        ui.showResults(player.place, save.level, finalStandings, player);
      }
    }
  }

  renderer.render(scene, camera);
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 0.1);   // tab-switch protection

  // menu interaction
  if (state === 'menu' && input.consumeTap()) {
    audio.unlock();
    audio.click();
    startRace();
  } else if (state !== 'menu') {
    input.consumeTap();
  }

  accum += dt;
  let steps = 0;
  while (accum >= SIM_DT && steps < 12) {
    simulate(SIM_DT);
    accum -= SIM_DT;
    steps++;
  }

  render(dt);
}
requestAnimationFrame(frame);

// unlock audio on any first gesture
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
