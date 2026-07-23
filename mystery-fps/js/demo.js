import { CLUES } from "./data.js";
import { $ } from "./util.js";

/** Headless autopilot for ?demo=1 recordings */
export async function runDemo({ state, keys, camera, world, investigation, ui, player }) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hold = async (code, ms) => {
    keys[code] = true;
    await wait(ms);
    keys[code] = false;
  };
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
    investigation.collectClue(CLUES[clueId], marker);
    pinTo.forEach((sid) => state.pins[clueId].add(sid));
    ui.renderPinChips(clueId);
    await wait(900);
    ui.closeEvidence();
    await wait(250);
  };

  state.yaw = 0;
  state.pitch = 0;
  camera.position.set(0, 1.65, 2);

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
  ui.toggleJournal();
  await wait(700);
  document.querySelector('.jtab[data-tab="suspects"]').click();
  await wait(1000);
  document.querySelector('.jtab[data-tab="notes"]').click();
  await wait(600);
  document.querySelector('.jtab[data-tab="evidence"]').click();
  await wait(700);
  $("#accuse-select").value = "elena";
  ui.syncAccuseButton();
  await wait(500);
  ui.openDossier();
  await wait(900);
  investigation.confirmAccusation();
}
