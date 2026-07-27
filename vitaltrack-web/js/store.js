/**
 * Everything is stored in the browser's own localStorage — there is no
 * server, no account, and nothing here is ever sent anywhere. Clearing
 * your browser data or using a different browser/device starts fresh.
 */
const Store = (() => {
  const KEY = 'vitaltrack_web_v1';
  const DISCLAIMER_KEY = 'vitaltrack_web_disclaimer_ack_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* fall through to fresh state */
    }
    return { heartRate: [], bloodPressure: [] };
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  let data = load();

  return {
    addHeartRate(reading) {
      data.heartRate.push({ id: crypto.randomUUID(), takenAt: Date.now(), ...reading });
      save(data);
    },
    addBloodPressure(reading) {
      data.bloodPressure.push({ id: crypto.randomUUID(), takenAt: Date.now(), ...reading });
      save(data);
    },
    deleteHeartRate(id) {
      data.heartRate = data.heartRate.filter((r) => r.id !== id);
      save(data);
    },
    deleteBloodPressure(id) {
      data.bloodPressure = data.bloodPressure.filter((r) => r.id !== id);
      save(data);
    },
    heartRate(sinceMs) {
      const rows = sinceMs ? data.heartRate.filter((r) => r.takenAt >= sinceMs) : data.heartRate;
      return [...rows].sort((a, b) => b.takenAt - a.takenAt);
    },
    bloodPressure(sinceMs) {
      const rows = sinceMs ? data.bloodPressure.filter((r) => r.takenAt >= sinceMs) : data.bloodPressure;
      return [...rows].sort((a, b) => b.takenAt - a.takenAt);
    },
    latestHeartRate() {
      return this.heartRate()[0] || null;
    },
    latestBloodPressure() {
      return this.bloodPressure()[0] || null;
    },
    clearAll() {
      data = { heartRate: [], bloodPressure: [] };
      save(data);
    },
    hasAcknowledgedDisclaimer() {
      return localStorage.getItem(DISCLAIMER_KEY) === '1';
    },
    setAcknowledgedDisclaimer() {
      localStorage.setItem(DISCLAIMER_KEY, '1');
    },
  };
})();

function bpReferenceRange(systolic, diastolic) {
  if (systolic >= 180 || diastolic >= 120) return 'Crisis range — seek medical care';
  if (systolic >= 140 || diastolic >= 90) return 'Stage 2 range';
  if (systolic >= 130 || diastolic >= 80) return 'Stage 1 range';
  if (systolic >= 120 && diastolic < 80) return 'Elevated range';
  return 'Normal range';
}
