import Foundation

public enum MoodTag: String, Codable, Sendable, CaseIterable, Identifiable {
    case great
    case good
    case okay
    case low
    case stressed

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .great: return "Great"
        case .good: return "Good"
        case .okay: return "Okay"
        case .low: return "Low energy"
        case .stressed: return "Stressed"
        }
    }

    /// 0...1 wellbeing contribution (higher is better).
    public var wellbeingScore: Double {
        switch self {
        case .great: return 1.0
        case .good: return 0.85
        case .okay: return 0.65
        case .low: return 0.4
        case .stressed: return 0.35
        }
    }
}

public struct CheckIn: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var date: Date
    public var waterGlasses: Int
    public var mood: MoodTag?
    public var sleepHours: Double?
    public var notes: String?

    public init(
        id: UUID = UUID(),
        date: Date = .now,
        waterGlasses: Int = 0,
        mood: MoodTag? = nil,
        sleepHours: Double? = nil,
        notes: String? = nil
    ) {
        self.id = id
        self.date = date
        self.waterGlasses = waterGlasses
        self.mood = mood
        self.sleepHours = sleepHours
        self.notes = notes
    }
}
