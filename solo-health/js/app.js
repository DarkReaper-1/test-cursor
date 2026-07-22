import {
  RANKS,
  STAT_KEYS,
  buildDailyQuests,
  buildPenaltyQuest,
  rankForXp,
  rankIndex,
  xpToNextLevel,
} from "./game-data.js";

const STORAGE_KEY = "solo-health-v1";

const defaultState = () => ({
  name: "Player",
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
  log: ["[SYSTEM] Welcome, Hunter. Your training begins."],
  lastCompletedDay: false,
});

let state = load();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

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
  const stamp = `Day ${state.day}`;
  state.log.unshift(`[${stamp}] ${msg}`);
  state.log = state.log.slice(0, 40);
}

function currentRank() {
  return rankForXp(state.totalXp);
}

function showToast(message, kind = "info") {
  const toast = $("#toast");
  toast.hidden = false;
  toast.dataset.kind = kind;
  toast.textContent = message;
  toast.classList.remove("show");
  // reflow for animation restart
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
  const list = $("#stats-list");
  list.innerHTML = STAT_KEYS.map(
    ({ key, label, full }) => `
    <li class="stat-item" title="${full}">
      <span class="stat-label">${label}</span>
      <span class="stat-value" data-stat="${key}">${state.stats[key]}</span>
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
  const pct = Math.min(100, (state.xp / need) * 100);
  $("#xp-fill").style.width = `${pct}%`;
  $("#xp-text").textContent = `${state.xp} / ${need} XP`;
  $("#streak-text").textContent = `Streak: ${state.streak} days`;
  renderStats();
}

function renderQuests() {
  const list = $("#quest-list");
  list.innerHTML = state.quests
    .map((q) => {
      const done = q.progress >= q.target;
      const pct = Math.min(100, (q.progress / q.target) * 100);
      return `
      <li class="quest-item ${done ? "done" : ""}" data-id="${q.id}">
        <div class="quest-top">
          <div>
            <p class="quest-name">${q.name}</p>
            <p class="quest-meta">${q.progress} / ${q.target} ${q.unit} · +${q.xp} XP · ${q.stat.toUpperCase()}</p>
          </div>
          <button class="sys-btn tiny log-quest" data-id="${q.id}" type="button" ${done ? "disabled" : ""}>
            ${done ? "DONE" : "LOG"}
          </button>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      </li>`;
    })
    .join("");

  const doneCount = state.quests.filter((q) => q.progress >= q.target).length;
  $("#quest-progress").textContent = `${doneCount} / ${state.quests.length} complete`;
}

function renderPenalty() {
  const modal = $("#penalty-modal");
  modal.hidden = !state.penaltyActive;
  if (!state.penaltyActive) return;

  $("#penalty-list").innerHTML = state.penaltyQuests
    .map((q) => {
      const done = q.progress >= q.target;
      const pct = Math.min(100, (q.progress / q.target) * 100);
      return `
      <li class="quest-item ${done ? "done" : ""}">
        <div class="quest-top">
          <div>
            <p class="quest-name">${q.name}</p>
            <p class="quest-meta">${q.progress} / ${q.target} ${q.unit}</p>
          </div>
          <button class="sys-btn tiny log-penalty" data-id="${q.id}" type="button" ${done ? "disabled" : ""}>
            ${done ? "DONE" : "LOG"}
          </button>
        </div>
        <div class="bar danger"><div class="bar-fill" style="width:${pct}%"></div></div>
      </li>`;
    })
    .join("");

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
  $("#system-log").innerHTML = state.log
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderAll() {
  renderStatus();
  renderQuests();
  renderPenalty();
  renderRanks();
  renderLog();
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
    // small sense bump each level
    state.stats.sen += 1;
  }
  if (leveled) {
    pushLog(`Level up! You are now Lv.${state.level}.`);
    showToast(`LEVEL UP — Lv.${state.level}`, "success");
  }

  const before = $("#rank-badge").dataset.rank;
  const after = currentRank();
  if (before && before !== after.id) {
    celebrateRankUp(after);
  }
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

function logQuest(id, amount) {
  const q = state.quests.find((x) => x.id === id);
  if (!q || q.progress >= q.target) return;

  const step = amount ?? q.step ?? 10;
  const before = q.progress;
  q.progress = Math.min(q.target, Math.round((q.progress + step) * 10) / 10);
  const gained = q.progress - before;
  if (gained <= 0) return;

  // proportional XP + stat
  if (q.progress >= q.target && before < q.target) {
    gainXp(q.xp);
    state.stats[q.stat] += 1;
    pushLog(`Daily objective cleared: ${q.name}. +${q.xp} XP`);
    showToast(`QUEST COMPLETE — ${q.name}`, "success");
    checkDailyClear();
  } else {
    showToast(`Logged ${gained} ${q.unit} — ${q.name}`);
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
    pushLog("Daily Quest cleared. Streak increased.");
    showToast("DAILY QUEST CLEARED", "success");
  }
}

function logPenalty(id) {
  const q = state.penaltyQuests.find((x) => x.id === id);
  if (!q || q.progress >= q.target) return;
  const step = q.step ?? 10;
  q.progress = Math.min(q.target, Math.round((q.progress + step) * 10) / 10);
  if (state.penaltyQuests.every((x) => x.progress >= x.target)) {
    clearPenalty(true);
    return;
  }
  renderAll();
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
  // prepare next day quests if advancing
  renderAll();
}

function failPenalty() {
  // demote rank via XP loss + stat penalty
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
  const idx = rankIndex(currentRank().id);
  state.quests = buildDailyQuests(idx);
  pushLog("A new day begins. Fresh Daily Quest assigned.");
  showToast(`DAY ${state.day} — New Daily Quest`);
  renderAll();
}

function bindEvents() {
  $("#btn-awaken").addEventListener("click", () => {
    $("#boot-screen").classList.remove("active");
    $("#main-screen").classList.add("active");
    showToast("[SYSTEM] Connected.", "success");
  });

  $("#quest-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".log-quest");
    if (!btn) return;
    logQuest(btn.dataset.id);
  });

  $("#btn-complete-demo").addEventListener("click", () => {
    const next = state.quests.find((q) => q.progress < q.target);
    if (!next) {
      showToast("All daily objectives complete.");
      return;
    }
    logQuest(next.id, next.step ?? 10);
  });

  $("#btn-reset-day").addEventListener("click", advanceDay);

  $("#penalty-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".log-penalty");
    if (!btn) return;
    logPenalty(btn.dataset.id);
  });

  $("#btn-clear-penalty").addEventListener("click", () => {
    // auto-complete for demo / mercy clear after effort
    state.penaltyQuests.forEach((q) => {
      q.progress = q.target;
    });
    clearPenalty(true);
  });

  $("#btn-fail-penalty").addEventListener("click", failPenalty);

  $$(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view;
      $("#ranks-view").hidden = view !== "ranks";
      $("#log-view").hidden = view !== "log";
      if (view === "ranks") renderRanks();
      if (view === "log") renderLog();
    });
  });

  $$(".close-view").forEach((btn) => {
    btn.addEventListener("click", () => {
      const which = btn.dataset.close;
      $(`#${which}-view`).hidden = true;
      $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === "home"));
    });
  });
}

function tickTimers() {
  // cosmetic daily countdown — resets conceptually at day advance
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
    if (state.penaltySeconds <= 0) {
      failPenalty();
    } else {
      const ph = Math.floor(state.penaltySeconds / 3600);
      const pm = Math.floor((state.penaltySeconds % 3600) / 60);
      const ps = state.penaltySeconds % 60;
      $("#penalty-timer").textContent = `${String(ph).padStart(2, "0")}:${String(pm).padStart(2, "0")}:${String(ps).padStart(2, "0")}`;
    }
  }
}

// Demo helpers exposed for Playwright
window.__SOLO__ = {
  getState: () => structuredClone(state),
  reset: () => {
    state = defaultState();
    save();
    renderAll();
  },
  awaken: () => $("#btn-awaken").click(),
  logQuest,
  advanceDay,
  triggerPenalty,
  clearPenalty: () => {
    state.penaltyQuests.forEach((q) => {
      q.progress = q.target;
    });
    clearPenalty(true);
  },
  failPenalty,
  grantXp: (n) => {
    gainXp(n);
    renderAll();
  },
};

function init() {
  // fresh session for cleaner demos unless ?persist=1
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
