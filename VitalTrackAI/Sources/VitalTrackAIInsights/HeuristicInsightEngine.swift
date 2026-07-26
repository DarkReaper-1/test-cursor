import Foundation
import VitalTrackCore

/// Offline heuristic insights. Informational only — never diagnoses.
public struct HeuristicInsightEngine: InsightEngine {
    private let safety = InsightSafetyFilter()
    private let calendar = Calendar.current

    public init() {}

    public func generateInsights(from context: InsightContext) async -> [Insight] {
        var raw: [Insight] = []
        if let improvement = bpImprovement(context.bloodPressure) { raw.append(improvement) }
        if let resting = restingHRTrend(context.heartRate) { raw.append(resting) }
        if let evening = eveningBPPattern(context.bloodPressure) { raw.append(evening) }
        if let sleep = sleepLinkedBP(context) { raw.append(sleep) }
        if let walk = walkingLinkedBP(context) { raw.append(walk) }
        if let sodium = sodiumLinkedBP(context) { raw.append(sodium) }
        if let med = medicationTimingPattern(context.bloodPressure) { raw.append(med) }
        if let refill = refillReminder(context.medications) { raw.append(refill) }
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

    private func bpImprovement(_ readings: [BloodPressureReading]) -> Insight? {
        guard readings.count >= 6 else { return nil }
        let sorted = readings.sorted { $0.recordedAt < $1.recordedAt }
        let recent = Array(sorted.suffix(7))
        let earlier = Array(sorted.dropLast(recent.count).suffix(7))
        guard earlier.count >= 3, recent.count >= 3 else { return nil }
        let earlierAvg = Double(earlier.map(\.systolic).reduce(0, +)) / Double(earlier.count)
        let recentAvg = Double(recent.map(\.systolic).reduce(0, +)) / Double(recent.count)
        let delta = earlierAvg - recentAvg
        guard delta >= 5 else { return nil }
        return Insight(
            title: "Encouraging blood pressure trend",
            body: String(
                format: "Great job — your recent average systolic looks about %.0f mmHg lower than earlier logs. Keep following your care plan, medication instructions, and healthy routines. This is a pattern from your data, not a diagnosis.",
                delta
            ),
            severity: .info,
            relatedMetric: "bloodPressure"
        )
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
        let evening = readings.filter { $0.timeBucket == .evening || calendar.component(.hour, from: $0.recordedAt) >= 17 }
        let daytime = readings.filter {
            $0.timeBucket == .morning || $0.timeBucket == .afternoon ||
            (calendar.component(.hour, from: $0.recordedAt) >= 8 && calendar.component(.hour, from: $0.recordedAt) < 17)
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

    private func sleepLinkedBP(_ context: InsightContext) -> Insight? {
        let pairs = pairedDayAverages(bp: context.bloodPressure, checkIns: context.checkIns) { checkIn in
            checkIn.sleepHours
        }
        guard pairs.count >= 4 else { return nil }
        let poor = pairs.filter { ($0.factor ?? 99) < 6 }
        let good = pairs.filter { ($0.factor ?? 0) >= 7 }
        guard poor.count >= 2, good.count >= 2 else { return nil }
        let poorAvg = poor.map(\.sys).reduce(0, +) / Double(poor.count)
        let goodAvg = good.map(\.sys).reduce(0, +) / Double(good.count)
        guard poorAvg - goodAvg >= 5 else { return nil }
        return Insight(
            title: "Sleep and blood pressure",
            body: String(
                format: "On days you logged under 6 hours of sleep, systolic readings averaged about %.0f mmHg higher than on better-sleep days. This is a pattern in your logs — not proof of cause. Informational only.",
                poorAvg - goodAvg
            ),
            severity: .suggestion,
            relatedMetric: "sleep"
        )
    }

    private func walkingLinkedBP(_ context: InsightContext) -> Insight? {
        let pairs = pairedDayAverages(bp: context.bloodPressure, checkIns: context.checkIns) { checkIn in
            checkIn.exerciseMinutes.map(Double.init)
        }
        guard pairs.count >= 4 else { return nil }
        let active = pairs.filter { ($0.factor ?? 0) >= 30 }
        let light = pairs.filter { ($0.factor ?? 0) < 15 }
        guard active.count >= 2, light.count >= 2 else { return nil }
        let activeAvg = active.map(\.sys).reduce(0, +) / Double(active.count)
        let lightAvg = light.map(\.sys).reduce(0, +) / Double(light.count)
        guard lightAvg - activeAvg >= 4 else { return nil }
        return Insight(
            title: "Movement and blood pressure",
            body: String(
                format: "On days you walked or exercised 30+ minutes, systolic averages looked about %.0f mmHg lower than lower-activity days in your log. Keep movement that feels safe for you. Not medical advice.",
                lightAvg - activeAvg
            ),
            severity: .info,
            relatedMetric: "exercise"
        )
    }

    private func sodiumLinkedBP(_ context: InsightContext) -> Insight? {
        let pairs = pairedDayAverages(bp: context.bloodPressure, checkIns: context.checkIns) { checkIn in
            checkIn.sodiumMg.map(Double.init)
        }
        guard pairs.count >= 4 else { return nil }
        let high = pairs.filter { ($0.factor ?? 0) >= 2300 }
        let lower = pairs.filter { let v = $0.factor ?? 0; return v > 0 && v < 1800 }
        guard high.count >= 2, lower.count >= 2 else { return nil }
        let highAvg = high.map(\.sys).reduce(0, +) / Double(high.count)
        let lowerAvg = lower.map(\.sys).reduce(0, +) / Double(lower.count)
        guard highAvg - lowerAvg >= 4 else { return nil }
        return Insight(
            title: "Sodium and evening readings",
            body: String(
                format: "Higher sodium days in your check-ins (about 2300+ mg) lined up with roughly %.0f mmHg higher systolic averages than lower-sodium days. Patterns vary by person. Discuss diet changes with your clinician.",
                highAvg - lowerAvg
            ),
            severity: .suggestion,
            relatedMetric: "sodium"
        )
    }

    private func medicationTimingPattern(_ readings: [BloodPressureReading]) -> Insight? {
        let before = readings.filter { $0.medicationTiming == .beforeMedication }
        let after = readings.filter { $0.medicationTiming == .afterMedication }
        guard before.count >= 2, after.count >= 2 else { return nil }
        let beforeAvg = Double(before.map(\.systolic).reduce(0, +)) / Double(before.count)
        let afterAvg = Double(after.map(\.systolic).reduce(0, +)) / Double(after.count)
        guard beforeAvg - afterAvg >= 5 else { return nil }
        return Insight(
            title: "Before vs after medication",
            body: String(
                format: "In your logs, readings marked after medication average about %.0f mmHg systolic lower than before-medication entries. Keep taking medication as prescribed. This is not proof of effect for every person — share with your clinician.",
                beforeAvg - afterAvg
            ),
            severity: .info,
            relatedMetric: "medication"
        )
    }

    private func refillReminder(_ medications: [Medication]) -> Insight? {
        guard let med = medications.first(where: \.needsRefillSoon) else { return nil }
        return Insight(
            title: "Medication refill coming up",
            body: "\(med.name) looks due for a refill soon. Contact your pharmacy or clinician before you run out. VitalTrack AI does not prescribe or change doses.",
            severity: .attention,
            relatedMetric: "medication"
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

    private struct DayPair {
        var factor: Double?
        var sys: Double
    }

    private func pairedDayAverages(
        bp: [BloodPressureReading],
        checkIns: [CheckIn],
        factor: (CheckIn) -> Double?
    ) -> [DayPair] {
        var result: [DayPair] = []
        for checkIn in checkIns {
            let dayBP = bp.filter { calendar.isDate($0.recordedAt, inSameDayAs: checkIn.date) }
            guard !dayBP.isEmpty else { continue }
            let sys = Double(dayBP.map(\.systolic).reduce(0, +)) / Double(dayBP.count)
            result.append(DayPair(factor: factor(checkIn), sys: sys))
        }
        return result
    }
}
