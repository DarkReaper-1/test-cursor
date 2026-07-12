/* The Midnight Manor — Game Engine */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const SAVE_KEY = "midnight-manor-save";

const state = {
  screen: "title",
  location: "library",
  suspect: null,
  clues: new Set(),
  examined: new Set(),
  talked: new Set(),
  lies: new Set(),
  deductions: {},
  journalTab: "all",
  introIndex: 0,
  startTime: null,
};

const screens = {
  title: $("#screen-title"),
  intro: $("#screen-intro"),
  game: $("#screen-game"),
  result: $("#screen-result"),
};

let toastTimer;
let typeTimer;
let rainAnim;

/* ── Persistence ── */

function saveGame() {
  const data = {
    location: state.location,
    clues: [...state.clues],
    examined: [...state.examined],
    talked: [...state.talked],
    lies: [...state.lies],
    deductions: state.deductions,
    startTime: state.startTime,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.location = data.location || "library";
    state.clues = new Set(data.clues || []);
    state.examined = new Set(data.examined || []);
    state.talked = new Set(data.talked || []);
    state.lies = new Set(data.lies || []);
    state.deductions = data.deductions || {};
    state.startTime = data.startTime || Date.now();
    return true;
  } catch {
    return false;
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

/* ── UI helpers ── */

function showScreen(name) {
  state.screen = name;
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name]?.classList.add("active");
}

function setStatus(msg) {
  $("#status-message").textContent = msg;
}

function showToast(msg, type = "") {
  const t = $("#toast");
  $("#toast-text").textContent = msg;
  t.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3200);
}

function typeText(el, text, speed = 22) {
  clearInterval(typeTimer);
  el.textContent = "";
  el.classList.add("typing");
  let i = 0;
  return new Promise((resolve) => {
    typeTimer = setInterval(() => {
      el.textContent += text[i] || "";
      i++;
      if (i >= text.length) {
        clearInterval(typeTimer);
        el.classList.remove("typing");
        resolve();
      }
    }, speed);
  });
}

function calcProgress() {
  const totalClues = Object.keys(CLUES).length;
  const cluePct = (state.clues.size / totalClues) * 50;
  const dedCount = Object.values(state.deductions).filter((v) => v).length;
  const dedPct = (dedCount / DEDUCTIONS.length) * 30;
  const liePct = Math.min(state.lies.size * 4, 20);
  return Math.min(Math.round(cluePct + dedPct + liePct), 100);
}

function updateHUD() {
  const progress = calcProgress();
  $("#case-progress").style.width = `${progress}%`;
  $("#progress-label").textContent = `${progress}% case assembled`;
  $("#clue-count").textContent = state.clues.size;
  $("#btn-accuse").disabled = !canAccuse();
  $("#btn-open-accuse") && ($("#btn-open-accuse").disabled = !canAccuse());
  if ($("#btn-continue")) {
    $("#btn-continue").classList.toggle("hidden", !localStorage.getItem(SAVE_KEY));
  }
}

function canAccuse() {
  const dedOk = DEDUCTIONS.every((d) => state.deductions[d.id] === d.correct);
  return state.clues.size >= CLUES_NEEDED && dedOk;
}

function getSuspicion(suspectId) {
  let score = 10;
  const sus = SUSPECTS[suspectId];
  for (const topic of sus.topics) {
    if (topic.lie && state.talked.has(`${suspectId}:${topic.id}`)) {
      const exposed = topic.contradicts?.some((c) => state.clues.has(c));
      if (exposed) score += 18;
      else score += 6;
    }
  }
  if (suspectId === "elena") {
    if (state.clues.has("elena_in_kitchen")) score += 12;
    if (state.clues.has("small_footprints")) score += 15;
    if (state.clues.has("elena_champagne")) score += 10;
  }
  return Math.min(score, 100);
}

/* ── Rain canvas ── */

