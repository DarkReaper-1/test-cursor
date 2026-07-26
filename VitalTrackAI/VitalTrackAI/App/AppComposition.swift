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
    let companionStore: CompanionStore
    let checkInRepository: InMemoryCheckInRepository
    let settingsStore: UserSettingsStore
    let reminderScheduler: ReminderScheduler
    let csvImport: CSVImportService
    let bluetoothManager: BluetoothManager
    let scoreEngine: ScoreEngine
    let summaryEngine: DailySummaryEngine
    let coachEngine: CoachAnswerEngine

    init() {
        let bpRepo = InMemoryBloodPressureRepository()
        let hrRepo = InMemoryHeartRateRepository()
        let hrvRepo = InMemoryHRVRepository()
        let deviceRepo = InMemoryDeviceRepository()
        let checkIns = InMemoryCheckInRepository()
        let healthKit = HealthKitService()
        let bluetooth = BluetoothManager()
        let exporter = CSVExporter()
        let doctor = DoctorReportFormatter()
        let pdf = PDFReportBuilder()
        let insights = HeuristicInsightEngine()
        let scores = ScoreEngine()
        let summaries = DailySummaryEngine()
        let coach = CoachAnswerEngine()

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
        self.companionStore = CompanionStore(
            bloodPressure: bpRepo,
            heartRate: hrRepo,
            hrv: hrvRepo,
            checkIns: checkIns
        )
        self.checkInRepository = checkIns
        self.settingsStore = UserSettingsStore()
        self.reminderScheduler = ReminderScheduler()
        self.csvImport = CSVImportService()
        self.bluetoothManager = bluetooth
        self.scoreEngine = scores
        self.summaryEngine = summaries
        self.coachEngine = coach
    }
}
