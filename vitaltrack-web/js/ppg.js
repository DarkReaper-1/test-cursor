/**
 * Real-time PPG (photoplethysmography) signal processor.
 *
 * Same pipeline as the Flutter (PulseCheck) and Swift (VitalTrack) ports:
 * raw luminance -> DC removal (slow moving-average subtraction, a simple
 * high-pass) -> light smoothing (fast moving average, a low-pass) ->
 * adaptive peak detection with a physiological refractory period -> BPM
 * from mean RR interval -> HRV (RMSSD) from successive RR differences.
 *
 * This is real signal processing over real camera brightness samples —
 * nothing here is simulated.
 */
class PPGProcessor {
  constructor({ sampleWindowMs = 12000, minBpm = 40, maxBpm = 200 } = {}) {
    this.sampleWindowMs = sampleWindowMs;
    this.minBpm = minBpm;
    this.maxBpm = maxBpm;
    this.reset();
  }

  reset() {
    this.rawTimestamps = [];
    this.rawLuminances = [];
    this.filtered = [];
    this.beatTimestamps = [];
    this.slowAvg = null;
    this.fastAvg = null;
    this.lastValue = 0;
    this.lastSlope = 0;
    this.lastPeakMs = null;
    this.startedAtMs = null;
  }

  get refractoryMs() {
    return 60000 / this.maxBpm;
  }

  addSample(timestampMs, luminance) {
    if (this.startedAtMs === null) this.startedAtMs = timestampMs;
    this.rawTimestamps.push(timestampMs);
    this.rawLuminances.push(luminance);
    if (this.rawLuminances.length > 300) this.rawLuminances.shift();

    const slowAlpha = 0.03;
    this.slowAvg = this.slowAvg === null ? luminance : this.slowAvg + slowAlpha * (luminance - this.slowAvg);
    const highPassed = luminance - this.slowAvg;

    const fastAlpha = 0.35;
    this.fastAvg = this.fastAvg === null ? highPassed : this.fastAvg + fastAlpha * (highPassed - this.fastAvg);
    const filteredValue = this.fastAvg;
    this.filtered.push(filteredValue);

    this._detectPeak(timestampMs, filteredValue);
    this._trimToWindow(timestampMs);

    return this._buildReading(timestampMs);
  }

  _detectPeak(timestampMs, value) {
    const slope = value - this.lastValue;
    if (this.lastSlope > 0 && slope <= 0) {
      const farEnough = this.lastPeakMs === null || (timestampMs - this.lastPeakMs) >= this.refractoryMs;
      const aboveNoiseFloor = value > this._adaptiveThreshold();
      if (farEnough && aboveNoiseFloor) {
        this.beatTimestamps.push(timestampMs);
        this.lastPeakMs = timestampMs;
      }
    }
    this.lastValue = value;
    this.lastSlope = slope;
  }

  _adaptiveThreshold() {
    if (this.filtered.length < 10) return Infinity;
    const recent = this.filtered.slice(-90);
    const maxVal = Math.max(...recent);
    const minVal = Math.min(...recent);
    return minVal + (maxVal - minVal) * 0.35;
  }

  _trimToWindow(nowMs) {
    const cutoff = nowMs - this.sampleWindowMs;
    while (this.rawTimestamps.length && this.rawTimestamps[0] < cutoff) this.rawTimestamps.shift();
    if (this.filtered.length > 300) this.filtered.splice(0, this.filtered.length - 300);
    while (this.beatTimestamps.length && this.beatTimestamps[0] < cutoff) this.beatTimestamps.shift();
  }

  _rrIntervals() {
    const rr = [];
    for (let i = 1; i < this.beatTimestamps.length; i++) {
      rr.push(this.beatTimestamps[i] - this.beatTimestamps[i - 1]);
    }
    return rr;
  }

  _rmssd(rr) {
    if (rr.length < 2) return 0;
    let sumSq = 0;
    for (let i = 1; i < rr.length; i++) {
      const diff = rr[i] - rr[i - 1];
      sumSq += diff * diff;
    }
    return Math.sqrt(sumSq / (rr.length - 1));
  }

  _estimateQuality(rr) {
    if (this.rawTimestamps.length < 60) return 'none';
    if (rr.length < 3) return 'poor';
    const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
    if (mean <= 0) return 'poor';
    const variance = rr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / rr.length;
    const cv = Math.sqrt(variance) / mean;
    if (rr.length >= 6 && cv < 0.12) return 'good';
    if (rr.length >= 4 && cv < 0.25) return 'fair';
    return 'poor';
  }

  _buildReading(nowMs) {
    const elapsed = this.startedAtMs === null ? 0 : (nowMs - this.startedAtMs) / 1000;
    const rr = this._rrIntervals();
    const quality = this._estimateQuality(rr);

    let bpm = null;
    if (rr.length >= 4 && quality !== 'none') {
      const meanRr = rr.reduce((a, b) => a + b, 0) / rr.length;
      const candidate = Math.round(60000 / meanRr);
      if (candidate >= this.minBpm && candidate <= this.maxBpm) bpm = candidate;
    }

    let hrv = null;
    if (rr.length >= 5 && quality === 'good') hrv = this._rmssd(rr);

    return { bpm, hrv, quality, waveform: this.filtered.slice(), elapsed };
  }

  /** Whether the raw brightness looks like a finger is actually covering the lens. */
  get looksLikeFingerPresent() {
    if (!this.rawLuminances.length) return false;
    const recent = this.rawLuminances.slice(-15);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return avg > 20 && avg < 250;
  }
}
