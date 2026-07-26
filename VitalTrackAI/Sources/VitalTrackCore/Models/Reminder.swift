import Foundation

public enum ReminderKind: String, Codable, Sendable, CaseIterable {
    case bloodPressureLog
    case heartRateCheck
    case medication
    case stressCheck
    case custom
}

public struct Reminder: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var title: String
    public var kind: ReminderKind
    public var hour: Int
    public var minute: Int
    public var weekdays: [Int]
    public var isEnabled: Bool
    public var notes: String?

    public init(
        id: UUID = UUID(),
        title: String,
        kind: ReminderKind,
        hour: Int,
        minute: Int,
        weekdays: [Int] = [2, 3, 4, 5, 6],
        isEnabled: Bool = true,
        notes: String? = nil
    ) {
        self.id = id
        self.title = title
        self.kind = kind
        self.hour = hour
        self.minute = minute
        self.weekdays = weekdays
        self.isEnabled = isEnabled
        self.notes = notes
    }
}
