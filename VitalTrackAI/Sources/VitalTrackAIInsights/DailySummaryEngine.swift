import Foundation
import VitalTrackCore

public struct DailySummaryEngine: DailySummaryComputing {
    private let safety = InsightSafetyFilter()
    private let calendar = Calendar.current

    public init() {}

    public func dailySummary(from context: CompanionContext, score: DailyHealthScore) async -> DailySummary {
        let recoveryLabel = score.recovery.value.map { $0 >= 70 ? "Good" : ($0 >= 50 ? "Fair" : "Needs rest") } ?? "Incomplete"
        let stressLabel = score.stress.label
        let hrLabel: String
        if let latest = context.heartRate.first {
            hrLabel = String(format: "Stable around %.0f BPM", latest.bpm)
        } else {
            hrLabel = "No pulse check yet"
        }
        let hydrationLabel = score.hydrationProgress >= 0.75 ? "On track" : "Needs improvement"

        var actions: [String] = []
        if score.hydrationProgress < 0.75 { actions.append("Drink a glass of water") }
        if score.stress.level >= 2 { actions.append("Take a short quiet walk") }
        if let sleep = context.checkIns.first(where: { calendar.isDateInToday($0.date) })?.sleepHours, sleep < 7 {
            actions.append("Aim for an earlier bedtime")
        }
        if context.heartRate.first(where: { calendar.isDateInToday($0.recordedAt) }) == nil {
            actions.append("Repeat a pulse check tomorrow at the same time")
        }
        if actions.isEmpty {
            actions = ["Keep today’s routines", "Log how you feel this evening"]
        }

        let narrative = safety.sanitizeText(
            "Today’s health summary: Recovery \(recoveryLabel), stress \(stressLabel), heart rate \(hrLabel.lowercased()), hydration \(hydrationLabel.lowercased()). Suggested next steps: \(actions.joined(separator: "; ")). Why: these cues come from your recent pulse logs and check-ins — not a diagnosis."
        )

        return DailySummary(
            recoveryLabel: recoveryLabel,
            stressLabel: stressLabel,
            heartRateLabel: hrLabel,
            hydrationLabel: hydrationLabel,
            suggestedActions: actions,
            narrative: narrative
        )
    }

    public func weeklyReport(from context: CompanionContext, score: DailyHealthScore) async -> WeeklyReport {
        let weekStart = calendar.date(byAdding: .day, value: -6, to: calendar.startOfDay(for: Date())) ?? Date()
        let weekHR = context.heartRate.filter { $0.recordedAt >= weekStart }
        let weekBP = context.bloodPressure.filter { $0.recordedAt >= weekStart }
        let avgHR = weekHR.isEmpty ? nil : weekHR.map(\.bpm).reduce(0, +) / Double(weekHR.count)
        let avgSys = weekBP.isEmpty ? nil : Double(weekBP.map(\.systolic).reduce(0, +)) / Double(weekBP.count)
        let avgDia = weekBP.isEmpty ? nil : Double(weekBP.map(\.diastolic).reduce(0, +)) / Double(weekBP.count)

        var wins: [String] = []
        var improve: [String] = []
        if score.consistencyScore >= 60 { wins.append("Solid measurement consistency this week") }
        else { improve.append("Aim for a quick log on more days this week") }
        if score.hydrationProgress >= 0.5 { wins.append("Hydration check-ins started") }
        else { improve.append("Track water glasses to improve coaching context") }
        if let avgHR, avgHR < 80 { wins.append("Average pulse stayed in a calm personal range") }
        if weekBP.isEmpty { improve.append("Add cuff BP readings from your FDA-cleared monitor") }

        let encouragement = "Progress is built one honest log at a time. Small routines beat perfect weeks."
        let narrative = safety.sanitizeText(
            String(
                format: "Weekly report: %d measurements. Average heart rate %@. Consistency %d%%. Recovery trend: %@. Stress trend: %@. Lifestyle wins: %@. Areas to improve: %@. %@",
                weekHR.count + weekBP.count,
                avgHR.map { String(format: "%.0f BPM" , $0) } ?? "n/a",
                score.consistencyScore,
                score.recovery.value.map { "\($0)/100" } ?? "incomplete",
                score.stress.label,
                wins.isEmpty ? "keep going" : wins.joined(separator: "; "),
                improve.isEmpty ? "maintain your rhythm" : improve.joined(separator: "; "),
                encouragement
            )
        )

        return WeeklyReport(
            weekStart: weekStart,
            averageHeartRate: avgHR,
            averageSystolic: avgSys,
            averageDiastolic: avgDia,
            measurementCount: weekHR.count + weekBP.count,
            consistencyScore: score.consistencyScore,
            recoveryTrend: score.recovery.explanation,
            stressTrend: score.stress.explanation,
            lifestyleWins: wins,
            areasToImprove: improve,
            encouragement: encouragement,
            narrative: narrative
        )
    }
}
