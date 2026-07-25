import Foundation

public protocol DeviceRepository: Sendable {
    func fetchAll() async throws -> [Device]
    func save(_ device: Device) async throws
    func delete(id: UUID) async throws
}
