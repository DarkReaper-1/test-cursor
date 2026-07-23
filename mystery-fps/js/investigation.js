import { CLUES, STUDY_LOCK } from "./data.js";
import { $, DEMO } from "./util.js";

/**
 * Evidence collection, pins, accusation finale.
 */
export function createInvestigation({ state, audio, ui, cinema, player, getWorld }) {
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

  function collectClue(clue, marker) {
    state.clues.add(clue.id);
    markClueSecured(marker);
    state.unreadEvidence++;
    audio.pickup();
    if (clue.id === STUDY_LOCK.clueRequired) player.unlockStudy();

    if (!state.onboardFirstClue) {
      state.onboardFirstClue = true;
      setTimeout(() => ui.toast("Tab — the journal. Pin your theories."), 500);
    }

    if (state.clues.size >= 5 && !state.accuseReadyAnnounced) {
      state.accuseReadyAnnounced = true;
      cinema.roomBanner("ACT III\nAccusation Ready");
      ui.pushRadio("Voiceover: Enough for the final act. Review your pins, then accuse.");
    }

    ui.maybeRadio();
    ui.updateHUD();
    ui.openEvidence(clue, { fresh: true });
    ui.renderJournal();
  }

  function tryInteract() {
    if (state.modalOpen || state.journalOpen || state.cinemaBusy) return;
    const target = player.getLookTarget();
    if (!target) {
      if (player.nearestClueMarker(2.2)) ui.toast("Aim at the gold marker, then press E");
      return;
    }

    if (target.userData.kind === "flavor") {
      ui.openFlavor(target);
      return;
    }

    const clue = CLUES[target.userData.clue];
    if (!clue) return;
    if (!state.clues.has(clue.id)) collectClue(clue, target);
    else ui.openEvidence(clue, { revisit: true });
  }

  async function confirmAccusation() {
    const choice = $("#accuse-select").value;
    if (!choice || state.clues.size < 5 || state.cinemaBusy) return;
    $("#accuse-modal").classList.add("hidden");
    state.modalOpen = false;
    const won = choice === ui.SOLUTION;
    const pinned = ui.pinsForSuspect(choice);
    const text = won
      ? "Elena Voss poisoned the soup with monkshood extract before Ashworth could reverse her inheritance. The final frame holds."
      : "Wrong charge. The kitchen trail and garden heels pointed elsewhere — rewrite the scene and try again.";
    state.journalOpen = false;
    $("#journal").classList.add("hidden");
    state.cinemaBusy = true;
    state.timeScale = 0.22;
    state.slowMoT = 1.4;
    audio.finale(won);
    ui.pushRadio(won
      ? "Voiceover: Cut. Print it. Case closed — Elena Voss."
      : "Voiceover: The cut doesn't hold. Back to the kitchen trail.");
    cinema.roomBanner(won ? "CASE CLOSED" : "WRONG CUT");
    await cinema.fade(true, DEMO ? 300 : 900);
    await cinema.titleCard({
      act: won ? "THE END" : "FADE OUT",
      title: won ? "Case Closed" : "Case Failed",
      sub: won ? "The heiress poured the death." : "The reel rejects your accusation.",
      hold: DEMO ? 500 : 2100,
    });
    state.cinemaBusy = false;
    ui.endGame(won, text, { pinned });
  }

  return { collectClue, tryInteract, confirmAccusation, markClueSecured };
}
