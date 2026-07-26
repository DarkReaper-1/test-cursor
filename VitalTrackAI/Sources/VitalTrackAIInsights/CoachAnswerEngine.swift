import Foundation
import VitalTrackCore

/// Offline, template-based AI coach. Always explains why; never diagnoses.
public struct CoachAnswerEngine: CoachAnswering {
    private let safety = InsightSafetyFilter()
    private let calendar = Calendar.current

    public init() {}

    public func suggestedPrompts() -> [String] {
        [
            "What does 82 BPM mean?",
            "Why is my heart rate higher today?",
            "How can I lower my resting heart rate?",
            "What foods help heart health?",
            "When should I see a doctor?",
            "How does hydration affect my pulse?",
            "What is my recovery score based on?",
            "Can the camera measure blood pressure?"
        ]
    }

    public func answer(question: String, context: CompanionContext) async -> CoachMessage {
        let q = question.lowercased()
        let latest = context.heartRate.first?.bpm
        let week = average(context.heartRate.filter { $0.recordedAt >= daysAgo(7) }.map(\.bpm))
        let text: String

        if q.contains("blood pressure") && (q.contains("camera") || q.contains("finger") || q.contains("measure bp")) {
            text = """
            No. The camera cannot measure blood pressure. \(TrustPolicy.bloodPressureSourceDisclaimer)

            Why this matters: phone cameras estimate pulse with light (PPG). Blood pressure needs an FDA-cleared cuff or equivalent external monitor.
            """
        } else if q.contains("what does") && (q.contains("bpm") || q.contains("mean")) {
            let value = extractNumber(from: q) ?? latest ?? 82
            text = """
            About \(Int(value)) BPM means your heart is beating roughly \(Int(value)) times per minute right now.

            Why that can vary: time of day, caffeine, stress, recent movement, dehydration, or illness. A single number is not a diagnosis. If you feel unwell — chest pain, severe dizziness, or shortness of breath — seek urgent care.
            """
        } else if q.contains("higher today") || q.contains("why is my heart rate") {
            if let latest, let week {
                let delta = latest - week
                let dir = delta >= 0 ? "higher" : "lower"
                text = """
                Your latest pulse is about \(Int(abs(delta))) BPM \(dir) than your 7-day average (\(String(format: "%.0f", week)) BPM).

                Why this can happen: poorer sleep, stress, dehydration, caffeine, illness, or measuring soon after activity. Consider drinking water, resting, and measuring again tomorrow at a similar time. This is informational only — not medical advice.
                """
            } else {
                text = """
                I need a few more pulse checks to compare today with your personal average.

                Why: trends are more meaningful than one reading. Take a resting check now, then again tomorrow.
                """
            }
        } else if q.contains("lower") && q.contains("resting") {
            text = """
            Helpful habits that often support a calmer resting pulse over weeks: consistent sleep, regular walking, staying hydrated, limiting late caffeine, and practicing slow breathing.

            Why: these affect recovery and nervous-system balance for many people — but results vary. Camera PPG is an estimate. Discuss persistent concerns with a clinician. Not medical advice.
            """
        } else if q.contains("food") || q.contains("eat") {
            text = """
            Heart-friendly eating patterns often emphasize vegetables, fruit, whole grains, lean proteins, nuts, and less ultra-processed salt-heavy food.

            Why: these patterns support long-term cardiovascular wellness in population research — they are not a cure or treatment plan. Personal nutrition advice belongs with your clinician or dietitian.
            """
        } else if q.contains("doctor") || q.contains("clinician") || q.contains("see a") {
            text = """
            Consider contacting a clinician if you have repeated unusual readings, symptoms (chest pain, fainting, severe shortness of breath), or advice from a care team to monitor closely.

            Why: apps provide trends and education, not diagnosis or emergency care. If you think you are having a medical emergency, call local emergency services.
            """
        } else if q.contains("hydration") || q.contains("water") {
            let glasses = context.checkIns.first { calendar.isDateInToday($0.date) }?.waterGlasses ?? 0
            text = """
            You’ve logged \(glasses) water glasses today (goal \(context.waterGoalGlasses)). Dehydration can make some people feel a quicker pulse.

            Why: fluid balance affects how hard the heart works for some individuals. Sip water through the day and recheck later if you feel off. Informational only.
            """
        } else if q.contains("recovery") {
            text = """
            Recovery score estimates how close you are to your calmer baseline using resting pulse, optional HRV, and sleep check-ins.

            Why we show inputs: transparency builds trust. Incomplete data shows as Incomplete — we do not invent a precise medical grade. Not a diagnosis.
            """
        } else {
            text = """
            I can help explain pulse trends, recovery cues, hydration, and when to talk with a clinician.

            Try asking: “Why is my heart rate higher today?” or “Can the camera measure blood pressure?” Why: clear questions let me use your recent logs for a personalized, non-diagnostic answer.
            """
        }

        return CoachMessage(role: .assistant, text: safety.sanitizeText(text))
    }

    private func extractNumber(from text: String) -> Double? {
        let pattern = #"(\d{2,3})"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range(at: 1), in: text) else { return nil }
        return Double(text[range])
    }

    private func average(_ values: [Double]) -> Double? {
        guard !values.isEmpty else { return nil }
        return values.reduce(0, +) / Double(values.count)
    }

    private func daysAgo(_ n: Int) -> Date {
        calendar.date(byAdding: .day, value: -n, to: Date()) ?? Date()
    }
}
