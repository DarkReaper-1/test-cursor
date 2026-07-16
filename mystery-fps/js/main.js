import * as THREE from "three";
import { BRIEF, CLUES, SOLUTION, ROOM_BOUNDS } from "./data.js";
import { AudioBus } from "./audio.js";
import { buildWorld, playerCollides } from "./world.js";

const $ = (s) => document.querySelector(s);

const DEMO = new URLSearchParams(location.search).has("demo");

const state = {
  playing: false,
  locked: false,
  health: 100,
  ammo: 12,
  reserve: 36,
  reloading: false,
  clues: new Set(),
  kills: 0,
  startTime: 0,
  yaw: 0,
  pitch: 0,
  room: "entrance",
  modalOpen: false,
  journalOpen: false,
};

const keys = {};
const audio = new AudioBus();

let renderer, scene, camera, clock;
let world;
let rain;
let bob = 0;
let shootCooldown = 0;
let toastTimer;
let demoScript;

/* ── Screens ── */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
}

function setObjective(text) {
  $("#objective-text").textContent = text;
}

function updateHUD() {
  $("#health-fill").style.width = `${Math.max(0, state.health)}%`;
  $("#ammo-count").textContent = state.ammo;
  $("#ammo-reserve").textContent = state.reserve;
  $("#clue-stat").textContent = `Evidence ${state.clues.size}/8`;
  $("#room-stat").textContent = ROOM_BOUNDS[state.room]?.name || state.room;
  $("#btn-accuse").disabled = state.clues.size < 5;
  if (state.clues.size >= 5) {
    setObjective("Open journal (Tab) and accuse the killer.");
  } else if (state.clues.size >= 3) {
    setObjective("Keep searching. Hostiles inbound.");
  }
}

/* ── Init Three ── */

function initEngine() {
  const canvas = $("#game-canvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 120);
  camera.position.set(0, 1.65, 2);

  clock = new THREE.Clock();
  world = buildWorld(scene);
  camera.add(world.weapon);
  scene.add(camera);

  // Rain particles
  const count = 1200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = Math.random() * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  rain = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0x88aacc, size: 0.04, transparent: true, opacity: 0.35 })
  );
  scene.add(rain);

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

/* ── Pointer / input ── */

function requestLock() {
  if (DEMO) return;
  $("#game-canvas").requestPointerLock();
}

function onLockChange() {
  state.locked = document.pointerLockElement === $("#game-canvas");
  $("#pause-hint").classList.toggle("hidden", state.locked || !state.playing || state.modalOpen);
}

function onMouseMove(e) {
  if (!state.locked || !state.playing || state.modalOpen) return;
  state.yaw -= e.movementX * 0.0022;
  state.pitch -= e.movementY * 0.0022;
  state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch));
}

function onMouseDown(e) {
  if (!state.playing) return;
  if (!state.locked && !DEMO) {
    requestLock();
    return;
  }
  if (e.button === 0) fire();
}

/* ── Combat ── */

function fire() {
  if (state.modalOpen || state.journalOpen || state.reloading || shootCooldown > 0) return;
  if (state.ammo <= 0) {
    toast("Empty — press R to reload");
    audio.tone(90, 0.05, "square", 0.03);
    return;
  }

  state.ammo--;
  shootCooldown = 0.18;
  world.weapon.userData.recoil = 0.08;
  audio.gunshot();
  $("#muzzle-flash").classList.add("flash");
  setTimeout(() => $("#muzzle-flash").classList.remove("flash"), 50);
  updateHUD();

  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(world.enemies.filter((e) => e.userData.alive), true);
  if (hits.length && hits[0].distance < 28) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData?.kind) obj = obj.parent;
    if (obj.userData?.kind === "enemy") damageEnemy(obj);
  }
}

function damageEnemy(enemy) {
  enemy.userData.hp -= 1;
  audio.hit();
  $("#crosshair").classList.add("hit");
  setTimeout(() => $("#crosshair").classList.remove("hit"), 80);
  enemy.children.forEach((c) => {
    if (c.material?.emissive) c.material.emissive.setHex(0x440000);
  });
  if (enemy.userData.hp <= 0) {
    enemy.userData.alive = false;
    enemy.visible = false;
    state.kills++;
    toast("Hostile neutralized");
  }
}

function reload() {
  if (state.reloading || state.ammo === 12 || state.reserve <= 0) return;
  state.reloading = true;
  audio.reload();
  toast("Reloading...");
  setTimeout(() => {
    const need = 12 - state.ammo;
    const take = Math.min(need, state.reserve);
    state.ammo += take;
    state.reserve -= take;
    state.reloading = false;
    updateHUD();
  }, 900);
}

