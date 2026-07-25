import Foundation
import VitalTrackCore

/// Offline heuristic insights. Informational only — never diagnoses.
public struct HeuristicInsightEngine: InsightEngine {
    private let safety = InsightSafetyFilter()
    private let calendar = Calendar.current

    public init() {}

    public func generateInsights(from context: InsightContext) async -> [Insight] {
        var raw: [Insight] = []
        if let resting = restingHRTrend(context.heartRate) { raw.append(resting) }
        if let evening = eveningBPPattern(context.bloodPressure) { raw.append(evening) }
        if let missed = missedLogging(context) { raw.append(missed) }
        if let hrv = hrvImprovement(context.hrv) { raw.append(hrv) }
        if raw.isEmpty {
            raw.append(
                Insight(
                    title: "Keep logging consistently",
                    body: "Add blood pressure from an FDA-cleared monitor and heart rate from PPG or Apple Health to unlock trend insights. Insights are informational only.",
                    severity: .info,
                    relatedMetric: nil
                )
            )
        }
        return safety.sanitize(all: raw)
    }

    private func restingHRTrend(_ samples: [HeartRateSample]) -> Insight? {
        let resting = samples.filter(\.isResting).sorted { $0.recordedAt < $1.recordedAt }
        guard resting.count >= 4 else { return nil }
        let mid = resting.count / 2
        let earlier = resting.prefix(mid)
        let later = resting.suffix(resting.count - mid)
        let earlierAvg = earlier.map(\.bpm).reduce(0, +) / Double(earlier.count)
        let laterAvg = later.map(\.bpm).reduce(0, +) / Double(later.count)
        let delta = laterAvg - earlierAvg
        if abs(delta) < 2 { return nil }
        let direction = delta < 0 ? "lower" : "higher"
        return Insight(
            title: "Resting heart rate trend",
            body: String(
                format: "Your recent resting heart rate averages look %.0f BPM %@ than your earlier logs. Camera/Watch PPG measures heart rate only — not blood pressure. Discuss meaningful changes with a clinician.",
                abs(delta),
                direction
            ),
            severity: .suggestion,
            relatedMetric: "heartRate"
        )
    }

    private func eveningBPPattern(_ readings: [BloodPressureReading]) -> Insight? {
        guard readings.count >= 5 else { return nil }
        let evening = readings.filter { calendar.component(.hour, from: $0.recordedAt) >= 17 }
        let daytime = readings.filter {
            let h = calendar.component(.hour, from: $0.recordedAt)
            return h >= 8 && h < 17
        }
        guard evening.count >= 2, daytime.count >= 2 else { return nil }
        let eveningSys = Double(evening.map(\.systolic).reduce(0, +)) / Double(evening.count)
        let daySys = Double(daytime.map(\.systolic).reduce(0, +)) / Double(daytime.count)
        guard eveningSys - daySys >= 5 else { return nil }
        return Insight(
            title: "Evening blood pressure pattern",
            body: String(
                format: "Evening readings in your log average about %.0f mmHg systolic higher than daytime entries. This is a logging pattern observation only — not a diagnosis. Continue using FDA-cleared external monitors for BP.",
                eveningSys - daySys
            ),
            severity: .attention,
            relatedMetric: "bloodPressure"
        )
    }

    private func missedLogging(_ context: InsightContext) -> Insight? {
        guard let last = context.lastLogDate else {
            return Insight(
                title: "No recent measurements",
                body: "You have not logged blood pressure or heart rate yet. Log BP from an FDA-cleared cuff (manual, Bluetooth, Health, or CSV). Use camera PPG for heart rate only.",
                severity: .suggestion,
                relatedMetric: "logging"
            )
        }
        let days = calendar.dateComponents([.day], from: last, to: Date()).day ?? 0
        guard days >= 3 else { return nil }
        return Insight(
            title: "Logging gap",
            body: "It has been \(days) days since your last measurement. Consistent logs help you and your clinician spot trends. Reminders can help — insights remain informational only.",
            severity: .suggestion,
            relatedMetric: "logging"
        )
    }

    private func hrvImprovement(_ samples: [HRVSample]) -> Insight? {
        let sorted = samples.sorted { $0.recordedAt < $1.recordedAt }
        guard sorted.count >= 4 else { return nil }
        let mid = sorted.count / 2
        let earlier = sorted.prefix(mid)
        let later = sorted.suffix(sorted.count - mid)
        let earlierAvg = earlier.map(\.sdnnMilliseconds).reduce(0, +) / Double(earlier.count)
        let laterAvg = later.map(\.sdnnMilliseconds).reduce(0, +) / Double(later.count)
        guard laterAvg - earlierAvg >= 5 else { return nil }
        return Insight(
            title: "HRV trend upward",
            body: String(
                format: "Recent HRV (SDNN) averages look about %.0f ms higher than earlier samples from Apple Health. HRV trends are contextual and informational — not a diagnosis.",
                laterAvg - earlierAvg
            ),
            severity: .info,
            relatedMetric: "hrv"
        )
    }
}
