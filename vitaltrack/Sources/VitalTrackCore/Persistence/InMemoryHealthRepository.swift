import Foundation

/// A dependency-free fake for previews, tests, and view-model unit tests —
/// no Core Data stack required.
public actor InMemoryHealthRepository: HealthRepository {
    private var heartRate: [HeartRateReading] = []
    private var bloodPressure: [BloodPressureReading] = []

    public init(heartRate: [HeartRateReading] = [], bloodPressure: [BloodPressureReading] = []) {
        self.heartRate = heartRate
        self.bloodPressure = bloodPressure
    }

    public func addHeartRate(_ reading: HeartRateReading) async throws {
        heartRate.append(reading)
    }

    public func addBloodPressure(_ reading: BloodPressureReading) async throws {
        bloodPressure.append(reading)
    }

    public func deleteHeartRate(id: UUID) async throws {
        heartRate.removeAll { $0.id == id }
    }

    public func deleteBloodPressure(id: UUID) async throws {
        bloodPressure.removeAll { $0.id == id }
    }

    public func heartRateReadings(since: Date? = nil) async throws -> [HeartRateReading] {
        heartRate
            .filter { since == nil || $0.takenAt >= since! }
            .sorted { $0.takenAt > $1.takenAt }
    }

    public func bloodPressureReadings(since: Date? = nil) async throws -> [BloodPressureReading] {
        bloodPressure
            .filter { since == nil || $0.takenAt >= since! }
            .sorted { $0.takenAt > $1.takenAt }
    }

    public func latestHeartRate() async throws -> HeartRateReading? {
        try await heartRateReadings(since: nil).first
    }

    public func latestBloodPressure() async throws -> BloodPressureReading? {
        try await bloodPressureReadings(since: nil).first
    }

    public func deleteAll() async throws {
        heartRate.removeAll()
        bloodPressure.removeAll()
    }
}
