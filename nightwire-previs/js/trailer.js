import * as THREE from "three";
import { BEATS, TITLE, CAST, DISTRICTS } from "./beats.js";
import { TrailerAudio } from "./audio.js";
import { createPrevisWorld, showStage, updateRain, applyCameraShot } from "./world3d.js";
import { renderOverlay, clearOverlays } from "./overlays.js";

const $ = (s) => document.querySelector(s);
const DEMO = new URLSearchParams(location.search).has("demo");

const audio = new TrailerAudio();
let renderer, scene, camera, clock, world;
let playing = false;
let beatIndex = -1;
let beatStart = 0;
let beatDuration = 1;
let voTimer;
let footTimer = 0;
let advancing = false;

function init() {
  const canvas = $("#stage");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;

  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 2, 6);

  clock = new THREE.Clock();
  world = createPrevisWorld();
  scene = world.scene;

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  buildStoryboard();
  buildCastStrip();
  loop();
}

function buildStoryboard() {
  const strip = $("#storyboard-strip");
  strip.innerHTML = "";
  BEATS.forEach((b, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "sb-card";
    card.innerHTML = `<span class="sb-num">${String(i + 1).padStart(2, "0")}</span><span class="sb-label">${b.label}</span>`;
    card.addEventListener("click", () => {
      if (!playing) jumpToBeat(i);
      else jumpToBeat(i);
    });
    strip.appendChild(card);
  });
}

function buildCastStrip() {
  const el = $("#cast-list");
  if (!el) return;
  el.innerHTML = CAST.map((c) => `<li><strong>${c.name}</strong><span>${c.role}</span></li>`).join("");
  const d = $("#district-list");
  if (d) d.innerHTML = DISTRICTS.map((x) => `<li>${x}</li>`).join("");
}

function setCaption(text) {
  const el = $("#caption");
  if (!text) {
    el.classList.add("hidden");
    return;
  }
  el.textContent = text;
  el.classList.remove("hidden");
}

function setVO(text) {
  const el = $("#vo-line");
  clearTimeout(voTimer);
  if (!text) {
    el.classList.add("hidden");
    return;
  }
  el.textContent = text;
  el.classList.remove("hidden");
  voTimer = setTimeout(() => el.classList.add("hidden"), Math.min(beatDuration - 400, 4200));
}

function showTitleCard(card) {
  const el = $("#title-card");
  if (!card) {
    el.classList.add("hidden");
    return;
  }
  $("#tc-act").textContent = card.act || "";
  $("#tc-title").textContent = card.title || "";
  $("#tc-sub").textContent = card.sub || "";
  el.classList.remove("hidden");
}

function hideTitleCard() {
  $("#title-card").classList.add("hidden");
}

function updateProgress() {
  const p = (beatIndex + 1) / BEATS.length;
  $("#progress-fill").style.width = `${p * 100}%`;
  $("#beat-label").textContent = BEATS[beatIndex]?.label || "";
  $$(".sb-card").forEach((c, i) => c.classList.toggle("active", i === beatIndex));
}

function $$(s) {
  return [...document.querySelectorAll(s)];
}

function enterBeat(i) {
  if (i < 0 || i >= BEATS.length) {
    playing = false;
    advancing = false;
    return;
  }
  advancing = false;
  beatIndex = i;
  const beat = BEATS[i];
  beatDuration = DEMO ? Math.min(beat.durationMs, 900) : beat.durationMs;
  beatStart = performance.now();

  clearOverlays($("#overlay-root"));
  hideTitleCard();

  if (beat.scene === "black" || beat.scene === "logo" || beat.scene === "end" || beat.scene === "ui-focus") {
    showStage(world.stages, beat.scene === "ui-focus" ? "board" : beat.scene);
    if (beat.scene === "black") {
      scene.background.setHex(0x000000);
      world.rain.visible = false;
    } else {
      scene.background.setHex(0x05070c);
      world.rain.visible = beat.scene !== "logo" && beat.scene !== "end";
    }
  } else {
    scene.background.setHex(0x05070c);
    world.rain.visible = true;
    showStage(world.stages, beat.scene);
  }

  // Day/night: modulate exposure
  if (beat.id === "day-night") {
    renderer.toneMappingExposure = 0.7;
  } else {
    renderer.toneMappingExposure = 1.05;
  }

  setCaption(beat.caption);
  setVO(beat.vo);
  if (beat.titleCard) {
    showTitleCard(beat.titleCard);
  }

  if (beat.overlays) {
    beat.overlays.forEach((o, idx) => {
      setTimeout(() => renderOverlay($("#overlay-root"), o), DEMO ? 50 : 200 + idx * 180);
    });
  }

  audio.applyBeat(beat.audio || {});
  if (beat.audio?.footsteps && !DEMO) {
    footTimer = 0.4;
  }

  updateProgress();
  $("#cinema-fade").classList.remove("on");
}

