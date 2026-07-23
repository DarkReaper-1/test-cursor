(function () {
  const params = new URLSearchParams(location.search);
  const DEMO = params.get("demo") === "1";

  const state = DB.load();
  let viewStack = ["home"];
  let engine = null;
  let cameraSession = null;
  let measureRaf = 0;
  let measuring = false;
  let measureStarted = 0;
  let pendingPulse = null;
  const MEASURE_MS = DEMO ? 7000 : 15000;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (el.hidden = true), 2200);
  }

  function applySettings() {
    document.body.classList.toggle("xl", !!state.settings.xl);
    document.body.classList.toggle("contrast", !!state.settings.contrast);
    document.body.classList.toggle("reduce-motion", !!state.settings.reduceMotion);
    $("#toggle-xl").checked = !!state.settings.xl;
    $("#toggle-contrast").checked = !!state.settings.contrast;
    $("#toggle-motion").checked = !!state.settings.reduceMotion;
    $("#toggle-remind-am").checked = !!state.settings.remindAm;
    $("#toggle-remind-pm").checked = !!state.settings.remindPm;
  }

  function setGreeting() {
    const h = new Date().getHours();
    $("#greeting").textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }

  function paintCategory(el, sys, dia) {
    const c = BP.classify(sys, dia);
    const keep = el.classList.contains("preview");
    el.textContent = c.label;
    el.className = "category-chip" + (c.key === "normal" ? "" : " " + c.key);
    if (keep) el.classList.add("preview");
    return c;
  }

  function syncMonitor() {
    const sys = Number($("#sys-input").value);
    const dia = Number($("#dia-input").value);
    const pulse = Number($("#pulse-input").value);
    $("#monitor-sys").textContent = Number.isFinite(sys) ? sys : "--";
    $("#monitor-dia").textContent = Number.isFinite(dia) ? dia : "--";
    $("#monitor-pulse").textContent = Number.isFinite(pulse) ? pulse : "--";
    const c = paintCategory($("#live-category"), sys, dia);
    // Map category to needle position across range strip segments
    const map = { normal: 12, elevated: 34, high: c.level >= 3 ? 72 : 55, crisis: 90, unknown: 12 };
    const pct = map[c.key] ?? 12;
    $("#range-needle").style.left = `calc(${pct}% - 2px)`;
  }

  function fmt(n, digits = 0) {
    if (!Number.isFinite(n)) return "—";
    return Math.round(n * 10 ** digits) / 10 ** digits;
  }

  function renderDash() {
    $("#insight-text").textContent = Analytics.insights(state.readings);

    const card = $("#latest-card");
    const r = state.readings[0];
    if (!r) {
      card.className = "latest-card empty";
      card.innerHTML = "<p>No readings yet — start with pulse or a cuff log.</p>";
      return;
    }
    const bits = [];
    if (r.systolic != null) {
      const c = BP.classify(r.systolic, r.diastolic);
      bits.push(`<p class="latest-bp">${r.systolic}/${r.diastolic} <span class="unit-inline">mmHg</span></p>`);
      bits.push(`<span class="category-chip ${c.key === "normal" ? "" : c.key}">${c.label}</span>`);
    } else if (r.heartRate != null) {
      bits.push(`<p class="latest-bp">${r.heartRate} <span class="unit-inline">bpm</span></p>`);
      if (r.stress) bits.push(`<span class="category-chip">${r.stress} stress cue</span>`);
    }
    card.className = "latest-card";
    card.innerHTML = `
      <div class="meta-row"><span>${labelType(r)}</span><span>${BP.formatWhen(r.at)}</span></div>
      ${bits.join("")}
      <div class="meta-row">${r.note ? `<span>${escapeHtml(r.note)}</span>` : ""}${r.heartRate != null && r.systolic != null ? `<span>Pulse ${r.heartRate} bpm</span>` : ""}</div>
    `;
  }

  function labelType(r) {
    if (r.systolic != null && r.heartRate != null) return "BP + pulse";
    if (r.systolic != null) return "Cuff blood pressure";
    return "Camera heart rate";
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderHistory() {
    const list = $("#history-list");
    if (!state.readings.length) {
      list.innerHTML = `<li><p class="hist-meta">No saved readings yet.</p></li>`;
      return;
    }
    list.innerHTML = state.readings
      .slice(0, 50)
      .map((r) => {
        const bp = r.systolic != null ? `${r.systolic}/${r.diastolic}` : null;
        const c = bp ? BP.classify(r.systolic, r.diastolic) : null;
        return `<li>
          <div class="hist-top">
            <span class="hist-bp">${bp || (r.heartRate != null ? r.heartRate + " bpm" : "—")}</span>
            ${c ? `<span class="category-chip ${c.key === "normal" ? "" : c.key}">${c.label}</span>` : r.stress ? `<span class="category-chip">${r.stress} stress cue</span>` : ""}
          </div>
          <div class="hist-meta">${BP.formatWhen(r.at)} · ${labelType(r)}${r.heartRate != null && bp ? ` · ${r.heartRate} bpm` : ""}${r.note ? ` · ${escapeHtml(r.note)}` : ""}</div>
        </li>`;
      })
      .join("");
  }

  function renderCharts() {
    const bpPts = state.readings.filter((r) => r.systolic != null).slice(0, 20).reverse();
    const hrPts = state.readings.filter((r) => r.heartRate != null).slice(0, 20).reverse();

    Charts.drawLineChart(
      $("#chart-bp"),
      [
        { label: "Systolic", color: "#0b5f66", points: bpPts.map((r) => ({ y: r.systolic })) },
        { label: "Diastolic", color: "#b86f12", points: bpPts.map((r) => ({ y: r.diastolic })) },
      ],
      { guides: [80, 120, 140], minY: 50, maxY: 180, legend: false, emptyText: "Log cuff readings to see BP trends" }
    );

    Charts.drawLineChart(
      $("#chart-hr"),
      [{ label: "Heart rate", color: "#0b5f66", points: hrPts.map((r) => ({ y: r.heartRate })) }],
      { guides: [60, 80, 100], minY: 40, maxY: 140, legend: false, emptyText: "Measure pulse to see heart-rate trends" }
    );

    const s = Analytics.summarize(state.readings);
    const week = state.readings.filter((r) => r.at >= Date.now() - 7 * 864e5);
    const weekDia = Analytics.summarize(week).avgDia;
    const month = state.readings.filter((r) => r.at >= Date.now() - 30 * 864e5);
    const monthDia = Analytics.summarize(month).avgDia;
    $("#trend-stats").innerHTML = `
      <div class="stat-card"><span class="stat-label">Week avg BP</span><strong>${s.weekAvgSys != null ? `${fmt(s.weekAvgSys)}/${fmt(weekDia)}` : "—"}</strong></div>
      <div class="stat-card"><span class="stat-label">Week avg HR</span><strong>${fmt(s.weekAvgHr)}</strong></div>
      <div class="stat-card"><span class="stat-label">Month avg BP</span><strong>${s.monthAvgSys != null ? `${fmt(s.monthAvgSys)}/${fmt(monthDia)}` : "—"}</strong></div>
      <div class="stat-card"><span class="stat-label">Month avg HR</span><strong>${fmt(s.monthAvgHr)}</strong></div>
    `;
  }

  function showView(name, { push = true } = {}) {
    if (name !== "pulse") stopMeasurement(true);

    $$(".view").forEach((v) => {
      v.hidden = true;
      v.classList.remove("active");
    });
    const el = $(`#view-${name}`);
    if (!el) return;
    el.hidden = false;
    el.classList.add("active");

    $$(".tab").forEach((t) => {
      const on = t.dataset.go === name;
      t.classList.toggle("active", on);
      if (on) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });

    if (push && viewStack[viewStack.length - 1] !== name) viewStack.push(name);

    if (name === "home") renderDash();
    if (name === "history") renderHistory();
    if (name === "charts") renderCharts();
    if (name === "log") syncMonitor();
    if (name === "pulse") preparePulseView();
  }

  function goBack() {
    if (viewStack.length > 1) viewStack.pop();
    showView(viewStack[viewStack.length - 1] || "home", { push: false });
  }

  function preparePulseView() {
    $("#pulse-result").hidden = true;
    pendingPulse = null;
    $("#live-bpm").textContent = "--";
    $("#pulse-progress").style.width = "0%";
    $("#btn-start-pulse").hidden = false;
    $("#btn-stop-pulse").hidden = true;
    $("#pulse-status").textContent = DEMO
      ? "Demo mode — synthetic PPG ready"
      : "Ready. Cover the camera, then start.";
    $("#camera-hint").textContent = DEMO ? "Demo waveform" : "Allow camera access to begin";
    Charts.drawWave($("#ppg-wave"), []);
  }

  async function startMeasurement() {
    if (measuring) return;
    engine = PulseEngine.create({ demo: DEMO });
    measuring = true;
    measureStarted = performance.now();
    pendingPulse = null;
    $("#pulse-result").hidden = true;
    $("#btn-start-pulse").hidden = true;
    $("#btn-stop-pulse").hidden = false;
    $("#pulse-status").textContent = "Hold steady… collecting pulse signal";

    if (!DEMO) {
      try {
        cameraSession = await Camera.openCamera({ preferTorch: true });
        await Camera.attach($("#camera-video"), cameraSession.stream);
        $("#camera-frame").classList.add("has-video");
        $("#camera-hint").textContent = cameraSession.torchOn
          ? "Torch on — keep fingertip covering the lens"
          : "Cover the lens fully with your fingertip";
      } catch (e) {
        measuring = false;
        $("#btn-start-pulse").hidden = false;
        $("#btn-stop-pulse").hidden = true;
        $("#pulse-status").textContent = "Camera blocked. Allow camera permission, or use demo mode (?demo=1).";
        toast("Camera unavailable");
        return;
      }
    } else {
      $("#camera-hint").textContent = "Synthetic PPG running";
    }

    const tick = (now) => {
      if (!measuring) return;
      if (DEMO) {
        engine.pushSynthetic(now, 72);
      } else if (cameraSession) {
        const red = Camera.sampleRed($("#camera-video"), $("#sample-canvas"));
        engine.push(red, now);
      }

      const analysis = engine.analyze();
      Charts.drawWave($("#ppg-wave"), analysis.waveform || []);
      if (analysis.bpm) $("#live-bpm").textContent = analysis.bpm;

      const elapsed = now - measureStarted;
      $("#pulse-progress").style.width = Math.min(100, (elapsed / MEASURE_MS) * 100) + "%";

      if (elapsed < MEASURE_MS * 0.3) $("#pulse-status").textContent = "Detecting pulse peaks…";
      else if (elapsed < MEASURE_MS * 0.75) $("#pulse-status").textContent = "Good signal — stay still";
      else $("#pulse-status").textContent = "Finishing…";

      if (elapsed >= MEASURE_MS) {
        finishMeasurement();
        return;
      }
      measureRaf = requestAnimationFrame(tick);
    };
    measureRaf = requestAnimationFrame(tick);
  }

  function finishMeasurement() {
    measuring = false;
    cancelAnimationFrame(measureRaf);
    const analysis = engine?.analyze() || {};
    stopCameraOnly();

    let bpm = analysis.bpm;
    let hrv = analysis.hrvMs;
    if (!bpm && DEMO) {
      bpm = 72;
      hrv = 38;
    }
    if (!bpm) {
      $("#pulse-status").textContent = "Couldn’t lock onto a steady pulse. Try again with fuller lens coverage.";
      $("#btn-start-pulse").hidden = false;
      $("#btn-stop-pulse").hidden = true;
      return;
    }

    const stress = BP.stressFromHrHrv(bpm, hrv);
    pendingPulse = { bpm, hrvMs: hrv, stress };
    $("#result-bpm").textContent = bpm;
    $("#result-hrv").textContent = hrv != null ? hrv : "—";
    $("#result-stress").textContent = stress;
    $("#live-bpm").textContent = bpm;
    $("#pulse-result").hidden = false;
    $("#pulse-status").textContent = "Measurement complete";
    $("#btn-start-pulse").hidden = false;
    $("#btn-stop-pulse").hidden = true;
    $("#pulse-progress").style.width = "100%";
  }

  function stopCameraOnly() {
    if (cameraSession) {
      Camera.stop(cameraSession.stream);
      cameraSession = null;
      $("#camera-video").srcObject = null;
    }
    $("#camera-frame")?.classList.remove("has-video");
  }

  function stopMeasurement(silent) {
    measuring = false;
    cancelAnimationFrame(measureRaf);
    stopCameraOnly();
    if (!silent) {
      $("#btn-start-pulse").hidden = false;
      $("#btn-stop-pulse").hidden = true;
      $("#pulse-status").textContent = "Stopped";
    }
  }

  function saveReading(reading) {
    DB.add(state, reading);
    if (reading.systolic != null) {
      const c = BP.classify(reading.systolic, reading.diastolic);
      if (c.key === "crisis") {
        const d = $("#crisis-dialog");
        if (d.showModal) d.showModal();
      }
    }
    toast("Saved on this device");
    showView("home");
  }

  function seedDemo() {
    if (state.readings.length) return;
    const now = Date.now();
    const rows = [
      { days: 6, sys: 118, dia: 76, hr: 70 },
      { days: 4, sys: 122, dia: 78, hr: 74 },
      { days: 2, sys: null, dia: null, hr: 68 },
      { days: 1, sys: 124, dia: 80, hr: 76 },
      { days: 0.2, sys: 119, dia: 77, hr: 72 },
    ];
    rows.forEach((row, i) => {
      state.readings.push({
        id: "demo-" + i,
        at: now - row.days * 86400000,
        type: row.sys != null ? "bloodPressure" : "heartRate",
        heartRate: row.hr,
        hrvMs: 40 - i,
        systolic: row.sys,
        diastolic: row.dia,
        stress: BP.stressFromHrHrv(row.hr, 40 - i),
        note: row.sys != null ? "Cuff" : "Camera",
        source: { hr: row.sys != null ? "cuff" : "camera", bp: row.sys != null ? "cuff" : null },
      });
    });
    DB.save(state);
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function runDemoTour() {
    seedDemo();
    renderDash();
    await wait(1100);
    showView("pulse");
    await wait(500);
    await startMeasurement();
    await wait(MEASURE_MS + 1600);
    $("#btn-save-pulse").click();
    await wait(1200);
    showView("log");
    await wait(800);
    $("#sys-input").value = 128;
    $("#dia-input").value = 82;
    $("#pulse-input").value = 76;
    $("#note-input").value = "After coffee";
    syncMonitor();
    await wait(900);
    $("#cuff-form").requestSubmit();
    await wait(1200);
    showView("charts");
    await wait(2000);
    showView("history");
    await wait(1600);
    showView("settings");
    await wait(1400);
    showView("home");
    await wait(1000);
  }

  function wire() {
    const accept = $("#accept-disclaimer");
    const enter = $("#btn-enter");
    accept.addEventListener("change", () => (enter.disabled = !accept.checked));
    enter.addEventListener("click", () => {
      state.accepted = true;
      DB.save(state);
      bootApp();
    });

    $$("[data-go]").forEach((btn) => btn.addEventListener("click", () => showView(btn.dataset.go)));
    $$("[data-back]").forEach((btn) => btn.addEventListener("click", goBack));
    $("#btn-settings").addEventListener("click", () => showView("settings"));

    $$(".step").forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.field;
        const input = $(`#${field}-input`);
        input.value = BP.clamp(Number(input.value) + Number(btn.dataset.delta), Number(input.min), Number(input.max));
        syncMonitor();
      });
    });
    ["sys-input", "dia-input", "pulse-input"].forEach((id) =>
      $(`#${id}`).addEventListener("input", syncMonitor)
    );

    $("#cuff-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const sys = Number($("#sys-input").value);
      const dia = Number($("#dia-input").value);
      const pulse = Number($("#pulse-input").value);
      const note = $("#note-input").value.trim();
      saveReading({
        id: BP.uid(),
        at: Date.now(),
        type: "bloodPressure",
        heartRate: Number.isFinite(pulse) ? pulse : null,
        hrvMs: null,
        systolic: sys,
        diastolic: dia,
        stress: null,
        note,
        source: { hr: Number.isFinite(pulse) ? "cuff" : null, bp: "cuff" },
      });
      $("#note-input").value = "";
    });

    $("#btn-start-pulse").addEventListener("click", () => startMeasurement());
    $("#btn-stop-pulse").addEventListener("click", () => stopMeasurement(false));
    $("#btn-save-pulse").addEventListener("click", () => {
      if (!pendingPulse) return;
      saveReading({
        id: BP.uid(),
        at: Date.now(),
        type: "heartRate",
        heartRate: pendingPulse.bpm,
        hrvMs: pendingPulse.hrvMs,
        systolic: null,
        diastolic: null,
        stress: pendingPulse.stress,
        note: "Camera PPG",
        source: { hr: "camera", bp: null },
      });
    });
    $("#btn-retry-pulse").addEventListener("click", () => {
      preparePulseView();
      startMeasurement();
    });

    const persistToggle = (id, key) => {
      $(id).addEventListener("change", (e) => {
        state.settings[key] = e.target.checked;
        DB.save(state);
        applySettings();
      });
    };
    persistToggle("#toggle-xl", "xl");
    persistToggle("#toggle-contrast", "contrast");
    persistToggle("#toggle-motion", "reduceMotion");
    persistToggle("#toggle-remind-am", "remindAm");
    persistToggle("#toggle-remind-pm", "remindPm");

    $("#btn-enable-notes").addEventListener("click", async () => {
      const perm = await Reminders.ensurePermission();
      toast(perm === "granted" ? "Notifications enabled" : "Notifications not available");
    });

    $("#btn-export-csv").addEventListener("click", () => {
      Export.downloadCsv(state.readings);
      toast("CSV downloaded");
    });
    $("#btn-export-pdf").addEventListener("click", () => {
      Export.printReport(state.readings, Analytics.summarize(state.readings));
    });
    $("#btn-export-menu").addEventListener("click", () => showView("settings"));

    $("#btn-clear").addEventListener("click", () => {
      if (confirm("Clear all readings on this device?")) {
        DB.clear(state);
        renderDash();
        renderHistory();
        toast("Readings cleared");
      }
    });
    $("#btn-crisis-ok").addEventListener("click", () => $("#crisis-dialog").close());

    if ("serviceWorker" in navigator && !DEMO) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }

    Reminders.startWatcher(() => state.settings);
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

  applySettings();
  wire();
  if (state.accepted || DEMO) {
    if (DEMO) {
      state.accepted = true;
      DB.save(state);
    }
    bootApp();
  }
})();
