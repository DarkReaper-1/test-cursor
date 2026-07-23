import * as THREE from "three";
import { ROOM_BOUNDS, STUDY_LOCK } from "./data.js";
import { playerCollides } from "./world.js";
import { $ } from "./util.js";

/**
 * First-person movement, look, lamp, storm, markers, pickups.
 */
export function createPlayer({
  state, keys, audio, ui, getCamera, getWorld, getRenderer, DEMO,
}) {
  let bob = 0;
  let cinema = null;

  function setCinema(c) {
    cinema = c;
  }

  function requestLock() {
    if (DEMO) return;
    $("#game-canvas").requestPointerLock();
  }

  function onLockChange() {
    state.locked = document.pointerLockElement === $("#game-canvas");
    $("#pause-hint").classList.toggle(
      "hidden",
      state.locked || !state.playing || state.modalOpen || state.journalOpen
    );
  }

  function onMouseMove(e) {
    if (!state.locked || !state.playing || state.modalOpen || state.journalOpen || state.cinemaBusy) return;
    const sens = 0.0022;
    state.yaw -= e.movementX * sens;
    state.pitch -= e.movementY * sens;
    state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch));
  }

  function syncFlashlight() {
    const world = getWorld();
    if (!world?.flashlight) return;
    if (!state.flashlightOn || state.battery <= 0) {
      world.flashlight.intensity = 0;
      if (state.battery <= 0) state.flashlightOn = false;
    } else {
      world.flashlight.intensity = 1.2 + (state.battery / 100) * 1.8;
    }
  }

  function toggleFlashlight() {
    if (state.battery <= 0 && !state.flashlightOn) {
      ui.toast("Lamp dead — wait for charge");
      return;
    }
    state.flashlightOn = !state.flashlightOn;
    syncFlashlight();
    audio.click();
    ui.updateHUD();
  }

  function unlockStudy() {
    if (state.studyUnlocked) return;
    const world = getWorld();
    state.studyUnlocked = true;
    state.studyDoorT = 1.2;
    if (world.studyDoor) {
      const idx = world.colliders.indexOf(world.studyDoor);
      if (idx >= 0) world.colliders.splice(idx, 1);
    }
    if (world.studySeal) world.studySeal.visible = false;
    audio.unlock();
    ui.toast("Study door unsealed");
    ui.pushRadio("Voiceover: The study yields. Paper knives next.");
  }

  function updateStudyDoor(dt) {
    const world = getWorld();
    if (!state.studyUnlocked || !world.studyDoor || state.studyDoorT <= 0) return;
    state.studyDoorT -= dt;
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
    const camera = getCamera();
    const world = getWorld();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = ray.intersectObjects(world.interactables, true);
    if (!hits.length || hits[0].distance > 3.6) return null;
    return resolveInteractable(hits[0].object);
  }

  function nearestClueMarker(maxDist = 4.5) {
    const camera = getCamera();
    const world = getWorld();
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

  function currentRoom(pos) {
    for (const [id, b] of Object.entries(ROOM_BOUNDS)) {
      if (pos.x >= b.min.x && pos.x <= b.max.x && pos.z >= b.min.z && pos.z <= b.max.z) return id;
    }
    return state.room;
  }

  function updatePickups() {
    const camera = getCamera();
    const world = getWorld();
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
        ui.toast("Field note filed to journal");
        audio.itemGet();
        ui.pushRadio(`Field note: ${text}`);
        ui.updateHUD();
        if (state.journalOpen && state.journalTab === "notes") ui.renderJournal();
      }
    }
  }

  function updateBattery(dt) {
    if (state.flashlightOn && state.battery > 0) {
      state.battery = Math.max(0, state.battery - dt * 4.2);
      if (state.battery <= 0) {
        state.flashlightOn = false;
        ui.toast("Lamp dead — wait for charge");
      }
    } else if (!state.flashlightOn && state.battery < 100) {
      state.battery = Math.min(100, state.battery + dt * 12);
    }
    syncFlashlight();
  }

  function updatePlayer(dt) {
    const camera = getCamera();
    const world = getWorld();
    if (!state.playing || state.modalOpen || state.journalOpen || state.cinemaBusy) return;
    if (state.openingCam > 0.15) {
      camera.rotation.order = "YXZ";
      camera.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;
      return;
    }

    state.studyToastCd = Math.max(0, state.studyToastCd - dt);
    if (!state.studyUnlocked) {
      const nearDoor = Math.abs(camera.position.x - 6) < 1.2 && Math.abs(camera.position.z - 2) < 1.4;
      if (nearDoor && (keys["KeyW"] || keys["KeyD"]) && state.studyToastCd <= 0) {
        ui.toast(STUDY_LOCK.message);
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
    ui.updateCompass();

    const room = currentRoom(camera.position);
    if (room !== state.room) {
      state.room = room;
      ui.updateHUD();
      cinema?.roomBanner(ui.roomChapter(room));
      audio.noirHit();
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

  function updateStorm(dt, rain) {
    const world = getWorld();
    const renderer = getRenderer();
    state.thunderT -= dt;
    state.exposureBoost = Math.max(0, state.exposureBoost - dt * 1.8);
    if (renderer) renderer.toneMappingExposure = 1.15 + state.exposureBoost;

    if (state.thunderT <= 0) {
      state.thunderT = 7 + Math.random() * 12;
      const outdoor = state.room === "garden";
      state.exposureBoost = outdoor ? 1.15 : 0.5;
      $("#lightning").classList.add("flash");
      setTimeout(() => $("#lightning").classList.remove("flash"), 90 + Math.random() * 70);
      setTimeout(() => audio.thunder(), outdoor ? 40 : 140 + Math.random() * 280);
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

  function updateMarkers(dt) {
    const camera = getCamera();
    const world = getWorld();
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
      }
      const dist = camera.position.distanceTo(m.position);
      const nearBoost = dist < 5 ? (1 - dist / 5) * 0.9 : 0;
      m.traverse((c) => {
        if (c.isMesh && c.material?.emissiveIntensity != null) {
          c.material.emissiveIntensity = 0.5 + Math.sin(t + m.position.x) * 0.25 + nearBoost;
        }
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

  return {
    setCinema,
    requestLock,
    onLockChange,
    onMouseMove,
    syncFlashlight,
    toggleFlashlight,
    unlockStudy,
    updateStudyDoor,
    getLookTarget,
    nearestClueMarker,
    updateBattery,
    updatePlayer,
    updateStorm,
    updateMarkers,
  };
}