function jumpToBeat(i) {
  if (i < 0 || i >= BEATS.length) return;
  advancing = true;
  $("#cinema-fade").classList.add("on");
  setTimeout(() => enterBeat(i), DEMO ? 80 : 280);
}

function nextBeat() {
  if (advancing || !playing) return;
  if (beatIndex >= BEATS.length - 1) {
    playing = false;
    advancing = false;
    $("#btn-play").textContent = "Replay Trailer";
    $("#trailer-complete").classList.remove("hidden");
    return;
  }
  advancing = true;
  $("#cinema-fade").classList.add("on");
  setTimeout(() => {
    enterBeat(beatIndex + 1);
  }, DEMO ? 80 : 320);
}

function startTrailer() {
  audio.init();
  audio.resume();
  audio.startScore();
  audio.startRain();
  playing = true;
  $("#intro-gate").classList.add("hidden");
  $("#trailer-chrome").classList.remove("hidden");
  $("#trailer-complete").classList.add("hidden");
  $("#btn-play").textContent = "Playing…";
  jumpToBeat(0);
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = performance.now() * 0.001;

  if (playing && beatIndex >= 0 && !advancing) {
    const elapsed = performance.now() - beatStart;
    const progress = Math.min(1, elapsed / beatDuration);
    const beat = BEATS[beatIndex];
    if (beat) {
      if (beat.camera?.shot) {
        applyCameraShot(camera, beat.camera.shot, t, progress);
      } else if (beat.scene === "logo" || beat.scene === "end" || beat.scene === "black") {
        camera.position.set(0, 2, 8);
        camera.lookAt(0, 1, 0);
      }

      if (beat.id === "day-night") {
        renderer.toneMappingExposure = 0.65 + Math.sin(progress * Math.PI) * 0.7;
        scene.fog.density = 0.02 + (1 - Math.sin(progress * Math.PI)) * 0.025;
      }

      if (beat.id === "detective-vision") {
        renderer.toneMappingExposure = 1.25;
        scene.fog.color.setHex(0x052028);
      } else if (beat.id !== "day-night") {
        scene.fog.color.setHex(0x080b14);
      }

      if (beat.audio?.footsteps) {
        footTimer -= dt;
        if (footTimer <= 0) {
          audio.footsteps();
          footTimer = 0.45;
        }
      }

      const car = world.stages.drive?.getObjectByName("car");
      if (car && (beat.scene === "drive" || beat.scene === "chase")) {
        car.position.z = 4 - progress * 12;
      }

      updateRain(world.rain, dt, camera);

      if (elapsed >= beatDuration) nextBeat();
    }
  }

  renderer.render(scene, camera);
}

/* Events */
$("#btn-start-trailer").addEventListener("click", startTrailer);
$("#btn-play").addEventListener("click", () => {
  if (!playing) startTrailer();
});
$("#btn-skip").addEventListener("click", () => {
  if (playing) nextBeat();
});
$("#btn-open-deck").addEventListener("click", () => {
  $("#vision-deck").classList.remove("hidden");
});
$("#btn-close-deck").addEventListener("click", () => {
  $("#vision-deck").classList.add("hidden");
});
$$(".deck-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".deck-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    $$(".deck-panel").forEach((p) => p.classList.add("hidden"));
    $(`#deck-${tab.dataset.deck}`).classList.remove("hidden");
  });
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (!playing) startTrailer();
    else nextBeat();
  }
  if (e.code === "ArrowRight" && playing) nextBeat();
});

init();

if (DEMO) {
  setTimeout(startTrailer, 400);
}

window.__trailer = { BEATS, TITLE, startTrailer };
