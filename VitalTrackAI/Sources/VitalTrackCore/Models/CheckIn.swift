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

public enum StressLevel: Int, Codable, Sendable, CaseIterable, Identifiable {
    case calm = 1
    case mild = 2
    case moderate = 3
    case high = 4

    public var id: Int { rawValue }

    public var displayName: String {
        switch self {
        case .calm: return "Calm"
        case .mild: return "Mild"
        case .moderate: return "Moderate"
        case .high: return "High"
        }
    }
}

public struct CheckIn: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var date: Date
    public var waterGlasses: Int
    public var mood: MoodTag?
    public var sleepHours: Double?
    public var weightKg: Double?
    public var sodiumMg: Int?
    public var caffeineCups: Int?
    public var alcoholDrinks: Int?
    public var smokedCigarettes: Int?
    public var exerciseMinutes: Int?
    public var steps: Int?
    public var stressLevel: StressLevel?
    public var notes: String?

    public init(
        id: UUID = UUID(),
        date: Date = .now,
        waterGlasses: Int = 0,
        mood: MoodTag? = nil,
        sleepHours: Double? = nil,
        weightKg: Double? = nil,
        sodiumMg: Int? = nil,
        caffeineCups: Int? = nil,
        alcoholDrinks: Int? = nil,
        smokedCigarettes: Int? = nil,
        exerciseMinutes: Int? = nil,
        steps: Int? = nil,
        stressLevel: StressLevel? = nil,
        notes: String? = nil
    ) {
        self.id = id
        self.date = date
        self.waterGlasses = waterGlasses
        self.mood = mood
        self.sleepHours = sleepHours
        self.weightKg = weightKg
        self.sodiumMg = sodiumMg
        self.caffeineCups = caffeineCups
        self.alcoholDrinks = alcoholDrinks
        self.smokedCigarettes = smokedCigarettes
        self.exerciseMinutes = exerciseMinutes
        self.steps = steps
        self.stressLevel = stressLevel
        self.notes = notes
    }

    enum CodingKeys: String, CodingKey {
        case id, date, waterGlasses, mood, sleepHours, weightKg, sodiumMg
        case caffeineCups, alcoholDrinks, smokedCigarettes, exerciseMinutes, steps, stressLevel, notes
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        date = try c.decode(Date.self, forKey: .date)
        waterGlasses = try c.decodeIfPresent(Int.self, forKey: .waterGlasses) ?? 0
        mood = try c.decodeIfPresent(MoodTag.self, forKey: .mood)
        sleepHours = try c.decodeIfPresent(Double.self, forKey: .sleepHours)
        weightKg = try c.decodeIfPresent(Double.self, forKey: .weightKg)
        sodiumMg = try c.decodeIfPresent(Int.self, forKey: .sodiumMg)
        caffeineCups = try c.decodeIfPresent(Int.self, forKey: .caffeineCups)
        alcoholDrinks = try c.decodeIfPresent(Int.self, forKey: .alcoholDrinks)
        smokedCigarettes = try c.decodeIfPresent(Int.self, forKey: .smokedCigarettes)
        exerciseMinutes = try c.decodeIfPresent(Int.self, forKey: .exerciseMinutes)
        steps = try c.decodeIfPresent(Int.self, forKey: .steps)
        stressLevel = try c.decodeIfPresent(StressLevel.self, forKey: .stressLevel)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
    }
}