function initRain() {
  const canvas = $("#rain-canvas");
  const ctx = canvas.getContext("2d");
  const drops = [];
  const count = 180;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < count; i++) {
    drops.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: 8 + Math.random() * 14,
      speed: 4 + Math.random() * 6,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(180, 200, 220, 0.15)";
    ctx.lineWidth = 1;
    for (const d of drops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 1, d.y + d.len);
      ctx.stroke();
      d.y += d.speed;
      d.x -= 0.5;
      if (d.y > canvas.height) {
        d.y = -d.len;
        d.x = Math.random() * canvas.width;
      }
    }
    rainAnim = requestAnimationFrame(draw);
  }
  draw();
}

/* ── Intro ── */

async function playIntro() {
  showScreen("intro");
  const el = $("#intro-text");
  el.innerHTML = "";

  for (const line of INTRO_LINES) {
    const p = document.createElement("p");
    p.className = "intro-line";
    el.appendChild(p);
    await typeText(p, line, 18);
    await delay(400);
  }

  await delay(600);
  startGame(false);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Game start ── */

function startGame(fresh = true) {
  if (fresh) {
    state.clues = new Set();
    state.examined = new Set();
    state.talked = new Set();
    state.lies = new Set();
    state.deductions = {};
    state.location = "library";
    state.startTime = Date.now();
    clearSave();
  }

  gameAudio.init();
  gameAudio.resume();
  if (gameAudio.enabled) gameAudio.startAmbient();

  showScreen("game");
  renderLocationBar();
  renderSuspectBar();
  visitLocation(state.location);
  updateHUD();
  setStatus("The manor is locked down. Begin your investigation.");
  saveGame();
}

/* ── Locations ── */

function renderLocationBar() {
  const bar = $("#location-bar");
  bar.innerHTML = "";
  Object.values(LOCATIONS).forEach((loc) => {
    const btn = document.createElement("button");
    btn.className = "loc-btn" + (loc.id === state.location ? " active" : "");
    btn.textContent = loc.name.replace("The ", "").replace("Lord Ashworth's ", "");
    btn.addEventListener("click", () => {
      gameAudio.playClick();
      closeDialogue();
      visitLocation(loc.id);
    });
    bar.appendChild(btn);
  });
}

function visitLocation(id) {
  state.location = id;
  state.suspect = null;
  const loc = LOCATIONS[id];

  $("#scene-art").dataset.location = loc.scene;
  $("#location-name").textContent = loc.name;
  $("#location-desc").textContent = loc.desc;

  const remaining = loc.hotspots.filter((h) => !state.examined.has(`${id}:${h.id}`)).length;
  $("#location-clues-hint").textContent = remaining
    ? `${remaining} area${remaining > 1 ? "s" : ""} left to examine`
    : "Fully searched";

  renderHotspots(loc);
  renderLocationBar();
  updateHUD();
  saveGame();
}

function renderHotspots(loc) {
  const container = $("#scene-hotspots");
  container.innerHTML = "";

  loc.hotspots.forEach((hs) => {
    const key = `${loc.id}:${hs.id}`;
    const btn = document.createElement("button");
    btn.className = "scene-hotspot" + (state.examined.has(key) ? " found" : "");
    btn.style.left = `${hs.x}%`;
    btn.style.top = `${hs.y}%`;
    btn.innerHTML = `<span class="hotspot-pulse"></span><span class="hotspot-label">${hs.label}</span>`;
    btn.addEventListener("click", () => examineHotspot(loc.id, hs));
    container.appendChild(btn);
  });
}

function examineHotspot(locId, hs) {
  const key = `${locId}:${hs.id}`;
  if (state.examined.has(key)) {
    const clue = CLUES[hs.clue];
    showEvidenceModal(clue);
    return;
  }

  state.examined.add(key);
  const clue = CLUES[hs.clue];
  state.clues.add(clue.id);
  gameAudio.playChime();
  showEvidenceModal(clue, true);
  visitLocation(locId);
  updateHUD();
  saveGame();
}

function showEvidenceModal(clue, isNew = false) {
  const modal = $("#evidence-modal");
  $("#evidence-category").textContent = CATEGORY_LABELS[clue.category] || "Evidence";
  $("#evidence-category").className = `evidence-category cat-${clue.category}`;
  $("#evidence-title").textContent = clue.title;
  $("#evidence-body").textContent = clue.text;
  $("#evidence-location").textContent = `Found in: ${LOCATIONS[clue.location]?.name || clue.location}`;
  modal.classList.remove("hidden");

  if (isNew) {
    setStatus(`Evidence recorded: ${clue.title}`);
    showToast(`New evidence: ${clue.title}`, clue.category === "critical" ? "critical" : "");
  }

  $("#btn-close-evidence").onclick = () => {
    modal.classList.add("hidden");
    gameAudio.playClick();
  };
}

/* ── Suspects ── */

function renderSuspectBar() {
  const bar = $("#suspect-bar");
  bar.innerHTML = "";
  Object.values(SUSPECTS).forEach((sus) => {
    const btn = document.createElement("button");
    btn.className = "suspect-btn" + (state.suspect === sus.id ? " active" : "");
    btn.innerHTML = `
      <span class="suspect-mini" style="background:${sus.color}">${sus.initials}</span>
      <span>${sus.name.split(" ")[0]}</span>
      ${state.lies.size && countLies(sus.id) ? `<span class="lie-tag">${countLies(sus.id)}</span>` : ""}
    `;
    btn.addEventListener("click", () => {
      gameAudio.playClick();
      openDialogue(sus.id);
    });
    bar.appendChild(btn);
  });
}

function countLies(susId) {
  let n = 0;
  for (const topic of SUSPECTS[susId].topics) {
    if (topic.lie && state.talked.has(`${susId}:${topic.id}`)) {
      if (topic.contradicts?.some((c) => state.clues.has(c))) n++;
    }
  }
  return n;
}

function openDialogue(id) {
  state.suspect = id;
  const sus = SUSPECTS[id];
  const overlay = $("#dialogue-overlay");
  overlay.classList.remove("hidden");

  $("#suspect-avatar").textContent = sus.initials;
  $("#suspect-avatar").style.background = sus.color;
  $("#suspect-name").textContent = sus.name;
  $("#suspect-role").textContent = sus.role;
  $("#suspicion-fill").style.width = `${getSuspicion(id)}%`;

  const greeted = state.talked.has(`${id}:greeting`);
  const greeting = greeted ? "Is there anything else, Detective?" : sus.greeting;
  if (!greeted) state.talked.add(`${id}:greeting`);

  typeText($("#dialogue-text"), `"${greeting}"`);
  renderDialogueOptions(sus);
  renderSuspectBar();
  setStatus(`Interviewing ${sus.name}`);
  saveGame();
}

function closeDialogue() {
  state.suspect = null;
  $("#dialogue-overlay").classList.add("hidden");
  renderSuspectBar();
}

function renderDialogueOptions(sus) {
  const container = $("#dialogue-options");
  container.innerHTML = "";

  sus.topics.forEach((topic) => {
    const key = `${sus.id}:${topic.id}`;
    const asked = state.talked.has(key);
    const missing = (topic.requires || []).filter((c) => !state.clues.has(c));
    const locked = missing.length > 0;

    const btn = document.createElement("button");
    btn.className = "dialogue-opt";

    if (locked) {
      btn.disabled = true;
      btn.innerHTML = `${topic.label}<span class="opt-hint">Requires more evidence</span>`;
    } else {
      const lieExposed = topic.lie && topic.contradicts?.some((c) => state.clues.has(c));
      btn.innerHTML = asked
        ? `<span class="asked">↩</span> ${topic.label}`
        : topic.label;
      if (lieExposed && asked) btn.classList.add("lie-exposed");
      if (topic.confrontation) btn.classList.add("confront");
      btn.addEventListener("click", () => askTopic(sus, topic));
    }
    container.appendChild(btn);
  });
}

async function askTopic(sus, topic) {
  const key = `${sus.id}:${topic.id}`;
  state.talked.add(key);
  gameAudio.playClick();

  await typeText($("#dialogue-text"), `"${topic.response}"`, 16);

  if (topic.reveals) {
    topic.reveals.forEach((id) => {
      if (!state.clues.has(id)) {
        state.clues.add(id);
        gameAudio.playChime();
        showToast(`Testimony reveals: ${CLUES[id].title}`, "critical");
      }
    });
  }

  if (topic.lie && topic.contradicts) {
    const exposed = topic.contradicts.filter((c) => state.clues.has(c));
    if (exposed.length) {
      const lieKey = `${sus.id}:${topic.id}`;
      if (!state.lies.has(lieKey)) {
        state.lies.add(lieKey);
        gameAudio.playDramatic();
        showToast(`${sus.name} contradicted by evidence!`, "lie");
        setStatus(`Contradiction: ${sus.name}'s statement doesn't match the evidence.`);
      }
    }
  }

  $("#suspicion-fill").style.width = `${getSuspicion(sus.id)}%`;
  renderDialogueOptions(sus);
  renderSuspectBar();
  updateHUD();
  saveGame();
}

/* ── Journal ── */

function openJournal() {
  $("#journal-drawer").classList.remove("hidden");
  renderJournal();
}

function renderJournal() {
  const list = $("#journal-entries");
  list.innerHTML = "";
  const tab = state.journalTab;

  const entries = Object.values(CLUES).filter((c) => {
    if (!state.clues.has(c.id)) return false;
    if (tab === "critical") return c.category === "critical";
    if (tab === "lies") return false;
    return true;
  });

  if (tab === "lies") {
    state.lies.forEach((lieKey) => {
      const [susId, topicId] = lieKey.split(":");
      const topic = SUSPECTS[susId]?.topics.find((t) => t.id === topicId);
      if (!topic) return;
      const li = document.createElement("li");
      li.className = "journal-lie";
      li.innerHTML = `<strong>${SUSPECTS[susId].name}</strong> lied about: "${topic.label}"<p>${topic.response}</p>`;
      list.appendChild(li);
    });
    if (!list.children.length) {
      list.innerHTML = '<li class="empty">No contradictions exposed yet.</li>';
    }
    return;
  }

  if (!entries.length) {
    list.innerHTML = '<li class="empty">No evidence collected yet.</li>';
    return;
  }

  entries.forEach((clue) => {
    const li = document.createElement("li");
    li.className = `journal-item cat-${clue.category}`;
    li.innerHTML = `
      <span class="j-cat">${CATEGORY_LABELS[clue.category]}</span>
      <strong>${clue.title}</strong>
      <span class="j-loc">${LOCATIONS[clue.location]?.name}</span>
      <p>${clue.text}</p>
    `;
    list.appendChild(li);
  });
}

/* ── Timeline ── */

function openTimeline() {
  $("#timeline-drawer").classList.remove("hidden");
  const container = $("#timeline-events");
  container.innerHTML = "";

  TIMELINE.forEach((ev) => {
    const unlocked = !ev.requires || state.clues.has(ev.requires);
    const div = document.createElement("div");
    div.className = "timeline-event" + (unlocked ? " unlocked" : " locked");
    div.innerHTML = `
      <span class="t-time">${ev.time}</span>
      <span class="t-event">${unlocked ? ev.event : "???"}</span>
    `;
    container.appendChild(div);
  });
}

/* ── Deduction board ── */

function openDeduction() {
  $("#deduction-drawer").classList.remove("hidden");
  renderDeductions();
}

function renderDeductions() {
  const container = $("#deduction-slots");
  container.innerHTML = "";

  DEDUCTIONS.forEach((ded) => {
    const unlocked = ded.requires.every((r) => state.clues.has(r));
    const div = document.createElement("div");
    div.className = "deduction-slot" + (unlocked ? "" : " locked");

    const label = document.createElement("label");
    label.innerHTML = `<span>${ded.label}</span>`;

    const select = document.createElement("select");
    select.disabled = !unlocked;
    select.innerHTML = '<option value="">— Deduce —</option>';
    ded.options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.id;
      o.textContent = opt.label;
      if (state.deductions[ded.id] === opt.id) o.selected = true;
      select.appendChild(o);
    });

    select.addEventListener("change", () => {
      state.deductions[ded.id] = select.value;
      const correct = select.value === ded.correct;
      div.classList.toggle("correct", correct && select.value);
      div.classList.toggle("wrong", select.value && !correct);
      if (correct) gameAudio.playChime();
      updateHUD();
      saveGame();
    });

    if (state.deductions[ded.id]) {
      const correct = state.deductions[ded.id] === ded.correct;
      div.classList.toggle("correct", correct);
      div.classList.toggle("wrong", !correct);
    }

    if (!unlocked) {
      const hint = document.createElement("p");
      hint.className = "ded-hint";
      hint.textContent = `Requires ${ded.requires.length - ded.requires.filter((r) => state.clues.has(r)).length} more clue(s)`;
      div.appendChild(label);
      div.appendChild(hint);
    } else {
      div.appendChild(label);
      div.appendChild(select);
    }

    container.appendChild(div);
  });

  $("#btn-open-accuse").disabled = !canAccuse();
}

