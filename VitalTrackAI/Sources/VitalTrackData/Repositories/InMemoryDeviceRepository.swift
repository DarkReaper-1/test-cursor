import Foundation
import VitalTrackCore

public actor InMemoryDeviceRepository: DeviceRepository {
    private let store: JSONFileStore<Device>

    public init(filename: String = "devices.json", directory: URL? = nil) {
        self.store = JSONFileStore(filename: filename, directory: directory)
    }

    public func fetchAll() async throws -> [Device] {
        try await store.load().sorted { ($0.lastConnectedAt ?? .distantPast) > ($1.lastConnectedAt ?? .distantPast) }
    }

    public func save(_ device: Device) async throws {
        var items = try await store.load()
        if let idx = items.firstIndex(where: { $0.id == device.id }) {
            items[idx] = device
        } else {
            items.append(device)
        }
        try await store.save(items)
    }

    public func delete(id: UUID) async throws {
        var items = try await store.load()
        items.removeAll { $0.id == id }
        try await store.save(items)
    }
}
