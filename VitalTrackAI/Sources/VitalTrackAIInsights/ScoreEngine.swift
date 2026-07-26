import Foundation
import VitalTrackCore

public struct ScoreEngine: ScoreComputing {
    private let calendar = Calendar.current

    public init() {}

    public func computeDailyScore(from context: CompanionContext) async -> DailyHealthScore {
        let recovery = recoveryScore(context)
        let stress = stressEstimate(context)
        let consistency = consistencyScore(context)
        let hydration = hydrationProgress(context)
        var inputs = recovery.inputsUsed
        inputs.append(contentsOf: ["logging consistency", "hydration check-in"])

        let pieces: [Double] = [
            recovery.value.map { Double($0) } ?? 55,
            Double(100 - stress.level * 18),
            Double(consistency),
            hydration * 100
        ]
        let hasCore = !context.heartRate.isEmpty || !context.bloodPressure.isEmpty || context.checkIns.contains { calendar.isDateInToday($0.date) }
        let value = hasCore ? Int(pieces.reduce(0, +) / Double(pieces.count)) : nil
        let confidence: ScoreConfidence
        if !hasCore {
            confidence = .incomplete
        } else if context.heartRate.count >= 5 && context.checkIns.count >= 2 {
            confidence = .high
        } else if context.heartRate.count >= 2 || !context.bloodPressure.isEmpty {
            confidence = .medium
        } else {
            confidence = .low
        }

        let explanation: String
        if let value {
            explanation = "Today’s health score (\(value)) blends recovery, a calm stress estimate, how consistently you log, and hydration progress. It is informational only — not a diagnosis."
        } else {
            explanation = "Add a pulse check, cuff reading, or today’s check-in to unlock your daily health score. Missing pieces show as incomplete — we never invent precision."
        }

        return DailyHealthScore(
            value: value,
            confidence: confidence,
            recovery: recovery,
            stress: stress,
            consistencyScore: consistency,
            hydrationProgress: hydration,
            inputsUsed: Array(Set(recovery.inputsUsed + ["logging consistency", "hydration check-in"])),
            explanation: explanation
        )
    }

    public func computeStreak(from context: CompanionContext) async -> HealthStreak {
        var days = Set<Date>()
        for sample in context.heartRate {
            days.insert(calendar.startOfDay(for: sample.recordedAt))
        }
        for reading in context.bloodPressure {
            days.insert(calendar.startOfDay(for: reading.recordedAt))
        }
        for check in context.stressChecks {
            days.insert(calendar.startOfDay(for: check.recordedAt))
        }
        for checkIn in context.checkIns where checkIn.waterGlasses > 0 || checkIn.mood != nil || checkIn.sleepHours != nil {
            days.insert(calendar.startOfDay(for: checkIn.date))
        }
        let sorted = days.sorted(by: >)
        guard let newest = sorted.first else {
            return HealthStreak()
        }
        var current = 0
        var cursor = calendar.startOfDay(for: Date())
        // Allow streak to count yesterday if user hasn't logged today yet
        if !days.contains(cursor), let yesterday = calendar.date(byAdding: .day, value: -1, to: cursor) {
            cursor = yesterday
        }
        while days.contains(cursor) {
            current += 1
            guard let prev = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = prev
        }
        // Best streak scan
        var best = 0
        var run = 0
        var prev: Date?
        for day in days.sorted() {
            if let prev, let expected = calendar.date(byAdding: .day, value: 1, to: prev), expected == day {
                run += 1
            } else {
                run = 1
            }
            best = max(best, run)
            prev = day
        }
        return HealthStreak(currentDays: current, bestDays: max(best, current), lastActiveDay: newest)
    }

