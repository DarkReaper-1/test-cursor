import Foundation
import VitalTrackCore

/// Facade for companion AI context (readings + check-ins + medications + stress).
public actor CompanionStore {
    private let bloodPressure: any BloodPressureRepository
    private let heartRate: any HeartRateRepository
    private let hrv: any HRVRepository
    private let checkIns: any CheckInRepository
    private let medications: any MedicationRepository
    private let stressChecks: any StressCheckRepository

    public init(
        bloodPressure: any BloodPressureRepository,
        heartRate: any HeartRateRepository,
        hrv: any HRVRepository,
        checkIns: any CheckInRepository,
        medications: any MedicationRepository,
        stressChecks: any StressCheckRepository
    ) {
        self.bloodPressure = bloodPressure
        self.heartRate = heartRate
        self.hrv = hrv
        self.checkIns = checkIns
        self.medications = medications
        self.stressChecks = stressChecks
    }

    public func companionContext(waterGoal: Int = 8, limit: Int = 90) async throws -> CompanionContext {
        let bp = try await bloodPressure.fetchRecent(limit: limit)
        let hr = try await heartRate.fetchRecent(limit: limit)
        let hrvSamples = try await hrv.fetchRecent(limit: limit)
        let ci = try await checkIns.fetchAll()
        let meds = try await medications.fetchAll()
        let doses = try await medications.fetchDoses(limit: 60)
        let stress = try await stressChecks.fetchRecent(limit: limit)
        return CompanionContext(
            bloodPressure: bp,
            heartRate: hr,
            hrv: hrvSamples,
            checkIns: ci,
            medications: meds,
            doses: doses,
            stressChecks: stress,
            waterGoalGlasses: waterGoal,
            lastLogDate: bp.first?.recordedAt
                ?? hr.first?.recordedAt
                ?? stress.first?.recordedAt
                ?? ci.first?.date
        )
    }

    public func upsertCheckIn(_ checkIn: CheckIn) async throws {
        try await checkIns.upsert(checkIn)
    }

    public func todayCheckIn() async throws -> CheckIn? {
        try await checkIns.fetchToday()
    }

    public func saveStressCheck(_ check: StressCheck) async throws {
        try await stressChecks.save(check)
    }

    public func todayStressCheck() async throws -> StressCheck? {
        try await stressChecks.fetchToday()
    }
}
