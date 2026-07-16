import * as THREE from "three";
import { BRIEF, CLUES, SOLUTION, ROOM_BOUNDS, SUSPECTS, STUDY_LOCK, RADIO } from "./data.js";
import { AudioBus } from "./audio.js";
import { buildWorld, playerCollides, spawnHitSparks, createBoss, createAdd } from "./world.js";
import {
  createDust, updateDust, createProjectile, spawnDamageNumber, updateFloating,
  spawnBulletHole, spawnShell, updatePhysicsBits,
} from "./fx.js";

const $ = (s) => document.querySelector(s);
const DEMO = new URLSearchParams(location.search).has("demo");

const state = {
  playing: false,
  locked: false,
  health: 100,
  ammo: 12,
  reserve: 48,
  reloading: false,
  reloadT: 0,
  clues: new Set(),
  kills: 0,
  startTime: 0,
  yaw: 0,
  pitch: 0,
  room: "entrance",
  modalOpen: false,
  journalOpen: false,
  journalTab: "evidence",
  flashlightOn: true,
  aiming: false,
  crouching: false,
  shake: 0,
  footTimer: 0,
  spread: 0,
  fov: 72,
  studyUnlocked: false,
  bossSpawned: false,
  bossDefeated: false,
  radioFired: new Set(),
  thunderT: 8,
  meleeCd: 0,
  shotsFired: 0,
  shotsHit: 0,
  lookSwayX: 0,
  lookSwayY: 0,
  standY: 1.65,
};

const keys = {};
const audio = new AudioBus();
const sparks = [];
const floaters = [];
const projectiles = [];
const decals = [];
const shells = [];

let renderer, scene, camera, clock, world, rain, dust;
let bob = 0;
let shootCooldown = 0;
let toastTimer;
let bannerTimer;
let minimapCtx;
let boss = null;

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

function showRoomBanner(name) {
  const el = $("#room-banner");
  el.textContent = name;
  el.classList.remove("hidden");
  el.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.classList.add("hidden"), 400);
  }, 1600);
}

function updateHUD() {
  $("#health-fill").style.width = `${Math.max(0, state.health)}%`;
  $("#ammo-count").textContent = state.ammo;
  $("#ammo-reserve").textContent = state.reserve;
  $("#clue-stat").textContent = `Evidence ${state.clues.size}/8`;
  $("#kill-stat").textContent = `Hostiles ${state.kills}`;
  const acc = state.shotsFired ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
  $("#acc-stat").textContent = state.shotsFired ? `Accuracy ${acc}%` : "Accuracy —";
  $("#room-stat").textContent = ROOM_BOUNDS[state.room]?.name || state.room;
  $("#btn-accuse").disabled = state.clues.size < 5;
  $("#damage-vignette").classList.toggle("critical", state.health > 0 && state.health <= 30);
  const flash = $("#flash-stat");
  flash.textContent = state.flashlightOn ? "🔦 ON" : "🔦 OFF";
  flash.className = state.flashlightOn ? "flash-on" : "flash-off";

  if (state.bossSpawned && !state.bossDefeated) setObjective("Confront Elena Voss in the ballroom.");
  else if (state.clues.size >= 5) setObjective("Open journal (Tab) and accuse — or face her.");
  else if (state.clues.size >= 3) setObjective("Keep searching. Hostiles inbound.");
  else if (!state.studyUnlocked) setObjective("Examine the body in the library to unseal the study.");
  else setObjective("Secure the manor. Find evidence.");

  if (boss?.userData?.alive) {
    $("#boss-bar").classList.remove("hidden");
    $("#boss-fill").style.width = `${(boss.userData.hp / boss.userData.maxHp) * 100}%`;
  } else {
    $("#boss-bar").classList.add("hidden");
  }
}

function initEngine() {
  const canvas = $("#game-canvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 120);
  camera.position.set(0, 1.65, 2);

  clock = new THREE.Clock();
  world = buildWorld(scene);
  camera.add(world.weapon);
  if (world.flashlight) {
    camera.add(world.flashlight);
    camera.add(world.flashlight.target);
    world.flashlight.target.position.set(0.15, -0.05, -1);
  }
  scene.add(camera);

  const count = 1400;
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
    new THREE.PointsMaterial({ color: 0x88aacc, size: 0.045, transparent: true, opacity: 0.4 })
  );
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

function requestLock() {
  if (DEMO) return;
  $("#game-canvas").requestPointerLock();
}

function onLockChange() {
  state.locked = document.pointerLockElement === $("#game-canvas");
  $("#pause-hint").classList.toggle("hidden", state.locked || !state.playing || state.modalOpen || state.journalOpen);
}

function onMouseMove(e) {
  if (!state.locked || !state.playing || state.modalOpen || state.journalOpen) return;
  const sens = state.aiming ? 0.0012 : 0.0022;
  state.yaw -= e.movementX * sens;
  state.pitch -= e.movementY * sens;
  state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch));
  state.lookSwayX += e.movementX * 0.00015;
  state.lookSwayY += e.movementY * 0.00012;
}

