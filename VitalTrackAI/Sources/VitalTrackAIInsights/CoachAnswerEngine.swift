import Foundation
import VitalTrackCore

/// Offline, template-based AI coach. Always explains why; never diagnoses.
public struct CoachAnswerEngine: CoachAnswering {
    private let safety = InsightSafetyFilter()
    private let calendar = Calendar.current

    public init() {}

    public func suggestedPrompts() -> [String] {
        [
            "What does 145/92 mean?",
            "Why was my blood pressure higher today?",
            "Am I improving?",
            "What should I eat?",
            "What does 82 BPM mean?",
            "How does sleep affect blood pressure?",
            "When should I see a doctor?",
            "Can the camera measure blood pressure?"
        ]
    }

    public func answer(question: String, context: CompanionContext) async -> CoachMessage {
        let q = question.lowercased()
        let latestHR = context.heartRate.first?.bpm
        let weekHR = average(context.heartRate.filter { $0.recordedAt >= daysAgo(7) }.map(\.bpm))
        let latestBP = context.bloodPressure.first
        let weekBP = context.bloodPressure.filter { $0.recordedAt >= daysAgo(7) }
        let monthBP = context.bloodPressure.filter { $0.recordedAt >= daysAgo(30) }
        let text: String

        if q.contains("blood pressure") && (q.contains("camera") || q.contains("finger") || q.contains("measure bp")) {
            text = """
            No. The camera cannot measure blood pressure. \(TrustPolicy.bloodPressureSourceDisclaimer)

            Why this matters: phone cameras estimate pulse with light (PPG). Blood pressure needs an FDA-cleared cuff or equivalent external monitor.
            """
        } else if looksLikeBPQuestion(q) || (q.contains("what does") && q.contains("/")) {
            let sys = extractPair(from: q)?.0 ?? latestBP?.systolic ?? extractNumber(from: q).map(Int.init)
            let dia = extractPair(from: q)?.1 ?? latestBP?.diastolic
            if let sys, let dia {
                let category = BPCategory.classify(systolic: sys, diastolic: dia)
                text = """
                \(sys)/\(dia) mmHg is often labeled “\(category.displayName)” using published adult reference ranges.

                Why: the top number is pressure when the heart squeezes; the bottom is when it rests. Categories help education — they are not a diagnosis for you. If numbers are very high or you have chest pain, trouble breathing, or sudden weakness, seek urgent care. Otherwise, share patterns with your clinician. Informational only.
                """
            } else {
                text = """
                Blood pressure is written as two numbers (for example 120/80). Log a cuff reading and ask again for a plain-English label.

                Why: labels need both systolic and diastolic. \(TrustPolicy.bloodPressureSourceDisclaimer)
                """
            }
        } else if q.contains("higher today") || (q.contains("why") && q.contains("blood pressure")) {
            if let latestBP, weekBP.count >= 2 {
                let weekSys = Double(weekBP.map(\.systolic).reduce(0, +)) / Double(weekBP.count)
                let delta = Double(latestBP.systolic) - weekSys
                let lifestyle = lifestyleHints(from: context)
                text = """
                Your latest cuff reading is \(latestBP.displayValue) mmHg. That is about \(Int(abs(delta))) mmHg systolic \(delta >= 0 ? "higher" : "lower") than your 7-day average (\(String(format: "%.0f", weekSys))).

                Why this can happen: \(lifestyle) Measuring soon after caffeine, stress, or skipping rest can also raise a single reading. Recheck after sitting quietly. This is not a diagnosis — discuss ongoing concerns with a clinician.
                """
            } else {
                text = """
                I need a few more cuff readings to compare today with your personal average.

                Why: trends beat one number. Log BP from your FDA-cleared monitor morning and evening when you can.
                """
            }
        } else if q.contains("improving") || q.contains("am i improving") || q.contains("getting better") {
            if monthBP.count >= 4 {
                let sorted = monthBP.sorted { $0.recordedAt < $1.recordedAt }
                let mid = sorted.count / 2
                let earlier = Double(sorted.prefix(mid).map(\.systolic).reduce(0, +)) / Double(max(1, mid))
                let later = Double(sorted.suffix(sorted.count - mid).map(\.systolic).reduce(0, +)) / Double(max(1, sorted.count - mid))
                let delta = earlier - later
                if delta >= 3 {
                    text = """
                    Encouraging news from your logs: recent systolic averages look about \(Int(delta)) mmHg lower than earlier this month.

                    Why we say “looks”: this is your recorded pattern, not a medical grade. Keep medication and habits your clinician recommended. Informational only — not a diagnosis.
                    """
                } else if delta <= -3 {
                    text = """
                    Recent systolic averages look a bit higher than earlier this month. That can happen with stress, sleep, sodium, missed doses, or illness.

                    Why: many factors change day to day. Keep logging calmly and share the trend with your clinician. Not medical advice.
                    """
                } else {
                    text = """
                    Your monthly systolic average looks fairly steady. Consistency itself is useful for you and your clinician.

                    Why: stable logging helps care decisions more than chasing every single reading. Informational only.
                    """
                }
            } else {
                text = """
                Log a few more weeks of cuff readings to see a clear improvement trend.

                Why: short histories bounce around. Aim for regular morning readings when possible.
                """
            }
        } else if q.contains("what does") && (q.contains("bpm") || q.contains("mean")) {
            let value = extractNumber(from: q) ?? latestHR ?? 82
            text = """
            About \(Int(value)) BPM means your heart is beating roughly \(Int(value)) times per minute right now.

            Why that can vary: time of day, caffeine, stress, recent movement, dehydration, or illness. A single number is not a diagnosis. If you feel unwell — chest pain, severe dizziness, or shortness of breath — seek urgent care.
            """
        } else if q.contains("higher today") || q.contains("why is my heart rate") {
            if let latestHR, let weekHR {
                let delta = latestHR - weekHR
                let dir = delta >= 0 ? "higher" : "lower"
                text = """
                Your latest pulse is about \(Int(abs(delta))) BPM \(dir) than your 7-day average (\(String(format: "%.0f", weekHR)) BPM).

                Why this can happen: poorer sleep, stress, dehydration, caffeine, illness, or measuring soon after activity. Consider drinking water, resting, and measuring again tomorrow at a similar time. This is informational only — not medical advice.
                """
            } else {
                text = """
                I need a few more pulse checks to compare today with your personal average.

                Why: trends are more meaningful than one reading. Take a resting check now, then again tomorrow.
                """
            }
        } else if q.contains("sleep") && (q.contains("blood") || q.contains("pressure") || q.contains("affect")) {
            text = """
            For many people, short or restless sleep can line up with higher next-day readings. Your check-ins help spot that pattern.

            Why: sleep affects recovery and stress hormones for some individuals. Aim for a steady bedtime, and mention loud snoring or daytime sleepiness to a clinician. Informational only.
            """
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
        } else if q.contains("medication") || q.contains("medicine") || q.contains("pill") {
            let active = context.medications.filter(\.isActive)
            let todayDoses = context.doses.filter { calendar.isDateInToday($0.takenAt) }
            if active.isEmpty {
                text = """
                You can add medications in the Medications screen to track doses, reminders, and before/after blood pressure.

                Why: a clear log helps clinic visits. Never change doses based on an app — follow your clinician.
                """
            } else {
                text = """
                You’re tracking \(active.count) active medication\(active.count == 1 ? "" : "s"). Today you’ve logged \(todayDoses.filter { $0.status == .taken }.count) taken dose\(todayDoses.filter { $0.status == .taken }.count == 1 ? "" : "s").

                Why this helps: before/after BP and dose history make doctor conversations clearer. Do not change medication from this chat. Informational only.
                """
            }
        } else if q.contains("recovery") {
            text = """
            Recovery score estimates how close you are to your calmer baseline using resting pulse, optional HRV, and sleep check-ins.

            Why we show inputs: transparency builds trust. Incomplete data shows as Incomplete — we do not invent a precise medical grade. Not a diagnosis.
            """
        } else {
            text = """
            I can help explain blood pressure and pulse trends, sleep and food habits, medication logs, and when to talk with a clinician.

            Try asking: “What does 145/92 mean?” or “Am I improving?” Why: clear questions let me use your recent logs for a personalized, non-diagnostic answer.
            """
        }

        return CoachMessage(role: .assistant, text: safety.sanitizeText(text))
    }

