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
    let medicationRepository: InMemoryMedicationRepository
    let stressCheckRepository: InMemoryStressCheckRepository
    let careProfileRepository: InMemoryCareProfileRepository
    let settingsStore: UserSettingsStore
    let reminderScheduler: ReminderScheduler
    let csvImport: CSVImportService
    let bluetoothManager: BluetoothManager
    let scoreEngine: ScoreEngine
    let summaryEngine: DailySummaryEngine
    let coachEngine: CoachAnswerEngine
    let crisisEngine: CrisisGuidanceEngine

    init() {
        let bpRepo = InMemoryBloodPressureRepository()
        let hrRepo = InMemoryHeartRateRepository()
        let hrvRepo = InMemoryHRVRepository()
        let deviceRepo = InMemoryDeviceRepository()
        let checkIns = InMemoryCheckInRepository()
        let medications = InMemoryMedicationRepository()
        let stressChecks = InMemoryStressCheckRepository()
        let careProfiles = InMemoryCareProfileRepository()
        let healthKit = HealthKitService()
        let bluetooth = BluetoothManager()
        let exporter = CSVExporter()
        let doctor = DoctorReportFormatter()
        let pdf = PDFReportBuilder()
        let insights = HeuristicInsightEngine()
        let scores = ScoreEngine()
        let summaries = DailySummaryEngine()
        let coach = CoachAnswerEngine()
        let crisis = CrisisGuidanceEngine()

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
            checkIns: checkIns,
            medications: medications,
            stressChecks: stressChecks
        )
        self.checkInRepository = checkIns
        self.medicationRepository = medications
        self.stressCheckRepository = stressChecks
        self.careProfileRepository = careProfiles
        self.settingsStore = UserSettingsStore()
        self.reminderScheduler = ReminderScheduler()
        self.csvImport = CSVImportService()
        self.bluetoothManager = bluetooth
        self.scoreEngine = scores
        self.summaryEngine = summaries
        self.coachEngine = coach
        self.crisisEngine = crisis
    }
}
