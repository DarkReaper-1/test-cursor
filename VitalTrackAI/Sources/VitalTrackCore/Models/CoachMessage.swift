import Foundation

public enum CoachRole: String, Codable, Sendable {
    case user
    case assistant
    case system
}

public struct CoachMessage: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var role: CoachRole
    public var text: String
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        role: CoachRole,
        text: String,
        createdAt: Date = .now
    ) {
        self.id = id
        self.role = role
        self.text = text
        self.createdAt = createdAt
    }
}

public struct DailySummary: Codable, Sendable, Equatable {
    public var date: Date
    public var recoveryLabel: String
    public var stressLabel: String
    public var heartRateLabel: String
    public var hydrationLabel: String
    public var suggestedActions: [String]
    public var narrative: String

    public init(
        date: Date = .now,
        recoveryLabel: String,
        stressLabel: String,
        heartRateLabel: String,
        hydrationLabel: String,
        suggestedActions: [String],
        narrative: String
    ) {
        self.date = date
        self.recoveryLabel = recoveryLabel
        self.stressLabel = stressLabel
        self.heartRateLabel = heartRateLabel
        self.hydrationLabel = hydrationLabel
        self.suggestedActions = suggestedActions
        self.narrative = narrative
    }
}

public struct WeeklyReport: Codable, Sendable, Equatable {
    public var weekStart: Date
    public var averageHeartRate: Double?
    public var averageSystolic: Double?
    public var averageDiastolic: Double?
    public var measurementCount: Int
    public var consistencyScore: Int
    public var recoveryTrend: String
    public var stressTrend: String
    public var lifestyleWins: [String]
    public var areasToImprove: [String]
    public var encouragement: String
    public var narrative: String

    public init(
        weekStart: Date,
        averageHeartRate: Double?,
        averageSystolic: Double?,
        averageDiastolic: Double?,
        measurementCount: Int,
        consistencyScore: Int,
        recoveryTrend: String,
        stressTrend: String,
        lifestyleWins: [String],
        areasToImprove: [String],
        encouragement: String,
        narrative: String
    ) {
        self.weekStart = weekStart
        self.averageHeartRate = averageHeartRate
        self.averageSystolic = averageSystolic
        self.averageDiastolic = averageDiastolic
        self.measurementCount = measurementCount
        self.consistencyScore = consistencyScore
        self.recoveryTrend = recoveryTrend
        self.stressTrend = stressTrend
        self.lifestyleWins = lifestyleWins
        self.areasToImprove = areasToImprove
        self.encouragement = encouragement
        self.narrative = narrative
    }
}

public struct PulseAnalysis: Codable, Sendable, Equatable {
    public var bpm: Double
    public var vsYesterday: Double?
    public var vsWeekAverage: Double?
    public var vsMonthAverage: Double?
    public var confidence: ScoreConfidence
    public var qualityLabel: String
    public var explanation: String
    public var possibleCauses: [String]
    public var lifestyleTips: [String]
    public var recoverySuggestion: String
    public var hydrationReminder: String
    public var stressLabel: String
    public var sparkline: [Double]
    public var riskFlag: String?

    public init(
        bpm: Double,
        vsYesterday: Double?,
        vsWeekAverage: Double?,
        vsMonthAverage: Double?,
        confidence: ScoreConfidence,
        qualityLabel: String,
        explanation: String,
        possibleCauses: [String],
        lifestyleTips: [String],
        recoverySuggestion: String,
        hydrationReminder: String,
        stressLabel: String,
        sparkline: [Double],
        riskFlag: String? = nil
    ) {
        self.bpm = bpm
        self.vsYesterday = vsYesterday
        self.vsWeekAverage = vsWeekAverage
        self.vsMonthAverage = vsMonthAverage
        self.confidence = confidence
        self.qualityLabel = qualityLabel
        self.explanation = explanation
        self.possibleCauses = possibleCauses
        self.lifestyleTips = lifestyleTips
        self.recoverySuggestion = recoverySuggestion
        self.hydrationReminder = hydrationReminder
        self.stressLabel = stressLabel
        self.sparkline = sparkline
        self.riskFlag = riskFlag
    }
}

public struct HistoryStats: Codable, Sendable, Equatable {
    public var averageBPM: Double?
    public var highestBPM: Double?
    public var lowestBPM: Double?
    public var averageSys: Double?
    public var averageDia: Double?
    public var measurementStreak: Int
    public var totalMeasurements: Int
    public var weeklyBPMs: [Double]
    public var monthlyBPMs: [Double]

    public init(
        averageBPM: Double? = nil,
        highestBPM: Double? = nil,
        lowestBPM: Double? = nil,
        averageSys: Double? = nil,
        averageDia: Double? = nil,
        measurementStreak: Int = 0,
        totalMeasurements: Int = 0,
        weeklyBPMs: [Double] = [],
        monthlyBPMs: [Double] = []
    ) {
        self.averageBPM = averageBPM
        self.highestBPM = highestBPM
        self.lowestBPM = lowestBPM
        self.averageSys = averageSys
        self.averageDia = averageDia
        self.measurementStreak = measurementStreak
        self.totalMeasurements = totalMeasurements
        self.weeklyBPMs = weeklyBPMs
        self.monthlyBPMs = monthlyBPMs
    }
}
