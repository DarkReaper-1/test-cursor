import Foundation

public struct CompanionContext: Sendable {
    public var bloodPressure: [BloodPressureReading]
    public var heartRate: [HeartRateSample]
    public var hrv: [HRVSample]
    public var checkIns: [CheckIn]
    public var waterGoalGlasses: Int
    public var lastLogDate: Date?

    public init(
        bloodPressure: [BloodPressureReading] = [],
        heartRate: [HeartRateSample] = [],
        hrv: [HRVSample] = [],
        checkIns: [CheckIn] = [],
        waterGoalGlasses: Int = 8,
        lastLogDate: Date? = nil
    ) {
        self.bloodPressure = bloodPressure
        self.heartRate = heartRate
        self.hrv = hrv
        self.checkIns = checkIns
        self.waterGoalGlasses = waterGoalGlasses
        self.lastLogDate = lastLogDate
    }

    public var insightContext: InsightContext {
        InsightContext(
            bloodPressure: bloodPressure,
            heartRate: heartRate,
            hrv: hrv,
            lastLogDate: lastLogDate
        )
    }
}

public protocol ScoreComputing: Sendable {
    func computeDailyScore(from context: CompanionContext) async -> DailyHealthScore
    func computeStreak(from context: CompanionContext) async -> HealthStreak
    func analyzePulse(_ sample: HeartRateSample, context: CompanionContext, qualityHint: String) async -> PulseAnalysis
    func historyStats(from context: CompanionContext) async -> HistoryStats
}

public protocol DailySummaryComputing: Sendable {
    func dailySummary(from context: CompanionContext, score: DailyHealthScore) async -> DailySummary
    func weeklyReport(from context: CompanionContext, score: DailyHealthScore) async -> WeeklyReport
}

public protocol CoachAnswering: Sendable {
    func suggestedPrompts() -> [String]
    func answer(question: String, context: CompanionContext) async -> CoachMessage
}

public protocol CheckInRepository: Sendable {
    func fetchAll() async throws -> [CheckIn]
    func fetchToday() async throws -> CheckIn?
    func upsert(_ checkIn: CheckIn) async throws
}
