(function (global) {
  function avg(nums) {
    const a = nums.filter(Number.isFinite);
    if (!a.length) return null;
    return a.reduce((x, y) => x + y, 0) / a.length;
  }

  function summarize(readings) {
    const hr = readings.map((r) => r.heartRate).filter(Number.isFinite);
    const sys = readings.map((r) => r.systolic).filter(Number.isFinite);
    const dia = readings.map((r) => r.diastolic).filter(Number.isFinite);

    const weekAgo = Date.now() - 7 * 86400000;
    const monthAgo = Date.now() - 30 * 86400000;
    const week = readings.filter((r) => r.at >= weekAgo);
    const month = readings.filter((r) => r.at >= monthAgo);

    return {
      count: readings.length,
      avgHr: avg(hr),
      maxHr: hr.length ? Math.max(...hr) : null,
      minHr: hr.length ? Math.min(...hr) : null,
      avgSys: avg(sys),
      avgDia: avg(dia),
      maxSys: sys.length ? Math.max(...sys) : null,
      minSys: sys.length ? Math.min(...sys) : null,
      weekAvgSys: avg(week.map((r) => r.systolic)),
      weekAvgHr: avg(week.map((r) => r.heartRate)),
      monthAvgSys: avg(month.map((r) => r.systolic)),
      monthAvgHr: avg(month.map((r) => r.heartRate)),
      weekCount: week.length,
      monthCount: month.length,
    };
  }

  /** Lifestyle pattern notes — not medical diagnoses */
  function insights(readings) {
    if (!readings.length) {
      return "Log a few camera and cuff readings to unlock gentle wellness pattern notes.";
    }
    const s = summarize(readings);
    const notes = [];

    if (s.avgHr != null) {
      if (s.avgHr >= 90) notes.push("Your recent average pulse runs a bit high — calm breathing and rest before measuring can help.");
      else if (s.avgHr <= 60) notes.push("Your recent average pulse is on the lower side — common for fit or resting adults.");
      else notes.push("Your recent average pulse sits in a typical resting band.");
    }

    if (s.weekAvgSys != null && s.monthAvgSys != null) {
      const delta = s.weekAvgSys - s.monthAvgSys;
      if (delta >= 6) notes.push("This week’s cuff average looks higher than your month average — worth watching with your clinician.");
      else if (delta <= -6) notes.push("This week’s cuff average looks lower than your month average — a positive trend if confirmed by your cuff.");
    }

    const morning = readings.filter((r) => new Date(r.at).getHours() < 12 && r.systolic != null);
    const evening = readings.filter((r) => new Date(r.at).getHours() >= 18 && r.systolic != null);
    if (morning.length >= 2 && evening.length >= 2) {
      const m = avg(morning.map((r) => r.systolic));
      const e = avg(evening.map((r) => r.systolic));
      if (m - e >= 8) notes.push("Morning cuff readings tend to run higher than evening ones in your log.");
    }

    const stressHigh = readings.filter((r) => r.stress === "High").length;
    if (stressHigh >= 2) notes.push("A few camera sessions flagged a higher stress cue — lifestyle context only, not a diagnosis.");

    return notes.slice(0, 3).join(" ") || "Keep logging consistently to reveal clearer trends.";
  }

  global.Analytics = { summarize, insights };
})(window);
