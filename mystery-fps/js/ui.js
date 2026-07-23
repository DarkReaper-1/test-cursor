import {
  CLUES, SOLUTION, ROOM_BOUNDS, ROOM_CARDS, SUSPECTS, KIND_LABELS, RADIO,
} from "./data.js";
import { $, $$ } from "./util.js";

/**
 * HUD, journal, evidence close-ups, dossier, result screen.
 */
export function createUI({ state, audio, cinema, getWorld, requestLock, DEMO }) {
  let toastTimer;

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
  }

  function totalPins() {
    return Object.values(state.pins).reduce((n, set) => n + set.size, 0);
  }

  function pinsForSuspect(suspectId) {
    return [...state.clues]
      .map((id) => CLUES[id])
      .filter((c) => state.pins[c.id]?.has(suspectId));
  }

  function roomChapter(roomId) {
    const card = ROOM_CARDS[roomId];
    if (!card) return ROOM_BOUNDS[roomId]?.name || roomId;
    return `${card.act}\n${card.line}`;
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

  function syncJournalBadge() {
    const badge = $("#journal-badge");
    if (!badge) return;
    badge.textContent = String(state.unreadEvidence);
    badge.classList.toggle("hidden", state.unreadEvidence <= 0);
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
    $("#objective-text").textContent = nextObjective();
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
      if (state.radioFired.has(msg.text)) continue;
      if (msg.atClues == null || state.clues.size >= msg.atClues) {
        state.radioFired.add(msg.text);
        pushRadio(msg.text);
      }
    }
  }

  function updateCompass() {
    let deg = ((-state.yaw * 180) / Math.PI) % 360;
    if (deg < 0) deg += 360;
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    $("#compass-dir").textContent = dirs[Math.round(deg / 45) % 8];
    $("#compass-track").style.transform = `translateX(${-(deg / 360) * 240}px)`;
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
    const sting = $("#ev-sting");
    sting.textContent = "A detail the camera almost missed.";
    sting.classList.remove("hidden");
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
    const sting = $("#ev-sting");
    sting.textContent = clue.sting || "";
    sting.classList.toggle("hidden", !clue.sting);
    $("#ev-room").textContent = `Scene: ${ROOM_BOUNDS[clue.room]?.name || clue.room}`;
    const cat = $("#ev-category");
    cat.textContent = KIND_LABELS[clue.kind] || "Evidence";
    cat.className = `ev-cat ${clue.kind || ""}`;
    $("#ev-pin-zone").classList.remove("hidden");
    renderPinChips(clue.id);
    $("#btn-close-ev").textContent = opts.revisit ? "Close" : "Hold on Frame";
    $("#evidence-modal").classList.remove("hidden");
    if (!opts.revisit) audio.sting();
    else audio.click();
  }

  function closeEvidence() {
    $("#evidence-modal").classList.add("hidden");
    state.modalOpen = false;
    if (state.activeClueId && state.clues.has(state.activeClueId)) {
      const btn = $("#btn-close-ev").textContent;
      if (btn.includes("Hold") || btn.includes("Log")) {
        toast(`Exhibit logged: ${CLUES[state.activeClueId].title}`);
      }
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

    $("#result-eyebrow").textContent = won ? "Finale — Print" : "Finale — Reshoot";
    $("#result-grade").textContent = grade;
    $("#result-title").textContent = won ? "Case Closed" : "Case Failed";
    $("#result-text").textContent = text;
    cinema.clearFade();

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
    $$(".screen").forEach((s) => s.classList.remove("active"));
    $("#screen-result").classList.add("active");
  }

  function drawMinimap(ctx, camera) {
    const world = getWorld();
    const w = 140;
    const h = 140;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(8,12,18,0.85)";
    ctx.fillRect(0, 0, w, h);

    const scale = 3.2;
    const ox = w / 2 - camera.position.x * scale;
    const oy = h / 2 - camera.position.z * scale;

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

    world.interactables.forEach((m) => {
      if (m.userData.kind !== "clue" || m.userData.secured) return;
      ctx.fillStyle = "#c9a14a";
      ctx.beginPath();
      ctx.arc(m.position.x * scale + ox, m.position.z * scale + oy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

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

  return {
    toast,
    totalPins,
    pinsForSuspect,
    roomChapter,
    updateHUD,
    pushRadio,
    maybeRadio,
    updateCompass,
    renderPinChips,
    openFlavor,
    openEvidence,
    closeEvidence,
    renderJournal,
    toggleJournal,
    openDossier,
    closeDossier,
    endGame,
    syncAccuseButton,
    drawMinimap,
    SOLUTION,
  };
}
