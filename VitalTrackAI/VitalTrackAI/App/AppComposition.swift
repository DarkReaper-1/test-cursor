import Foundation
import VitalTrackCore
import VitalTrackData
import VitalTrackHealthKit
import VitalTrackBluetooth
import VitalTrackAIInsights
import VitalTrackExport
import VitalTrackNotifications

@MainActor
final class AppComposition: ObservableObject {
    let environment: AppEnvironment
    let readingStore: ReadingStore
    let settingsStore: UserSettingsStore
    let reminderScheduler: ReminderScheduler
    let csvImport: CSVImportService
    let bluetoothManager: BluetoothManager

    init() {
        let bpRepo = InMemoryBloodPressureRepository()
        let hrRepo = InMemoryHeartRateRepository()
        let hrvRepo = InMemoryHRVRepository()
        let deviceRepo = InMemoryDeviceRepository()
        let healthKit = HealthKitService()
        let bluetooth = BluetoothManager()
        let exporter = CSVExporter()
        let doctor = DoctorReportFormatter()
        let pdf = PDFReportBuilder()
        let insights = HeuristicInsightEngine()

        self.environment = AppEnvironment(
            bloodPressureRepository: bpRepo,
            heartRateRepository: hrRepo,
            hrvRepository: hrvRepo,
            deviceRepository: deviceRepo,
            insightEngine: insights,
            healthKit: healthKit,
            bluetooth: bluetooth,
            exporter: exporter,
            doctorReportFormatter: doctor,
            pdfBuilder: pdf
        )
        self.readingStore = ReadingStore(bloodPressure: bpRepo, heartRate: hrRepo, hrv: hrvRepo)
        self.settingsStore = UserSettingsStore()
        self.reminderScheduler = ReminderScheduler()
        self.csvImport = CSVImportService()
        self.bluetoothManager = bluetooth
    }
}
