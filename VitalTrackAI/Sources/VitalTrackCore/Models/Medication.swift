import Foundation

public struct Medication: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var name: String
    public var dosage: String
    public var scheduleNote: String?
    public var isActive: Bool
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        name: String,
        dosage: String,
        scheduleNote: String? = nil,
        isActive: Bool = true,
        createdAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.dosage = dosage
        self.scheduleNote = scheduleNote
        self.isActive = isActive
        self.createdAt = createdAt
    }
}
