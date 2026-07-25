import Foundation
import VitalTrackCore

/// Facade over BP/HR repositories for dashboard and history screens.
public actor ReadingStore {
    private let bloodPressure: any BloodPressureRepository
    private let heartRate: any HeartRateRepository
    private let hrv: any HRVRepository

    public init(
        bloodPressure: any BloodPressureRepository,
        heartRate: any HeartRateRepository,
        hrv: any HRVRepository
    ) {
        self.bloodPressure = bloodPressure
        self.heartRate = heartRate
        self.hrv = hrv
    }

    public func latestBloodPressure() async throws -> BloodPressureReading? {
        try await bloodPressure.fetchRecent(limit: 1).first
    }

    public func latestHeartRate() async throws -> HeartRateSample? {
        try await heartRate.fetchRecent(limit: 1).first
    }

    public func insightContext(limit: Int = 60) async throws -> InsightContext {
        let bp = try await bloodPressure.fetchRecent(limit: limit)
        let hr = try await heartRate.fetchRecent(limit: limit)
        let hrvSamples = try await hrv.fetchRecent(limit: limit)
        return InsightContext(
            bloodPressure: bp,
            heartRate: hr,
            hrv: hrvSamples,
            lastLogDate: bp.first?.recordedAt ?? hr.first?.recordedAt
        )
    }

    public func addBloodPressure(_ reading: BloodPressureReading) async throws {
        try await bloodPressure.save(reading)
    }

    public func addHeartRate(_ sample: HeartRateSample) async throws {
        try await heartRate.save(sample)
    }
}
