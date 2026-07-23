(function () {
  const params = new URLSearchParams(location.search);
  const DEMO = params.get("demo") === "1";

  const state = Store.load();
  let scanner = null;
  let pendingEstimate = null;
  let viewStack = ["home"];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 2200);
  }

  function applySettings() {
    document.body.classList.toggle("xl", !!state.settings.xl);
    document.body.classList.toggle("contrast", !!state.settings.contrast);
    document.body.classList.toggle("reduce-motion", !!state.settings.reduceMotion);
    $("#toggle-xl").checked = !!state.settings.xl;
    $("#toggle-contrast").checked = !!state.settings.contrast;
    $("#toggle-motion").checked = !!state.settings.reduceMotion;
  }

  function setGreeting() {
    const h = new Date().getHours();
    const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    $("#greeting").textContent = part;
  }

  function paintCategory(el, sys, dia) {
    const c = BP.classify(sys, dia);
    const keepPreview = el.classList.contains("preview");
    el.textContent = c.label;
    el.className = "category-chip" + (c.key === "normal" ? "" : " " + c.key);
    if (keepPreview) el.classList.add("preview");
    return c;
  }

  function renderLatest() {
    const card = $("#latest-card");
    const r = state.readings[0];
    if (!r) {
      card.className = "latest-card empty";
      card.innerHTML = "<p>No readings yet. Start with a cuff log or a finger check.</p>";
      return;
    }
    const c = BP.classify(r.sys, r.dia);
    card.className = "latest-card";
    card.innerHTML = `
      <div class="meta-row">
        <span>${r.source === "cuff" ? "Cuff reading" : "Finger estimate"}</span>
        <span>${BP.formatWhen(r.at)}</span>
      </div>
      <p class="latest-bp">${r.sys}/${r.dia} <span style="font-size:1rem;font-family:var(--font);color:var(--ink-soft)">mmHg</span></p>
      <div class="meta-row">
        <span class="category-chip ${c.key === "normal" ? "" : c.key}">${c.label}</span>
        ${r.pulse ? `<span>Pulse ${r.pulse} bpm</span>` : ""}
      </div>
    `;
  }

  function renderHistory() {
    const list = $("#history-list");
    if (!state.readings.length) {
      list.innerHTML = `<li><p class="hist-meta">No saved readings yet.</p></li>`;
      drawChart([]);
      return;
    }
    list.innerHTML = state.readings
      .slice(0, 40)
      .map((r) => {
        const c = BP.classify(r.sys, r.dia);
        return `<li>
          <div class="hist-top">
            <span class="hist-bp">${r.sys}/${r.dia}</span>
            <span class="category-chip ${c.key === "normal" ? "" : c.key}">${c.label}</span>
          </div>
          <div class="hist-meta">${BP.formatWhen(r.at)} · ${r.source === "cuff" ? "Cuff" : "Finger estimate"}${r.pulse ? ` · ${r.pulse} bpm` : ""}${r.note ? ` · ${escapeHtml(r.note)}` : ""}</div>
        </li>`;
      })
      .join("");
    drawChart(state.readings.slice(0, 14).reverse());
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function drawChart(rows) {
    const canvas = $("#trend-chart");
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(10,92,99,0.04)";
    ctx.fillRect(0, 0, w, h);

    if (rows.length < 1) {
      ctx.fillStyle = "#3d5c63";
      ctx.font = "28px Atkinson Hyperlegible, sans-serif";
      ctx.fillText("Trends appear after you save readings", 36, h / 2);
      return;
    }

    const pad = 36;
    const minY = 50;
    const maxY = 180;
    const xAt = (i) => pad + (i * (w - pad * 2)) / Math.max(1, rows.length - 1);
    const yAt = (v) => pad + ((maxY - v) / (maxY - minY)) * (h - pad * 2);

    // guide lines
    [80, 120, 140].forEach((v) => {
      ctx.strokeStyle = "rgba(10,92,99,0.12)";
      ctx.beginPath();
      ctx.moveTo(pad, yAt(v));
      ctx.lineTo(w - pad, yAt(v));
      ctx.stroke();
      ctx.fillStyle = "#3d5c63";
      ctx.font = "18px Atkinson Hyperlegible, sans-serif";
      ctx.fillText(String(v), 8, yAt(v) + 6);
    });

    function line(key, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      rows.forEach((r, i) => {
        const x = xAt(i);
        const y = yAt(r[key]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      rows.forEach((r, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(xAt(i), yAt(r[key]), 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    line("sys", "#0a5c63");
    line("dia", "#c9851a");
  }

  function showView(name, { push = true } = {}) {
    $$(".view").forEach((v) => {
      v.hidden = true;
      v.classList.remove("active");
    });
    const el = $(`#view-${name}`);
    if (!el) return;
    el.hidden = false;
    el.classList.add("active");

    $$(".tab").forEach((t) => {
      const on = t.dataset.go === name || (name === "settings" && false);
      t.classList.toggle("active", t.dataset.go === name);
      if (t.dataset.go === name) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });

    if (push) {
      if (viewStack[viewStack.length - 1] !== name) viewStack.push(name);
    }

    if (name === "home") renderLatest();
    if (name === "history") renderHistory();
    if (name === "scan") setupScanner();
    if (name === "log") updateLiveCategory();
  }

  function goBack() {
    if (viewStack.length > 1) viewStack.pop();
    const prev = viewStack[viewStack.length - 1] || "home";
    showView(prev, { push: false });
  }

  function maybeCrisis(sys, dia) {
    const c = BP.classify(sys, dia);
    if (c.key === "crisis") {
      const d = $("#crisis-dialog");
      if (typeof d.showModal === "function") d.showModal();
    }
  }

  function saveReading(reading) {
    Store.addReading(state, reading);
    maybeCrisis(reading.sys, reading.dia);
    renderLatest();
    toast("Saved on this device");
    showView("home");
  }

  function setupScanner() {
    $("#scan-result").hidden = true;
    pendingEstimate = null;
    if (scanner) scanner.destroy();
    scanner = FingerScan.createScanner({
      pad: $("#finger-pad"),
      progress: $("#scan-progress"),
      status: $("#scan-status"),
      wave: $("#pulse-wave"),
      demo: DEMO,
      getCalibration: () => Store.cuffAverage(state),
      onComplete: (result) => {
        pendingEstimate = result;
        $("#est-sys").textContent = result.sys;
        $("#est-dia").textContent = result.dia;
        $("#est-pulse").textContent = result.pulse;
        paintCategory($("#est-category"), result.sys, result.dia);
        $("#scan-result").hidden = false;
      },
    });
  }

  function updateLiveCategory() {
    const sys = Number($("#sys-input").value);
    const dia = Number($("#dia-input").value);
    paintCategory($("#live-category"), sys, dia);
  }

  function wire() {
    const accept = $("#accept-disclaimer");
    const enter = $("#btn-enter");
    accept.addEventListener("change", () => {
      enter.disabled = !accept.checked;
    });
    enter.addEventListener("click", () => {
      state.accepted = true;
      Store.save(state);
      bootApp();
    });

    $$("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.go));
    });
    $$("[data-back]").forEach((btn) => btn.addEventListener("click", goBack));
    $("#btn-settings").addEventListener("click", () => showView("settings"));

    $$(".step").forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.field;
        const delta = Number(btn.dataset.delta);
        const input = $(`#${field}-input`);
        input.value = BP.clamp(Number(input.value) + delta, Number(input.min), Number(input.max));
        updateLiveCategory();
      });
    });
    ["sys-input", "dia-input"].forEach((id) => {
      $(`#${id}`).addEventListener("input", updateLiveCategory);
    });

    $("#cuff-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const sys = Number($("#sys-input").value);
      const dia = Number($("#dia-input").value);
      const pulse = Number($("#pulse-input").value);
      const note = $("#note-input").value.trim();
      if (!Number.isFinite(sys) || !Number.isFinite(dia)) {
        toast("Please enter valid numbers");
        return;
      }
      saveReading({
        id: crypto.randomUUID?.() || String(Date.now()),
        at: Date.now(),
        source: "cuff",
        sys,
        dia,
        pulse: Number.isFinite(pulse) ? pulse : null,
        note,
      });
      $("#note-input").value = "";
    });

    $("#btn-save-estimate").addEventListener("click", () => {
      if (!pendingEstimate) return;
      saveReading({
        id: crypto.randomUUID?.() || String(Date.now()),
        at: Date.now(),
        source: "finger",
        sys: pendingEstimate.sys,
        dia: pendingEstimate.dia,
        pulse: pendingEstimate.pulse,
        note: "Wellness estimate",
      });
    });
    $("#btn-rescan").addEventListener("click", () => {
      $("#scan-result").hidden = true;
      pendingEstimate = null;
      scanner?.reset();
      if (DEMO) setTimeout(() => scanner?.startDemo(), 400);
    });

    $("#toggle-xl").addEventListener("change", (e) => {
      state.settings.xl = e.target.checked;
      Store.save(state);
      applySettings();
    });
    $("#toggle-contrast").addEventListener("change", (e) => {
      state.settings.contrast = e.target.checked;
      Store.save(state);
      applySettings();
    });
    $("#toggle-motion").addEventListener("change", (e) => {
      state.settings.reduceMotion = e.target.checked;
      Store.save(state);
      applySettings();
    });

    $("#btn-clear").addEventListener("click", () => {
      if (confirm("Clear all readings saved on this device?")) {
        Store.clearReadings(state);
        renderLatest();
        renderHistory();
        toast("Readings cleared");
      }
    });

    $("#btn-export").addEventListener("click", () => {
      showView("history");
      setTimeout(() => window.print(), 200);
    });

    $("#btn-crisis-ok").addEventListener("click", () => {
      $("#crisis-dialog").close();
    });

    if ("serviceWorker" in navigator && !DEMO) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  function seedDemoData() {
    if (state.readings.length) return;
    const now = Date.now();
    const sample = [
      { sys: 118, dia: 76, pulse: 70, source: "cuff", days: 5 },
      { sys: 122, dia: 78, pulse: 72, source: "cuff", days: 3 },
      { sys: 124, dia: 80, pulse: 74, source: "finger", days: 2 },
      { sys: 119, dia: 77, pulse: 68, source: "cuff", days: 1 },
    ];
    sample.forEach((s, i) => {
      state.readings.push({
        id: "demo-" + i,
        at: now - s.days * 86400000,
        source: s.source,
        sys: s.sys,
        dia: s.dia,
        pulse: s.pulse,
        note: s.source === "finger" ? "Wellness estimate" : "Morning",
      });
    });
    Store.save(state);
  }

  async function runDemoTour() {
    seedDemoData();
    renderLatest();
    await wait(1200);
    showView("scan");
    await wait(600);
    scanner?.startDemo();
    await wait(FingerScan.DEMO_SCAN_MS + 1800);
    $("#btn-save-estimate").click();
    await wait(1400);
    showView("log");
    await wait(900);
    $("#sys-input").value = 128;
    $("#dia-input").value = 82;
    $("#pulse-input").value = 76;
    $("#note-input").value = "After coffee";
    updateLiveCategory();
    await wait(1000);
    $("#cuff-form").requestSubmit();
    await wait(1400);
    showView("history");
    await wait(2200);
    showView("settings");
    await wait(1600);
    showView("home");
    await wait(1200);
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function bootApp() {
    const ob = $("#onboarding");
    ob.hidden = true;
    ob.setAttribute("hidden", "");
    ob.style.display = "none";
    $("#app").hidden = false;
    $("#app").removeAttribute("hidden");
    applySettings();
    setGreeting();
    showView("home", { push: false });
    viewStack = ["home"];
    if (DEMO) runDemoTour();
  }

  // init
  applySettings();
  wire();
  if (state.accepted || DEMO) {
    if (DEMO) {
      state.accepted = true;
      Store.save(state);
    }
    bootApp();
  }
})();
