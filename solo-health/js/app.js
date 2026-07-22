import {
  RANKS,
  STAT_KEYS,
  buildDailyQuests,
  buildPenaltyQuest,
  rankForXp,
  rankIndex,
  xpToNextLevel,
} from "./game-data.js";
import { createScannerSession } from "./scanner.js";
import { questKind } from "./rep-counter.js";
import { createFormTracker, critiqueQuest, critiqueDay } from "./critique-ai.js";

const STORAGE_KEY = "solo-health-v2";

const defaultState = () => ({
  name: "Hunter",
  level: 1,
  xp: 0,
  totalXp: 0,
  streak: 0,
  stats: { str: 10, agi: 10, vit: 10, int: 10, sen: 10 },
  quests: buildDailyQuests(0),
  day: 1,
  penaltyActive: false,
  penaltyQuests: [],
  penaltySeconds: 4 * 60 * 60,
  log: ["[SYSTEM] Camera Scanner online. Quests require live verification."],
  lastCompletedDay: false,
  critiques: [],
});

let state = load();
let activeQuest = null;
let activeIsPenalty = false;
let formTracker = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const scanner = createScannerSession({
  video: $("#scanner-video"),
  canvas: $("#scanner-canvas"),
  statusEl: $("#scanner-status"),
  cueEl: $("#scanner-cue"),
  countEl: $("#scanner-count"),
  meterEl: $("#scanner-meter-fill"),
  stageEl: $("#scanner-stage"),
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pushLog(msg) {
  state.log.unshift(`[Day ${state.day}] ${msg}`);
  state.log = state.log.slice(0, 50);
}

function currentRank() {
  return rankForXp(state.totalXp);
}

function pushCritique(entry) {
  state.critiques.unshift(entry);
  state.critiques = state.critiques.slice(0, 30);
  pushLog(`[Critique AI] ${entry.questName}: ${entry.gradeLabel} (${entry.score}/100)`);
  showToast(`CRITIQUE AI — ${entry.gradeLabel}`, entry.score >= 62 ? "success" : "danger");
  renderCritique();
}

function showToast(message, kind = "info") {
  const toast = $("#toast");
  toast.hidden = false;
  toast.dataset.kind = kind;
  toast.textContent = message;
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.hidden = true;
    }, 350);
  }, 2600);
}

function renderStats() {
  $("#stats-list").innerHTML = STAT_KEYS.map(
    ({ key, label, full }) => `
    <li class="stat-item" title="${full}">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${state.stats[key]}</span>
    </li>`
  ).join("");
}

function renderStatus() {
  const rank = currentRank();
  const badge = $("#rank-badge");
  badge.textContent = rank.id === "N" ? "N" : rank.id;
  badge.className = `rank-badge rank-${rank.id.toLowerCase()}`;
  badge.dataset.rank = rank.id;
  $("#rank-name").textContent = rank.name;
  $("#player-level").textContent = String(state.level);
  $("#player-title").textContent = state.name;
  const need = xpToNextLevel(state.level);
  $("#xp-fill").style.width = `${Math.min(100, (state.xp / need) * 100)}%`;
  $("#xp-text").textContent = `${state.xp} / ${need} XP`;
  $("#streak-text").textContent = `Streak: ${state.streak} days`;
  renderStats();
}

function questCard(q, { penalty = false } = {}) {
  const done = q.progress >= q.target;
  const pct = Math.min(100, (q.progress / q.target) * 100);
  return `
    <li class="quest-item ${done ? "done" : ""}" data-id="${q.id}">
      <div class="quest-top">
        <div>
          <p class="quest-name">${q.name}</p>
          <p class="quest-meta">${q.progress} / ${q.target} ${q.unit}${
            q.xp ? ` · +${q.xp} XP · ${q.stat.toUpperCase()}` : ""
          }</p>
          <p class="quest-scan-tag">📷 Camera verification required</p>
        </div>
        <button class="sys-btn tiny ${penalty ? "scan-penalty" : "scan-quest"}" data-id="${q.id}" type="button" ${
          done ? "disabled" : ""
        }>
          ${done ? "VERIFIED" : "SCAN"}
        </button>
      </div>
      <div class="bar ${penalty ? "danger" : ""}"><div class="bar-fill" style="width:${pct}%"></div></div>
    </li>`;
}

