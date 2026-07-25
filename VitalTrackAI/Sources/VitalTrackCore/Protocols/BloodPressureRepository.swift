import Foundation

public protocol BloodPressureRepository: Sendable {
    func fetchAll() async throws -> [BloodPressureReading]
    func fetchRecent(limit: Int) async throws -> [BloodPressureReading]
    func fetch(id: UUID) async throws -> BloodPressureReading?
    func save(_ reading: BloodPressureReading) async throws
    func delete(id: UUID) async throws
    func deleteAll() async throws
}
