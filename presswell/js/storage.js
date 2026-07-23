(function (global) {
  const KEY = "presswell.v1";

  const defaults = {
    accepted: false,
    settings: { xl: false, contrast: false, reduceMotion: false },
    readings: [],
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaults);
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

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function addReading(state, reading) {
    state.readings.unshift(reading);
    if (state.readings.length > 400) state.readings.length = 400;
    save(state);
    return state;
  }

  function clearReadings(state) {
    state.readings = [];
    save(state);
    return state;
  }

  function cuffAverage(state, limit = 5) {
    const cuff = state.readings.filter((r) => r.source === "cuff").slice(0, limit);
    if (!cuff.length) return null;
    const sys = cuff.reduce((a, r) => a + r.sys, 0) / cuff.length;
    const dia = cuff.reduce((a, r) => a + r.dia, 0) / cuff.length;
    return { sys, dia };
  }

  global.Store = { load, save, addReading, clearReadings, cuffAverage, defaults };
})(window);
