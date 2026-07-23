(function (global) {
  function classify(sys, dia) {
    const s = Number(sys);
    const d = Number(dia);
    if (![s, d].every(Number.isFinite)) return { key: "unknown", label: "Unknown", level: 0 };
    if (s >= 180 || d >= 120) return { key: "crisis", label: "Hypertensive crisis range", level: 4 };
    if (s >= 140 || d >= 90) return { key: "high", label: "High (Stage 2 range)", level: 3 };
    if (s >= 130 || d >= 80) return { key: "high", label: "High (Stage 1 range)", level: 2 };
    if (s >= 120 && d < 80) return { key: "elevated", label: "Elevated", level: 1 };
    return { key: "normal", label: "Normal", level: 0 };
  }

  function stressFromHrHrv(hr, hrvMs) {
    if (!Number.isFinite(hr)) return "—";
    if (hr >= 100 || (Number.isFinite(hrvMs) && hrvMs < 20)) return "High";
    if (hr >= 85 || (Number.isFinite(hrvMs) && hrvMs < 35)) return "Moderate";
    return "Low";
  }

  function formatWhen(ts) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      }).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString();
    }
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function uid() {
    return crypto.randomUUID?.() || ("id-" + Date.now() + "-" + Math.random().toString(16).slice(2));
  }

  global.BP = { classify, stressFromHrHrv, formatWhen, clamp, uid };
})(window);