    public func analyzePulse(_ sample: HeartRateSample, context: CompanionContext, qualityHint: String) async -> PulseAnalysis {
        let bpm = sample.bpm
        let sorted = context.heartRate.sorted { $0.recordedAt < $1.recordedAt }
        let yesterday = average(sorted.filter { calendar.isDateInYesterday($0.recordedAt) }.map(\.bpm))
        let week = average(sorted.filter { $0.recordedAt >= daysAgo(7) }.map(\.bpm))
        let month = average(sorted.filter { $0.recordedAt >= daysAgo(30) }.map(\.bpm))
        let vsY = yesterday.map { bpm - $0 }
        let vsW = week.map { bpm - $0 }
        let vsM = month.map { bpm - $0 }

        let confidence: ScoreConfidence = qualityHint.lowercased().contains("demo") || qualityHint.lowercased().contains("placeholder")
            ? .medium
            : (sorted.count >= 5 ? .high : .medium)

        var causes: [String] = []
        var tips: [String] = []
        if let vsW, vsW >= 6 {
            causes += ["Recent stress", "Less sleep than usual", "Dehydration", "Recent activity or caffeine"]
            tips += ["Drink a glass of water", "Take 5 quiet minutes", "Measure again tomorrow at the same time"]
        } else if let vsW, vsW <= -6 {
            causes += ["Better recovery", "Improved sleep", "Natural day-to-day variation"]
            tips += ["Keep your current routines", "Log sleep tonight to confirm the pattern"]
        } else {
            causes += ["Normal day-to-day variation", "Time of day", "Recent meals or movement"]
            tips += ["Stay hydrated", "Keep logging at consistent times"]
        }

        let today = context.checkIns.first { calendar.isDateInToday($0.date) }
        let hydrationReminder: String
        if let today, Double(today.waterGlasses) >= Double(context.waterGoalGlasses) * 0.75 {
            hydrationReminder = "Hydration looks on track today."
        } else {
            hydrationReminder = "Consider drinking a glass of water, then recheck later if you feel off."
        }

        let stressLabel: String
        if let vsW, vsW >= 8 { stressLabel = "Possibly elevated vs your week" }
        else if today?.mood == .stressed { stressLabel = "Mood tagged stressed" }
        else { stressLabel = "Steady estimate" }

        var risk: String?
        if bpm >= 120 {
            risk = "This reading is higher than a typical resting range. If you feel chest pain, dizziness, or shortness of breath, seek urgent care. Otherwise rest and recheck — this is not a diagnosis."
        } else if bpm <= 45 {
            risk = "This reading is lower than many resting ranges. If you feel faint or unwell, contact a clinician. Athletes may normally run lower — this is not a diagnosis."
        }

        let explanation: String
        if let vsW {
            let dir = vsW >= 0 ? "higher" : "lower"
            explanation = String(
                format: "Your pulse is %.0f BPM — about %.0f BPM %@ than your 7-day average (%.0f). Camera PPG is an estimate of heart rate only, not blood pressure. Common reasons include sleep, stress, hydration, or recent activity.",
                bpm, abs(vsW), dir, week ?? bpm
            )
        } else {
            explanation = String(
                format: "Your pulse is %.0f BPM. As you add more checks, we will compare this to your personal weekly average. Camera PPG estimates heart rate only — not blood pressure.",
                bpm
            )
        }

        let spark = sorted.suffix(12).map(\.bpm)
        return PulseAnalysis(
            bpm: bpm,
            vsYesterday: vsY,
            vsWeekAverage: vsW,
            vsMonthAverage: vsM,
            confidence: confidence,
            qualityLabel: qualityHint.isEmpty ? "Good signal estimate" : qualityHint,
            explanation: explanation + "\n\n" + TrustPolicy.medicalDisclaimer,
            possibleCauses: causes,
            lifestyleTips: tips,
            recoverySuggestion: "Sit quietly for 2 minutes, sip water, and avoid checking again immediately after exercise.",
            hydrationReminder: hydrationReminder,
            stressLabel: stressLabel,
            sparkline: Array(spark),
            riskFlag: risk
        )
    }

