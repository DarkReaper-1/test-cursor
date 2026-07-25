import Foundation

public struct HeartRateSample: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var bpm: Double
    public var recordedAt: Date
    public var source: MeasurementSource
    public var isResting: Bool
    public var notes: String?
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        bpm: Double,
        recordedAt: Date = .now,
        source: MeasurementSource,
        isResting: Bool = false,
        notes: String? = nil,
        createdAt: Date = .now
    ) {
        self.id = id
        self.bpm = bpm
        self.recordedAt = recordedAt
        self.source = source
        self.isResting = isResting
        self.notes = notes
        self.createdAt = createdAt
    }

    public var displayBPM: String {
        String(format: "%.0f", bpm)
    }
}
