import Foundation
import VitalTrackCore

#if canImport(UserNotifications)
import UserNotifications
#endif

public final class ReminderScheduler: @unchecked Sendable {
    public init() {}

    public func requestAuthorization() async throws -> Bool {
#if canImport(UserNotifications)
        let center = UNUserNotificationCenter.current()
        do {
            return try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            throw VitalTrackError.notificationPermissionDenied
        }
#else
        return false
#endif
    }

    public func schedule(_ reminder: Reminder) async throws {
#if canImport(UserNotifications)
        guard reminder.isEnabled else {
            await cancel(id: reminder.id)
            return
        }
        let center = UNUserNotificationCenter.current()
        let content = UNMutableNotificationContent()
        content.title = reminder.title
        content.body = body(for: reminder)
        content.sound = .default

        if reminder.weekdays.isEmpty {
            var date = DateComponents()
            date.hour = reminder.hour
            date.minute = reminder.minute
            let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
            let request = UNNotificationRequest(identifier: reminder.id.uuidString, content: content, trigger: trigger)
            try await center.add(request)
        } else {
            for weekday in reminder.weekdays {
                var date = DateComponents()
                date.hour = reminder.hour
                date.minute = reminder.minute
                date.weekday = weekday
                let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
                let id = "\(reminder.id.uuidString)-\(weekday)"
                let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
                try await center.add(request)
            }
        }
#else
        _ = reminder
#endif
    }

    public func cancel(id: UUID) async {
#if canImport(UserNotifications)
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        let ids = pending.map(\.identifier).filter { $0.hasPrefix(id.uuidString) }
        center.removePendingNotificationRequests(withIdentifiers: ids.isEmpty ? [id.uuidString] : ids)
#else
        _ = id
#endif
    }

    private func body(for reminder: Reminder) -> String {
        switch reminder.kind {
        case .bloodPressureLog:
            return "Good morning! Ready to record today’s blood pressure from your FDA-cleared cuff? No pressure — just a gentle nudge."
        case .heartRateCheck:
            return "You’re doing great. Optional pulse check via Watch, Health, or camera PPG (heart rate only — not blood pressure)."
        case .medication:
            return reminder.notes ?? "Friendly reminder for your medication. Follow your clinician’s instructions."
        case .custom:
            return reminder.notes ?? "We’re here when you’re ready. Small steps count."
        }
    }
}
