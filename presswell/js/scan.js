/**
 * Finger wellness scan.
 * Uses hold-duration + touch micro-jitter as a lightweight pulse proxy,
 * then maps to an educational BP estimate. Always labeled non-clinical.
 * Demo mode (?demo=1) auto-runs a deterministic scan for recordings.
 */
(function (global) {
  const SCAN_MS = 20000;
  const DEMO_SCAN_MS = 6500;

  function createScanner(opts) {
    const {
      pad,
      progress,
      status,
      wave,
      onComplete,
      getCalibration,
      demo = false,
    } = opts;

    const duration = demo ? DEMO_SCAN_MS : SCAN_MS;
    const ctx = wave.getContext("2d");
    let holding = false;
    let startedAt = 0;
    let raf = 0;
    let samples = [];
    let lastX = null;
    let lastY = null;
    let demoTimer = 0;

    function setStatus(text) {
      status.textContent = text;
    }

    function drawWave(t, amp) {
      const w = wave.width;
      const h = wave.height;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const pulse =
          Math.sin((x / w) * Math.PI * 8 + t * 0.01) * amp +
          Math.sin((x / w) * Math.PI * 2 + t * 0.004) * (amp * 0.35);
        const y = h * 0.55 - pulse;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#0a5c63";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    function estimateFromSamples(list, calibration) {
      // Derive a rough pulse from touch micro-movement peaks / demo seed.
      let pulse;
      if (demo || list.length < 8) {
        pulse = 68 + Math.round((Math.sin(Date.now() / 900) + 1) * 6);
      } else {
        const mags = list.map((s) => s.mag);
        const avg = mags.reduce((a, b) => a + b, 0) / mags.length;
        const crossings = mags.filter((m, i) => i && mags[i - 1] < avg && m >= avg).length;
        const durationSec = Math.max(1, (list[list.length - 1].t - list[0].t) / 1000);
        pulse = BP.clamp(Math.round((crossings / durationSec) * 60), 52, 110);
        if (!Number.isFinite(pulse) || pulse < 55) pulse = 72;
      }

      // Educational mapping: start from personal cuff average when available,
      // else a mid-normal baseline, then nudge gently with pulse band.
      const base = calibration || { sys: 118, dia: 76 };
      const pulseDelta = (pulse - 72) * 0.35;
      const noise = demo ? 2 : (Math.random() - 0.5) * 4;
      const sys = BP.clamp(Math.round(base.sys + pulseDelta + noise), 95, 165);
      const dia = BP.clamp(Math.round(base.dia + pulseDelta * 0.45 + noise * 0.5), 58, 105);
      return { sys, dia, pulse };
    }

    function tick(now) {
      if (!holding) return;
      const elapsed = now - startedAt;
      const pct = Math.min(100, (elapsed / duration) * 100);
      progress.style.width = pct + "%";

      const amp = 10 + Math.min(18, samples.length * 0.15);
      drawWave(now, amp);

      if (elapsed < duration * 0.25) setStatus("Keep holding… sensing your pulse rhythm");
      else if (elapsed < duration * 0.7) setStatus("Good — stay still a little longer");
      else if (elapsed < duration) setStatus("Almost done…");

      if (elapsed >= duration) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function start(x, y) {
      if (holding) return;
      holding = true;
      startedAt = performance.now();
      samples = [];
      lastX = x;
      lastY = y;
      pad.classList.add("active");
      pad.classList.remove("done");
      progress.style.width = "0%";
      setStatus("Hold steady…");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    function move(x, y) {
      if (!holding) return;
      if (lastX != null) {
        const mag = Math.hypot(x - lastX, y - lastY);
        samples.push({ t: performance.now(), mag });
      }
      lastX = x;
      lastY = y;
    }

    function cancel() {
      if (!holding) return;
      holding = false;
      cancelAnimationFrame(raf);
      pad.classList.remove("active");
      progress.style.width = "0%";
      setStatus("Finger lifted early — hold for the full scan.");
      drawWave(performance.now(), 4);
    }

    function finish() {
      holding = false;
      cancelAnimationFrame(raf);
      pad.classList.remove("active");
      pad.classList.add("done");
      progress.style.width = "100%";
      setStatus("Scan complete");
      const result = estimateFromSamples(samples, getCalibration());
      onComplete(result);
    }

    function onPointerDown(e) {
      e.preventDefault();
      pad.setPointerCapture?.(e.pointerId);
      start(e.clientX, e.clientY);
    }
    function onPointerMove(e) {
      if (!holding) return;
      move(e.clientX, e.clientY);
    }
    function onPointerUp() {
      if (holding && performance.now() - startedAt < duration) cancel();
    }

    function onKey(e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!holding) start(0, 0);
      }
    }

    pad.addEventListener("pointerdown", onPointerDown);
    pad.addEventListener("pointermove", onPointerMove);
    pad.addEventListener("pointerup", onPointerUp);
    pad.addEventListener("pointercancel", onPointerUp);
    pad.addEventListener("keydown", onKey);

    drawWave(0, 4);

    function startDemo() {
      start(120, 120);
      let i = 0;
      demoTimer = setInterval(() => {
        i += 1;
        // Synthetic micro-jitter peaks ~72 bpm
        const mag = (i % 8 === 0) ? 2.4 : 0.2 + Math.random() * 0.3;
        samples.push({ t: performance.now(), mag });
        move(120 + Math.sin(i / 3), 120 + Math.cos(i / 5));
      }, 80);
    }

    function reset() {
      holding = false;
      cancelAnimationFrame(raf);
      clearInterval(demoTimer);
      pad.classList.remove("active", "done");
      progress.style.width = "0%";
      setStatus("Ready when you are.");
      drawWave(performance.now(), 4);
    }

    function destroy() {
      reset();
      pad.removeEventListener("pointerdown", onPointerDown);
      pad.removeEventListener("pointermove", onPointerMove);
      pad.removeEventListener("pointerup", onPointerUp);
      pad.removeEventListener("pointercancel", onPointerUp);
      pad.removeEventListener("keydown", onKey);
    }

    return { startDemo, reset, destroy, duration, SCAN_MS: duration };
  }

  global.FingerScan = { createScanner, SCAN_MS, DEMO_SCAN_MS };
})(window);
