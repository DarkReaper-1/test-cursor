(function (global) {
  const KEY = "presswell.db.v2";

  const defaults = {
    accepted: false,
    settings: {
      xl: false,
      contrast: false,
      reduceMotion: false,
      remindAm: false,
      remindPm: false,
    },
    readings: [],
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        // migrate v1 if present
        const legacy = localStorage.getItem("presswell.v1");
        if (legacy) {
          const old = JSON.parse(legacy);
          const migrated = {
            ...defaults,
            accepted: !!old.accepted,
            settings: { ...defaults.settings, ...(old.settings || {}) },
            readings: (old.readings || []).map(migrateReading),
          };
          save(migrated);
          return migrated;
        }
        return structuredClone(defaults);
      }
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        readings: Array.isArray(parsed.readings) ? parsed.readings : [],
      };
    } catch {
      return structuredClone(defaults);
    }
  }

  function migrateReading(r) {
    return {
      id: r.id || BP.uid(),
      at: r.at || Date.now(),
      type: r.source === "finger" ? "heartRate" : r.sys ? "bloodPressure" : "heartRate",
      heartRate: r.pulse ?? r.heartRate ?? null,
      hrvMs: r.hrvMs ?? null,
      systolic: r.sys ?? r.systolic ?? null,
      diastolic: r.dia ?? r.diastolic ?? null,
      stress: r.stress || null,
      note: r.note || "",
      source: {
        hr: r.source === "finger" ? "camera" : r.pulse ? "cuff" : null,
        bp: r.sys ? "cuff" : null,
      },
    };
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function add(state, reading) {
    state.readings.unshift(reading);
    if (state.readings.length > 500) state.readings.length = 500;
    save(state);
    return reading;
  }

  function clear(state) {
    state.readings = [];
    save(state);
  }

  global.DB = { load, save, add, clear, defaults };
})(window);
