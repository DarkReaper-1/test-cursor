/**
 * Signal Processing Engine — PPG → BPM
 * Raw red intensity → smooth → peak detect → beat intervals → heart rate (+ simple HRV)
 */
(function (global) {
  function createPulseEngine({ demo = false } = {}) {
    const samples = []; // { t, v }
    const MAX = 600;
    let lastPeaks = [];

    function push(value, t = performance.now()) {
      samples.push({ t, v: value });
      if (samples.length > MAX) samples.splice(0, samples.length - MAX);
    }

    function movingAverage(arr, window) {
      const out = new Array(arr.length);
      let sum = 0;
      for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
        if (i >= window) sum -= arr[i - window];
        const n = Math.min(i + 1, window);
        out[i] = sum / n;
      }
      return out;
    }

    function analyze() {
      if (samples.length < 30) {
        return { bpm: null, hrvMs: null, confidence: 0, waveform: samples.map((s) => s.v) };
      }

      const values = samples.map((s) => s.v);
      const times = samples.map((s) => s.t);

      // Remove slow drift (high-pass via subtract long MA) then smooth
      const slow = movingAverage(values, 24);
      const detrended = values.map((v, i) => v - slow[i]);
      const smooth = movingAverage(detrended, 5);

      // Peak detection on inverted or upright signal — pick orientation with more energy
      const mean = smooth.reduce((a, b) => a + b, 0) / smooth.length;
      const centered = smooth.map((v) => v - mean);
      let signal = centered;
      // Prefer the orientation where positive peaks dominate pulse shape
      const posEnergy = centered.filter((v) => v > 0).reduce((a, b) => a + b * b, 0);
      const negEnergy = centered.filter((v) => v < 0).reduce((a, b) => a + b * b, 0);
      if (negEnergy > posEnergy) signal = centered.map((v) => -v);

      const abs = signal.map(Math.abs);
      const noiseFloor = abs.slice().sort((a, b) => a - b)[Math.floor(abs.length * 0.6)] || 0.5;
      const thresh = Math.max(noiseFloor * 1.4, 0.15);

      const peaks = [];
      const minGapMs = 320; // ~187 bpm max
      for (let i = 2; i < signal.length - 2; i++) {
        if (
          signal[i] > thresh &&
          signal[i] >= signal[i - 1] &&
          signal[i] >= signal[i + 1] &&
          signal[i] >= signal[i - 2] &&
          signal[i] >= signal[i + 2]
        ) {
          const t = times[i];
          if (!peaks.length || t - peaks[peaks.length - 1] >= minGapMs) peaks.push(t);
        }
      }
      lastPeaks = peaks;

      if (peaks.length < 3) {
        return { bpm: null, hrvMs: null, confidence: 0.2, waveform: signal, peaks };
      }

      const intervals = [];
      for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i - 1]);

      // Use recent intervals
      const recent = intervals.slice(-8);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      let bpm = Math.round(60000 / avg);
      bpm = BP.clamp(bpm, 40, 180);

      // RMSSD-like HRV on RR intervals (ms)
      let hrvMs = null;
      if (recent.length >= 3) {
        let acc = 0;
        for (let i = 1; i < recent.length; i++) {
          const d = recent[i] - recent[i - 1];
          acc += d * d;
        }
        hrvMs = Math.round(Math.sqrt(acc / (recent.length - 1)));
      }

      const confidence = Math.min(1, peaks.length / 10);
      return { bpm, hrvMs, confidence, waveform: signal, peaks, intervals: recent };
    }

    function reset() {
      samples.length = 0;
      lastPeaks = [];
    }

    /** Demo / fake device: synthetic PPG around ~72 bpm */
    function pushSynthetic(t = performance.now(), bpm = 72) {
      const hz = bpm / 60;
      const phase = (t / 1000) * hz * Math.PI * 2;
      // Pulse-like wave + noise
      const v =
        Math.sin(phase) * 0.7 +
        Math.sin(phase * 2) * 0.18 +
        (Math.random() - 0.5) * 0.05;
      push(v, t);
    }

    return { push, analyze, reset, pushSynthetic, get peaks() { return lastPeaks; }, demo };
  }

  global.PulseEngine = { create: createPulseEngine };
})(window);