/* ── Accusation ── */

function openAccusation() {
  ["killer", "method", "motive"].forEach((field) => {
    const sel = $(`#accuse-${field}`);
    sel.innerHTML = '<option value="">— Select —</option>';
    ACCUSATION_OPTIONS[field].forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.id;
      o.textContent = opt.label;
      if (state.deductions[field === "killer" ? "who" : field === "method" ? "how" : "why"] === opt.id) {
        o.selected = true;
      }
      sel.appendChild(o);
    });
  });
  $("#accusation-modal").classList.remove("hidden");
}

function handleAccusation(e) {
  e.preventDefault();
  const killer = $("#accuse-killer").value;
  const method = $("#accuse-method").value;
  const motive = $("#accuse-motive").value;

  const won =
    killer === SOLUTION.killer &&
    method === SOLUTION.method &&
    motive === SOLUTION.motive;

  showResult(won, { killer, method, motive });
}

function showResult(won, choices) {
  gameAudio.stopAmbient();
  clearSave();
  showScreen("result");

  const elapsed = state.startTime ? Math.round((Date.now() - state.startTime) / 60000) : 0;
  const grade = won
    ? state.clues.size >= 12 && state.lies.size >= 3 ? "S" : state.clues.size >= 8 ? "A" : "B"
    : "F";

  $("#result-grade").textContent = grade;
  $("#result-grade").className = `result-grade grade-${grade}`;
  $("#result-title").textContent = won ? "Case Closed" : "Justice Undone";
  $("#result-subtitle").textContent = won
    ? "The constable arrives at dawn. Your accusation holds."
    : "The killer walks free. The truth dies with the night.";

  $("#result-stats").innerHTML = `
    <div><span>${state.clues.size}</span> clues found</div>
    <div><span>${state.lies.size}</span> lies exposed</div>
    <div><span>${elapsed}</span> min elapsed</div>
  `;

  if (won) {
    gameAudio.playChime();
    $("#result-reveal").innerHTML = `
      <p><strong>The truth:</strong> Elena Voss poisoned her father's soup with monkshood extract
      stolen from Dr. Whitmore's pantry. She knew an unsigned will reversal sat in the study safe.
      With Marcus, Victoria, and Thomas disinherited, she acted before Lord Ashworth could sign.</p>
      <p>Her garden footprints, the kitchen log, Victoria's testimony, and the missing extract
      formed an unbreakable chain. The heiress became the accused.</p>
    `;
  } else {
    gameAudio.playDramatic();
    const name = ACCUSATION_OPTIONS.killer.find((k) => k.id === choices.killer)?.label;
    $("#result-reveal").innerHTML = `
      <p>You accused <strong>${name}</strong>, but the evidence told a different story.</p>
      <p><strong>What happened:</strong> Elena Voss administered aconitine in the soup course.
      The brandy glass was a deliberate misdirection. She left the ballroom at 7:10, entered the
      kitchen at 7:15, and returned before anyone noticed — but the mud remembered.</p>
    `;
  }
}

