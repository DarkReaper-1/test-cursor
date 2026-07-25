import Foundation

public struct BloodPressureReading: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var systolic: Int
    public var diastolic: Int
    public var pulse: Int?
    public var recordedAt: Date
    public var source: MeasurementSource
    public var deviceName: String?
    public var notes: String?
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        systolic: Int,
        diastolic: Int,
        pulse: Int? = nil,
        recordedAt: Date = .now,
        source: MeasurementSource,
        deviceName: String? = nil,
        notes: String? = nil,
        createdAt: Date = .now
    ) {
        self.id = id
        self.systolic = systolic
        self.diastolic = diastolic
        self.pulse = pulse
        self.recordedAt = recordedAt
        self.source = source
        self.deviceName = deviceName
        self.notes = notes
        self.createdAt = createdAt
    }

    public var category: BPCategory {
        BPCategory.classify(systolic: systolic, diastolic: diastolic)
    }

    public var displayValue: String {
        "\(systolic)/\(diastolic)"
    }

    /// Rejects camera/Watch as BP sources at the domain boundary.
    public static func validateSource(_ source: MeasurementSource) throws {
        guard source.isValidBloodPressureSource else {
            throw VitalTrackError.invalidBloodPressureSource(source)
        }
    }
}
