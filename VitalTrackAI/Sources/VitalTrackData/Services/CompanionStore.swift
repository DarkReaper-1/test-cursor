import Foundation
import VitalTrackCore

/// Facade for companion AI context (readings + check-ins).
public actor CompanionStore {
    private let bloodPressure: any BloodPressureRepository
    private let heartRate: any HeartRateRepository
    private let hrv: any HRVRepository
    private let checkIns: any CheckInRepository

    public init(
        bloodPressure: any BloodPressureRepository,
        heartRate: any HeartRateRepository,
        hrv: any HRVRepository,
        checkIns: any CheckInRepository
    ) {
        self.bloodPressure = bloodPressure
        self.heartRate = heartRate
        self.hrv = hrv
        self.checkIns = checkIns
    }

    public func companionContext(waterGoal: Int = 8, limit: Int = 90) async throws -> CompanionContext {
        let bp = try await bloodPressure.fetchRecent(limit: limit)
        let hr = try await heartRate.fetchRecent(limit: limit)
        let hrvSamples = try await hrv.fetchRecent(limit: limit)
        let ci = try await checkIns.fetchAll()
        return CompanionContext(
            bloodPressure: bp,
            heartRate: hr,
            hrv: hrvSamples,
            checkIns: ci,
            waterGoalGlasses: waterGoal,
            lastLogDate: bp.first?.recordedAt ?? hr.first?.recordedAt ?? ci.first?.date
        )
    }

    public func upsertCheckIn(_ checkIn: CheckIn) async throws {
        try await checkIns.upsert(checkIn)
    }

    public func todayCheckIn() async throws -> CheckIn? {
        try await checkIns.fetchToday()
    }
}
