import * as THREE from "three";
import {
  BRIEF, CLUES, SOLUTION, ROOM_BOUNDS, SUSPECTS, STUDY_LOCK, RADIO, KIND_LABELS,
} from "./data.js";
import { AudioBus } from "./audio.js";
import { buildWorld, playerCollides, resetInvestigation } from "./world.js";
import { createDust, updateDust } from "./fx.js";

const $ = (s) => document.querySelector(s);
const DEMO = new URLSearchParams(location.search).has("demo");

function emptyPins() {
  return Object.fromEntries(Object.keys(CLUES).map((id) => [id, new Set()]));
}

const state = {
  playing: false,
  locked: false,
  clues: new Set(),
  notes: 0,
  fieldNotes: [],
  pins: emptyPins(),
  unreadEvidence: 0,
  activeClueId: null,
  startTime: 0,
  yaw: 0,
  pitch: 0,
  room: "entrance",
  modalOpen: false,
  journalOpen: false,
  journalTab: "evidence",
  flashlightOn: true,
  battery: 100,
  crouching: false,
  footTimer: 0,
  fov: 72,
  studyUnlocked: false,
  studyDoorT: 0,
  radioFired: new Set(),
  thunderT: 8,
  lookSwayX: 0,
  lookSwayY: 0,
  standY: 1.65,
  timeScale: 1,
  slowMoT: 0,
  studyToastCd: 0,
  exposureBoost: 0,
  accuseReadyAnnounced: false,
  onboardFirstClue: false,
  onboardPinHint: false,
  vx: 0,
  vz: 0,
};

const keys = {};
const audio = new AudioBus();

let renderer, scene, camera, clock, world, rain, dust;
let bob = 0;
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

function totalPins() {
  return Object.values(state.pins).reduce((n, set) => n + set.size, 0);
}

function pinsForSuspect(suspectId) {
  return [...state.clues]
    .map((id) => CLUES[id])
    .filter((c) => state.pins[c.id]?.has(suspectId));
}

function syncJournalBadge() {
  const badge = $("#journal-badge");
  if (!badge) return;
  const n = state.unreadEvidence;
  badge.textContent = String(n);
  badge.classList.toggle("hidden", n <= 0);
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
    hint.textContent = "Case ready — pin theories, select a suspect, then open the dossier.";
  } else {
    const name = $("#accuse-select").selectedOptions[0]?.textContent || "suspect";
    const pinned = pinsForSuspect(choice).length;
    hint.textContent = pinned
      ? `Ready to accuse ${name} (${pinned} pin${pinned === 1 ? "" : "s"}). Review the dossier first.`
      : `Selected ${name} — pin exhibits to them before filing if you can.`;
  }
}

function nextObjective() {
  if (state.clues.size >= 8) return "Full dossier. Tab → pin theories → accuse when certain.";
  if (state.clues.size >= 5) {
    if (totalPins() < 2) return "Accusation unlocked. Pin exhibits to a suspect, then accuse.";
    return "Accusation unlocked. Tab → review suspects → Make Accusation.";
  }
  if (!state.studyUnlocked) return "Library: examine Ashworth's body (gold marker) — press E.";

  const priority = ["library", "kitchen", "study", "garden", "ballroom", "entrance"];
  for (const room of priority) {
    const missing = Object.values(CLUES).filter((c) => c.room === room && !state.clues.has(c.id));
    if (!missing.length) continue;
    const titles = missing.slice(0, 2).map((c) => c.title).join(" & ");
    return `${ROOM_BOUNDS[room].name}: examine ${titles} (E).`;
  }
  return "All evidence secured. Tab to accuse.";
}

function caseStatus() {
  if (state.clues.size >= 8) return "Dossier complete";
  if (state.clues.size >= 5) return "Ready to accuse";
  if (state.clues.size >= 3) return "Motive forming";
  if (state.clues.size >= 1) return "Case opened";
  return "Case building";
}

