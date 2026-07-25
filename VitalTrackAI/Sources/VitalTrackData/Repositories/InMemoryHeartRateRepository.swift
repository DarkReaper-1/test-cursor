import Foundation
import VitalTrackCore

public actor InMemoryHeartRateRepository: HeartRateRepository {
    private let store: JSONFileStore<HeartRateSample>

    public init(filename: String = "hr_samples.json", directory: URL? = nil) {
        self.store = JSONFileStore(filename: filename, directory: directory)
    }

    public func fetchAll() async throws -> [HeartRateSample] {
        try await store.load().sorted { $0.recordedAt > $1.recordedAt }
    }

    public func fetchRecent(limit: Int) async throws -> [HeartRateSample] {
        Array(try await fetchAll().prefix(max(0, limit)))
    }

    public func save(_ sample: HeartRateSample) async throws {
        guard sample.bpm > 0, sample.bpm < 300 else {
            throw VitalTrackError.invalidReading("Heart rate BPM out of range.")
        }
        var items = try await store.load()
        if let idx = items.firstIndex(where: { $0.id == sample.id }) {
            items[idx] = sample
        } else {
            items.append(sample)
        }
        try await store.save(items)
    }

    public func delete(id: UUID) async throws {
        var items = try await store.load()
        items.removeAll { $0.id == id }
        try await store.save(items)
    }
}

public actor InMemoryHRVRepository: HRVRepository {
    private let store: JSONFileStore<HRVSample>

    public init(filename: String = "hrv_samples.json", directory: URL? = nil) {
        self.store = JSONFileStore(filename: filename, directory: directory)
    }

    public func fetchRecent(limit: Int) async throws -> [HRVSample] {
        let all = try await store.load().sorted { $0.recordedAt > $1.recordedAt }
        return Array(all.prefix(max(0, limit)))
    }

    public func save(_ sample: HRVSample) async throws {
        var items = try await store.load()
        if let idx = items.firstIndex(where: { $0.id == sample.id }) {
            items[idx] = sample
        } else {
            items.append(sample)
        }
        try await store.save(items)
    }
}