    public func historyStats(from context: CompanionContext) async -> HistoryStats {
        let hr = context.heartRate.map(\.bpm)
        let bp = context.bloodPressure
        let streak = await computeStreak(from: context)
        let week = context.heartRate.filter { $0.recordedAt >= daysAgo(7) }.sorted { $0.recordedAt < $1.recordedAt }.map(\.bpm)
        let month = context.heartRate.filter { $0.recordedAt >= daysAgo(30) }.sorted { $0.recordedAt < $1.recordedAt }.map(\.bpm)
        let weekBP = bp.filter { $0.recordedAt >= daysAgo(7) }
        let monthBP = bp.filter { $0.recordedAt >= daysAgo(30) }
        let yearBP = bp.filter { $0.recordedAt >= daysAgo(365) }
        let morning = bp.filter { $0.timeBucket == .morning }
        let evening = bp.filter { $0.timeBucket == .evening }
        let before = bp.filter { $0.medicationTiming == .beforeMedication }
        let after = bp.filter { $0.medicationTiming == .afterMedication }
        return HistoryStats(
            averageBPM: average(hr),
            highestBPM: hr.max(),
            lowestBPM: hr.min(),
            averageSys: bp.isEmpty ? nil : Double(bp.map(\.systolic).reduce(0, +)) / Double(bp.count),
            averageDia: bp.isEmpty ? nil : Double(bp.map(\.diastolic).reduce(0, +)) / Double(bp.count),
            highestSys: bp.map(\.systolic).max(),
            lowestSys: bp.map(\.systolic).min(),
            morningAvgSys: average(morning.map { Double($0.systolic) }),
            eveningAvgSys: average(evening.map { Double($0.systolic) }),
            beforeMedAvgSys: average(before.map { Double($0.systolic) }),
            afterMedAvgSys: average(after.map { Double($0.systolic) }),
            weekAvgSys: average(weekBP.map { Double($0.systolic) }),
            monthAvgSys: average(monthBP.map { Double($0.systolic) }),
            measurementStreak: streak.currentDays,
            totalMeasurements: context.heartRate.count + context.bloodPressure.count,
            weeklyBPMs: week,
            monthlyBPMs: month,
            weeklySystolic: weekBP.sorted { $0.recordedAt < $1.recordedAt }.map { Double($0.systolic) },
            monthlySystolic: monthBP.sorted { $0.recordedAt < $1.recordedAt }.map { Double($0.systolic) },
            yearlySystolic: yearBP.sorted { $0.recordedAt < $1.recordedAt }.map { Double($0.systolic) }
        )
    }

    private func recoveryScore(_ context: CompanionContext) -> RecoveryScore {
        var inputs: [String] = []
        let resting = context.heartRate.filter(\.isResting)
        let baseline = average(resting.suffix(14).map(\.bpm)) ?? average(context.heartRate.suffix(14).map(\.bpm))
        let latest = resting.first?.bpm ?? context.heartRate.first?.bpm
        var score: Int?
        if let baseline, let latest {
            inputs.append("resting heart rate vs personal baseline")
            let delta = latest - baseline
            // Lower than baseline → higher recovery
            score = Int(max(20, min(100, 78 - delta * 3)))
        }
        if let hrv = average(context.hrv.suffix(7).map(\.sdnnMilliseconds)) {
            inputs.append("HRV (SDNN)")
            if let current = score {
                score = min(100, current + (hrv > 40 ? 4 : 0))
            } else {
                score = hrv > 40 ? 72 : 60
            }
        }
        let today = context.checkIns.first { calendar.isDateInToday($0.date) }
        if let sleep = today?.sleepHours {
            inputs.append("sleep hours check-in")
            let adj = sleep >= 7 ? 6 : (sleep >= 6 ? 0 : -8)
            if let current = score {
                score = max(15, min(100, current + adj))
            } else {
                score = sleep >= 7 ? 70 : 55
            }
        }
        let confidence: ScoreConfidence = inputs.isEmpty ? .incomplete : (inputs.count >= 2 ? .medium : .low)
        let explanation: String
        if let score {
            explanation = "Recovery estimate \(score)/100 uses \(inputs.joined(separator: ", ")). Higher usually means you are closer to your calmer baseline. Informational only — not medical advice."
        } else {
            explanation = "Log a resting pulse or sleep check-in to estimate recovery. We show Incomplete instead of guessing."
        }
        return RecoveryScore(value: score, confidence: confidence, inputsUsed: inputs, explanation: explanation)
    }