    private func looksLikeBPQuestion(_ q: String) -> Bool {
        q.contains("mmhg") || q.contains("systolic") || q.contains("diastolic")
            || (q.contains("blood pressure") && (q.contains("mean") || q.contains("what")))
            || q.contains("145/92") || q.contains("/") && q.contains("mean")
    }

    private func lifestyleHints(from context: CompanionContext) -> String {
        let today = context.checkIns.first { calendar.isDateInToday($0.date) }
        var bits: [String] = []
        if let sleep = today?.sleepHours, sleep < 6 { bits.append("shorter sleep last night") }
        if let sodium = today?.sodiumMg, sodium >= 2300 { bits.append("higher sodium today") }
        if today?.mood == .stressed || today?.stressLevel == .high { bits.append("higher stress") }
        if let caffeine = today?.caffeineCups, caffeine >= 3 { bits.append("more caffeine") }
        if bits.isEmpty {
            return "sleep, stress, sodium, caffeine, recent activity, or measuring technique."
        }
        return bits.joined(separator: ", ") + "."
    }

    private func extractPair(from text: String) -> (Int, Int)? {
        let pattern = #"(\d{2,3})\s*/\s*(\d{2,3})"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let r1 = Range(match.range(at: 1), in: text),
              let r2 = Range(match.range(at: 2), in: text),
              let sys = Int(text[r1]),
              let dia = Int(text[r2]) else { return nil }
        return (sys, dia)
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
