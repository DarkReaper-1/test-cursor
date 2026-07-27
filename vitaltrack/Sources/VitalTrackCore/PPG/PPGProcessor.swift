import Foundation

public enum SignalQuality: String, Sendable, Equatable {
    case none, poor, fair, good
}

public struct PPGReading: Sendable {
    public let bpm: Int?
    public let hrvRMSSDMs: Double?
    public let quality: SignalQuality
    public let waveform: [Double]
    public let elapsed: TimeInterval
}

/// Turns a stream of raw camera-brightness samples into a heart rate and a
/// rough HRV estimate.
///
/// Pipeline: raw luminance -> DC removal (subtract a slow moving average,
/// a simple high-pass) -> light smoothing (simple low-pass) -> adaptive
/// peak detection with a physiological refractory period -> BPM from the
/// mean of recent RR intervals -> RMSSD from successive RR differences.
///
/// This mirrors the PulseCheck (Flutter) implementation line-for-line in
/// spirit, so the filter cutoff-frequency reasoning documented there
/// applies unchanged: the slow average's ~0.15 Hz cutoff removes baseline
/// drift while passing the ~0.7–3.3 Hz pulse band untouched.
public final class PPGProcessor {
    private let sampleWindowMs: Double
    private let minBpm: Int
    private let maxBpm: Int

    private var rawTimestamps: [Double] = []
    private var rawLuminances: [Double] = []
    private var filtered: [Double] = []
    private var beatTimestamps: [Double] = []

    private var slowAverage: Double?
    private var fastAverage: Double?
    private var lastValue: Double = 0
    private var lastSlope: Double = 0
    private var lastPeakMs: Double?
    private var startedAtMs: Double?

    public init(sampleWindowMs: Double = 12_000, minBpm: Int = 40, maxBpm: Int = 200) {
        self.sampleWindowMs = sampleWindowMs
        self.minBpm = minBpm
        self.maxBpm = maxBpm
    }

    private var refractoryMs: Double { 60_000.0 / Double(maxBpm) }

    public func reset() {
        rawTimestamps.removeAll()
        rawLuminances.removeAll()
        filtered.removeAll()
        beatTimestamps.removeAll()
        slowAverage = nil
        fastAverage = nil
        lastPeakMs = nil
        startedAtMs = nil
    }

    @discardableResult
    public func addSample(timestampMs: Double, luminance: Double) -> PPGReading {
        if startedAtMs == nil { startedAtMs = timestampMs }
        rawTimestamps.append(timestampMs)
        rawLuminances.append(luminance)
        if rawLuminances.count > 300 { rawLuminances.removeFirst(rawLuminances.count - 300) }

        let slowAlpha = 0.03
        slowAverage = slowAverage.map { $0 + slowAlpha * (luminance - $0) } ?? luminance
        let highPassed = luminance - slowAverage!

        let fastAlpha = 0.35
        fastAverage = fastAverage.map { $0 + fastAlpha * (highPassed - $0) } ?? highPassed
        let filteredValue = fastAverage!
        filtered.append(filteredValue)

        detectPeak(timestampMs: timestampMs, value: filteredValue)
        trimToWindow(nowMs: timestampMs)

        return buildReading(nowMs: timestampMs)
    }

    private func detectPeak(timestampMs: Double, value: Double) {
        let slope = value - lastValue

        if lastSlope > 0 && slope <= 0 {
            let farEnough = lastPeakMs.map { (timestampMs - $0) >= refractoryMs } ?? true
            let aboveNoiseFloor = value > adaptiveThreshold()
            if farEnough && aboveNoiseFloor {
                beatTimestamps.append(timestampMs)
                lastPeakMs = timestampMs
            }
        }

        lastValue = value
        lastSlope = slope
    }

    private func adaptiveThreshold() -> Double {
        guard filtered.count >= 10 else { return .infinity }
        let recent = filtered.suffix(90)
        let maxVal = recent.max() ?? 0
        let minVal = recent.min() ?? 0
        return minVal + (maxVal - minVal) * 0.35
    }

    private func trimToWindow(nowMs: Double) {
        let cutoff = nowMs - sampleWindowMs
        while let first = rawTimestamps.first, first < cutoff { rawTimestamps.removeFirst() }
        if filtered.count > 300 { filtered.removeFirst(filtered.count - 300) }
        while let first = beatTimestamps.first, first < cutoff { beatTimestamps.removeFirst() }
    }

    private func rrIntervalsMs() -> [Double] {
        guard beatTimestamps.count >= 2 else { return [] }
        return zip(beatTimestamps.dropFirst(), beatTimestamps).map { $0 - $1 }
    }

    private func rmssd(_ rr: [Double]) -> Double {
        guard rr.count >= 2 else { return 0 }
        var sumSq = 0.0
        for i in 1..<rr.count {
            let diff = rr[i] - rr[i - 1]
            sumSq += diff * diff
        }
        return (sumSq / Double(rr.count - 1)).squareRoot()
    }

    /// How much to trust the current reading, based on beat-to-beat
    /// consistency (real pulses are fairly regular; motion artifacts and
    /// finger slips are not) and how many beats have actually been seen.
    private func estimateQuality(_ rrIntervals: [Double]) -> SignalQuality {
        guard rawTimestamps.count >= 60 else { return .none }
        guard rrIntervals.count >= 3 else { return .poor }

        let mean = rrIntervals.reduce(0, +) / Double(rrIntervals.count)
        guard mean > 0 else { return .poor }

        let variance = rrIntervals.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Double(rrIntervals.count)
        let coefficientOfVariation = variance.squareRoot() / mean

        if rrIntervals.count >= 6 && coefficientOfVariation < 0.12 { return .good }
        if rrIntervals.count >= 4 && coefficientOfVariation < 0.25 { return .fair }
        return .poor
    }

    private func buildReading(nowMs: Double) -> PPGReading {
        let elapsed = startedAtMs.map { (nowMs - $0) / 1000.0 } ?? 0
        let rrIntervals = rrIntervalsMs()
        let quality = estimateQuality(rrIntervals)

        var bpm: Int?
        if rrIntervals.count >= 4, quality != .none {
            let meanRr = rrIntervals.reduce(0, +) / Double(rrIntervals.count)
            let candidate = Int((60_000 / meanRr).rounded())
            if candidate >= minBpm && candidate <= maxBpm { bpm = candidate }
        }

        var hrv: Double?
        if rrIntervals.count >= 5, quality == .good {
            hrv = rmssd(rrIntervals)
        }

        return PPGReading(bpm: bpm, hrvRMSSDMs: hrv, quality: quality, waveform: filtered, elapsed: elapsed)
    }

    /// Whether the raw brightness looks like a finger is actually covering
    /// the lens + flash — used to prompt the user immediately instead of
    /// letting them wait a long time for a reading that will never arrive.
    public var looksLikeFingerPresent: Bool {
        guard !rawLuminances.isEmpty else { return false }
        let recent = rawLuminances.suffix(15)
        let avg = recent.reduce(0, +) / Double(recent.count)
        return avg > 40 && avg < 250
    }
}
