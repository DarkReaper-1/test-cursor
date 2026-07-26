import Foundation

public enum MedicationDoseStatus: String, Codable, Sendable, CaseIterable, Identifiable {
    case taken
    case missed
    case skipped

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .taken: return "Taken"
        case .missed: return "Missed"
        case .skipped: return "Skipped"
        }
    }
}

public struct MedicationDose: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var medicationId: UUID
    public var medicationName: String
    public var status: MedicationDoseStatus
    public var takenAt: Date
    public var sideEffectNote: String?
    public var notes: String?

    public init(
        id: UUID = UUID(),
        medicationId: UUID,
        medicationName: String,
        status: MedicationDoseStatus,
        takenAt: Date = .now,
        sideEffectNote: String? = nil,
        notes: String? = nil
    ) {
        self.id = id
        self.medicationId = medicationId
        self.medicationName = medicationName
        self.status = status
        self.takenAt = takenAt
        self.sideEffectNote = sideEffectNote
        self.notes = notes
    }
}
