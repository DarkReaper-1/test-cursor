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
    public var medicationTiming: MedicationTimingContext
    public var linkedMedicationId: UUID?
    public var timeBucket: ReadingTimeBucket
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
        medicationTiming: MedicationTimingContext = .notTracked,
        linkedMedicationId: UUID? = nil,
        timeBucket: ReadingTimeBucket? = nil,
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
        self.medicationTiming = medicationTiming
        self.linkedMedicationId = linkedMedicationId
        self.timeBucket = timeBucket ?? ReadingTimeBucket.from(date: recordedAt)
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

    enum CodingKeys: String, CodingKey {
        case id, systolic, diastolic, pulse, recordedAt, source, deviceName, notes
        case medicationTiming, linkedMedicationId, timeBucket, createdAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        systolic = try c.decode(Int.self, forKey: .systolic)
        diastolic = try c.decode(Int.self, forKey: .diastolic)
        pulse = try c.decodeIfPresent(Int.self, forKey: .pulse)
        recordedAt = try c.decode(Date.self, forKey: .recordedAt)
        source = try c.decode(MeasurementSource.self, forKey: .source)
        deviceName = try c.decodeIfPresent(String.self, forKey: .deviceName)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        medicationTiming = try c.decodeIfPresent(MedicationTimingContext.self, forKey: .medicationTiming) ?? .notTracked
        linkedMedicationId = try c.decodeIfPresent(UUID.self, forKey: .linkedMedicationId)
        let decodedBucket = try c.decodeIfPresent(ReadingTimeBucket.self, forKey: .timeBucket)
        timeBucket = decodedBucket ?? ReadingTimeBucket.from(date: recordedAt)
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt) ?? recordedAt
    }
}
