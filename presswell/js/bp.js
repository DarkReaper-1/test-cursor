/* AHA adult BP categories + helpers */
(function (global) {
  function classify(sys, dia) {
    const s = Number(sys);
    const d = Number(dia);
    if (![s, d].every(Number.isFinite)) {
      return { key: "unknown", label: "Unknown", level: 0 };
    }
    if (s >= 180 || d >= 120) {
      return { key: "crisis", label: "Hypertensive crisis range", level: 4 };
    }
    if (s >= 140 || d >= 90) {
      return { key: "high", label: "High (Stage 2 range)", level: 3 };
    }
    if (s >= 130 || d >= 80) {
      return { key: "high", label: "High (Stage 1 range)", level: 2 };
    }
    if (s >= 120 && d < 80) {
      return { key: "elevated", label: "Elevated", level: 1 };
    }
    return { key: "normal", label: "Normal", level: 0 };
  }

  function formatWhen(ts) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString();
    }
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  global.BP = { classify, formatWhen, clamp };
})(window);
