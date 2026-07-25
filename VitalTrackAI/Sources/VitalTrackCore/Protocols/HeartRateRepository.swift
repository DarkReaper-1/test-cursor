import Foundation

public protocol HeartRateRepository: Sendable {
    func fetchAll() async throws -> [HeartRateSample]
    func fetchRecent(limit: Int) async throws -> [HeartRateSample]
    func save(_ sample: HeartRateSample) async throws
    func delete(id: UUID) async throws
}

public protocol HRVRepository: Sendable {
    func fetchRecent(limit: Int) async throws -> [HRVSample]
    func save(_ sample: HRVSample) async throws
}
