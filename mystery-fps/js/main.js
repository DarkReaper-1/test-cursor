import * as THREE from "three";
import { BRIEF, CLUES, SOLUTION, ROOM_BOUNDS, SUSPECTS } from "./data.js";
import { AudioBus } from "./audio.js";
import { buildWorld, playerCollides, spawnHitSparks } from "./world.js";

const $ = (s) => document.querySelector(s);
const DEMO = new URLSearchParams(location.search).has("demo");

const state = {
  playing: false,
  locked: false,
  health: 100,
  ammo: 12,
  reserve: 48,
  reloading: false,
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
  shake: 0,
  footTimer: 0,
};

const keys = {};
const audio = new AudioBus();
const sparks = [];

let renderer, scene, camera, clock, world, rain;
let bob = 0;
let shootCooldown = 0;
let toastTimer;
let bannerTimer;
let minimapCtx;

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
  $("#room-stat").textContent = ROOM_BOUNDS[state.room]?.name || state.room;
  $("#btn-accuse").disabled = state.clues.size < 5;
  $("#damage-vignette").classList.toggle("critical", state.health > 0 && state.health <= 30);
  const flash = $("#flash-stat");
  flash.textContent = state.flashlightOn ? "🔦 ON" : "🔦 OFF";
  flash.className = state.flashlightOn ? "flash-on" : "flash-off";

  if (state.clues.size >= 5) setObjective("Open journal (Tab) and accuse the killer.");
  else if (state.clues.size >= 3) setObjective("Keep searching. Hostiles inbound.");
  else setObjective("Secure the manor. Find evidence.");
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
  shootCooldown = 0.16;
  world.weapon.userData.recoil = 0.12;
  state.shake = 0.04;
  audio.gunshot();

  if (world.weapon.userData.muzzle) {
    world.weapon.userData.muzzle.intensity = 3.5;
    setTimeout(() => { if (world.weapon.userData.muzzle) world.weapon.userData.muzzle.intensity = 0; }, 40);
  }
  $("#muzzle-flash").classList.add("flash");
  setTimeout(() => $("#muzzle-flash").classList.remove("flash"), 45);
  updateHUD();

  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const alive = world.enemies.filter((e) => e.userData.alive);
  const hits = ray.intersectObjects(alive, true);
  if (hits.length && hits[0].distance < 30) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData?.kind) obj = obj.parent;
    if (obj.userData?.kind === "enemy") {
      const headshot = hits[0].point.y - obj.position.y > 1.7;
      damageEnemy(obj, headshot ? 2 : 1, hits[0].point);
    }
  }
}

function damageEnemy(enemy, dmg, point) {
  enemy.userData.hp -= dmg;
  enemy.userData.hurtFlash = 0.2;
  enemy.userData.stagger = 0.25;
  audio.hit();
  state.shake = 0.025;

  $("#crosshair").classList.add("hit");
  $("#hitmarker").classList.remove("hidden");
  setTimeout(() => {
    $("#crosshair").classList.remove("hit");
    $("#hitmarker").classList.add("hidden");
  }, 90);

  if (point) sparks.push(spawnHitSparks(scene, point));

  // Knockback
  const away = enemy.position.clone().sub(camera.position);
  away.y = 0;
  away.normalize().multiplyScalar(0.35);
  enemy.position.add(away);

  if (enemy.userData.hp <= 0) {
    enemy.userData.alive = false;
    enemy.visible = false;
    state.kills++;
    toast(dmg >= 2 ? "Headshot — neutralized" : "Hostile neutralized");
    updateHUD();
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
  }, 850);
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

  camera.rotation.order = "YXZ";
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;

  const sprinting = keys["ShiftLeft"] || keys["ShiftRight"];
  const speed = (sprinting ? 5.8 : 3.6) * dt;
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
  }

  let y = 1.65 + Math.sin(bob) * 0.03;
  if (state.shake > 0) {
    y += (Math.random() - 0.5) * state.shake;
    camera.rotation.z = (Math.random() - 0.5) * state.shake * 0.5;
    state.shake *= 0.85;
  } else {
    camera.rotation.z = 0;
  }
  camera.position.y = y;

  const w = world.weapon;
  w.position.set(0.22, -0.24 + Math.sin(bob) * 0.012, -0.4);
  w.userData.recoil *= 0.82;
  w.rotation.x = -w.userData.recoil * 2.5;
  w.rotation.z = Math.sin(bob * 0.5) * 0.02;

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
    if (!e.userData.alive) return;
    e.userData.bob += dt * 5;
    e.userData.stagger = Math.max(0, e.userData.stagger - dt);

    // Limb animation
    const swing = Math.sin(e.userData.bob) * 0.35;
    if (e.userData.armL) e.userData.armL.rotation.x = swing;
    if (e.userData.armR) e.userData.armR.rotation.x = -swing;
    if (e.userData.legL) e.userData.legL.rotation.x = -swing;
    if (e.userData.legR) e.userData.legR.rotation.x = swing;

    if (e.userData.hurtFlash > 0) {
      e.userData.hurtFlash -= dt;
      e.userData.eyes?.forEach((eye) => eye.material.color.setHex(0xffffff));
    } else {
      e.userData.eyes?.forEach((eye) => eye.material.color.setHex(0xff2233));
    }

    const toPlayer = playerPos.clone().sub(e.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 20) return;

    e.lookAt(playerPos.x, e.position.y, playerPos.z);

    if (e.userData.stagger > 0) return;

    if (dist > 1.35) {
      toPlayer.normalize().multiplyScalar(e.userData.speed * dt);
      const next = e.position.clone().add(toPlayer);
      if (!playerCollides(next, world.colliders, 0.4)) {
        e.position.x = next.x;
        e.position.z = next.z;
      }
    } else {
      e.userData.cooldown -= dt;
      if (e.userData.cooldown <= 0) {
        e.userData.cooldown = 0.95;
        hurtPlayer(14);
      }
    }
  });
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
  const grade = won
    ? state.clues.size >= 8 && state.kills >= 5 ? "S" : state.clues.size >= 6 ? "A" : "B"
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

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  shootCooldown = Math.max(0, shootCooldown - dt);

  if (state.playing) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateRain(dt);
    updateSparks(dt);
    updateMarkers(dt);
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
  state.clues = new Set();
  state.kills = 0;
  state.startTime = Date.now();
  state.yaw = 0;
  state.pitch = 0;
  state.room = "entrance";
  state.modalOpen = false;
  state.journalOpen = false;
  state.flashlightOn = true;
  state.shake = 0;
  camera.position.set(0, 1.65, 2);
  if (world.flashlight) world.flashlight.intensity = 2.8;

  world.interactables.forEach((m) => {
    m.visible = true;
    if (m.userData.ring) m.userData.ring.visible = true;
  });
  world.enemies.forEach((e) => {
    e.visible = true;
    e.userData.alive = true;
    e.userData.hp = e.userData.maxHp || 4;
    e.userData.stagger = 0;
  });
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

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (!state.playing) return;
  if (e.code === "KeyE") tryInteract();
  if (e.code === "KeyR") reload();
  if (e.code === "KeyF") toggleFlashlight();
  if (e.code === "Tab") { e.preventDefault(); toggleJournal(); }
  if (e.code === "Escape" && state.journalOpen) toggleJournal();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

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