function renderQuests() {
  $("#quest-list").innerHTML = state.quests.map((q) => questCard(q)).join("");
  const doneCount = state.quests.filter((q) => q.progress >= q.target).length;
  $("#quest-progress").textContent = `${doneCount} / ${state.quests.length} verified`;
}

function renderPenalty() {
  const modal = $("#penalty-modal");
  modal.hidden = !state.penaltyActive;
  if (!state.penaltyActive) return;

  $("#penalty-list").innerHTML = state.penaltyQuests
    .map((q) => questCard(q, { penalty: true }))
    .join("");

  const allDone = state.penaltyQuests.every((q) => q.progress >= q.target);
  $("#btn-clear-penalty").disabled = !allDone;

  const h = Math.floor(state.penaltySeconds / 3600);
  const m = Math.floor((state.penaltySeconds % 3600) / 60);
  const s = state.penaltySeconds % 60;
  $("#penalty-timer").textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function renderRanks() {
  const rank = currentRank();
  $("#rank-ladder").innerHTML = RANKS.map((r) => {
    const active = r.id === rank.id;
    const unlocked = state.totalXp >= r.minXp;
    return `
      <li class="ladder-item ${active ? "active" : ""} ${unlocked ? "unlocked" : "locked"}">
        <span class="ladder-rank rank-${r.id.toLowerCase()}">${r.id === "N" ? "N" : r.id}</span>
        <div>
          <p class="ladder-name">${r.name}</p>
          <p class="ladder-meta">${r.minXp.toLocaleString()} total XP</p>
        </div>
        <span class="ladder-flag">${active ? "CURRENT" : unlocked ? "CLEARED" : "LOCKED"}</span>
      </li>`;
  }).join("");
}

function renderLog() {
  $("#system-log").innerHTML = state.log.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

function critiqueCard(entry) {
  return `
    <li class="critique-card grade-${entry.grade.toLowerCase()}">
      <div class="critique-card-top">
        <p class="critique-card-name">${escapeHtml(entry.questName)}</p>
        <span class="chip grade">${entry.grade} · ${entry.score}</span>
      </div>
      <ul class="critique-lines">
        ${entry.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
      </ul>
    </li>`;
}

function renderCritique() {
  const latest = state.critiques[0];
  const panel = $("#critique-window");
  if (latest) {
    panel.hidden = false;
    $("#critique-grade").textContent = `${latest.grade} · ${latest.score}`;
    $("#critique-grade").className = `chip grade grade-${latest.grade.toLowerCase()}`;
    $("#critique-latest-title").innerHTML = `<strong>${escapeHtml(latest.questName)}</strong> — ${escapeHtml(latest.gradeLabel)}`;
    $("#critique-latest-lines").innerHTML = latest.lines
      .map((l) => `<li>${escapeHtml(l)}</li>`)
      .join("");
  } else {
    panel.hidden = true;
  }
  $("#critique-history").innerHTML = state.critiques.map(critiqueCard).join("") ||
    `<li class="critique-empty">No scans reviewed yet. Complete a quest for the Critique AI to analyze your form.</li>`;
}

function escapeHtml(str) {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderAll() {
  renderStatus();
  renderQuests();
  renderPenalty();
  renderRanks();
  renderLog();
  renderCritique();
  save();
}

function gainXp(amount) {
  state.xp += amount;
  state.totalXp += amount;
  let leveled = false;
  while (state.xp >= xpToNextLevel(state.level)) {
    state.xp -= xpToNextLevel(state.level);
    state.level += 1;
    leveled = true;
    state.stats.sen += 1;
  }
  if (leveled) {
    pushLog(`Level up! You are now Lv.${state.level}.`);
    showToast(`LEVEL UP — Lv.${state.level}`, "success");
  }
  const before = $("#rank-badge").dataset.rank;
  const after = currentRank();
  if (before && before !== after.id) celebrateRankUp(after);
}

function celebrateRankUp(rank) {
  pushLog(`Rank promotion: ${rank.name}.`);
  const overlay = $("#rankup-overlay");
  $("#rankup-text").textContent = `You have been promoted to ${rank.name}.`;
  const badge = $("#rankup-badge");
  badge.textContent = rank.id === "N" ? "N" : rank.id;
  badge.className = `rank-badge rank-${rank.id.toLowerCase()}`;
  overlay.hidden = false;
  overlay.classList.add("show");
  showToast(`RANK UP — ${rank.id}-Rank`, "success");
  setTimeout(() => {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.hidden = true;
    }, 400);
  }, 2800);
}

function addQuestProgress(quest, amount, { penalty = false } = {}) {
  if (!quest || amount <= 0 || quest.progress >= quest.target) return;
  const before = quest.progress;
  const step = quest.unit === "km" || quest.unit === "min" ? amount : Math.round(amount);
  quest.progress = Math.min(
    quest.target,
    Math.round((quest.progress + step) * 10) / 10
  );
  const gained = quest.progress - before;
  if (gained <= 0) return;

  if (quest.progress >= quest.target && before < quest.target) {
    if (!penalty) {
      gainXp(quest.xp);
      state.stats[quest.stat] += 1;
      pushLog(`Scanner verified: ${quest.name}. +${quest.xp} XP`);
      showToast(`VERIFIED — ${quest.name}`, "success");
      checkDailyClear();
    } else {
      pushLog(`Penalty objective verified: ${quest.name}.`);
      showToast(`PENALTY CLEARED — ${quest.name}`, "success");
      if (state.penaltyQuests.every((q) => q.progress >= q.target)) {
        clearPenalty(true);
      }
    }
  }
  renderAll();
}

function checkDailyClear() {
  const allDone = state.quests.every((q) => q.progress >= q.target);
  if (allDone && !state.lastCompletedDay) {
    state.lastCompletedDay = true;
    state.streak += 1;
    state.stats.sen += 1;
    gainXp(50);
    pushLog("Daily Quest cleared via Camera Scanner. Streak +1.");
    showToast("DAILY QUEST CLEARED", "success");
    pushCritique(
      critiqueDay({
        quests: state.quests,
        streak: state.streak,
        stats: state.stats,
        rank: currentRank().name,
      })
    );
  }
}

function triggerPenalty() {
  if (state.penaltyActive) return;
  const idx = rankIndex(currentRank().id);
  state.penaltyActive = true;
  state.penaltyQuests = buildPenaltyQuest(idx);
  state.penaltySeconds = 4 * 60 * 60;
  state.streak = 0;
  pushLog("WARNING: Daily Quest failed. Penalty Quest issued.");
  showToast("PENALTY QUEST ISSUED", "danger");
  renderAll();
}

function clearPenalty(survived) {
  state.penaltyActive = false;
  state.penaltyQuests = [];
  if (survived) {
    pushLog("Penalty Quest survived. No demotion.");
    gainXp(30);
    showToast("PENALTY CLEARED — You survived.", "success");
  }
  renderAll();
}

function failPenalty() {
  const loss = Math.min(state.totalXp, 200);
  state.totalXp = Math.max(0, state.totalXp - loss);
  state.xp = Math.max(0, state.xp - 40);
  for (const { key } of STAT_KEYS) {
    state.stats[key] = Math.max(1, state.stats[key] - 2);
  }
  state.penaltyActive = false;
  state.penaltyQuests = [];
  pushLog(`Penalty failed. Stats reduced. Lost ${loss} total XP.`);
  showToast("PENALTY FAILED — Stats reduced", "danger");
  renderAll();
}

function advanceDay() {
  if (state.penaltyActive) {
    showToast("Resolve the Penalty Quest first.", "danger");
    return;
  }
  const incomplete = state.quests.some((q) => q.progress < q.target);
  if (incomplete) {
    triggerPenalty();
    return;
  }
  state.day += 1;
  state.lastCompletedDay = false;
  state.quests = buildDailyQuests(rankIndex(currentRank().id));
  pushLog("New day. Fresh Daily Quest assigned.");
  showToast(`DAY ${state.day} — New Daily Quest`);
  renderAll();
}

async function openScanner(quest, { penalty = false, forceSynthetic = false } = {}) {
  if (!quest || quest.progress >= quest.target) return;
  activeQuest = quest;
  activeIsPenalty = penalty;

  $("#scanner-title").textContent = quest.name;
  $("#scanner-target").textContent = `Target ${quest.target} ${quest.unit}`;
  $("#scanner-view").hidden = false;
  $("#camera-pill").textContent = "SCANNING";
  $("#camera-pill").classList.add("live");

  const params = new URLSearchParams(location.search);
  const demo = params.get("demo") === "1" || forceSynthetic;

  formTracker = createFormTracker(questKind(quest.id));

  await scanner.start({
    quest,
    forceSynthetic: demo,
    allowSynthFallback: demo || params.get("sim") === "1",
    onFrame: (result) => formTracker?.record(result),
    onProgress: (amount) => {
      addQuestProgress(quest, amount, { penalty });
      $("#scanner-target").textContent = `${quest.progress} / ${quest.target} ${quest.unit}`;
      if (quest.progress >= quest.target) {
        $("#scanner-status").textContent = "OBJECTIVE VERIFIED";
      }
    },
  });
}

function closeScanner() {
  scanner.stop();
  $("#scanner-view").hidden = true;
  $("#camera-pill").textContent = "SCANNER READY";
  $("#camera-pill").classList.remove("live");
  if (activeQuest && formTracker?.hasData()) {
    pushCritique(
      critiqueQuest({
        name: activeQuest.name,
        kind: questKind(activeQuest.id),
        target: activeQuest.target,
        achieved: activeQuest.progress,
        tracker: formTracker,
      })
    );
  }
  formTracker = null;
  activeQuest = null;
  activeIsPenalty = false;
  renderAll();
}

function bindEvents() {
  $("#btn-awaken").addEventListener("click", () => {
    $("#boot-screen").classList.remove("active");
    $("#main-screen").classList.add("active");
    showToast("[SYSTEM] Camera Scanner armed.", "success");
    // preload model in background
    scanner.ensureModel().catch(() => {});
  });

  $("#quest-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".scan-quest");
    if (!btn || btn.disabled) return;
    const quest = state.quests.find((q) => q.id === btn.dataset.id);
    openScanner(quest, { penalty: false });
  });

  $("#penalty-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".scan-penalty");
    if (!btn || btn.disabled) return;
    const quest = state.penaltyQuests.find((q) => q.id === btn.dataset.id);
    openScanner(quest, { penalty: true });
  });

  $("#btn-close-scanner").addEventListener("click", closeScanner);
  $("#btn-finish-scan").addEventListener("click", closeScanner);

  $("#btn-synth").addEventListener("click", () => {
    scanner.enableSynthetic(true);
    showToast("Simulation feed enabled", "info");
  });

  $("#btn-reset-day").addEventListener("click", advanceDay);

  $("#btn-clear-penalty").addEventListener("click", () => {
    if (state.penaltyQuests.every((q) => q.progress >= q.target)) {
      clearPenalty(true);
    } else {
      showToast("Scan all penalty objectives first.", "danger");
    }
  });

  $("#btn-fail-penalty").addEventListener("click", failPenalty);

  $$(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view;
      $("#ranks-view").hidden = view !== "ranks";
      $("#log-view").hidden = view !== "log";
      $("#critique-view").hidden = view !== "critique";
      if (view === "ranks") renderRanks();
      if (view === "log") renderLog();
      if (view === "critique") renderCritique();
    });
  });

  $$(".close-view").forEach((btn) => {
    btn.addEventListener("click", () => {
      $(`#${btn.dataset.close}-view`).hidden = true;
      $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === "home"));
    });
  });
}

