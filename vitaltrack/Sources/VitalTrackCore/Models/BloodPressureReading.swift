import Foundation

public enum BloodPressureSource: String, Codable, CaseIterable, Sendable {
    case manual
    case bluetoothCuff
    case appleHealthImport
    case csvImport
}

public enum BloodPressureReferenceRange: String, Codable, Sendable {
    case normal = "Normal range"
    case elevated = "Elevated range"
    case stage1 = "Stage 1 range"
    case stage2 = "Stage 2 range"
    case crisis = "Crisis range — seek medical care"
}

/// A blood pressure reading obtained from a real monitor — VitalTrack never
/// estimates blood pressure itself. `source` records where the numbers came
/// from so History/Reports can show it honestly.
public struct BloodPressureReading: Identifiable, Codable, Equatable, Sendable {
    public let id: UUID
    public let takenAt: Date
    public let systolic: Int
    public let diastolic: Int
    public let pulse: Int?
    public let source: BloodPressureSource
    public let notes: String?

    public init(
        id: UUID = UUID(),
        takenAt: Date,
        systolic: Int,
        diastolic: Int,
        pulse: Int? = nil,
        source: BloodPressureSource = .manual,
        notes: String? = nil
    ) {
        self.id = id
        self.takenAt = takenAt
        self.systolic = systolic
        self.diastolic = diastolic
        self.pulse = pulse
        self.source = source
        self.notes = notes
    }

    /// General reference categorization from published AHA thresholds.
    /// Informational only — never phrased as a diagnosis.
    public var referenceRange: BloodPressureReferenceRange {
        if systolic >= 180 || diastolic >= 120 { return .crisis }
        if systolic >= 140 || diastolic >= 90 { return .stage2 }
        if systolic >= 130 || diastolic >= 80 { return .stage1 }
        if systolic >= 120 && diastolic < 80 { return .elevated }
        return .normal
    }
}
