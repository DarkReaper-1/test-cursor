import Foundation

public enum ScoreConfidence: String, Codable, Sendable {
    case high
    case medium
    case low
    case incomplete

    public var displayName: String {
        switch self {
        case .high: return "High confidence"
        case .medium: return "Medium confidence"
        case .low: return "Low confidence"
        case .incomplete: return "Incomplete data"
        }
    }
}

public struct RecoveryScore: Codable, Sendable, Equatable {
    public var value: Int?
    public var confidence: ScoreConfidence
    public var inputsUsed: [String]
    public var explanation: String

    public init(value: Int?, confidence: ScoreConfidence, inputsUsed: [String], explanation: String) {
        self.value = value
        self.confidence = confidence
        self.inputsUsed = inputsUsed
        self.explanation = explanation
    }

    public var displayValue: String {
        value.map(String.init) ?? "—"
    }
}

public struct StressEstimate: Codable, Sendable, Equatable {
    public var label: String
    public var level: Int // 0 calm … 3 elevated estimate
    public var confidence: ScoreConfidence
    public var explanation: String

    public init(label: String, level: Int, confidence: ScoreConfidence, explanation: String) {
        self.label = label
        self.level = level
        self.confidence = confidence
        self.explanation = explanation
    }
}

public struct DailyHealthScore: Codable, Sendable, Equatable {
    public var value: Int?
    public var confidence: ScoreConfidence
    public var recovery: RecoveryScore
    public var stress: StressEstimate
    public var consistencyScore: Int
    public var hydrationProgress: Double
    public var inputsUsed: [String]
    public var explanation: String

    public init(
        value: Int?,
        confidence: ScoreConfidence,
        recovery: RecoveryScore,
        stress: StressEstimate,
        consistencyScore: Int,
        hydrationProgress: Double,
        inputsUsed: [String],
        explanation: String
    ) {
        self.value = value
        self.confidence = confidence
        self.recovery = recovery
        self.stress = stress
        self.consistencyScore = consistencyScore
        self.hydrationProgress = hydrationProgress
        self.inputsUsed = inputsUsed
        self.explanation = explanation
    }

    public var displayValue: String {
        value.map(String.init) ?? "—"
    }
}

public struct HealthStreak: Codable, Sendable, Equatable {
    public var currentDays: Int
    public var bestDays: Int
    public var lastActiveDay: Date?

    public init(currentDays: Int = 0, bestDays: Int = 0, lastActiveDay: Date? = nil) {
        self.currentDays = currentDays
        self.bestDays = bestDays
        self.lastActiveDay = lastActiveDay
    }
}

public struct HealthGoal: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var title: String
    public var targetValue: Double
    public var currentValue: Double
    public var unit: String
    public var kind: String

    public init(
        id: UUID = UUID(),
        title: String,
        targetValue: Double,
        currentValue: Double = 0,
        unit: String,
        kind: String
    ) {
        self.id = id
        self.title = title
        self.targetValue = targetValue
        self.currentValue = currentValue
        self.unit = unit
        self.kind = kind
    }

    public var progress: Double {
        guard targetValue > 0 else { return 0 }
        return min(1, currentValue / targetValue)
    }

    public static let defaultWater = HealthGoal(
        title: "Drink water today",
        targetValue: 8,
        unit: "glasses",
        kind: "hydration"
    )

    public static let defaultMeasurements = HealthGoal(
        title: "Log measurements this week",
        targetValue: 5,
        unit: "logs",
        kind: "consistency"
    )
}
