import Foundation
import VitalTrackCore

/// Manual, constructor-based dependency injection — one small container
/// built once at launch and threaded through the environment, rather than
/// a DI framework. Every dependency here is a protocol or a plain class
/// with no singletons required, so any view model can be constructed in
/// isolation for previews and tests by passing fakes instead.
@MainActor
public final class AppContainer: ObservableObject {
    public let repository: HealthRepository
    public let healthKit: HealthKitManager
    public let insightsEngine: InsightsEngine
    public let reminderScheduler: ReminderScheduler
    public let exportManager: ExportManager
    public let settings: SettingsStore

    public init(
        repository: HealthRepository = CoreDataHealthRepository(),
        healthKit: HealthKitManager = HealthKitManager(),
        reminderScheduler: ReminderScheduler = ReminderScheduler(),
        settings: SettingsStore = SettingsStore()
    ) {
        self.repository = repository
        self.healthKit = healthKit
        self.insightsEngine = InsightsEngine(repository: repository)
        self.reminderScheduler = reminderScheduler
        self.exportManager = ExportManager(repository: repository)
        self.settings = settings
    }

    /// A container wired to in-memory fakes with sample data — used by
    /// SwiftUI previews so screens render without touching Core Data,
    /// HealthKit, or Bluetooth.
    public static func preview() -> AppContainer {
        let repo = InMemoryHealthRepository(
            heartRate: SampleData.heartRate,
            bloodPressure: SampleData.bloodPressure
        )
        return AppContainer(repository: repo)
    }
}