/* ── Event bindings ── */

$("#btn-start").addEventListener("click", () => {
  gameAudio.init();
  gameAudio.resume();
  if ($("#audio-pref").checked) {
    gameAudio.enabled = true;
    gameAudio.startAmbient();
  }
  playIntro();
});

$("#btn-continue")?.addEventListener("click", () => {
  if (loadGame()) {
    gameAudio.init();
    gameAudio.resume();
    if (gameAudio.enabled) gameAudio.startAmbient();
    startGame(false);
  }
});

$("#btn-skip-intro").addEventListener("click", () => startGame(true));

$("#btn-close-dialogue").addEventListener("click", () => {
  gameAudio.playClick();
  closeDialogue();
});

$("#btn-journal").addEventListener("click", () => { gameAudio.playClick(); openJournal(); });
$("#btn-close-journal").addEventListener("click", () => $("#journal-drawer").classList.add("hidden"));

$("#btn-timeline").addEventListener("click", () => { gameAudio.playClick(); openTimeline(); });
$("#btn-close-timeline").addEventListener("click", () => $("#timeline-drawer").classList.add("hidden"));

$("#btn-deduce").addEventListener("click", () => { gameAudio.playClick(); openDeduction(); });
$("#btn-close-deduce").addEventListener("click", () => $("#deduction-drawer").classList.add("hidden"));