/* ── Interaction ── */

function getLookTarget() {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(world.interactables, false);
  if (!hits.length || hits[0].distance > 2.8) return null;
  return hits[0].object;
}

function tryInteract() {
  if (state.modalOpen || state.journalOpen) return;
  const target = getLookTarget();
  if (!target) return;
  const clue = CLUES[target.userData.clue];
  if (!clue || state.clues.has(clue.id)) {
    toast("Already secured");
    return;
  }
  collectClue(clue, target);
}

function collectClue(clue, marker) {
  state.clues.add(clue.id);
  marker.visible = false;
  if (marker.userData.ring) marker.userData.ring.visible = false;
  audio.pickup();
  updateHUD();
  openEvidence(clue);
  renderJournal();
}

function openEvidence(clue) {
  state.modalOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
  $("#ev-title").textContent = clue.title;
  $("#ev-body").textContent = clue.text;
  $("#evidence-modal").classList.remove("hidden");
}

function closeEvidence() {
  $("#evidence-modal").classList.add("hidden");
  state.modalOpen = false;
  if (state.playing && !DEMO) requestLock();
}

function renderJournal() {
  const list = $("#journal-list");
  list.innerHTML = "";
  if (!state.clues.size) {
    list.innerHTML = '<li><p>No evidence yet. Search every room.</p></li>';
    return;
  }
  [...state.clues].forEach((id) => {
    const c = CLUES[id];
    const li = document.createElement("li");
    li.innerHTML = `<strong>${c.title}</strong><p>${c.text}</p>`;
    list.appendChild(li);
  });
}

function toggleJournal() {
  state.journalOpen = !state.journalOpen;
  $("#journal").classList.toggle("hidden", !state.journalOpen);
  if (state.journalOpen) {
    if (document.pointerLockElement) document.exitPointerLock();
    renderJournal();
  } else if (state.playing && !DEMO) {
    requestLock();
  }
}

/* ── Movement / rooms ── */

function currentRoom(pos) {
  for (const [id, b] of Object.entries(ROOM_BOUNDS)) {
    if (pos.x >= b.min.x && pos.x <= b.max.x && pos.z >= b.min.z && pos.z <= b.max.z) return id;
  }
  return state.room;
}

function updatePlayer(dt) {
  if (!state.playing || state.modalOpen || state.journalOpen) return;

  camera.rotation.order = "YXZ";
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;

  const speed = (keys["ShiftLeft"] || keys["ShiftRight"] ? 5.8 : 3.6) * dt;
  const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const wish = new THREE.Vector3();

  if (keys["KeyW"] || keys["ArrowUp"]) wish.add(forward);
  if (keys["KeyS"] || keys["ArrowDown"]) wish.sub(forward);
  if (keys["KeyD"] || keys["ArrowRight"]) wish.add(right);
  if (keys["KeyA"] || keys["ArrowLeft"]) wish.sub(right);

  if (wish.lengthSq() > 0) {
    wish.normalize().multiplyScalar(speed);
    bob += dt * 10;
    const next = camera.position.clone();
    next.x += wish.x;
    if (!playerCollides(next, world.colliders)) camera.position.x = next.x;
    next.x = camera.position.x;
    next.z += wish.z;
    if (!playerCollides(next, world.colliders)) camera.position.z = next.z;
  }

  camera.position.y = 1.65 + Math.sin(bob) * 0.025;

  // Weapon bob / recoil
  const w = world.weapon;
  w.position.set(0.18, -0.22 + Math.sin(bob) * 0.01, -0.35);
  w.userData.recoil *= 0.85;
  w.rotation.x = -w.userData.recoil * 2;

  const room = currentRoom(camera.position);
  if (room !== state.room) {
    state.room = room;
    updateHUD();
    toast(ROOM_BOUNDS[room].name);
  }

  // Interact prompt
  const target = getLookTarget();
  const prompt = $("#interact-prompt");
  if (target && !state.clues.has(target.userData.clue)) {
    prompt.classList.remove("hidden");
    $("#interact-label").textContent = target.userData.label;
  } else {
    prompt.classList.add("hidden");
  }
}

function updateEnemies(dt) {
  if (!state.playing || state.modalOpen) return;
  const playerPos = camera.position;

  world.enemies.forEach((e) => {
    if (!e.userData.alive) return;
    e.userData.bob += dt * 4;
    e.position.y = Math.sin(e.userData.bob) * 0.05;

    const toPlayer = playerPos.clone().sub(e.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 18) return;

    e.lookAt(playerPos.x, e.position.y, playerPos.z);

    if (dist > 1.4) {
      toPlayer.normalize().multiplyScalar(e.userData.speed * dt);
      const next = e.position.clone().add(toPlayer);
      if (!playerCollides(next, world.colliders, 0.4)) {
        e.position.x = next.x;
        e.position.z = next.z;
      }
    } else {
      e.userData.cooldown -= dt;
      if (e.userData.cooldown <= 0) {
        e.userData.cooldown = 1.1;
        hurtPlayer(12);
      }
    }
  });
}

