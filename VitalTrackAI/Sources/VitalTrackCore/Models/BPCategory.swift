import Foundation

/// AHA-style adult blood pressure categories (informational only — not a diagnosis).
public enum BPCategory: String, Codable, Sendable, CaseIterable, Identifiable {
    case low
    case normal
    case elevated
    case hypertensionStage1
    case hypertensionStage2
    case hypertensiveCrisis
    case unknown

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .low: return "Low"
        case .normal: return "Normal"
        case .elevated: return "Elevated"
        case .hypertensionStage1: return "Stage 1 range"
        case .hypertensionStage2: return "Stage 2 range"
        case .hypertensiveCrisis: return "Crisis range"
        case .unknown: return "Unknown"
        }
    }

    public var informationalNote: String {
        "Category labels follow published AHA adult ranges for reference only. They are not a diagnosis or medical advice."
    }

    /// Classifies systolic/diastolic mmHg using common AHA adult cutoffs.
    public static func classify(systolic: Int, diastolic: Int) -> BPCategory {
        guard systolic > 0, diastolic > 0 else { return .unknown }
        if systolic > 180 || diastolic > 120 { return .hypertensiveCrisis }
        if systolic >= 140 || diastolic >= 90 { return .hypertensionStage2 }
        if systolic >= 130 || diastolic >= 80 { return .hypertensionStage1 }
        if systolic >= 120 && diastolic < 80 { return .elevated }
        if systolic < 90 || diastolic < 60 { return .low }
        return .normal
    }
}
