import Foundation
import VitalTrackCore

public actor InMemoryBloodPressureRepository: BloodPressureRepository {
    private let store: JSONFileStore<BloodPressureReading>

    public init(filename: String = "bp_readings.json", directory: URL? = nil) {
        self.store = JSONFileStore(filename: filename, directory: directory)
    }

    public func fetchAll() async throws -> [BloodPressureReading] {
        try await store.load().sorted { $0.recordedAt > $1.recordedAt }
    }

    public func fetchRecent(limit: Int) async throws -> [BloodPressureReading] {
        Array(try await fetchAll().prefix(max(0, limit)))
    }

    public func fetch(id: UUID) async throws -> BloodPressureReading? {
        try await store.load().first { $0.id == id }
    }

    public func save(_ reading: BloodPressureReading) async throws {
        try TrustPolicy.assertValidBPSource(reading.source)
        guard reading.systolic > 0, reading.diastolic > 0 else {
            throw VitalTrackError.invalidReading("Systolic and diastolic must be positive.")
        }
        var items = try await store.load()
        if let idx = items.firstIndex(where: { $0.id == reading.id }) {
            items[idx] = reading
        } else {
            items.append(reading)
        }
        do {
            try await store.save(items)
        } catch {
            throw VitalTrackError.persistenceFailed(error.localizedDescription)
        }
    }

    public func delete(id: UUID) async throws {
        var items = try await store.load()
        items.removeAll { $0.id == id }
        try await store.save(items)
    }

    public func deleteAll() async throws {
        try await store.save([])
    }
}
