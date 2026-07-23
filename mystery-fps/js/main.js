import * as THREE from "three";
import { BRIEF, STUDY_LOCK, RADIO } from "./data.js";
import { AudioBus } from "./audio.js";
import { buildWorld, resetInvestigation } from "./world.js";
import { createDust, updateDust, createRain, updateRain } from "./fx.js";
import { $, $$, DEMO, waitMs, showScreen } from "./util.js";
import { createState, resetCaseState } from "./state.js";
import { createCinema } from "./cinema.js";
import { createUI } from "./ui.js";
import { createPlayer } from "./player.js";
import { createInvestigation } from "./investigation.js";
import { runDemo } from "./demo.js";

const state = createState();
const keys = {};
const audio = new AudioBus();

let renderer, scene, camera, clock, world, rain, dust, minimapCtx;
let cinema, ui, player, investigation;

function getCamera() { return camera; }
function getWorld() { return world; }
function getRenderer() { return renderer; }

function initEngine() {
  const canvas = $("#game-canvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 120);
  camera.position.set(0, 1.65, 2);

  clock = new THREE.Clock();
  world = buildWorld(scene);
  if (world.flashlight) {
    camera.add(world.flashlight);
    camera.add(world.flashlight.target);
    world.flashlight.target.position.set(0.15, -0.05, -1);
  }
  scene.add(camera);

  rain = createRain(1400);
  scene.add(rain);
  dust = createDust(350);
  scene.add(dust);

  minimapCtx = $("#minimap").getContext("2d");

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function wireSystems() {
  cinema = createCinema({ audio });

  ui = createUI({
    state,
    audio,
    cinema,
    getWorld,
    requestLock: () => player.requestLock(),
    DEMO,
  });

  player = createPlayer({
    state,
    keys,
    audio,
    ui,
    getCamera,
    getWorld,
    getRenderer,
    DEMO,
  });
  player.setCinema(cinema);

  investigation = createInvestigation({
    state,
    audio,
    ui,
    cinema,
    player,
    getWorld,
  });
}

async function playBrief() {
  await cinema.fade(true, DEMO ? 200 : 500);
  showScreen("#screen-brief");
  await cinema.fade(false, DEMO ? 200 : 600);
  audio.noirHit();
  const box = $("#brief-lines");
  box.innerHTML = "";
  for (const line of BRIEF) {
    const p = document.createElement("p");
    p.textContent = line;
    box.appendChild(p);
    audio.radio();
    await waitMs(DEMO ? 180 : 720);
  }
}

async function startMission() {
  if (state.cinemaBusy) return;
  state.cinemaBusy = true;
  audio.init();
  audio.resume();

  await cinema.fade(true, DEMO ? 250 : 700);
  await cinema.titleCard({
    act: "ACT I",
    title: "Blackwood Manor",
    sub: "Nightfall. A locked estate. A dead lord.",
    hold: DEMO ? 450 : 1800,
  });

  state.playing = true;
  resetCaseState(state);
  state.openingCamDur = DEMO ? 0.8 : 2.8;
  state.openingCam = state.openingCamDur;

  $("#accuse-select").value = "";
  $$(".jtab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "evidence"));
  $("#accuse-modal").classList.add("hidden");
  $("#result-chain").innerHTML = "";
  ui.syncAccuseButton();

  camera.position.set(0, 1.65, 3.4);
  camera.fov = 78;
  camera.updateProjectionMatrix();
  player.syncFlashlight();
  $("#radio-log").innerHTML = "";

  resetInvestigation(scene, world);

  if (world.studyDoor) {
    const lock = STUDY_LOCK.block;
    world.studyDoor.visible = true;
    world.studyDoor.rotation.y = 0;
    world.studyDoor.position.set(lock.x, lock.h / 2, lock.z);
    if (!world.colliders.includes(world.studyDoor)) world.colliders.push(world.studyDoor);
  }
  if (world.studySeal) world.studySeal.visible = true;

  showScreen("#screen-game");
  $("#hud").classList.remove("hidden");
  $("#journal").classList.add("hidden");
  $("#evidence-modal").classList.add("hidden");
  ui.updateHUD();
  cinema.roomBanner(ui.roomChapter("entrance"));
  ui.pushRadio("Voiceover: The manor holds its breath. So do you.");
  state.radioFired.add(RADIO[0].text);
  audio.startAmbience();
  audio.startScore();
  state.cinemaBusy = false;
  await cinema.fade(false, DEMO ? 250 : 700);

  if (DEMO) {
    $("#pause-hint").classList.add("hidden");
    runDemo({ state, keys, camera, world, investigation, ui, player });
  } else {
    $("#pause-hint").classList.remove("hidden");
    setTimeout(() => player.requestLock(), 200);
  }
}

function bindEvents() {
  $("#btn-start").addEventListener("click", async () => {
    audio.init();
    audio.resume();
    await playBrief();
    // Demo boots via main; manual play waits for Cut to Manor.
  });
  $("#btn-deploy").addEventListener("click", startMission);
  $("#btn-close-ev").addEventListener("click", () => ui.closeEvidence());
  $("#btn-close-journal").addEventListener("click", () => {
    state.journalOpen = false;
    $("#journal").classList.add("hidden");
    if (state.playing && !DEMO) player.requestLock();
  });
  $("#btn-accuse").addEventListener("click", () => ui.openDossier());
  $("#btn-dossier-cancel").addEventListener("click", () => ui.closeDossier());
  $("#btn-dossier-confirm").addEventListener("click", () => investigation.confirmAccusation());
  $("#accuse-select").addEventListener("change", () => ui.syncAccuseButton());
  $("#btn-replay").addEventListener("click", () => showScreen("#screen-title"));
  $("#btn-hud-journal").addEventListener("click", () => {
    if (state.playing && !state.modalOpen) ui.toggleJournal();
  });
  $("#game-canvas").addEventListener("click", () => {
    if (state.playing && !state.locked && !state.modalOpen && !state.journalOpen && !DEMO) {
      player.requestLock();
    }
  });

  $$(".jtab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".jtab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.journalTab = tab.dataset.tab;
      ui.renderJournal();
    });
  });

  document.addEventListener("pointerlockchange", () => player.onLockChange());
  document.addEventListener("mousemove", (e) => player.onMouseMove(e));
  document.addEventListener("mousedown", () => {
    if (state.playing && !state.locked && !DEMO) player.requestLock();
  });
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (!state.playing) return;
    if (e.code === "Escape") {
      if (!$("#accuse-modal").classList.contains("hidden")) {
        ui.closeDossier();
        return;
      }
      if (state.modalOpen) {
        ui.closeEvidence();
        return;
      }
      if (state.journalOpen) ui.toggleJournal();
      return;
    }
    if (e.code === "KeyE") investigation.tryInteract();
    if (e.code === "KeyF") player.toggleFlashlight();
    if (e.code === "Tab") {
      e.preventDefault();
      if (!state.modalOpen) ui.toggleJournal();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05) * state.timeScale;

  if (state.slowMoT > 0) {
    state.slowMoT -= dt / Math.max(state.timeScale, 0.01);
    if (state.slowMoT <= 0) {
      state.slowMoT = 0;
      state.timeScale = 1;
    }
  }

  if (state.playing) {
    player.updatePlayer(dt);
    player.updateBattery(dt);
    player.updateStudyDoor(dt);
    updateRain(rain, dt, camera);
    updateDust(dust, dt, camera);
    player.updateMarkers(dt);
    player.updateStorm(dt, rain);
    ui.drawMinimap(minimapCtx, camera);

    const tension = Math.min(
      1,
      0.08
        + state.clues.size * 0.06
        + (!state.flashlightOn || state.battery < 25 ? 0.2 : 0)
        + (state.clues.size >= 5 ? 0.15 : 0)
    );
    audio.setTension(tension);
    audio.setScoreIntensity(tension);

    if (state.openingCam > 0) {
      state.openingCam -= dt;
      const dur = state.openingCamDur || 2.8;
      const t = 1 - Math.max(0, state.openingCam) / dur;
      camera.position.z = 3.4 - t * 1.4;
      camera.fov = 78 - t * 6;
      camera.updateProjectionMatrix();
    }

    world.lights.forEach((l, i) => {
      if (l === world.flashlight) return;
      if (l.isPointLight) {
        l.intensity = 2.2 + Math.sin(performance.now() * 0.003 + i) * 0.2;
      }
    });
  }

  renderer.render(scene, camera);
}

/* Boot */
initEngine();
wireSystems();
bindEvents();
loop();

if (DEMO) {
  // Single path: brief → mission (avoid double startMission from deploy).
  setTimeout(async () => {
    audio.init();
    audio.resume();
    await playBrief();
    await startMission();
  }, 700);
}

window.__game = {
  state,
  camera,
  tryInteract: () => investigation.tryInteract(),
  startMission,
  confirmAccusation: () => investigation.confirmAccusation(),
};
