import * as THREE from "three";
import { BRIEF, CLUES, SOLUTION, ROOM_BOUNDS, SUSPECTS, STUDY_LOCK, RADIO, WEAPONS } from "./data.js";
import { AudioBus } from "./audio.js";
import { buildWorld, playerCollides, spawnHitSparks, createBoss, createAdd, spawnLootPickup } from "./world.js";
import {
  createDust, updateDust, createProjectile, spawnDamageNumber, updateFloating,
  spawnBulletHole, spawnShell, updatePhysicsBits, spawnBlood,
} from "./fx.js";

const $ = (s) => document.querySelector(s);
const DEMO = new URLSearchParams(location.search).has("demo");

const state = {
  playing: false,
  locked: false,
  health: 100,
  weapon: "pistol",
  hasShotgun: false,
  weapons: {
    pistol: { ammo: 12, reserve: 48 },
    shotgun: { ammo: 6, reserve: 18 },
  },
  reloading: false,
  reloadT: 0,
  reloadDuration: 0.85,
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
  battery: 100,
  aiming: false,
  crouching: false,
  shake: 0,
  footTimer: 0,
  spread: 0,
  fov: 72,
  studyUnlocked: false,
  studyDoorT: 0,
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
  timeScale: 1,
  slowMoT: 0,
  fovKick: 0,
  studyToastCd: 0,
  emptyClickCd: 0,
  exposureBoost: 0,
  firing: false,
  accuseReadyAnnounced: false,
  onboardFirstClue: false,
  bossPending: false,
  vx: 0,
  vz: 0,
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

function currentWeapon() {
  return WEAPONS[state.weapon];
}

function currentMag() {
  return state.weapons[state.weapon];
}

function switchWeapon(id) {
  if (id === "shotgun" && !state.hasShotgun) {
    toast("Shotgun not recovered yet — check the kitchen");
    return;
  }
  if (state.reloading) return;
  if (state.weapon === id) return;
  // save current? already in state.weapons
  state.weapon = id;
  const root = world.weapon;
  root.userData.pistol.visible = id === "pistol";
  root.userData.shotgun.visible = id === "shotgun";
  root.userData.muzzle = id === "shotgun" ? root.userData.shotgun.userData.muzzle : root.userData.pistol.userData.muzzle;
  audio.click();
  toast(WEAPONS[id].name);
  updateHUD();
}

function syncAccuseButton() {
  const ready = state.clues.size >= 5;
  const choice = $("#accuse-select").value;
  $("#btn-accuse").disabled = !ready || !choice;
  const hint = $("#accuse-hint");
  if (!hint) return;
  hint.classList.toggle("ready", ready);
  if (!ready) {
    hint.textContent = `Collect ${Math.max(0, 5 - state.clues.size)} more exhibit${state.clues.size === 4 ? "" : "s"} to unlock accusation (${state.clues.size}/5).`;
  } else if (!choice) {
    hint.textContent = "Accusation unlocked — select a suspect (or click a card), then confirm. This ends the protocol.";
  } else {
    const name = $("#accuse-select").selectedOptions[0]?.textContent || "suspect";
    hint.textContent = `Ready to accuse ${name}. This closes the case — be sure.`;
  }
}

function nextObjective() {
  if (state.bossSpawned && !state.bossDefeated) {
    return "Ballroom: confront Elena — or Tab to accuse now.";
  }
  if (state.bossDefeated) return "Elena is down. Tab → select killer → Make Accusation.";
  if (state.clues.size >= 5) return "Tab: open journal and make your accusation.";
  if (!state.studyUnlocked) return "Library: aim at the body (gold marker) and press E.";

  const priority = ["library", "kitchen", "study", "garden", "ballroom", "entrance"];
  for (const room of priority) {
    const missing = Object.values(CLUES).filter((c) => c.room === room && !state.clues.has(c.id));
    if (!missing.length) continue;
    const titles = missing.slice(0, 2).map((c) => c.title).join(" & ");
    return `${ROOM_BOUNDS[room].name}: recover ${titles} (E).`;
  }
  return "All evidence secured. Tab to accuse.";
}

function updateHUD() {
  const mag = currentMag();
  const wpn = currentWeapon();
  $("#health-fill").style.width = `${Math.max(0, state.health)}%`;
  $("#ammo-count").textContent = mag.ammo;
  $("#ammo-reserve").textContent = mag.reserve;
  $("#weapon-name").textContent = wpn.ammoLabel;
  $("#clue-stat").textContent = `Evidence ${state.clues.size}/8`;
  $("#kill-stat").textContent = `Hostiles ${state.kills}`;
  const acc = state.shotsFired ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
  $("#acc-stat").textContent = state.shotsFired ? `Accuracy ${acc}%` : "Accuracy —";
  $("#room-stat").textContent = ROOM_BOUNDS[state.room]?.name || state.room;
  syncAccuseButton();
  $("#damage-vignette").classList.toggle("critical", state.health > 0 && state.health <= 30);
  const flash = $("#flash-stat");
  flash.textContent = state.flashlightOn ? "LAMP ON" : "LAMP OFF";
  flash.className = state.flashlightOn ? "flash-on" : "flash-off";
  const bat = $("#battery-fill");
  bat.style.width = `${Math.max(0, state.battery)}%`;
  bat.classList.toggle("low", state.battery < 25);

  setObjective(nextObjective());

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
  if (!state.locked) {
    state.firing = false;
    state.aiming = false;
  }
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
  if (e.button === 0) {
    state.firing = true;
    fire();
  }
  if (e.button === 2) state.aiming = true;
}

function onMouseUp(e) {
  if (e.button === 0) state.firing = false;
  if (e.button === 2) state.aiming = false;
}

function hasLineOfSight(from, to) {
  const dir = to.clone().sub(from);
  const dist = dir.length();
  if (dist < 0.4) return true;
  dir.normalize();
  const ray = new THREE.Raycaster(from, dir, 0.15, dist - 0.25);
  return ray.intersectObjects(world.colliders, true).length === 0;
}

function toggleFlashlight() {
  if (state.battery <= 0 && !state.flashlightOn) {
    toast("Lamp dead — wait for charge");
    return;
  }
  state.flashlightOn = !state.flashlightOn;
  syncFlashlight();
  audio.click();
  updateHUD();
}

function syncFlashlight() {
  if (!world.flashlight) return;
  if (!state.flashlightOn || state.battery <= 0) {
    world.flashlight.intensity = 0;
    if (state.battery <= 0) state.flashlightOn = false;
  } else {
    world.flashlight.intensity = 1.2 + (state.battery / 100) * 1.8;
  }
}

function alertNearby(radius = 14) {
  world.enemies.forEach((e) => {
    if (!e.userData.alive || e.userData.dying) return;
    const dist = e.position.distanceTo(camera.position);
    const hear = e.userData.hearRadius || radius;
    if (dist < hear * 0.7) e.userData.alert = "combat";
    else if (dist < hear && e.userData.alert === "patrol") e.userData.alert = "suspicious";
  });
}

function fire() {
  if (state.modalOpen || state.journalOpen || state.reloading || shootCooldown > 0) return;
  const wpn = currentWeapon();
  const mag = currentMag();
  if (mag.ammo <= 0) {
    if (mag.reserve > 0) {
      reload();
      return;
    }
    if (state.emptyClickCd <= 0) {
      toast("Empty — no reserve");
      audio.empty();
      state.emptyClickCd = 0.35;
    }
    return;
  }

  mag.ammo--;
  state.shotsFired += wpn.pellets;
  shootCooldown = state.aiming ? wpn.adsFireRate : wpn.fireRate;
  world.weapon.userData.recoil = state.aiming ? wpn.adsRecoil : wpn.recoil;
  state.shake = state.aiming ? 0.018 : wpn.id === "shotgun" ? 0.09 : 0.045;
  state.fovKick = wpn.id === "shotgun" ? (state.aiming ? 4 : 7) : (state.aiming ? 1.6 : 3.2);
  state.spread = Math.min(22, state.spread + (wpn.id === "shotgun" ? 10 : state.aiming ? 2 : 7));
  if (wpn.id === "shotgun") audio.shotgun();
  else audio.gunshot();
  alertNearby(16);

  const flashMs = wpn.id === "shotgun" ? 70 : 50;
  if (world.weapon.userData.muzzle) {
    world.weapon.userData.muzzle.intensity = wpn.id === "shotgun" ? 5.5 : 3.5;
    setTimeout(() => { if (world.weapon.userData.muzzle) world.weapon.userData.muzzle.intensity = 0; }, flashMs);
  }
  $("#muzzle-flash").classList.add("flash");
  setTimeout(() => $("#muzzle-flash").classList.remove("flash"), flashMs);

  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const shellOrigin = camera.position.clone().add(new THREE.Vector3(0, -0.1, 0)).addScaledVector(right, 0.25);
  shells.push(spawnShell(scene, shellOrigin, right));
  updateHUD();

  const pellets = wpn.pellets;
  const hitMap = new Map();
  for (let i = 0; i < pellets; i++) {
    let bloom;
    if (wpn.id === "shotgun") {
      const ring = 0.012 + i * 0.004;
      bloom = state.aiming ? ring * 0.55 : ring;
    } else {
      bloom = (state.aiming ? 0.0012 : 0.004 + state.spread * 0.001);
    }
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(
      (Math.random() - 0.5) * bloom * 20,
      (Math.random() - 0.5) * bloom * 20
    );
    ray.setFromCamera(ndc, camera);
    const targets = world.enemies.filter((e) => e.userData.alive && !e.userData.dying);
    const hits = ray.intersectObjects([...targets, ...world.colliders], true);
    if (!hits.length || hits[0].distance > wpn.range) continue;
    let obj = hits[0].object;
    while (obj.parent && !obj.userData?.kind) obj = obj.parent;
    if (obj.userData?.kind === "enemy") {
      const headY = obj.userData.boss ? 2.1 : 1.7;
      const headshot = hits[0].point.y - obj.position.y > headY;
      state.shotsHit++;
      const prev = hitMap.get(obj) || { dmg: 0, point: hits[0].point, headshot: false, pellets: 0 };
      prev.dmg += headshot ? 2 : wpn.damage;
      prev.headshot = prev.headshot || headshot;
      prev.point = hits[0].point;
      prev.pellets++;
      hitMap.set(obj, prev);
    } else {
      if (i === 0 || Math.random() < 0.35) {
        decals.push(spawnBulletHole(scene, hits[0].point, hits[0].face?.normal));
      }
    }
  }
  for (const [enemy, h] of hitMap) {
    damageEnemy(enemy, h.dmg, h.point, h.headshot);
  }
  if (hitMap.size) updateHUD();

  if (mag.ammo <= 0 && mag.reserve > 0) {
    setTimeout(() => {
      if (state.playing && !state.reloading && currentMag().ammo <= 0) reload();
    }, 180);
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
    sparks.push(spawnBlood(scene, point));
    floaters.push(spawnDamageNumber(scene, point, headshot ? `${dmg} HS` : `${dmg}`, headshot ? "#ffee88" : "#ffcc66"));
  }
  enemy.userData.alert = "combat";

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
  audio.killConfirm();
  state.kills++;
  if (enemy.userData.boss) {
    state.bossDefeated = true;
    state.timeScale = 0.35;
    state.slowMoT = 1.4;
    toast("Elena is down — open your journal and accuse.");
    setObjective("Open journal (Tab) and make your accusation.");
    pushRadio("HQ: Visual confirm — Elena is down. Open your journal and accuse.");
  } else {
    const label = enemy.userData.type === "brute" ? "Brute down" :
      enemy.userData.type === "runner" ? "Runner down" : "Hostile neutralized";
    toast(headshot ? `Headshot — ${label}` : label);
    // Chance loot drop
    const roll = Math.random();
    if (roll < 0.38) {
      spawnLootPickup(scene, world.pickups, "ammo", enemy.userData.type === "brute" ? 14 : 8, enemy.position.x, enemy.position.z);
    } else if (roll < 0.55) {
      spawnLootPickup(scene, world.pickups, "health", enemy.userData.type === "brute" ? 20 : 12, enemy.position.x, enemy.position.z);
    }
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
  const wpn = currentWeapon();
  const mag = currentMag();
  if (state.reloading || mag.ammo === wpn.magSize || mag.reserve <= 0) return;
  state.reloading = true;
  state.reloadDuration = wpn.id === "shotgun" ? 1.35 : 0.85;
  state.reloadT = state.reloadDuration;
  audio.reload();
  $("#reload-bar").classList.remove("hidden");
  toast("Reloading...");
}

function finishReload() {
  const wpn = currentWeapon();
  const mag = currentMag();
  const need = wpn.magSize - mag.ammo;
  const take = Math.min(need, mag.reserve);
  mag.ammo += take;
  mag.reserve -= take;
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
  state.studyDoorT = 1.2;
  if (world.studyDoor) {
    const idx = world.colliders.indexOf(world.studyDoor);
    if (idx >= 0) world.colliders.splice(idx, 1);
    world.studyDoor.userData.openFrom = world.studyDoor.position.z;
  }
  if (world.studySeal) world.studySeal.visible = false;
  audio.unlock();
  toast("Study door unsealed");
  pushRadio("HQ: Study seal broken. Check the will.");
}

function updateStudyDoor(dt) {
  if (!state.studyUnlocked || !world.studyDoor || state.studyDoorT <= 0) return;
  state.studyDoorT -= dt;
  // Swing open around hinge — slide + rotate
  world.studyDoor.rotation.y = Math.min(1.4, world.studyDoor.rotation.y + dt * 1.4);
  world.studyDoor.position.x = 6 + Math.sin(world.studyDoor.rotation.y) * 0.8;
  world.studyDoor.position.z = 2 + (1 - Math.cos(world.studyDoor.rotation.y)) * 0.6;
  if (state.studyDoorT <= 0) world.studyDoor.visible = false;
}

function maybeSpawnBoss() {
  if (state.bossSpawned || state.clues.size < 5) return;
  if (state.modalOpen || state.journalOpen) {
    state.bossPending = true;
    return;
  }
  state.bossPending = false;
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
  const hits = ray.intersectObjects(world.interactables, true);
  if (!hits.length || hits[0].distance > 3.4) return null;
  let obj = hits[0].object;
  while (obj.parent && !obj.userData?.clue) obj = obj.parent;
  return obj.userData?.clue ? obj : null;
}

function nearestClueMarker(maxDist = 4.5) {
  let best = null;
  let bestD = maxDist;
  for (const m of world.interactables) {
    if (!m.visible || state.clues.has(m.userData.clue)) continue;
    const d = camera.position.distanceTo(m.position);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

function tryInteract() {
  if (state.modalOpen || state.journalOpen) return;
  const target = getLookTarget();
  if (!target) {
    const near = nearestClueMarker(2.2);
    if (near) toast("Aim at the gold marker, then press E");
    return;
  }
  const clue = CLUES[target.userData.clue];
  if (!clue || state.clues.has(clue.id)) return;
  collectClue(clue, target);
}

function collectClue(clue, marker) {
  state.clues.add(clue.id);
  marker.visible = false;
  if (marker.userData.ring) marker.userData.ring.visible = false;
  audio.pickup();
  toast(`Exhibit secured: ${clue.title}`);
  if (clue.id === STUDY_LOCK.clueRequired) unlockStudy();

  if (!state.onboardFirstClue) {
    state.onboardFirstClue = true;
    setTimeout(() => toast("Tab opens Case Journal"), 1600);
  }

  if (state.clues.size >= 5 && !state.bossSpawned) {
    if (!state.accuseReadyAnnounced) {
      state.accuseReadyAnnounced = true;
      showRoomBanner("ACCUSATION READY");
      toast("Accusation unlocked — Tab to charge");
      pushRadio("HQ: Enough for a charge. Open your journal when ready — Elena may not wait.");
      setTimeout(() => maybeSpawnBoss(), 3200);
    } else {
      maybeSpawnBoss();
    }
  }

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
  if (state.playing && !state.journalOpen && !DEMO) requestLock();
}

function suspectHeat(id) {
  let heat = 0;
  for (const cid of state.clues) {
    const c = CLUES[cid];
    if (c.implicates?.includes(id)) heat += c.category === "critical" ? 2 : 1;
  }
  return heat;
}

function linkedExhibits(suspectId) {
  return [...state.clues]
    .map((id) => CLUES[id])
    .filter((c) => c.implicates?.includes(suspectId));
}

function renderJournal() {
  const list = $("#journal-list");
  const suspects = $("#suspect-list");
  syncAccuseButton();

  if (state.journalTab === "evidence") {
    list.classList.remove("hidden");
    suspects.classList.add("hidden");
    list.innerHTML = "";
    if (!state.clues.size) {
      list.innerHTML = "<li><p>No evidence yet. Search every room — gold markers, press E.</p></li>";
      return;
    }
    [...state.clues].forEach((id) => {
      const c = CLUES[id];
      const li = document.createElement("li");
      const who = (c.implicates || []).map((sid) => SUSPECTS[sid]?.name || sid).join(", ");
      li.innerHTML = `<strong>${c.title}</strong><span class="ev-cat ${c.category}">${c.category}</span><p>${c.text}</p>${who ? `<div class="links">Points toward: ${who}</div>` : ""}`;
      list.appendChild(li);
    });
  } else {
    list.classList.add("hidden");
    suspects.classList.remove("hidden");
    suspects.innerHTML = "";
    Object.values(SUSPECTS).forEach((s) => {
      const heat = suspectHeat(s.id);
      const links = linkedExhibits(s.id);
      const div = document.createElement("div");
      div.className = "suspect-card" + (heat >= 4 ? " hot" : "");
      div.innerHTML = `
        <h4>${s.name}</h4>
        <div class="role">${s.role}</div>
        <p>${s.bio}</p>
        <div class="heat">${heat ? `Suspicion: ${"●".repeat(Math.min(heat, 6))}` : "No linking evidence yet"}</div>
        <div class="links">${links.length ? `Exhibits: ${links.map((c) => c.title).join(" · ")}` : "No exhibits name them yet"}</div>
        <div class="pick-hint">Click to select for accusation</div>
      `;
      div.addEventListener("click", () => {
        $("#accuse-select").value = s.id;
        syncAccuseButton();
        audio.click();
        toast(`Selected ${s.name}`);
      });
      suspects.appendChild(div);
    });
  }
}

function toggleJournal() {
  if (state.modalOpen) return;
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
      } else if (p.type === "shotgun") {
        state.hasShotgun = true;
        state.weapons.shotgun.ammo = WEAPONS.shotgun.magSize;
        state.weapons.shotgun.reserve = WEAPONS.shotgun.reserveStart;
        toast("Remington 870 — press 2");
        switchWeapon("shotgun");
      } else {
        state.weapons.pistol.reserve += p.amount;
        if (state.hasShotgun) state.weapons.shotgun.reserve += Math.ceil(p.amount / 2);
        toast(`+${p.amount} rounds`);
      }
      audio.itemGet();
      updateHUD();
    }
  }
}

function updateBattery(dt) {
  if (state.flashlightOn && state.battery > 0) {
    state.battery = Math.max(0, state.battery - dt * 4.2);
    if (state.battery <= 0) {
      state.flashlightOn = false;
      toast("Lamp dead — wait for charge");
    }
  } else if (!state.flashlightOn && state.battery < 100) {
    state.battery = Math.min(100, state.battery + dt * 12);
  }
  syncFlashlight();
}

function updatePlayer(dt) {
  if (!state.playing || state.modalOpen || state.journalOpen) return;

  // Block study entry message (rate-limited)
  state.studyToastCd = Math.max(0, state.studyToastCd - dt);
  state.emptyClickCd = Math.max(0, state.emptyClickCd - dt);
  if (!state.studyUnlocked) {
    const nearDoor = Math.abs(camera.position.x - 6) < 1.2 && Math.abs(camera.position.z - 2) < 1.4;
    if (nearDoor && (keys["KeyW"] || keys["KeyD"]) && state.studyToastCd <= 0) {
      toast(STUDY_LOCK.message);
      state.studyToastCd = 2.4;
    }
  }

  if (state.firing) fire();

  camera.rotation.order = "YXZ";
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;

  state.crouching = !!(keys["KeyC"] || keys["ControlLeft"] || keys["ControlRight"]);
  const sprinting = !state.aiming && !state.crouching && (keys["ShiftLeft"] || keys["ShiftRight"]);
  const maxSpeed = state.crouching ? 1.8 : state.aiming ? 2.4 : sprinting ? 5.8 : 3.6;
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
    wish.normalize();
    const accel = sprinting ? 22 : 16;
    state.vx += wish.x * accel * dt;
    state.vz += wish.z * accel * dt;
    bob += dt * (sprinting ? 14 : 10);
    state.spread = Math.min(16, state.spread + dt * (sprinting ? 20 : 10));
  } else {
    const friction = Math.exp(-14 * dt);
    state.vx *= friction;
    state.vz *= friction;
    state.spread = Math.max(0, state.spread - dt * 18);
  }
  const speed = Math.hypot(state.vx, state.vz);
  if (speed > maxSpeed) {
    state.vx = (state.vx / speed) * maxSpeed;
    state.vz = (state.vz / speed) * maxSpeed;
  }
  if (speed > 0.05) {
    const next = camera.position.clone();
    next.x += state.vx * dt;
    if (!playerCollides(next, world.colliders)) camera.position.x = next.x;
    else state.vx *= 0.2;
    next.x = camera.position.x;
    next.z += state.vz * dt;
    if (!playerCollides(next, world.colliders)) camera.position.z = next.z;
    else state.vz *= 0.2;

    state.footTimer -= dt;
    if (moving && state.footTimer <= 0) {
      audio.footstep();
      state.footTimer = sprinting ? 0.28 : 0.4;
    }
  }
  if (state.aiming) state.spread = Math.max(0, state.spread - dt * 30);

  // FOV: ADS / sprint + gun kick
  state.fovKick *= Math.exp(-dt * 14);
  const targetFov = (state.aiming ? 52 : sprinting && moving ? 80 : 72) + state.fovKick;
  state.fov += (targetFov - state.fov) * Math.min(1, dt * 10);
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
    const pct = Math.max(0, 1 - state.reloadT / state.reloadDuration) * 100;
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
    prompt.classList.remove("hidden", "nearby");
    $("#interact-label").textContent = target.userData.label;
  } else {
    const near = nearestClueMarker(4.2);
    if (near) {
      prompt.classList.remove("hidden");
      prompt.classList.add("nearby");
      $("#interact-label").textContent = "Evidence nearby — look for the gold marker";
    } else {
      prompt.classList.add("hidden");
      prompt.classList.remove("nearby");
    }
  }

  updatePickups();
}