function tickTimers() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, Math.floor((end - now) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  $("#quest-timer").textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  if (state.penaltyActive && state.penaltySeconds > 0) {
    state.penaltySeconds -= 1;
    if (state.penaltySeconds <= 0) failPenalty();
    else renderPenalty();
  }
}

window.__SOLO__ = {
  getState: () => structuredClone(state),
  reset: () => {
    state = defaultState();
    save();
    renderAll();
  },
  awaken: () => $("#btn-awaken").click(),
  openScanner: (id, opts) => {
    const q =
      state.quests.find((x) => x.id === id) ||
      state.penaltyQuests.find((x) => x.id === id);
    return openScanner(q, { forceSynthetic: true, ...opts, penalty: !!state.penaltyQuests.find((x) => x.id === id) });
  },
  closeScanner,
  advanceDay,
  triggerPenalty,
  grantXp: (n) => {
    gainXp(n);
    renderAll();
  },
  addProgress: (id, amount) => {
    const q =
      state.quests.find((x) => x.id === id) ||
      state.penaltyQuests.find((x) => x.id === id);
    if (!q) return;
    addQuestProgress(q, amount, { penalty: state.penaltyQuests.includes(q) });
  },
  scanner,
};

function init() {
  const params = new URLSearchParams(location.search);
  if (params.get("persist") !== "1") {
    state = defaultState();
    save();
  }
  bindEvents();
  renderAll();
  setInterval(tickTimers, 1000);
  tickTimers();
}

init();
