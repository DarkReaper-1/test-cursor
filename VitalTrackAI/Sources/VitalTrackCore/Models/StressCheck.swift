import Foundation

/// Self-reported stress and anxiety measurement.
/// Informational wellness logging only — not a clinical assessment or diagnosis.
public enum BodyStressSignal: String, Codable, Sendable, CaseIterable, Identifiable {
    case tenseMuscles
    case racingThoughts
    case tightChest
    case restlessness
    case calmBody

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .tenseMuscles: return "Tense muscles"
        case .racingThoughts: return "Racing thoughts"
        case .tightChest: return "Tight chest"
        case .restlessness: return "Restless"
        case .calmBody: return "Body feels calm"
        }
    }
}

public struct StressCheck: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    /// Perceived stress right now, 1 (very calm) … 10 (very stressed).
    public var stressScore: Int
    /// Perceived anxiety right now, 1 (very calm) … 10 (very anxious).
    public var anxietyScore: Int
    public var bodySignals: [BodyStressSignal]
    public var completedBreathing: Bool
    public var notes: String?
    public var recordedAt: Date
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        stressScore: Int,
        anxietyScore: Int,
        bodySignals: [BodyStressSignal] = [],
        completedBreathing: Bool = false,
        notes: String? = nil,
        recordedAt: Date = .now,
        createdAt: Date = .now
    ) {
        self.id = id
        self.stressScore = min(10, max(1, stressScore))
        self.anxietyScore = min(10, max(1, anxietyScore))
        self.bodySignals = bodySignals
        self.completedBreathing = completedBreathing
        self.notes = notes
        self.recordedAt = recordedAt
        self.createdAt = createdAt
    }

    /// Average of stress and anxiety (1…10).
    public var combinedScore: Double {
        Double(stressScore + anxietyScore) / 2.0
    }

    public var intensityBand: StressIntensityBand {
        StressIntensityBand.from(combined: combinedScore)
    }

    public var displaySummary: String {
        "Stress \(stressScore)/10 · Anxiety \(anxietyScore)/10"
    }

    public static func validateScores(stress: Int, anxiety: Int) -> Bool {
        (1...10).contains(stress) && (1...10).contains(anxiety)
    }
}

public enum StressIntensityBand: String, Codable, Sendable, CaseIterable, Identifiable {
    case calm
    case mild
    case moderate
    case high

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .calm: return "Calm"
        case .mild: return "Mild"
        case .moderate: return "Moderate"
        case .high: return "High"
        }
    }

    /// Maps combined 1…10 score into a friendly band.
    public static func from(combined: Double) -> StressIntensityBand {
        switch combined {
        case ..<3.5: return .calm
        case ..<5.5: return .mild
        case ..<7.5: return .moderate
        default: return .high
        }
    }

    /// Maps legacy check-in StressLevel into the same bands.
    public static func from(level: StressLevel) -> StressIntensityBand {
        switch level {
        case .calm: return .calm
        case .mild: return .mild
        case .moderate: return .moderate
        case .high: return .high
        }
    }
}
