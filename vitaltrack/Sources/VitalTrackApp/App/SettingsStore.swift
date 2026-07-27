import Foundation
import SwiftUI
import VitalTrackCore

/// Small on-device flags — not health data, so `@AppStorage` (backed by
/// `UserDefaults`) is enough; no need for the Core Data stack here.
public final class SettingsStore: ObservableObject {
    @AppStorage("vitaltrack.onboardingCompleted") public var onboardingCompleted: Bool = false
    @AppStorage("vitaltrack.healthKitWriteEnabled") public var healthKitWriteEnabled: Bool = false
    @AppStorage("vitaltrack.healthKitReadEnabled") public var healthKitReadEnabled: Bool = false
    @AppStorage("vitaltrack.iCloudSyncEnabled") public var iCloudSyncEnabled: Bool = false

    @AppStorage("vitaltrack.reminderSchedulesData") private var reminderSchedulesData: Data = Data()

    public init() {}

    /// Persisted so the Settings screen's toggles always reflect what's
    /// actually scheduled with the OS — a toggle that silently forgot its
    /// state after a relaunch, while the underlying notification kept
    /// firing, is exactly the kind of quiet mismatch this app's
    /// transparency principle rules out.
    public var reminderSchedules: [ReminderSchedule] {
        get {
            if let decoded = try? JSONDecoder().decode([ReminderSchedule].self, from: reminderSchedulesData),
               !decoded.isEmpty {
                return decoded
            }
            return ReminderKind.allCases.map { ReminderSchedule(kind: $0, hour: 9, minute: 0) }
        }
        set {
            reminderSchedulesData = (try? JSONEncoder().encode(newValue)) ?? Data()
        }
    }
}
