import Foundation
import UserNotifications

public enum ReminderKind: String, CaseIterable, Identifiable, Codable, Sendable {
    case bloodPressureCheck
    case heartRateCheck
    case medication
    case hydration
    case exercise
    case doctorAppointment
    case missedReading

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .bloodPressureCheck: return "Blood pressure check"
        case .heartRateCheck: return "Heart rate check"
        case .medication: return "Medication reminder"
        case .hydration: return "Hydration reminder"
        case .exercise: return "Exercise reminder"
        case .doctorAppointment: return "Doctor appointment"
        case .missedReading: return "Missed reading"
        }
    }

    public var defaultBody: String {
        switch self {
        case .bloodPressureCheck: return "It's time to log today's blood pressure reading."
        case .heartRateCheck: return "Take a moment to measure your pulse."
        case .medication: return "Time to take your medication."
        case .hydration: return "Remember to drink some water."
        case .exercise: return "A short walk or workout is on your plan for today."
        case .doctorAppointment: return "You have an upcoming appointment."
        case .missedReading: return "You haven't logged a reading in a few days."
        }
    }

    fileprivate var identifierPrefix: String { "vitaltrack.reminder.\(rawValue)" }
}

public struct ReminderSchedule: Identifiable, Codable, Sendable {
    public var id: String { kind.rawValue }
    public let kind: ReminderKind
    public var hour: Int
    public var minute: Int
    public var enabled: Bool
    public var customBody: String?

    public init(kind: ReminderKind, hour: Int, minute: Int, enabled: Bool = false, customBody: String? = nil) {
        self.kind = kind
        self.hour = hour
        self.minute = minute
        self.enabled = enabled
        self.customBody = customBody
    }
}

/// All reminders are local notifications scheduled on-device — there is no
/// push server, so nothing about when or whether you get reminded is ever
/// known outside your phone.
///
/// "Adaptive scheduling using user behavior" (requested in the product
/// brief) is intentionally not implemented as a black-box heuristic here:
/// silently moving a user's reminder times based on inferred behavior is
/// exactly the kind of opaque "smart" feature the app's transparency
/// principle argues against. Instead this ships fixed, user-set times, and
/// docs/PRD.md proposes an explicit opt-in version ("suggest a better
/// time based on when you usually respond") as a roadmap item the user
/// approves rather than one that acts on their behalf.
public final class ReminderScheduler {
    private let center = UNUserNotificationCenter.current()

    public init() {}

    public func requestAuthorization() async throws -> Bool {
        try await center.requestAuthorization(options: [.alert, .badge, .sound])
    }

    public func apply(_ schedule: ReminderSchedule) async {
        let identifier = schedule.kind.identifierPrefix
        center.removePendingNotificationRequests(withIdentifiers: [identifier])
        guard schedule.enabled else { return }

        let content = UNMutableNotificationContent()
        content.title = schedule.kind.title
        content.body = schedule.customBody ?? schedule.kind.defaultBody
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.hour = schedule.hour
        dateComponents.minute = schedule.minute
        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        try? await center.add(request)
    }

    public func cancel(_ kind: ReminderKind) {
        center.removePendingNotificationRequests(withIdentifiers: [kind.identifierPrefix])
    }

    public func cancelAll() {
        center.removeAllPendingNotificationRequests()
    }
}