function trySlideMove(entity, dx, dz, radius = 0.4) {
  const full = entity.position.clone();
  full.x += dx;
  full.z += dz;
  if (!playerCollides(full, world.colliders, radius)) {
    entity.position.x = full.x;
    entity.position.z = full.z;
    return true;
  }
  const onlyX = entity.position.clone();
  onlyX.x += dx;
  if (!playerCollides(onlyX, world.colliders, radius)) {
    entity.position.x = onlyX.x;
    return true;
  }
  const onlyZ = entity.position.clone();
  onlyZ.z += dz;
  if (!playerCollides(onlyZ, world.colliders, radius)) {
    entity.position.z = onlyZ.z;
    return true;
  }
  return false;
}

function lerpPose(pose, key, target, rate) {
  pose[key] += (target - pose[key]) * rate;
}

function animateEnemy(e, dt, moved, mode) {
  const u = e.userData;
  if (!u.shoulderL || !u.pose) return;

  const pose = u.pose;
  const telegraphing = (u.telegraph || 0) > 0;
  const staggered = u.stagger > 0;
  const meleeing = (u.meleeAnim || 0) > 0;
  if (u.meleeAnim > 0) u.meleeAnim = Math.max(0, u.meleeAnim - dt);

  // Movement blend 0..1
  const moveTarget = moved ? (mode === "combat" ? 1 : mode === "suspicious" ? 0.65 : 0.4) : 0;
  u.moveAmt += (moveTarget - (u.moveAmt || 0)) * Math.min(1, dt * 8);
  const move = u.moveAmt || 0;

  // Cycle speed by type / state
  const baseSpeed = u.type === "runner" ? 11 : u.type === "brute" ? 6.5 : 8;
  const cycle = mode === "combat" ? baseSpeed * 1.25 : mode === "patrol" ? baseSpeed * 0.7 : baseSpeed;
  u.animPhase = (u.animPhase || 0) + dt * cycle * (0.35 + move * 0.9);
  const phase = u.animPhase;
  const swing = Math.sin(phase);
  const swing2 = Math.sin(phase * 2);

  // Defaults — idle breathing
  let armLX = Math.sin(phase * 0.35) * 0.06;
  let armRX = -Math.sin(phase * 0.35) * 0.06;
  let armLZ = 0.08;
  let armRZ = -0.08;
  let legLX = 0;
  let legRX = 0;
  let torsoY = Math.sin(phase * 0.4) * 0.03;
  let torsoZ = 0;
  let headY = 0;
  let headX = Math.sin(phase * 0.3) * 0.04;
  let rootY = Math.sin(phase * 0.5) * 0.015;
  let rootTilt = 0;

  if (move > 0.05) {
    const amp = mode === "combat" ? 0.7 : 0.45;
    const legAmp = mode === "combat" ? 0.85 : 0.55;
    armLX = swing * amp * move;
    armRX = -swing * amp * move;
    legLX = -swing * legAmp * move;
    legRX = swing * legAmp * move;
    rootY = Math.abs(swing2) * 0.04 * move;
    torsoY = swing * 0.06 * move;
    torsoZ = -0.05 * move;
    rootTilt = swing * 0.04 * move;
    if (u.type === "brute") {
      armLX *= 0.7;
      armRX *= 0.7;
      torsoZ = -0.1 * move;
    }
    if (u.type === "runner") {
      armLX *= 1.15;
      armRX *= 1.15;
      legLX *= 1.2;
      legRX *= 1.2;
      rootY *= 1.3;
    }
  }

  // Aim / telegraph — raise gun arm
  if (telegraphing && u.ranged) {
    armRX = -1.45;
    armRZ = -0.35;
    armLX = 0.35;
    armLZ = 0.25;
    headX = -0.12;
    torsoZ = 0.08;
  } else if (mode === "combat" && u.ranged && move < 0.4) {
    // Ready-gun idle in combat
    armRX = -0.85;
    armRZ = -0.25;
    armLX = 0.25;
  }

  // Melee swing
  if (meleeing) {
    const t = 1 - u.meleeAnim / 0.45;
    armRX = -0.3 + Math.sin(t * Math.PI) * -1.6;
    armRZ = -0.4;
    torsoY = Math.sin(t * Math.PI) * 0.25;
  }

  // Hurt flinch
  if (staggered) {
    armLX = 0.5;
    armRX = 0.4;
    headX = 0.25;
    torsoZ = -0.15;
    rootTilt = 0.12;
  }

  // Suspicious — peer forward
  if (mode === "suspicious" && move < 0.3) {
    headX = -0.15;
    headY = Math.sin(phase * 0.6) * 0.2;
  }

  const rate = Math.min(1, dt * 12);
  lerpPose(pose, "armLX", armLX, rate);
  lerpPose(pose, "armRX", armRX, rate);
  lerpPose(pose, "armLZ", armLZ, rate);
  lerpPose(pose, "armRZ", armRZ, rate);
  lerpPose(pose, "legLX", legLX, rate);
  lerpPose(pose, "legRX", legRX, rate);
  lerpPose(pose, "torsoY", torsoY, rate);
  lerpPose(pose, "torsoZ", torsoZ, rate);
  lerpPose(pose, "headY", headY, rate);
  lerpPose(pose, "headX", headX, rate);
  lerpPose(pose, "rootY", rootY, rate);
  lerpPose(pose, "rootTilt", rootTilt, rate);

  u.shoulderL.rotation.x = pose.armLX;
  u.shoulderL.rotation.z = pose.armLZ;
  u.shoulderR.rotation.x = pose.armRX;
  u.shoulderR.rotation.z = pose.armRZ;
  u.hipL.rotation.x = pose.legLX;
  u.hipR.rotation.x = pose.legRX;
  if (u.torso) {
    u.torso.rotation.y = pose.torsoY;
    u.torso.rotation.x = pose.torsoZ;
  }
  if (u.headPivot) {
    u.headPivot.rotation.y = pose.headY;
    u.headPivot.rotation.x = pose.headX;
  }
  if (u.root) {
    u.root.position.y = pose.rootY;
    u.root.rotation.z = pose.rootTilt;
  }
}