function updateHUD() {
  $("#clue-stat").textContent = `Evidence ${state.clues.size}/8`;
  $("#case-stat").textContent = caseStatus();
  $("#pin-stat").textContent = `Pins ${totalPins()}`;
  $("#room-stat").textContent = ROOM_BOUNDS[state.room]?.name || state.room;
  $("#case-progress").textContent = state.clues.size >= 5
    ? "Accusation unlocked"
    : `${state.clues.size} / 5 to accuse`;
  syncAccuseButton();
  syncJournalBadge();
  const flash = $("#flash-stat");
  flash.textContent = state.flashlightOn ? "LAMP ON" : "LAMP OFF";
  flash.className = state.flashlightOn ? "flash-on" : "flash-off";
  const bat = $("#battery-fill");
  bat.style.width = `${Math.max(0, state.battery)}%`;
  bat.classList.toggle("low", state.battery < 25);
  setObjective(nextObjective());
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
  // pointer released
  $("#pause-hint").classList.toggle("hidden", state.locked || !state.playing || state.modalOpen || state.journalOpen);
}

function onMouseMove(e) {
  if (!state.locked || !state.playing || state.modalOpen || state.journalOpen) return;
  const sens = 0.0022;
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
  }
}

function onMouseUp() {}

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
    const clueOk = msg.atClues == null || state.clues.size >= msg.atClues;
    if (clueOk) {
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

function resolveInteractable(obj) {
  let cur = obj;
  while (cur) {
    if (cur.userData?.kind === "clue" || cur.userData?.kind === "flavor") return cur;
    cur = cur.parent;
  }
  return null;
}

function getLookTarget() {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(world.interactables, true);
  if (!hits.length || hits[0].distance > 3.6) return null;
  return resolveInteractable(hits[0].object);
}

function nearestClueMarker(maxDist = 4.5) {
  let best = null;
  let bestD = maxDist;
  for (const m of world.interactables) {
    if (m.userData.kind !== "clue" || m.userData.secured) continue;
    const d = camera.position.distanceTo(m.position);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

function markClueSecured(marker) {
  marker.userData.secured = true;
  if (marker.userData.beacon) marker.userData.beacon.visible = false;
  if (marker.userData.ring) marker.userData.ring.visible = false;
  marker.traverse((c) => {
    if (c.isMesh && c.material?.emissiveIntensity != null) {
      c.material = c.material.clone();
      c.material.emissiveIntensity = 0.12;
      c.material.color?.setHex?.(0x3a3428);
    }
  });
}

function tryInteract() {
  if (state.modalOpen || state.journalOpen) return;
  const target = getLookTarget();
  if (!target) {
    const near = nearestClueMarker(2.2);
    if (near) toast("Aim at the gold marker, then press E");
    return;
  }

  if (target.userData.kind === "flavor") {
    openFlavor(target);
    return;
  }

  const clue = CLUES[target.userData.clue];
  if (!clue) return;
  if (!state.clues.has(clue.id)) collectClue(clue, target);
  else openEvidence(clue, { revisit: true });
}

function collectClue(clue, marker) {
  state.clues.add(clue.id);
  markClueSecured(marker);
  state.unreadEvidence++;
  audio.pickup();
  if (clue.id === STUDY_LOCK.clueRequired) unlockStudy();

  if (!state.onboardFirstClue) {
    state.onboardFirstClue = true;
    setTimeout(() => toast("Tab opens Case Journal — pin theories to suspects"), 400);
  }

  if (state.clues.size >= 5 && !state.accuseReadyAnnounced) {
    state.accuseReadyAnnounced = true;
    showRoomBanner("ACCUSATION READY");
    pushRadio("HQ: Enough for a charge. Review your pins, then accuse when ready.");
  }

  maybeRadio();
  updateHUD();
  openEvidence(clue, { fresh: true });
  renderJournal();
}

function renderPinChips(clueId) {
  const wrap = $("#ev-pin-chips");
  wrap.innerHTML = "";
  Object.values(SUSPECTS).forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pin-chip" + (state.pins[clueId]?.has(s.id) ? " active" : "");
    btn.textContent = s.name.split(" ")[0];
    btn.title = `Pin to ${s.name}`;
    btn.addEventListener("click", () => {
      const set = state.pins[clueId];
      if (set.has(s.id)) set.delete(s.id);
      else set.add(s.id);
      btn.classList.toggle("active", set.has(s.id));
      audio.click();
      if (!state.onboardPinHint && set.size) {
        state.onboardPinHint = true;
        toast("Pinned — suspicion builds from your theory");
      }
      updateHUD();
      if (state.journalOpen) renderJournal();
    });
    wrap.appendChild(btn);
  });
}

function openFlavor(marker) {
  state.modalOpen = true;
  state.activeClueId = null;
  if (document.pointerLockElement) document.exitPointerLock();
  marker.userData.examined = true;
  $("#ev-title").textContent = marker.userData.title;
  $("#ev-body").textContent = marker.userData.text;
  $("#ev-room").textContent = `Observation — ${ROOM_BOUNDS[state.room]?.name || state.room}`;
  const cat = $("#ev-category");
  cat.textContent = KIND_LABELS.flavor;
  cat.className = "ev-cat flavor";
  $("#ev-pin-zone").classList.add("hidden");
  $("#btn-close-ev").textContent = "Continue";
  $("#evidence-modal").classList.remove("hidden");
  audio.itemGet();
}

function openEvidence(clue, opts = {}) {
  state.modalOpen = true;
  state.activeClueId = clue.id;
  if (document.pointerLockElement) document.exitPointerLock();
  $("#ev-title").textContent = clue.title;
  $("#ev-body").textContent = clue.text;
  $("#ev-room").textContent = `Found in: ${ROOM_BOUNDS[clue.room]?.name || clue.room}`;
  const cat = $("#ev-category");
  cat.textContent = KIND_LABELS[clue.kind] || "Evidence";
  cat.className = `ev-cat ${clue.kind || ""}`;
  $("#ev-pin-zone").classList.remove("hidden");
  renderPinChips(clue.id);
  $("#btn-close-ev").textContent = opts.revisit ? "Close" : "Log & Continue";
  $("#evidence-modal").classList.remove("hidden");
}

function closeEvidence() {
  $("#evidence-modal").classList.add("hidden");
  state.modalOpen = false;
  const justLogged = state.activeClueId && state.clues.has(state.activeClueId);
  if (justLogged && $("#btn-close-ev").textContent.includes("Log")) {
    toast(`Exhibit logged: ${CLUES[state.activeClueId].title}`);
  }
  state.activeClueId = null;
  if (state.playing && !state.journalOpen && !DEMO) requestLock();
}

function suspectHeat(id) {
  return pinsForSuspect(id).length;
}

function renderJournal() {
  const list = $("#journal-list");
  const notes = $("#notes-list");
  const suspects = $("#suspect-list");
  syncAccuseButton();

  list.classList.add("hidden");
  notes.classList.add("hidden");
  suspects.classList.add("hidden");

  if (state.journalTab === "evidence") {
    list.classList.remove("hidden");
    list.innerHTML = "";
    if (!state.clues.size) {
      list.innerHTML = "<li><p>No evidence yet. Search every room — gold markers, press E. Dim props can be re-examined.</p></li>";
      return;
    }
    [...state.clues].forEach((id) => {
      const c = CLUES[id];
      const pinned = [...(state.pins[id] || [])].map((sid) => SUSPECTS[sid]?.name.split(" ")[0] || sid);
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${c.title}</strong>
        <span class="ev-cat ${c.kind}">${KIND_LABELS[c.kind] || "Evidence"}</span>
        <p>${c.text}</p>
        <div class="links">${pinned.length ? `Your pins: ${pinned.join(" · ")}` : "No pins yet — open exhibit (E) to theorize"}</div>
      `;
      li.addEventListener("click", () => {
        state.journalOpen = false;
        $("#journal").classList.add("hidden");
        openEvidence(c, { revisit: true });
      });
      list.appendChild(li);
    });
  } else if (state.journalTab === "notes") {
    notes.classList.remove("hidden");
    notes.innerHTML = "";
    if (!state.fieldNotes.length) {
      notes.innerHTML = "<p class=\"empty-notes\">No field notes yet. Walk near loose papers in the manor.</p>";
      return;
    }
    state.fieldNotes.forEach((text, i) => {
      const div = document.createElement("div");
      div.className = "note-card";
      div.innerHTML = `<span class="note-idx">Note ${i + 1}</span><p>${text}</p>`;
      notes.appendChild(div);
    });
  } else {
    suspects.classList.remove("hidden");
    suspects.innerHTML = "";
    Object.values(SUSPECTS).forEach((s) => {
      const heat = suspectHeat(s.id);
      const links = pinsForSuspect(s.id);
      const div = document.createElement("div");
      div.className = "suspect-card" + (heat >= 3 ? " hot" : "") + ($("#accuse-select").value === s.id ? " selected" : "");
      div.innerHTML = `
        <h4>${s.name}</h4>
        <div class="role">${s.role}</div>
        <p>${s.bio}</p>
        <div class="heat">${heat ? `Your theory: ${"●".repeat(Math.min(heat, 6))}` : "No pins linking them yet"}</div>
        <div class="links">${links.length ? `Pinned: ${links.map((c) => c.title).join(" · ")}` : "Pin exhibits from the evidence view"}</div>
        <div class="pick-hint">Click to select for accusation</div>
      `;
      div.addEventListener("click", () => {
        $("#accuse-select").value = s.id;
        syncAccuseButton();
        audio.click();
        toast(`Selected ${s.name}`);
        renderJournal();
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
    state.unreadEvidence = 0;
    syncJournalBadge();
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
    p.meshes.forEach((m, i) => {
      m.position.y = (i === 0 ? 0.35 : 0.5) + Math.sin(performance.now() * 0.004 + p.position.x) * 0.06;
      m.rotation.y += 0.02;
    });
    if (camera.position.distanceTo(p.position) < 1.2) {
      p.taken = true;
      p.meshes.forEach((m) => { m.visible = false; });
      state.notes++;
      const text = p.text || "Case note recovered";
      state.fieldNotes.push(text);
      toast("Field note filed to journal");
      audio.itemGet();
      pushRadio(`Field note: ${text}`);
      updateHUD();
      if (state.journalOpen && state.journalTab === "notes") renderJournal();
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

  state.studyToastCd = Math.max(0, state.studyToastCd - dt);
  if (!state.studyUnlocked) {
    const nearDoor = Math.abs(camera.position.x - 6) < 1.2 && Math.abs(camera.position.z - 2) < 1.4;
    if (nearDoor && (keys["KeyW"] || keys["KeyD"]) && state.studyToastCd <= 0) {
      toast(STUDY_LOCK.message);
      state.studyToastCd = 2.4;
    }
  }

  camera.rotation.order = "YXZ";
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;

  state.crouching = !!(keys["KeyC"] || keys["ControlLeft"] || keys["ControlRight"]);
  const sprinting = !state.crouching && (keys["ShiftLeft"] || keys["ShiftRight"]);
  const maxSpeed = state.crouching ? 1.8 : sprinting ? 5.6 : 3.5;
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
    const accel = sprinting ? 20 : 14;
    state.vx += wish.x * accel * dt;
    state.vz += wish.z * accel * dt;
    bob += dt * (sprinting ? 12 : 9);
  } else {
    const friction = Math.exp(-14 * dt);
    state.vx *= friction;
    state.vz *= friction;
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
      state.footTimer = sprinting ? 0.3 : 0.42;
    }
  }

  const targetFov = sprinting && moving ? 78 : 72;
  state.fov += (targetFov - state.fov) * Math.min(1, dt * 8);
  camera.fov = state.fov;
  camera.updateProjectionMatrix();

  const targetStand = state.crouching ? 1.15 : 1.65;
  state.standY += (targetStand - state.standY) * Math.min(1, dt * 10);
  camera.position.y = state.standY + Math.sin(bob) * (state.crouching ? 0.01 : 0.025);
  camera.rotation.z = 0;

  state.lookSwayX *= 0.85;
  state.lookSwayY *= 0.85;

  updateCompass();

  const room = currentRoom(camera.position);
  if (room !== state.room) {
    state.room = room;
    updateHUD();
    showRoomBanner(ROOM_BOUNDS[room].name);
  }

  const target = getLookTarget();
  const prompt = $("#interact-prompt");
  const cross = $("#crosshair");
  if (target) {
    prompt.classList.remove("hidden", "nearby");
    cross.classList.add("examine");
    if (target.userData.kind === "flavor") {
      $("#interact-label").textContent = target.userData.label;
    } else if (target.userData.secured || state.clues.has(target.userData.clue)) {
      $("#interact-label").textContent = "Re-examine evidence";
    } else {
      $("#interact-label").textContent = target.userData.label;
    }
  } else {
    cross.classList.remove("examine");
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

function updateMarkers(dt) {
  const t = performance.now() * 0.003;
  world.interactables.forEach((m) => {
    if (!m.visible) return;
    if (m.userData.kind === "flavor") {
      m.position.y = (m.userData.baseY ?? m.position.y) + Math.sin(t + m.position.x) * 0.02;
      return;
    }
    if (m.userData.secured) return;
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

  // Unsecured clue markers
  world.interactables.forEach((m) => {
    if (m.userData.kind !== "clue" || m.userData.secured) return;
    ctx.fillStyle = "#c9a14a";
    ctx.beginPath();
    ctx.arc(m.position.x * scale + ox, m.position.z * scale + oy, 2.5, 0, Math.PI * 2);
    ctx.fill();
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

function caseStrength(suspectId) {
  const pinned = pinsForSuspect(suspectId);
  const hits = pinned.filter((c) => c.implicates?.includes(suspectId)).length;
  if (pinned.length >= 4 && hits >= 3) return { label: "Strong case", rank: 3 };
  if (pinned.length >= 2 && hits >= 1) return { label: "Moderate case", rank: 2 };
  if (pinned.length >= 1) return { label: "Thin case", rank: 1 };
  return { label: "No pinned exhibits", rank: 0 };
}

function openDossier() {
  const choice = $("#accuse-select").value;
  if (!choice || state.clues.size < 5) return;
  const suspect = SUSPECTS[choice];
  const pinned = pinsForSuspect(choice);
  const strength = caseStrength(choice);
  $("#dossier-title").textContent = `Accuse ${suspect.name}`;
  $("#dossier-strength").textContent = `${strength.label} — ${pinned.length} exhibit${pinned.length === 1 ? "" : "s"} pinned to them`;
  $("#dossier-strength").className = `dossier-strength rank-${strength.rank}`;
  const list = $("#dossier-pins");
  list.innerHTML = "";
  if (!pinned.length) {
    list.innerHTML = "<li class=\"weak\">You have no pins on this suspect. Accusing from gut feeling is risky.</li>";
  } else {
    pinned.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c.title;
      list.appendChild(li);
    });
  }
  state.journalOpen = false;
  $("#journal").classList.add("hidden");
  state.modalOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
  $("#accuse-modal").classList.remove("hidden");
  audio.click();
}

function closeDossier() {
  $("#accuse-modal").classList.add("hidden");
  state.modalOpen = false;
  state.journalOpen = true;
  $("#journal").classList.remove("hidden");
  renderJournal();
}

function confirmAccusation() {
  const choice = $("#accuse-select").value;
  if (!choice || state.clues.size < 5) return;
  $("#accuse-modal").classList.add("hidden");
  state.modalOpen = false;
  const won = choice === SOLUTION;
  const pinned = pinsForSuspect(choice);
  const text = won
    ? "Elena Voss poisoned the soup with monkshood extract before Ashworth could reverse her inheritance. Your dossier held."
    : "Wrong charge. The kitchen trail and garden heels pointed elsewhere — reopen and rebuild your theory.";
  state.journalOpen = false;
  $("#journal").classList.add("hidden");
  state.timeScale = 0.28;
  state.slowMoT = 1.1;
  pushRadio(won
    ? "HQ: Accusation logged. Case closed — Elena Voss."
    : "HQ: Accusation rejected. Re-examine the kitchen log and heels.");
  showRoomBanner(won ? "CASE CLOSED" : "WRONG ACCUSED");
  setTimeout(() => endGame(won, text, { pinned, trueHits }), 1100);
}

function accuse() {
  openDossier();
}

function endGame(won, text, meta = {}) {
  state.playing = false;
  if (document.pointerLockElement) document.exitPointerLock();
  $("#hud").classList.add("hidden");
  $("#journal").classList.add("hidden");
  $("#evidence-modal").classList.add("hidden");
  $("#accuse-modal").classList.add("hidden");

  const mins = Math.max(1, Math.round((Date.now() - state.startTime) / 60000));
  const pinScore = totalPins();
  const grade = won
    ? (state.clues.size >= 8 && pinScore >= 4 ? "S" : state.clues.size >= 6 ? "A" : "B")
    : "F";

  $("#result-grade").textContent = grade;
  $("#result-title").textContent = won ? "Case Closed" : "Case Failed";
  $("#result-text").textContent = text;

  const chain = $("#result-chain");
  if (won) {
    const key = ["ledger", "prints", "extract", "safe", "champagne"]
      .filter((id) => state.clues.has(id))
      .map((id) => CLUES[id].title);
    chain.innerHTML = key.length
      ? `<p class="chain-label">Decisive chain</p><ul>${key.map((t) => `<li>${t}</li>`).join("")}</ul>`
      : "";
  } else {
    const pinned = meta.pinned || [];
    chain.innerHTML = pinned.length
      ? `<p class="chain-label">Your pins did not hold</p><ul>${pinned.map((c) => `<li>${c.title}</li>`).join("")}</ul>`
      : `<p class="chain-label">No theory was pinned before the charge</p>`;
  }

  $("#result-stats").innerHTML = `
    <div><span>${state.clues.size}</span>exhibits</div>
    <div><span>${pinScore}</span>pins</div>
    <div><span>${state.notes}</span>notes</div>
    <div><span>${mins}</span>min</div>
  `;
  showScreen("#screen-result");
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
    updatePlayer(dt);
    updateBattery(dt);
    updateStudyDoor(dt);
    updateRain(dt);
    updateDust(dust, dt, camera);
    updateMarkers(dt);
    updateStorm(dt);
    drawMinimap();

    const tension = Math.min(
      1,
      0.08
        + state.clues.size * 0.06
        + (!state.flashlightOn || state.battery < 25 ? 0.2 : 0)
        + (state.clues.size >= 5 ? 0.15 : 0)
    );
    audio.setTension(tension);

    world.lights.forEach((l, i) => {
      if (l === world.flashlight) return;
      if (l.isPointLight) {
        l.intensity = 2.2 + Math.sin(performance.now() * 0.003 + i) * 0.2;
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
    state.pitch = -0.12;
  };
  const takeClue = async (clueId, pinTo = []) => {
    const marker = world.interactables.find((m) => m.userData.clue === clueId);
    if (!marker || state.clues.has(clueId)) return;
    camera.position.set(marker.position.x, 1.65, marker.position.z + 1.4);
    lookAt(marker.position.x, marker.position.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
    camera.updateMatrixWorld(true);
    await wait(450);
    collectClue(CLUES[clueId], marker);
    pinTo.forEach((sid) => state.pins[clueId].add(sid));
    renderPinChips(clueId);
    await wait(900);
    closeEvidence();
    await wait(250);
  };

  await turnTo(Math.PI / 2, 600);
  await hold("KeyW", 1600);
  await turnTo(Math.PI, 400);
  await hold("KeyW", 1000);
  await takeClue("body", ["elena"]);
  await takeClue("letter", ["whitmore"]);
  for (const [id, pins] of [
    ["extract", ["elena"]],
    ["ledger", ["elena"]],
    ["will", ["elena"]],
    ["safe", ["elena"]],
    ["prints", ["elena"]],
    ["champagne", ["elena"]],
  ]) {
    await takeClue(id, pins);
  }
  toggleJournal();
  await wait(700);
  document.querySelector('.jtab[data-tab="suspects"]').click();
  await wait(1000);
  document.querySelector('.jtab[data-tab="notes"]').click();
  await wait(600);
  document.querySelector('.jtab[data-tab="evidence"]').click();
  await wait(700);
  $("#accuse-select").value = "elena";
  syncAccuseButton();
  await wait(500);
  accuse();
  await wait(900);
  confirmAccusation();
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
  state.clues = new Set();
  state.notes = 0;
  state.fieldNotes = [];
  state.pins = emptyPins();
  state.unreadEvidence = 0;
  state.activeClueId = null;
  state.startTime = Date.now();
  state.yaw = 0;
  state.pitch = 0;
  state.room = "entrance";
  state.modalOpen = false;
  state.journalOpen = false;
  state.journalTab = "evidence";
  state.flashlightOn = true;
  state.battery = 100;
  state.crouching = false;
  state.fov = 72;
  state.studyUnlocked = false;
  state.studyDoorT = 0;
  state.radioFired = new Set();
  state.thunderT = 6;
  state.standY = 1.65;
  state.timeScale = 1;
  state.slowMoT = 0;
  state.studyToastCd = 0;
  state.exposureBoost = 0;
  state.accuseReadyAnnounced = false;
  state.onboardFirstClue = false;
  state.onboardPinHint = false;
  state.vx = 0;
  state.vz = 0;
  $("#accuse-select").value = "";
  document.querySelectorAll(".jtab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "evidence"));
  $("#accuse-modal").classList.add("hidden");
  $("#result-chain").innerHTML = "";
  syncAccuseButton();
  camera.position.set(0, 1.65, 2);
  camera.fov = 72;
  camera.updateProjectionMatrix();
  syncFlashlight();
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
  updateHUD();
  showRoomBanner("Entrance Hall");
  pushRadio("HQ: Comms live. Document the scene. Build a case before dawn.");
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
$("#btn-dossier-cancel").addEventListener("click", closeDossier);
$("#btn-dossier-confirm").addEventListener("click", confirmAccusation);
$("#accuse-select").addEventListener("change", syncAccuseButton);
$("#btn-replay").addEventListener("click", () => showScreen("#screen-title"));
$("#btn-hud-journal").addEventListener("click", () => {
  if (state.playing && !state.modalOpen) toggleJournal();
});
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
    if (!$("#accuse-modal").classList.contains("hidden")) {
      closeDossier();
      return;
    }
    if (state.modalOpen) {
      closeEvidence();
      return;
    }
    if (state.journalOpen) toggleJournal();
    return;
  }
  if (e.code === "KeyE") tryInteract();
  if (e.code === "KeyF") toggleFlashlight();
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

window.__game = { state, camera, tryInteract, startMission, confirmAccusation };