    private func stressEstimate(_ context: CompanionContext) -> StressEstimate {
        let todayStress = context.stressChecks.first { calendar.isDateInToday($0.recordedAt) }
            ?? context.stressChecks.first
        if let check = todayStress {
            let level: Int
            switch check.intensityBand {
            case .calm: level = 0
            case .mild: level = 1
            case .moderate: level = 2
            case .high: level = 3
            }
            return StressEstimate(
                label: "\(check.intensityBand.displayName) (self-report)",
                level: level,
                confidence: .high,
                explanation: "Based on your stress \(check.stressScore)/10 and anxiety \(check.anxietyScore)/10 self-check. This is a wellness log, not a clinical anxiety assessment."
            )
        }

        let week = average(context.heartRate.filter { $0.recordedAt >= daysAgo(7) }.map(\.bpm))
        let latest = context.heartRate.first?.bpm
        let today = context.checkIns.first { calendar.isDateInToday($0.date) }
        var level = 1
        var label = "Moderate"
        if let week, let latest, latest - week >= 8 { level = 3; label = "Higher than usual" }
        else if today?.stressLevel == .high || today?.mood == .stressed { level = 2; label = "Mood suggests stress" }
        else if let stress = today?.stressLevel {
            label = stress.displayName
            level = max(0, stress.rawValue - 1)
        }
        else if let week, let latest, latest - week <= -4 { level = 0; label = "Calm" }
        else if latest != nil { level = 1; label = "Steady" }
        else {
            return StressEstimate(
                label: "Unknown",
                level: 1,
                confidence: .incomplete,
                explanation: "Log a stress & anxiety check (or a pulse/mood tag) for a clearer estimate. Wellness cue only — not a diagnosis."
            )
        }
        return StressEstimate(
            label: label,
            level: level,
            confidence: latest == nil ? .low : .medium,
            explanation: "Stress estimate uses pulse trends and check-in tags when a dedicated stress check is not logged. Wellness cue only — not a clinical assessment."
        )
    }

    private func consistencyScore(_ context: CompanionContext) -> Int {
        let last7 = (0..<7).compactMap { calendar.date(byAdding: .day, value: -$0, to: Date()).map { calendar.startOfDay(for: $0) } }
        var hits = 0
        for day in last7 {
            let hasHR = context.heartRate.contains { calendar.isDate($0.recordedAt, inSameDayAs: day) }
            let hasBP = context.bloodPressure.contains { calendar.isDate($0.recordedAt, inSameDayAs: day) }
            let hasCI = context.checkIns.contains { calendar.isDate($0.date, inSameDayAs: day) }
            let hasStress = context.stressChecks.contains { calendar.isDate($0.recordedAt, inSameDayAs: day) }
            if hasHR || hasBP || hasCI || hasStress { hits += 1 }
        }
        return Int((Double(hits) / 7.0) * 100)
    }

    private func hydrationProgress(_ context: CompanionContext) -> Double {
        let today = context.checkIns.first { calendar.isDateInToday($0.date) }
        let glasses = Double(today?.waterGlasses ?? 0)
        return min(1, glasses / Double(max(1, context.waterGoalGlasses)))
    }

    private func average(_ values: [Double]) -> Double? {
        guard !values.isEmpty else { return nil }
        return values.reduce(0, +) / Double(values.count)
    }

    private func daysAgo(_ n: Int) -> Date {
        calendar.date(byAdding: .day, value: -n, to: Date()) ?? Date()
    }
}
