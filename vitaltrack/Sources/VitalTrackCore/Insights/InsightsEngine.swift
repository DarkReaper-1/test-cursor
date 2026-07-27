import Foundation

public enum InsightTone: Sendable, Equatable { case neutral, positive, caution }

public struct Insight: Identifiable, Sendable {
    public let id = UUID()
    public let text: String
    public let tone: InsightTone
}

/// Generates the "AI Assistant" tab's content.
///
/// Naming note: this is rule-based statistics over your own logged
/// readings — trend deltas, consistency checks, reference-range lookups —
/// computed entirely on-device. It is **not** a generative language model,
/// does not call any cloud AI service, and was not trained on user data.
/// "VitalTrack AI" is a product name; per the app's own "never mislead
/// users" rule, the in-app copy in `InsightsView` says "Smart Insights"
/// and explains exactly how the numbers were produced, rather than
/// implying a chat-style AI that it isn't. See docs/PRD.md for the
/// reasoning and what a real generative assistant would additionally
/// require (a privacy review, a cloud dependency, and cost controls) if
/// the product later wants one.
public struct InsightsEngine: Sendable {
    private let repository: HealthRepository

    public init(repository: HealthRepository) {
        self.repository = repository
    }

    public func buildInsights() async throws -> [Insight] {
        var insights: [Insight] = []

        if let insight = try await heartRateTrendInsight() { insights.append(insight) }
        if let insight = try await hrvInsight() { insights.append(insight) }
        if let insight = try await bloodPressureTrendInsight() { insights.append(insight) }
        if let insight = try await missedReadingInsight() { insights.append(insight) }
        if let insight = try await bloodPressureReferenceInsight() { insights.append(insight) }

        if insights.isEmpty {
            insights.append(Insight(text: "Log a few more readings to start seeing trends here.", tone: .neutral))
        }
        return insights
    }

    private func heartRateTrendInsight() async throws -> Insight? {
        let now = Date()
        let thisWeek = try await repository.heartRateReadings(since: now.addingTimeInterval(-7 * 86400))
        let last14 = try await repository.heartRateReadings(since: now.addingTimeInterval(-14 * 86400))
        let priorWeek = last14.filter { $0.takenAt < now.addingTimeInterval(-7 * 86400) }

        guard thisWeek.count >= 3, priorWeek.count >= 3 else { return nil }

        let thisAvg = average(thisWeek.map { Double($0.bpm) })
        let priorAvg = average(priorWeek.map { Double($0.bpm) })
        let delta = thisAvg - priorAvg

        if abs(delta) < 3 {
            return Insight(
                text: "Your resting heart rate has been steady, averaging \(Int(thisAvg.rounded())) bpm this week.",
                tone: .positive
            )
        }
        let direction = delta > 0 ? "up" : "down"
        return Insight(
            text: "Your average heart rate is \(direction) \(Int(abs(delta).rounded())) bpm this week "
                + "(\(Int(thisAvg.rounded())) vs \(Int(priorAvg.rounded())) bpm last week).",
            tone: abs(delta) > 8 ? .caution : .neutral
        )
    }

    private func hrvInsight() async throws -> Insight? {
        let recent = try await repository.heartRateReadings(since: Date().addingTimeInterval(-7 * 86400))
        let values = recent.compactMap { $0.hrvRMSSDMs }
        guard values.count >= 3 else { return nil }
        let avg = average(values)
        return Insight(
            text: "Your average HRV (RMSSD) this week is \(Int(avg.rounded())) ms — a rough wellness "
                + "indicator, not a clinical HRV measurement.",
            tone: .neutral
        )
    }

    private func bloodPressureTrendInsight() async throws -> Insight? {
        let now = Date()
        let thisWeek = try await repository.bloodPressureReadings(since: now.addingTimeInterval(-7 * 86400))
        let last14 = try await repository.bloodPressureReadings(since: now.addingTimeInterval(-14 * 86400))
        let priorWeek = last14.filter { $0.takenAt < now.addingTimeInterval(-7 * 86400) }

        guard thisWeek.count >= 2, priorWeek.count >= 2 else { return nil }

        let thisAvg = average(thisWeek.map { Double($0.systolic) })
        let priorAvg = average(priorWeek.map { Double($0.systolic) })
        let delta = thisAvg - priorAvg

        if abs(delta) < 4 {
            return Insight(
                text: "Your systolic blood pressure has been consistent, averaging \(Int(thisAvg.rounded())) mmHg this week.",
                tone: .positive
            )
        }
        let direction = delta > 0 ? "higher" : "lower"
        return Insight(
            text: "Your average systolic reading this week (\(Int(thisAvg.rounded())) mmHg) is "
                + "\(Int(abs(delta).rounded())) mmHg \(direction) than last week.",
            tone: delta > 10 ? .caution : .neutral
        )
    }

    private func missedReadingInsight() async throws -> Insight? {
        guard let latest = try await repository.latestBloodPressure() else { return nil }
        let daysSince = Calendar.current.dateComponents([.day], from: latest.takenAt, to: Date()).day ?? 0
        guard daysSince >= 5 else { return nil }
        return Insight(
            text: "You haven't logged a blood pressure reading in \(daysSince) days. "
                + "Regular readings make the trends above more meaningful.",
            tone: .caution
        )
    }

    private func bloodPressureReferenceInsight() async throws -> Insight? {
        guard let latest = try await repository.latestBloodPressure() else { return nil }
        return Insight(
            text: "Your latest reading (\(latest.systolic)/\(latest.diastolic) mmHg) falls in the "
                + "\"\(latest.referenceRange.rawValue)\" reference range. This is general information, "
                + "not a diagnosis — talk to a clinician about what your numbers mean for you.",
            tone: latest.referenceRange == .normal ? .positive : .caution
        )
    }

    private func average(_ values: [Double]) -> Double {
        guard !values.isEmpty else { return 0 }
        return values.reduce(0, +) / Double(values.count)
    }
}