function hurtPlayer(amount) {
  state.health -= amount;
  audio.hurt();
  $("#damage-vignette").classList.add("active");
  setTimeout(() => $("#damage-vignette").classList.remove("active"), 180);
  updateHUD();
  if (state.health <= 0) endGame(false, "KIA — the manor claims another investigator.");
}

function updateRain(dt) {
  if (!rain) return;
  const pos = rain.geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] -= (8 + (i % 5)) * dt;
    pos[i] -= 1.5 * dt;
    if (pos[i + 1] < 0) {
      pos[i + 1] = 18 + Math.random() * 4;
      pos[i] = camera.position.x + (Math.random() - 0.5) * 40;
      pos[i + 2] = camera.position.z + (Math.random() - 0.5) * 40;
    }
  }
  rain.geometry.attributes.position.needsUpdate = true;
}

/* ── Accuse / end ── */

function accuse() {
  const choice = $("#accuse-select").value;
  if (!choice) return;
  const won = choice === SOLUTION;
  endGame(
    won,
    won
      ? "Elena Voss poisoned the soup with monkshood extract before Ashworth could reverse her inheritance. Your evidence held."
      : "Wrong suspect. Elena Voss was the killer — the kitchen log, footprints, and unsigned will told the truth."
  );
}

function endGame(won, text) {
  state.playing = false;
  if (document.pointerLockElement) document.exitPointerLock();
  $("#hud").classList.add("hidden");
  $("#journal").classList.add("hidden");
  $("#evidence-modal").classList.add("hidden");

  const mins = Math.max(1, Math.round((Date.now() - state.startTime) / 60000));
  const grade = won
    ? state.clues.size >= 8 && state.kills >= 4 ? "S" : state.clues.size >= 6 ? "A" : "B"
    : "F";

  $("#result-grade").textContent = grade;
  $("#result-title").textContent = won ? "Protocol Complete" : "Protocol Failed";
  $("#result-text").textContent = text;
  $("#result-stats").innerHTML = `
    <div><span>${state.clues.size}</span>evidence</div>
    <div><span>${state.kills}</span>hostiles</div>
    <div><span>${mins}</span>min</div>
  `;
  showScreen("#screen-result");
}

/* ── Loop ── */

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  shootCooldown = Math.max(0, shootCooldown - dt);

  if (state.playing) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateRain(dt);

    // Flicker lights
    world.lights.forEach((l, i) => {
      l.intensity = 1.05 + Math.sin(performance.now() * 0.004 + i) * 0.12;
    });
  }

  renderer.render(scene, camera);
}

/* ── Demo autopilot ── */

async function runDemo() {
  state.yaw = 0;
  state.pitch = 0;
  camera.position.set(0, 1.65, 2);

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hold = async (code, ms) => {
    keys[code] = true;
    await wait(ms);
    keys[code] = false;
  };
  const turn = async (dyaw, ms) => {
    const steps = Math.max(1, Math.floor(ms / 16));
    for (let i = 0; i < steps; i++) {
      state.yaw += dyaw / steps;
      await wait(16);
    }
  };

  // Walk to library
  await turn(0.9, 600);
  await hold("KeyW", 2200);
  await turn(0.5, 400);
  await hold("KeyW", 1600);

  // Collect library clues via proximity hack in demo
  for (const marker of world.interactables) {
    if (marker.userData.clue === "body" || marker.userData.clue === "letter") {
      camera.position.set(marker.position.x, 1.65, marker.position.z + 1.2);
      state.yaw = Math.PI;
      await wait(400);
      tryInteract();
      await wait(900);
      closeEvidence();
      await wait(300);
    }
  }

  // Fight — face nearest enemy and shoot
  const foe = world.enemies.find((e) => e.userData.alive);
  if (foe) {
    camera.position.set(foe.position.x, 1.65, foe.position.z + 3);
    state.yaw = Math.PI;
    await wait(300);
    for (let i = 0; i < 4; i++) {
      fire();
      await wait(220);
    }
  }

  // Kitchen evidence
  for (const marker of world.interactables) {
    if (marker.userData.clue === "extract" || marker.userData.clue === "ledger") {
      camera.position.set(marker.position.x, 1.65, marker.position.z + 1.1);
      state.yaw = Math.PI;
      await wait(350);
      tryInteract();
      await wait(900);
      closeEvidence();
      await wait(250);
    }
  }

  // Study
  for (const marker of world.interactables) {
    if (marker.userData.clue === "will" || marker.userData.clue === "safe") {
      camera.position.set(marker.position.x - 1, 1.65, marker.position.z);
      state.yaw = -Math.PI / 2;
      await wait(350);
      tryInteract();
      await wait(900);
      closeEvidence();
      await wait(250);
    }
  }

  // Garden + ballroom
  for (const id of ["prints", "champagne"]) {
    const marker = world.interactables.find((m) => m.userData.clue === id);
    if (!marker) continue;
    camera.position.set(marker.position.x, 1.65, marker.position.z + 1.2);
    state.yaw = Math.PI;
    await wait(350);
    tryInteract();
    await wait(900);
    closeEvidence();
  }

  // Shoot remaining nearby
  for (const e of world.enemies) {
    if (!e.userData.alive) continue;
    camera.position.set(e.position.x, 1.65, e.position.z + 2.5);
    state.yaw = Math.PI;
    await wait(200);
    for (let i = 0; i < 3; i++) {
      fire();
      await wait(180);
    }
    await wait(200);
  }

  // Journal + accuse
  toggleJournal();
  await wait(1200);
  $("#accuse-select").value = "elena";
  $("#btn-accuse").disabled = false;
  await wait(800);
  accuse();
}

