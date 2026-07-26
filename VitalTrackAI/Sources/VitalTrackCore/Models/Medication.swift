import Foundation

public struct Medication: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var name: String
    public var dosage: String
    public var scheduleNote: String?
    public var doctorInstructions: String?
    public var reminderHour: Int?
    public var reminderMinute: Int?
    public var refillDate: Date?
    public var sideEffectNotes: String?
    public var isActive: Bool
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        name: String,
        dosage: String,
        scheduleNote: String? = nil,
        doctorInstructions: String? = nil,
        reminderHour: Int? = nil,
        reminderMinute: Int? = nil,
        refillDate: Date? = nil,
        sideEffectNotes: String? = nil,
        isActive: Bool = true,
        createdAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.dosage = dosage
        self.scheduleNote = scheduleNote
        self.doctorInstructions = doctorInstructions
        self.reminderHour = reminderHour
        self.reminderMinute = reminderMinute
        self.refillDate = refillDate
        self.sideEffectNotes = sideEffectNotes
        self.isActive = isActive
        self.createdAt = createdAt
    }

    public var reminderLabel: String? {
        guard let hour = reminderHour, let minute = reminderMinute else { return nil }
        return String(format: "%d:%02d", hour, minute)
    }

    public var needsRefillSoon: Bool {
        guard let refillDate else { return false }
        let days = Calendar.current.dateComponents([.day], from: Date(), to: refillDate).day ?? 999
        return days <= 7
    }

    enum CodingKeys: String, CodingKey {
        case id, name, dosage, scheduleNote, doctorInstructions, reminderHour, reminderMinute
        case refillDate, sideEffectNotes, isActive, createdAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        dosage = try c.decode(String.self, forKey: .dosage)
        scheduleNote = try c.decodeIfPresent(String.self, forKey: .scheduleNote)
        doctorInstructions = try c.decodeIfPresent(String.self, forKey: .doctorInstructions)
        reminderHour = try c.decodeIfPresent(Int.self, forKey: .reminderHour)
        reminderMinute = try c.decodeIfPresent(Int.self, forKey: .reminderMinute)
        refillDate = try c.decodeIfPresent(Date.self, forKey: .refillDate)
        sideEffectNotes = try c.decodeIfPresent(String.self, forKey: .sideEffectNotes)
        isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt) ?? .now
    }
}