function onMouseDown(e) {
  if (!state.playing) return;
  if (!state.locked && !DEMO) {
    requestLock();
    return;
  }
  if (e.button === 0) fire();
  if (e.button === 2) state.aiming = true;
}

function onMouseUp(e) {
  if (e.button === 2) state.aiming = false;
}

function toggleFlashlight() {
  state.flashlightOn = !state.flashlightOn;
  if (world.flashlight) world.flashlight.intensity = state.flashlightOn ? 2.8 : 0;
  audio.click();
  updateHUD();
}

function fire() {
  if (state.modalOpen || state.journalOpen || state.reloading || shootCooldown > 0) return;
  if (state.ammo <= 0) {
    toast("Empty — press R to reload");
    audio.tone(90, 0.05, "square", 0.03);
    return;
  }

  state.ammo--;
  state.shotsFired++;
  shootCooldown = state.aiming ? 0.2 : 0.15;
  world.weapon.userData.recoil = state.aiming ? 0.06 : 0.14;
  state.shake = state.aiming ? 0.02 : 0.045;
  state.spread = Math.min(18, state.spread + (state.aiming ? 3 : 8));
  audio.gunshot();

  if (world.weapon.userData.muzzle) {
    world.weapon.userData.muzzle.intensity = 3.5;
    setTimeout(() => { if (world.weapon.userData.muzzle) world.weapon.userData.muzzle.intensity = 0; }, 40);
  }
  $("#muzzle-flash").classList.add("flash");
  setTimeout(() => $("#muzzle-flash").classList.remove("flash"), 45);

  // Eject casing to the right
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const shellOrigin = camera.position.clone().add(new THREE.Vector3(0, -0.1, 0)).addScaledVector(right, 0.25);
  shells.push(spawnShell(scene, shellOrigin, right));
  updateHUD();

  // Bloom / ADS accuracy
  const bloom = state.aiming ? 0.004 : 0.004 + state.spread * 0.0012;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(
    (Math.random() - 0.5) * bloom * 20,
    (Math.random() - 0.5) * bloom * 20
  );
  ray.setFromCamera(ndc, camera);
  const targets = world.enemies.filter((e) => e.userData.alive && !e.userData.dying);
  const hits = ray.intersectObjects([...targets, ...world.colliders], true);
  if (hits.length && hits[0].distance < 32) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData?.kind) obj = obj.parent;
    if (obj.userData?.kind === "enemy") {
      const headY = obj.userData.boss ? 2.1 : 1.7;
      const headshot = hits[0].point.y - obj.position.y > headY;
      state.shotsHit++;
      damageEnemy(obj, headshot ? 2 : 1, hits[0].point, headshot);
    } else {
      decals.push(spawnBulletHole(scene, hits[0].point, hits[0].face?.normal));
    }
  }
}

function melee() {
  if (state.modalOpen || state.journalOpen || state.meleeCd > 0 || state.reloading) return;
  state.meleeCd = 0.55;
  world.weapon.userData.recoil = 0.22;
  state.shake = 0.03;
  audio.melee();

  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const targets = world.enemies.filter((e) => e.userData.alive && !e.userData.dying);
  const hits = ray.intersectObjects(targets, true);
  if (hits.length && hits[0].distance < 2.1) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData?.kind) obj = obj.parent;
    if (obj.userData?.kind === "enemy") {
      audio.meleeHit();
      damageEnemy(obj, 3, hits[0].point, false);
      toast("Bash!");
    }
  }
}

function damageEnemy(enemy, dmg, point, headshot = false) {
  if (enemy.userData.dying) return;
  enemy.userData.hp -= dmg;
  enemy.userData.hurtFlash = 0.2;
  enemy.userData.stagger = enemy.userData.boss ? 0.12 : 0.25;
  audio.hit();
  state.shake = 0.025;

  $("#crosshair").classList.add("hit");
  $("#hitmarker").classList.remove("hidden");
  setTimeout(() => {
    $("#crosshair").classList.remove("hit");
    $("#hitmarker").classList.add("hidden");
  }, 90);

  if (point) {
    sparks.push(spawnHitSparks(scene, point));
    floaters.push(spawnDamageNumber(scene, point, headshot ? `${dmg} HS` : `${dmg}`, headshot ? "#ffee88" : "#ffcc66"));
  }

  const away = enemy.position.clone().sub(camera.position);
  away.y = 0;
  away.normalize().multiplyScalar(enemy.userData.boss ? 0.15 : 0.35);
  enemy.position.add(away);

  if (enemy.userData.boss && !enemy.userData.summoned && enemy.userData.hp <= enemy.userData.maxHp * 0.5) {
    triggerBossPhase2();
  }

  if (enemy.userData.hp <= 0) {
    beginDeath(enemy, headshot);
  }
  updateHUD();
}

