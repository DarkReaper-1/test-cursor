import Foundation

public protocol HealthKitSyncing: Sendable {
    var isAvailable: Bool { get }
    func requestAuthorization(writeBloodPressure: Bool) async throws
    func importBloodPressure(since: Date) async throws -> [BloodPressureReading]
    func importHeartRate(since: Date) async throws -> [HeartRateSample]
    func importHRV(since: Date) async throws -> [HRVSample]
    func writeBloodPressure(_ reading: BloodPressureReading) async throws
}