function enemyFire(e, playerPos) {
  const origin = e.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  if (!hasLineOfSight(origin, playerPos.clone())) return false;
  const dir = playerPos.clone().sub(origin);
  dir.x += (Math.random() - 0.5) * 0.35;
  dir.y += (Math.random() - 0.5) * 0.18;
  dir.z += (Math.random() - 0.5) * 0.35;
  const proj = createProjectile(origin, dir);
  scene.add(proj);
  projectiles.push(proj);
  audio.enemyShot();
  return true;
}

function updateEnemies(dt) {
  if (!state.playing || state.journalOpen) return;
  const playerPos = camera.position;

  world.enemies.forEach((e) => {
    // Death fall animation
    if (e.userData.dying) {
      e.userData.deathT -= dt;
      e.rotation.x += dt * 2.4;
      e.rotation.z = Math.sin(e.userData.deathT * 6) * 0.15;
      if (e.userData.root) e.userData.root.position.y = Math.max(-0.4, (e.userData.root.position.y || 0) - dt * 0.8);
      e.position.y = Math.max(-0.15, e.position.y - dt * 0.35);
      if (e.userData.deathT <= 0) e.visible = false;
      return;
    }
    if (!e.userData.alive) return;

    e.userData.stagger = Math.max(0, e.userData.stagger - dt);
    const telegraphing = (e.userData.telegraph || 0) > 0;
    let moved = false;

    const eyeIdle = e.userData.eyeColor || (e.userData.boss ? 0xffcc44 : 0xff2233);
    if (e.userData.hurtFlash > 0) {
      e.userData.hurtFlash -= dt;
      e.userData.eyes?.forEach((eye) => eye.material.color.setHex(0xffffff));
      if (e.userData.glow) e.userData.glow.intensity = 1.6;
    } else if (telegraphing) {
      e.userData.eyes?.forEach((eye) => eye.material.color.setHex(0xffeeaa));
      if (e.userData.glow) e.userData.glow.intensity = (e.userData.boss ? 0.9 : 0.45) * 1.4;
    } else {
      e.userData.eyes?.forEach((eye) => eye.material.color.setHex(
        e.userData.alert === "combat" ? eyeIdle : 0x446688
      ));
      if (e.userData.glow) {
        e.userData.glow.intensity = (e.userData.boss ? 0.9 : 0.45) * (e.userData.alert === "combat" ? 1 : 0.55);
      }
    }

    const toPlayer = playerPos.clone().sub(e.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 26) {
      animateEnemy(e, dt, false, e.userData.alert || "patrol");
      return;
    }

    const eyeFrom = e.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    const canSee = dist < 2.2 || hasLineOfSight(eyeFrom, playerPos.clone());

    if (e.userData.alert !== "combat") {
      const seeR = e.userData.seeRadius || 14;
      const hearR = e.userData.hearRadius || 12;
      const fwd = new THREE.Vector3(Math.sin(e.userData.patrolAngle), 0, Math.cos(e.userData.patrolAngle));
      const dir = toPlayer.clone().normalize();
      const facing = fwd.dot(dir);
      const lit = state.flashlightOn && dist < 9;
      if (dist < 2.4 || (canSee && dist < seeR && facing > 0.35) || (canSee && lit && dist < 7 && facing > 0.1)) {
        e.userData.alert = "combat";
      } else if (e.userData.alert === "suspicious" || (dist < hearR * 0.45 && state.flashlightOn)) {
        e.userData.alert = "suspicious";
      }
    }

    if (e.userData.alert === "patrol") {
      e.userData.patrolT = (e.userData.patrolT || 0) + dt;
      if (e.userData.patrolT > 2.6) {
        e.userData.patrolT = 0;
        e.userData.patrolAngle += (Math.random() - 0.5) * 1.8;
      }
      const home = e.userData.home || e.position;
      const hx = home.x + Math.sin(e.userData.patrolAngle) * 1.8;
      const hz = home.z + Math.cos(e.userData.patrolAngle) * 1.8;
      const toHome = new THREE.Vector3(hx - e.position.x, 0, hz - e.position.z);
      if (toHome.length() > 0.2) {
        toHome.normalize().multiplyScalar(e.userData.speed * 0.35 * dt);
        moved = trySlideMove(e, toHome.x, toHome.z);
        if (!moved) e.userData.patrolAngle += Math.PI * 0.55;
      }
      e.lookAt(
        e.position.x + Math.sin(e.userData.patrolAngle),
        e.position.y,
        e.position.z + Math.cos(e.userData.patrolAngle)
      );
      animateEnemy(e, dt, moved, "patrol");
      return;
    }

    if (e.userData.alert === "suspicious") {
      e.lookAt(playerPos.x, e.position.y, playerPos.z);
      e.userData.patrolAngle = Math.atan2(toPlayer.x, toPlayer.z);
      if (canSee && dist < (e.userData.seeRadius || 14) * 0.75) e.userData.alert = "combat";
      const step = toPlayer.clone().normalize().multiplyScalar(e.userData.speed * 0.55 * dt);
      moved = trySlideMove(e, step.x, step.z);
      animateEnemy(e, dt, moved, "suspicious");
      return;
    }

    // Combat
    e.lookAt(playerPos.x, e.position.y, playerPos.z);
    if (e.userData.stagger > 0) {
      animateEnemy(e, dt, false, "combat");
      return;
    }

    if (e.userData.ranged && dist > 3 && dist < 16) {
      if ((e.userData.telegraph || 0) > 0) {
        e.userData.telegraph -= dt;
        if (e.userData.telegraph <= 0) {
          e.userData.telegraph = 0;
          enemyFire(e, playerPos);
        }
      } else {
        e.userData.shootCd -= dt;
        if (e.userData.shootCd <= 0 && canSee) {
          e.userData.telegraph = e.userData.boss ? 0.22 : 0.38;
          e.userData.shootCd = e.userData.boss ? 0.75 : 1.45 + Math.random() * 0.55;
        }
      }
    } else {
      e.userData.telegraph = 0;
    }

    const stopDist = e.userData.ranged && dist < 7 ? 5.5 : 1.35;
    if (dist > stopDist) {
      const step = toPlayer.clone().normalize().multiplyScalar(e.userData.speed * dt);
      moved = trySlideMove(e, step.x, step.z);
    } else if (dist <= 1.35) {
      e.userData.cooldown -= dt;
      if (e.userData.cooldown <= 0) {
        e.userData.cooldown = e.userData.boss ? 0.7 : e.userData.type === "brute" ? 1.15 : 0.95;
        e.userData.meleeAnim = 0.45;
        hurtPlayer(e.userData.meleeDmg || 14);
      }
    }
    animateEnemy(e, dt, moved, "combat");
  });
}

