import Foundation

public struct HRVSample: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var sdnnMilliseconds: Double
    public var recordedAt: Date
    public var source: MeasurementSource
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        sdnnMilliseconds: Double,
        recordedAt: Date = .now,
        source: MeasurementSource = .healthKit,
        createdAt: Date = .now
    ) {
        self.id = id
        self.sdnnMilliseconds = sdnnMilliseconds
        self.recordedAt = recordedAt
        self.source = source
        self.createdAt = createdAt
    }
}