function beginDeath(enemy, headshot) {
  enemy.userData.dying = true;
  enemy.userData.alive = false;
  enemy.userData.deathT = 0.7;
  audio.death();
  state.kills++;
  if (enemy.userData.boss) {
    state.bossDefeated = true;
    toast("Elena is down — open your journal and accuse.");
    setObjective("Open journal (Tab) and make your accusation.");
  } else {
    const label = enemy.userData.type === "brute" ? "Brute down" :
      enemy.userData.type === "runner" ? "Runner down" : "Hostile neutralized";
    toast(headshot ? `Headshot — ${label}` : label);
  }
  maybeRadio();
  updateHUD();
}

function triggerBossPhase2() {
  if (!boss || boss.userData.phase >= 2 || boss.userData.summoned) return;
  boss.userData.phase = 2;
  boss.userData.summoned = true;
  boss.userData.speed = 3.4;
  boss.userData.shootCd = 0.2;
  toast("Elena calls reinforcements!");
  showRoomBanner("PHASE TWO");
  pushRadio("HQ: She's calling reinforcements. Clear the adds, then finish her.");
  state.radioFired.add("HQ: She's calling reinforcements. Clear the adds, then finish her.");
  [[6, 10], [10, 14], [5, 14]].forEach(([x, z], i) => {
    const add = createAdd(scene, x, z, i === 2 ? "shooter" : "runner");
    world.enemies.push(add);
  });
}

function reload() {
  if (state.reloading || state.ammo === 12 || state.reserve <= 0) return;
  state.reloading = true;
  state.reloadT = 0.85;
  audio.reload();
  $("#reload-bar").classList.remove("hidden");
  toast("Reloading...");
}

function finishReload() {
  const need = 12 - state.ammo;
  const take = Math.min(need, state.reserve);
  state.ammo += take;
  state.reserve -= take;
  state.reloading = false;
  $("#reload-bar").classList.add("hidden");
  updateHUD();
}

function pushRadio(text) {
  const log = $("#radio-log");
  const line = document.createElement("div");
  line.className = "line";
  line.textContent = text;
  log.prepend(line);
  while (log.children.length > 3) log.lastChild.remove();
  audio.radio();
}

function maybeRadio() {
  for (const msg of RADIO) {
    const key = msg.text;
    if (state.radioFired.has(key)) continue;
    if (msg.atBossPhase != null) continue; // fired manually
    const clueOk = msg.atClues == null || state.clues.size >= msg.atClues;
    const killOk = msg.atKills == null || state.kills >= msg.atKills;
    if (clueOk && killOk) {
      state.radioFired.add(key);
      pushRadio(msg.text);
    }
  }
}