function updateProjectiles(dt) {
  if (state.journalOpen) return;
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
  state.exposureBoost = Math.max(0, state.exposureBoost - dt * 1.8);
  if (renderer) renderer.toneMappingExposure = 1.3 + state.exposureBoost;

  if (state.thunderT <= 0) {
    state.thunderT = 7 + Math.random() * 12;
    const outdoor = state.room === "garden";
    state.exposureBoost = outdoor ? 1.15 : 0.5;
    $("#lightning").classList.add("flash");
    setTimeout(() => $("#lightning").classList.remove("flash"), 90 + Math.random() * 70);
    setTimeout(() => audio.thunder(), outdoor ? 40 : 140 + Math.random() * 280);
    // Dim room lights for a beat
    world.lights.forEach((l) => {
      if (l === world.flashlight || !l.isPointLight) return;
      const prev = l.intensity;
      l.intensity = prev * 0.35;
      setTimeout(() => { l.intensity = prev; }, 180);
    });
  }

  if (rain?.material) {
    rain.material.opacity = state.room === "garden" ? 0.55 : 0.18;
  }
  audio.setAmbience(state.room === "garden");
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
    const beacon = m.userData.beacon;
    if (beacon) {
      beacon.rotation.y += dt * 2.2;
      beacon.position.y = 0.55 + Math.sin(t * 2 + m.position.x) * 0.06;
    } else {
      m.rotation.y += dt * 1.5;
    }
    const baseY = m.userData.baseY ?? m.userData.pos?.[1] ?? 0;
    if (!beacon) m.position.y = baseY + Math.sin(t * 2 + m.position.x) * 0.08;
    const dist = camera.position.distanceTo(m.position);
    const nearBoost = dist < 5 ? (1 - dist / 5) * 0.9 : 0;
    const mats = [];
    m.traverse((c) => { if (c.isMesh && c.material?.emissiveIntensity != null) mats.push(c.material); });
    mats.forEach((mat) => {
      mat.emissiveIntensity = 0.5 + Math.sin(t + m.position.x) * 0.25 + nearBoost;
    });
    if (m.userData.ring) {
      const s = 1 + Math.sin(t * 2) * 0.15 + nearBoost * 0.35;
      m.userData.ring.scale.set(s, s, s);
      if (m.userData.ring.material) {
        m.userData.ring.material.opacity = 0.45 + nearBoost * 0.4;
      }
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

  // Rooms — filled when all clues in room secured
  ctx.lineWidth = 1;
  Object.entries(ROOM_BOUNDS).forEach(([id, r]) => {
    const roomClues = Object.values(CLUES).filter((c) => c.room === id);
    const cleared = roomClues.length > 0 && roomClues.every((c) => state.clues.has(c.id));
    const x = r.min.x * scale + ox;
    const y = r.min.z * scale + oy;
    const rw = (r.max.x - r.min.x) * scale;
    const rh = (r.max.z - r.min.z) * scale;
    if (cleared) {
      ctx.fillStyle = "rgba(80, 140, 90, 0.18)";
      ctx.fillRect(x, y, rw, rh);
    }
    ctx.strokeStyle = cleared ? "rgba(120,180,110,0.45)" : "rgba(201,161,74,0.25)";
    ctx.strokeRect(x, y, rw, rh);
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
  if (!choice || state.clues.size < 5) return;
  const name = $("#accuse-select").selectedOptions[0]?.textContent || "this suspect";
  if (!DEMO && !window.confirm(`Accuse ${name}?\n\nThis closes the protocol. Wrong charges fail the case.`)) {
    return;
  }
  const won = choice === SOLUTION;
  const text = won
    ? "Elena Voss poisoned the soup with monkshood extract before Ashworth could reverse her inheritance. Your evidence held."
    : "Wrong suspect. Elena Voss was the killer — the kitchen log, footprints, and unsigned will told the truth.";
  state.journalOpen = false;
  $("#journal").classList.add("hidden");
  state.timeScale = 0.28;
  state.slowMoT = 1.1;
  pushRadio(won
    ? "HQ: Accusation logged. Case closed — Elena Voss."
    : "HQ: Accusation rejected. Review the kitchen log and heels.");
  showRoomBanner(won ? "CASE CLOSED" : "WRONG ACCUSED");
  setTimeout(() => endGame(won, text), 1100);
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
  let dt = Math.min(clock.getDelta(), 0.05);

  if (state.slowMoT > 0) {
    state.slowMoT -= dt;
    if (state.slowMoT <= 0) {
      state.slowMoT = 0;
      state.timeScale = 1;
    }
  }
  dt *= state.timeScale;
  shootCooldown = Math.max(0, shootCooldown - dt);

  if (state.playing) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateBattery(dt);
    updateStudyDoor(dt);
    updateRain(dt);
    updateDust(dust, dt, camera);
    updateSparks(dt);
    updateFloating(floaters, dt, scene);
    updatePhysicsBits(shells, dt, scene);
    updatePhysicsBits(decals, dt, scene);
    updateMarkers(dt);
    updateStorm(dt);
    if (state.bossPending) maybeSpawnBoss();
    drawMinimap();

    const nearCombat = world.enemies.some(
      (e) => e.userData.alive && !e.userData.dying && e.userData.alert === "combat"
        && e.position.distanceTo(camera.position) < 14
    );
    const tension = Math.min(
      1,
      (nearCombat ? 0.55 : 0.1)
        + (1 - state.health / 100) * 0.3
        + (state.bossSpawned && !state.bossDefeated ? 0.25 : 0)
    );
    audio.setTension(tension);

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
  state.weapon = "pistol";
  state.hasShotgun = false;
  state.weapons = {
    pistol: { ammo: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.reserveStart },
    shotgun: { ammo: 0, reserve: 0 },
  };
  state.reloading = false;
  state.reloadT = 0;
  state.reloadDuration = 0.85;
  state.clues = new Set();
  state.kills = 0;
  state.startTime = Date.now();
  state.yaw = 0;
  state.pitch = 0;
  state.room = "entrance";
  state.modalOpen = false;
  state.journalOpen = false;
  state.flashlightOn = true;
  state.battery = 100;
  state.aiming = false;
  state.crouching = false;
  state.shake = 0;
  state.spread = 0;
  state.fov = 72;
  state.studyUnlocked = false;
  state.studyDoorT = 0;
  state.bossSpawned = false;
  state.bossDefeated = false;
  state.radioFired = new Set();
  state.thunderT = 6;
  state.meleeCd = 0;
  state.shotsFired = 0;
  state.shotsHit = 0;
  state.standY = 1.65;
  state.timeScale = 1;
  state.slowMoT = 0;
  state.fovKick = 0;
  state.studyToastCd = 0;
  state.emptyClickCd = 0;
  state.exposureBoost = 0;
  state.firing = false;
  state.accuseReadyAnnounced = false;
  state.onboardFirstClue = false;
  state.bossPending = false;
  state.vx = 0;
  state.vz = 0;
  $("#accuse-select").value = "";
  syncAccuseButton();
  camera.position.set(0, 1.65, 2);
  camera.fov = 72;
  camera.updateProjectionMatrix();
  world.weapon.position.set(0.22, -0.24, -0.4);
  world.weapon.userData.pistol.visible = true;
  world.weapon.userData.shotgun.visible = false;
  world.weapon.userData.muzzle = world.weapon.userData.pistol.userData.muzzle;
  syncFlashlight();
  boss = null;
  projectiles.splice(0).forEach((p) => scene.remove(p));
  $("#radio-log").innerHTML = "";
  $("#reload-bar").classList.add("hidden");
  $("#boss-bar").classList.add("hidden");

  if (world.studyDoor) {
    const lock = STUDY_LOCK.block;
    world.studyDoor.visible = true;
    world.studyDoor.rotation.y = 0;
    world.studyDoor.position.set(lock.x, lock.h / 2, lock.z);
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
    e.rotation.z = 0;
    e.position.y = 0;
    if (e.userData.home) {
      e.position.x = e.userData.home.x;
      e.position.z = e.userData.home.z;
    }
    e.userData.alive = true;
    e.userData.dying = false;
    e.userData.hp = e.userData.maxHp || 4;
    e.userData.stagger = 0;
    e.userData.shootCd = 0.5;
    e.userData.telegraph = 0;
    e.userData.meleeAnim = 0;
    e.userData.moveAmt = 0;
    e.userData.animPhase = Math.random() * Math.PI * 2;
    e.userData.alert = e.userData.boss ? "combat" : "patrol";
    e.userData.patrolT = Math.random() * 3;
    e.userData.patrolAngle = Math.random() * Math.PI * 2;
    if (e.userData.root) {
      e.userData.root.position.y = 0;
      e.userData.root.rotation.z = 0;
    }
    if (e.userData.pose) {
      Object.keys(e.userData.pose).forEach((k) => { e.userData.pose[k] = 0; });
    }
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
  sparks.splice(0).forEach((g) => scene.remove(g));
  floaters.splice(0).forEach((f) => scene.remove(f));
  // Drop dynamic kill-loot; restore static pickups
  world.pickups = world.pickups.filter((p) => {
    if (p.dynamic) {
      p.meshes.forEach((m) => scene.remove(m));
      return false;
    }
    p.taken = false;
    p.meshes.forEach((m) => { m.visible = true; });
    return true;
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
$("#accuse-select").addEventListener("change", syncAccuseButton);
$("#btn-replay").addEventListener("click", () => showScreen("#screen-title"));
$("#game-canvas").addEventListener("click", () => {
  if (state.playing && !state.locked && !state.modalOpen && !state.journalOpen && !DEMO) requestLock();
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
  if (e.code === "Escape") {
    if (state.modalOpen) {
      closeEvidence();
      return;
    }
    if (state.journalOpen) toggleJournal();
    return;
  }
  if (e.code === "KeyE") tryInteract();
  if (e.code === "KeyR") reload();
  if (e.code === "KeyF") toggleFlashlight();
  if (e.code === "KeyV") melee();
  if (e.code === "Digit1" || e.code === "Numpad1") switchWeapon("pistol");
  if (e.code === "Digit2" || e.code === "Numpad2") switchWeapon("shotgun");
  if (e.code === "Tab") {
    e.preventDefault();
    if (!state.modalOpen) toggleJournal();
  }
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
