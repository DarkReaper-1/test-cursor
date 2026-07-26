import Foundation
import VitalTrackCore

public actor InMemoryStressCheckRepository: StressCheckRepository {
    private var items: [StressCheck] = []
    private let store: JSONFileStore<StressCheck>
    private let calendar = Calendar.current

    public init(filename: String = "stress_checks.json", directory: URL? = nil) {
        self.store = JSONFileStore(filename: filename, directory: directory)
    }

    private func ensureLoaded() async {
        if items.isEmpty {
            items = (try? await store.load()) ?? []
        }
    }

    public func fetchAll() async throws -> [StressCheck] {
        await ensureLoaded()
        return items.sorted { $0.recordedAt > $1.recordedAt }
    }

    public func fetchRecent(limit: Int) async throws -> [StressCheck] {
        Array(try await fetchAll().prefix(limit))
    }

    public func fetchToday() async throws -> StressCheck? {
        await ensureLoaded()
        return items
            .filter { calendar.isDateInToday($0.recordedAt) }
            .sorted { $0.recordedAt > $1.recordedAt }
            .first
    }

    public func save(_ check: StressCheck) async throws {
        await ensureLoaded()
        if let idx = items.firstIndex(where: { $0.id == check.id }) {
            items[idx] = check
        } else {
            items.insert(check, at: 0)
        }
        try await store.save(items)
    }

    public func delete(id: UUID) async throws {
        await ensureLoaded()
        items.removeAll { $0.id == id }
        try await store.save(items)
    }
}