/* ── Flow ── */

async function playBrief() {
  showScreen("#screen-brief");
  const box = $("#brief-lines");
  box.innerHTML = "";
  for (const line of BRIEF) {
    const p = document.createElement("p");
    p.textContent = line;
    box.appendChild(p);
    await new Promise((r) => setTimeout(r, DEMO ? 200 : 700));
  }
}

function startMission() {
  state.playing = true;
  state.health = 100;
  state.ammo = 12;
  state.reserve = 36;
  state.clues = new Set();
  state.kills = 0;
  state.startTime = Date.now();
  state.yaw = 0;
  state.pitch = 0;
  state.room = "entrance";
  state.modalOpen = false;
  state.journalOpen = false;
  camera.position.set(0, 1.65, 2);

  world.interactables.forEach((m) => {
    m.visible = true;
    if (m.userData.ring) m.userData.ring.visible = true;
  });
  world.enemies.forEach((e) => {
    e.visible = true;
    e.userData.alive = true;
    e.userData.hp = 3;
  });

  showScreen("#screen-game");
  $("#hud").classList.remove("hidden");
  $("#journal").classList.add("hidden");
  $("#evidence-modal").classList.add("hidden");
  updateHUD();
  setObjective("Secure the manor. Find evidence.");
  audio.init();
  audio.resume();
  audio.startAmbience();

  if (DEMO) {
    $("#pause-hint").classList.add("hidden");
    runDemo();
  } else {
    $("#pause-hint").classList.remove("hidden");
    setTimeout(requestLock, 200);
  }
}

/* ── Events ── */

$("#btn-start").addEventListener("click", async () => {
  audio.init();
  audio.resume();
  await playBrief();
  if (DEMO) startMission();
});

$("#btn-deploy").addEventListener("click", startMission);

$("#btn-close-ev").addEventListener("click", closeEvidence);
$("#btn-close-journal").addEventListener("click", () => {
  state.journalOpen = false;
  $("#journal").classList.add("hidden");
  if (state.playing && !DEMO) requestLock();
});

$("#btn-accuse").addEventListener("click", accuse);
$("#accuse-select").addEventListener("change", () => {
  $("#btn-accuse").disabled = !$("#accuse-select").value || state.clues.size < 5;
});

$("#btn-replay").addEventListener("click", () => {
  showScreen("#screen-title");
});

$("#game-canvas").addEventListener("click", () => {
  if (state.playing && !state.locked && !state.modalOpen && !DEMO) requestLock();
});

document.addEventListener("pointerlockchange", onLockChange);
document.addEventListener("mousemove", onMouseMove);
document.addEventListener("mousedown", onMouseDown);

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (!state.playing) return;
  if (e.code === "KeyE") tryInteract();
  if (e.code === "KeyR") reload();
  if (e.code === "Tab") {
    e.preventDefault();
    toggleJournal();
  }
  if (e.code === "Escape" && state.journalOpen) toggleJournal();
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

/* Boot */
initEngine();
loop();

if (DEMO) {
  // Auto-start for recording
  setTimeout(async () => {
    $("#btn-start").click();
    await new Promise((r) => setTimeout(r, 1000));
    $("#btn-deploy").click();
  }, 800);
}

// Expose for recorder debugging
window.__game = { state, camera, fire, tryInteract, startMission };