function updateCompass() {
  // yaw 0 looks -Z (north in our map convention)
  let deg = ((-state.yaw * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(deg / 45) % 8;
  $("#compass-dir").textContent = dirs[idx];
  const offset = (deg / 360) * 240;
  $("#compass-track").style.transform = `translateX(${-offset}px)`;
}

function unlockStudy() {
  if (state.studyUnlocked) return;
  state.studyUnlocked = true;
  if (world.studyDoor) {
    world.studyDoor.visible = false;
    const idx = world.colliders.indexOf(world.studyDoor);
    if (idx >= 0) world.colliders.splice(idx, 1);
  }
  if (world.studySeal) world.studySeal.visible = false;
  audio.unlock();
  toast("Study door unsealed");
  pushRadio("HQ: Study seal broken. Check the will.");
}

function maybeSpawnBoss() {
  if (state.bossSpawned || state.clues.size < 5) return;
  state.bossSpawned = true;
  boss = createBoss(scene);
  world.enemies.push(boss);
  pushRadio("HQ: Visual on Elena in the ballroom. She's armed — careful.");
  toast("Elena Voss spotted in the ballroom");
  showRoomBanner("CONFRONTATION");
  updateHUD();
}

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
  if (clue.id === STUDY_LOCK.clueRequired) unlockStudy();
  maybeSpawnBoss();
  maybeRadio();
  updateHUD();
  openEvidence(clue);
  renderJournal();
}

function openEvidence(clue) {
  state.modalOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
  $("#ev-title").textContent = clue.title;
  $("#ev-body").textContent = clue.text;
  $("#ev-room").textContent = `Found in: ${ROOM_BOUNDS[clue.room]?.name || clue.room}`;
  const cat = $("#ev-category");
  cat.textContent = clue.category === "critical" ? "Critical Evidence" : "Possible Red Herring";
  cat.className = `ev-cat ${clue.category || ""}`;
  $("#evidence-modal").classList.remove("hidden");
}

function closeEvidence() {
  $("#evidence-modal").classList.add("hidden");
  state.modalOpen = false;
  if (state.playing && !DEMO) requestLock();
}

function suspectHeat(id) {
  let heat = 0;
  for (const cid of state.clues) {
    const c = CLUES[cid];
    if (c.implicates?.includes(id)) heat += c.category === "critical" ? 2 : 1;
  }
  return heat;
}

function renderJournal() {
  const list = $("#journal-list");
  const suspects = $("#suspect-list");

  if (state.journalTab === "evidence") {
    list.classList.remove("hidden");
    suspects.classList.add("hidden");
    list.innerHTML = "";
    if (!state.clues.size) {
      list.innerHTML = "<li><p>No evidence yet. Search every room.</p></li>";
      return;
    }
    [...state.clues].forEach((id) => {
      const c = CLUES[id];
      const li = document.createElement("li");
      li.innerHTML = `<strong>${c.title}</strong><span class="ev-cat ${c.category}">${c.category}</span><p>${c.text}</p>`;
      list.appendChild(li);
    });
  } else {
    list.classList.add("hidden");
    suspects.classList.remove("hidden");
    suspects.innerHTML = "";
    Object.values(SUSPECTS).forEach((s) => {
      const heat = suspectHeat(s.id);
      const div = document.createElement("div");
      div.className = "suspect-card" + (heat >= 4 ? " hot" : "");
      div.innerHTML = `
        <h4>${s.name}</h4>
        <div class="role">${s.role}</div>
        <p>${s.bio}</p>
        <div class="heat">${heat ? `Suspicion: ${"●".repeat(Math.min(heat, 6))}` : "No linking evidence yet"}</div>
      `;
      suspects.appendChild(div);
    });
  }
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

function currentRoom(pos) {
  for (const [id, b] of Object.entries(ROOM_BOUNDS)) {
    if (pos.x >= b.min.x && pos.x <= b.max.x && pos.z >= b.min.z && pos.z <= b.max.z) return id;
  }
  return state.room;
}

function updatePickups() {
  for (const p of world.pickups) {
    if (p.taken) continue;
    // Bob
    p.meshes.forEach((m, i) => {
      m.position.y = (i === 0 ? 0.35 : 0.5) + Math.sin(performance.now() * 0.004 + p.position.x) * 0.06;
      m.rotation.y += 0.02;
    });
    if (camera.position.distanceTo(p.position) < 1.2) {
      p.taken = true;
      p.meshes.forEach((m) => { m.visible = false; });
      if (p.type === "health") {
        state.health = Math.min(100, state.health + p.amount);
        toast(`+${p.amount} Vital`);
      } else {
        state.reserve += p.amount;
        toast(`+${p.amount} rounds`);
      }
      audio.itemGet();
      updateHUD();
    }
  }
}

function updatePlayer(dt) {
  if (!state.playing || state.modalOpen || state.journalOpen) return;

  // Block study entry message
  if (!state.studyUnlocked) {
    const nearDoor = Math.abs(camera.position.x - 6) < 1.2 && Math.abs(camera.position.z - 2) < 1.4;
    if (nearDoor && (keys["KeyW"] || keys["KeyD"])) toast(STUDY_LOCK.message);
  }

  camera.rotation.order = "YXZ";
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;

  state.crouching = !!(keys["KeyC"] || keys["ControlLeft"] || keys["ControlRight"]);
  const sprinting = !state.aiming && !state.crouching && (keys["ShiftLeft"] || keys["ShiftRight"]);
  const speed = (state.crouching ? 1.8 : state.aiming ? 2.4 : sprinting ? 5.8 : 3.6) * dt;
  state.meleeCd = Math.max(0, state.meleeCd - dt);
  const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const wish = new THREE.Vector3();

  if (keys["KeyW"] || keys["ArrowUp"]) wish.add(forward);
  if (keys["KeyS"] || keys["ArrowDown"]) wish.sub(forward);
  if (keys["KeyD"] || keys["ArrowRight"]) wish.add(right);
  if (keys["KeyA"] || keys["ArrowLeft"]) wish.sub(right);

  const moving = wish.lengthSq() > 0;
  if (moving) {
    wish.normalize().multiplyScalar(speed);
    bob += dt * (sprinting ? 14 : 10);
    state.spread = Math.min(16, state.spread + dt * (sprinting ? 20 : 10));
    const next = camera.position.clone();
    next.x += wish.x;
    if (!playerCollides(next, world.colliders)) camera.position.x = next.x;
    next.x = camera.position.x;
    next.z += wish.z;
    if (!playerCollides(next, world.colliders)) camera.position.z = next.z;

    state.footTimer -= dt;
    if (state.footTimer <= 0) {
      audio.footstep();
      state.footTimer = sprinting ? 0.28 : 0.4;
    }
  } else {
    state.spread = Math.max(0, state.spread - dt * 18);
  }
  if (state.aiming) state.spread = Math.max(0, state.spread - dt * 30);

  // FOV: ADS / sprint
  const targetFov = state.aiming ? 52 : sprinting && moving ? 80 : 72;
  state.fov += (targetFov - state.fov) * Math.min(1, dt * 8);
  camera.fov = state.fov;
  camera.updateProjectionMatrix();

  const targetStand = state.crouching ? 1.15 : 1.65;
  state.standY += (targetStand - state.standY) * Math.min(1, dt * 10);
  let y = state.standY + Math.sin(bob) * (state.aiming || state.crouching ? 0.01 : 0.03);
  if (state.shake > 0) {
    y += (Math.random() - 0.5) * state.shake;
    camera.rotation.z = (Math.random() - 0.5) * state.shake * 0.5;
    state.shake *= 0.85;
  } else {
    camera.rotation.z = 0;
  }
  camera.position.y = y;

  // Weapon sway from look
  state.lookSwayX *= 0.85;
  state.lookSwayY *= 0.85;

  const w = world.weapon;
  const adsX = state.aiming ? 0.02 : 0.22;
  const adsY = state.aiming ? -0.14 : -0.24;
  const adsZ = state.aiming ? -0.28 : -0.4;
  w.position.x += (adsX - state.lookSwayX - w.position.x) * 0.2;
  w.position.y += (adsY + Math.sin(bob) * 0.01 + state.lookSwayY - w.position.y) * 0.2;
  w.position.z += (adsZ - w.position.z) * 0.2;
  w.userData.recoil *= 0.82;
  w.rotation.x = -w.userData.recoil * 2.5 + state.lookSwayY * 0.8;
  w.rotation.z = Math.sin(bob * 0.5) * (state.aiming ? 0.005 : 0.02) - state.lookSwayX * 0.6;

  updateCompass();

  // Crosshair spread / ADS
  const ch = $("#crosshair");
  ch.style.setProperty("--spread", `${state.spread.toFixed(1)}px`);
  ch.classList.toggle("ads", state.aiming);

  if (state.reloading) {
    state.reloadT -= dt;
    const pct = Math.max(0, 1 - state.reloadT / 0.85) * 100;
    $("#reload-fill").style.width = `${pct}%`;
    if (state.reloadT <= 0) finishReload();
  }

  const room = currentRoom(camera.position);
  if (room !== state.room) {
    state.room = room;
    updateHUD();
    showRoomBanner(ROOM_BOUNDS[room].name);
  }

  const target = getLookTarget();
  const prompt = $("#interact-prompt");
  if (target && !state.clues.has(target.userData.clue)) {
    prompt.classList.remove("hidden");
    $("#interact-label").textContent = target.userData.label;
  } else {
    prompt.classList.add("hidden");
  }

  updatePickups();
}

function updateEnemies(dt) {
  if (!state.playing || state.modalOpen) return;
  const playerPos = camera.position;

  world.enemies.forEach((e) => {
    // Death fall animation
    if (e.userData.dying) {
      e.userData.deathT -= dt;
      e.rotation.x += dt * 2.2;
      e.position.y = Math.max(-0.2, e.position.y - dt * 0.6);
      if (e.userData.deathT <= 0) e.visible = false;
      return;
    }
    if (!e.userData.alive) return;

    e.userData.bob += dt * 5;
    e.userData.stagger = Math.max(0, e.userData.stagger - dt);

    const swing = Math.sin(e.userData.bob) * 0.35;
    if (e.userData.armL) e.userData.armL.rotation.x = swing;
    if (e.userData.armR) e.userData.armR.rotation.x = -swing;
    if (e.userData.legL) e.userData.legL.rotation.x = -swing;
    if (e.userData.legR) e.userData.legR.rotation.x = swing;

    const eyeIdle = e.userData.eyeColor || (e.userData.boss ? 0xffcc44 : 0xff2233);
    if (e.userData.hurtFlash > 0) {
      e.userData.hurtFlash -= dt;
      e.userData.eyes?.forEach((eye) => eye.material.color.setHex(0xffffff));
    } else {
      e.userData.eyes?.forEach((eye) => eye.material.color.setHex(eyeIdle));
    }

    const toPlayer = playerPos.clone().sub(e.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 22) return;

    e.lookAt(playerPos.x, e.position.y, playerPos.z);
    if (e.userData.stagger > 0) return;

    // Ranged fire
    if (e.userData.ranged && dist > 3 && dist < 16) {
      e.userData.shootCd -= dt;
      if (e.userData.shootCd <= 0) {
        e.userData.shootCd = e.userData.boss ? 0.7 : 1.4 + Math.random() * 0.6;
        const origin = e.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const dir = playerPos.clone().sub(origin);
        // slight inaccuracy
        dir.x += (Math.random() - 0.5) * 0.4;
        dir.y += (Math.random() - 0.5) * 0.2;
        dir.z += (Math.random() - 0.5) * 0.4;
        const proj = createProjectile(origin, dir);
        scene.add(proj);
        projectiles.push(proj);
        audio.enemyShot();
      }
    }

    const stopDist = e.userData.ranged && dist < 7 ? 5.5 : 1.35;
    if (dist > stopDist) {
      toPlayer.normalize().multiplyScalar(e.userData.speed * dt);
      const next = e.position.clone().add(toPlayer);
      if (!playerCollides(next, world.colliders, 0.4)) {
        e.position.x = next.x;
        e.position.z = next.z;
      }
    } else if (dist <= 1.35) {
      e.userData.cooldown -= dt;
      if (e.userData.cooldown <= 0) {
        e.userData.cooldown = e.userData.boss ? 0.7 : e.userData.type === "brute" ? 1.15 : 0.95;
        hurtPlayer(e.userData.meleeDmg || 14);
      }
    }
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.userData.life -= dt;
    p.position.addScaledVector(p.userData.vel, dt);
    if (p.position.distanceTo(camera.position) < 0.55) {
      hurtPlayer(p.userData.damage);
      scene.remove(p);
      projectiles.splice(i, 1);
      continue;
    }
    if (p.userData.life <= 0 || playerCollides(p.position, world.colliders, 0.1)) {
      scene.remove(p);
      projectiles.splice(i, 1);
    }
  }
}

function updateStorm(dt) {
  state.thunderT -= dt;
  if (state.thunderT <= 0) {
    state.thunderT = 7 + Math.random() * 12;
    $("#lightning").classList.add("flash");
    setTimeout(() => $("#lightning").classList.remove("flash"), 80 + Math.random() * 60);
    setTimeout(() => audio.thunder(), 100 + Math.random() * 300);
  }
}

function hurtPlayer(amount) {
  state.health -= amount;
  state.shake = 0.12;
  audio.hurt();
  $("#damage-vignette").classList.add("active");
  setTimeout(() => $("#damage-vignette").classList.remove("active"), 200);
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

function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const g = sparks[i];
    let alive = false;
    g.children.forEach((p) => {
      p.userData.life -= dt;
      if (p.userData.life > 0) {
        alive = true;
        p.position.addScaledVector(p.userData.vel, dt);
        p.userData.vel.y -= 6 * dt;
        p.material.opacity = p.userData.life / 0.35;
        p.material.transparent = true;
      } else {
        p.visible = false;
      }
    });
    if (!alive) {
      scene.remove(g);
      sparks.splice(i, 1);
    }
  }
}

function updateMarkers(dt) {
  const t = performance.now() * 0.003;
  world.interactables.forEach((m) => {
    if (!m.visible) return;
    m.rotation.y += dt * 1.5;
    const baseY = m.userData.pos?.[1] ?? 1.2;
    m.position.y = baseY + Math.sin(t * 2 + m.position.x) * 0.08;
    if (m.material) m.material.emissiveIntensity = 0.6 + Math.sin(t + m.position.x) * 0.35;
    if (m.userData.ring) {
      const s = 1 + Math.sin(t * 2) * 0.15;
      m.userData.ring.scale.set(s, s, s);
    }
  });
}

function drawMinimap() {
  const ctx = minimapCtx;
  const w = 140;
  const h = 140;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8,12,18,0.85)";
  ctx.fillRect(0, 0, w, h);

  const scale = 3.2;
  const ox = w / 2 - camera.position.x * scale;
  const oy = h / 2 - camera.position.z * scale;

  // Rooms
  ctx.strokeStyle = "rgba(201,161,74,0.25)";
  ctx.lineWidth = 1;
  Object.values(ROOM_BOUNDS).forEach((r) => {
    ctx.strokeRect(
      r.min.x * scale + ox,
      r.min.z * scale + oy,
      (r.max.x - r.min.x) * scale,
      (r.max.z - r.min.z) * scale
    );
  });

  // Clues
  world.interactables.forEach((m) => {
    if (!m.visible) return;
    ctx.fillStyle = "#c9a14a";
    ctx.beginPath();
    ctx.arc(m.position.x * scale + ox, m.position.z * scale + oy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Enemies
  world.enemies.forEach((e) => {
    if (!e.userData.alive) return;
    ctx.fillStyle = "#ff3344";
    ctx.fillRect(e.position.x * scale + ox - 2, e.position.z * scale + oy - 2, 4, 4);
  });

  // Player
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-state.yaw);
  ctx.fillStyle = "#dce4ef";
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(4, 5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(201,161,74,0.5)";
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

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
  const acc = state.shotsFired ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
  const grade = won
    ? state.clues.size >= 8 && state.kills >= 6 && acc >= 40 ? "S"
      : state.clues.size >= 6 ? "A" : "B"
    : "F";

  $("#result-grade").textContent = grade;
  $("#result-title").textContent = won ? "Protocol Complete" : "Protocol Failed";
  $("#result-text").textContent = text;
  $("#result-stats").innerHTML = `
    <div><span>${state.clues.size}</span>evidence</div>
    <div><span>${state.kills}</span>hostiles</div>
    <div><span>${acc}%</span>accuracy</div>
    <div><span>${mins}</span>min</div>
  `;
  showScreen("#screen-result");
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  shootCooldown = Math.max(0, shootCooldown - dt);

  if (state.playing) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateRain(dt);
    updateDust(dust, dt, camera);
    updateSparks(dt);
    updateFloating(floaters, dt, scene);
    updatePhysicsBits(shells, dt, scene);
    updatePhysicsBits(decals, dt, scene);
    updateMarkers(dt);
    updateStorm(dt);
    drawMinimap();

    world.lights.forEach((l, i) => {
      if (l === world.flashlight) return;
      if (l.isPointLight) {
        l.intensity = 2.4 + Math.sin(performance.now() * 0.004 + i) * 0.25;
      }
    });
  }

  renderer.render(scene, camera);
}

/* Demo */
async function runDemo() {
  state.yaw = 0;
  state.pitch = 0;
  camera.position.set(0, 1.65, 2);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hold = async (code, ms) => { keys[code] = true; await wait(ms); keys[code] = false; };
  const turnTo = async (yaw, ms = 500) => {
    const start = state.yaw;
    const steps = Math.max(1, Math.floor(ms / 16));
    for (let i = 1; i <= steps; i++) {
      state.yaw = start + ((yaw - start) * i) / steps;
      await wait(16);
    }
  };
  const lookAt = (x, z) => {
    state.yaw = Math.atan2(-(x - camera.position.x), -(z - camera.position.z));
    state.pitch = 0;
  };
  const takeClue = async (clueId) => {
    const marker = world.interactables.find((m) => m.userData.clue === clueId);
    if (!marker || state.clues.has(clueId)) return;
    camera.position.set(marker.position.x, 1.65, marker.position.z + 1.4);
    lookAt(marker.position.x, marker.position.z);
    await wait(450);
    collectClue(CLUES[clueId], marker);
    await wait(1000);
    closeEvidence();
    await wait(300);
  };

  await turnTo(Math.PI / 2, 600);
  await hold("KeyW", 1600);
  await turnTo(Math.PI, 400);
  await hold("KeyW", 1000);
  await takeClue("body");
  await takeClue("letter");

  const foe = world.enemies.find((e) => e.userData.alive);
  if (foe) {
    camera.position.set(foe.position.x + 0.2, 1.65, foe.position.z + 3.2);
    lookAt(foe.position.x, foe.position.z);
    await wait(350);
    for (let i = 0; i < 5; i++) { fire(); await wait(200); }
  }

  for (const id of ["extract", "ledger", "will", "safe", "prints", "champagne"]) {
    await takeClue(id);
  }

  reload();
  await wait(900);
  for (const e of world.enemies) {
    if (!e.userData.alive) continue;
    camera.position.set(e.position.x, 1.65, e.position.z + 2.8);
    lookAt(e.position.x, e.position.z);
    await wait(200);
    for (let i = 0; i < 4; i++) { fire(); await wait(180); }
  }

  toggleJournal();
  await wait(800);
  document.querySelector('.jtab[data-tab="suspects"]').click();
  await wait(1200);
  document.querySelector('.jtab[data-tab="evidence"]').click();
  await wait(800);
  $("#accuse-select").value = "elena";
  $("#btn-accuse").disabled = false;
  await wait(700);
  accuse();
}

async function playBrief() {
  showScreen("#screen-brief");
  const box = $("#brief-lines");
  box.innerHTML = "";
  for (const line of BRIEF) {
    const p = document.createElement("p");
    p.textContent = line;
    box.appendChild(p);
    await new Promise((r) => setTimeout(r, DEMO ? 180 : 650));
  }
}

function startMission() {
  state.playing = true;
  state.health = 100;
  state.ammo = 12;
  state.reserve = 48;
  state.reloading = false;
  state.clues = new Set();
  state.kills = 0;
  state.startTime = Date.now();
  state.yaw = 0;
  state.pitch = 0;
  state.room = "entrance";
  state.modalOpen = false;
  state.journalOpen = false;
  state.flashlightOn = true;
  state.aiming = false;
  state.crouching = false;
  state.shake = 0;
  state.spread = 0;
  state.fov = 72;
  state.studyUnlocked = false;
  state.bossSpawned = false;
  state.bossDefeated = false;
  state.radioFired = new Set();
  state.thunderT = 6;
  state.meleeCd = 0;
  state.shotsFired = 0;
  state.shotsHit = 0;
  state.standY = 1.65;
  camera.position.set(0, 1.65, 2);
  camera.fov = 72;
  camera.updateProjectionMatrix();
  world.weapon.position.set(0.22, -0.24, -0.4);
  if (world.flashlight) world.flashlight.intensity = 2.8;
  boss = null;
  projectiles.splice(0).forEach((p) => scene.remove(p));
  $("#radio-log").innerHTML = "";
  $("#reload-bar").classList.add("hidden");
  $("#boss-bar").classList.add("hidden");

  if (world.studyDoor) {
    world.studyDoor.visible = true;
    if (!world.colliders.includes(world.studyDoor)) world.colliders.push(world.studyDoor);
  }
  if (world.studySeal) world.studySeal.visible = true;

  // Remove previous boss if any
  world.enemies = world.enemies.filter((e) => {
    if (e.userData.boss) {
      scene.remove(e);
      return false;
    }
    return true;
  });

  world.interactables.forEach((m) => {
    m.visible = true;
    if (m.userData.ring) m.userData.ring.visible = true;
  });
  world.enemies.forEach((e) => {
    e.visible = true;
    e.rotation.x = 0;
    e.position.y = 0;
    e.userData.alive = true;
    e.userData.dying = false;
    e.userData.hp = e.userData.maxHp || 4;
    e.userData.stagger = 0;
    e.userData.shootCd = 0.5;
    if (e.userData.boss) {
      e.userData.phase = 1;
      e.userData.summoned = false;
      e.userData.speed = 2.8;
    }
  });
  // Clear leftover adds from prior runs
  world.enemies = world.enemies.filter((e) => {
    if (e.userData.add) {
      scene.remove(e);
      return false;
    }
    return true;
  });
  decals.splice(0).forEach((d) => scene.remove(d));
  shells.splice(0).forEach((s) => scene.remove(s));
  world.pickups.forEach((p) => {
    p.taken = false;
    p.meshes.forEach((m) => { m.visible = true; });
  });

  showScreen("#screen-game");
  $("#hud").classList.remove("hidden");
  $("#journal").classList.add("hidden");
  $("#evidence-modal").classList.add("hidden");
  updateHUD();
  showRoomBanner("Entrance Hall");
  pushRadio("HQ: Comms live. Sweep the manor. Recover evidence.");
  state.radioFired.add(RADIO[0].text);
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

/* Events */
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
$("#btn-replay").addEventListener("click", () => showScreen("#screen-title"));
$("#game-canvas").addEventListener("click", () => {
  if (state.playing && !state.locked && !state.modalOpen && !DEMO) requestLock();
});

document.querySelectorAll(".jtab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".jtab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    state.journalTab = tab.dataset.tab;
    renderJournal();
  });
});

document.addEventListener("pointerlockchange", onLockChange);
document.addEventListener("mousemove", onMouseMove);
document.addEventListener("mousedown", onMouseDown);
document.addEventListener("mouseup", onMouseUp);
document.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (!state.playing) return;
  if (e.code === "KeyE") tryInteract();
  if (e.code === "KeyR") reload();
  if (e.code === "KeyF") toggleFlashlight();
  if (e.code === "KeyV") melee();
  if (e.code === "Tab") { e.preventDefault(); toggleJournal(); }
  if (e.code === "Escape" && state.journalOpen) toggleJournal();
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

initEngine();
loop();

if (DEMO) {
  setTimeout(async () => {
    $("#btn-start").click();
    await new Promise((r) => setTimeout(r, 900));
    $("#btn-deploy").click();
  }, 700);
}

window.__game = { state, camera, fire, tryInteract, startMission };
