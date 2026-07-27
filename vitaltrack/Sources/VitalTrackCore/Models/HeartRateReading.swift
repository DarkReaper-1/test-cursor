import Foundation

public enum HeartRateSource: String, Codable, CaseIterable, Sendable {
    case camera
    case appleWatch
    case manual
}

/// A single heart rate measurement. Camera-derived readings always carry
/// `signalQuality` so the UI can show how much to trust them; Watch/manual
/// readings don't need it.
public struct HeartRateReading: Identifiable, Codable, Equatable, Sendable {
    public let id: UUID
    public let takenAt: Date
    public let bpm: Int
    public let hrvRMSSDMs: Double?
    public let source: HeartRateSource

    public init(
        id: UUID = UUID(),
        takenAt: Date,
        bpm: Int,
        hrvRMSSDMs: Double? = nil,
        source: HeartRateSource = .camera
    ) {
        self.id = id
        self.takenAt = takenAt
        self.bpm = bpm
        self.hrvRMSSDMs = hrvRMSSDMs
        self.source = source
    }
}
