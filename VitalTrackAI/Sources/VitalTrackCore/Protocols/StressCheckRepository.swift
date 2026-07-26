import Foundation

public protocol StressCheckRepository: Sendable {
    func fetchAll() async throws -> [StressCheck]
    func fetchRecent(limit: Int) async throws -> [StressCheck]
    func fetchToday() async throws -> StressCheck?
    func save(_ check: StressCheck) async throws
    func delete(id: UUID) async throws
}