$("#btn-accuse").addEventListener("click", () => { if (canAccuse()) openAccusation(); });
$("#btn-open-accuse").addEventListener("click", () => { if (canAccuse()) openAccusation(); });
$("#btn-cancel-accuse").addEventListener("click", () => $("#accusation-modal").classList.add("hidden"));
$("#accusation-form").addEventListener("submit", handleAccusation);

$("#btn-replay").addEventListener("click", () => {
  screens.result.classList.remove("failure");
  showScreen("title");
  if (gameAudio.enabled) gameAudio.startAmbient();
});

$("#btn-audio").addEventListener("click", () => {
  gameAudio.enabled = !gameAudio.enabled;
  gameAudio.setEnabled(gameAudio.enabled);
  $("#btn-audio").textContent = gameAudio.enabled ? "🔊" : "🔇";
  $("#audio-pref").checked = gameAudio.enabled;
});

$("#audio-pref").addEventListener("change", (e) => {
  gameAudio.enabled = e.target.checked;
  if (!gameAudio.ctx) gameAudio.init();
  gameAudio.setEnabled(gameAudio.enabled);
});

$$("#journal-tabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$("#journal-tabs .tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    state.journalTab = tab.dataset.tab;
    renderJournal();
  });
});

document.querySelectorAll(".modal-backdrop").forEach((bd) => {
  bd.addEventListener("click", () => bd.closest(".modal")?.classList.add("hidden"));
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("#evidence-modal").classList.add("hidden");
    $("#accusation-modal").classList.add("hidden");
    $("#journal-drawer").classList.add("hidden");
    $("#timeline-drawer").classList.add("hidden");
    $("#deduction-drawer").classList.add("hidden");
    closeDialogue();
  }
});

/* ── Init ── */

initRain();
updateHUD();
if (localStorage.getItem(SAVE_KEY)) {
  $("#btn-continue")?.classList.remove("hidden");
}
