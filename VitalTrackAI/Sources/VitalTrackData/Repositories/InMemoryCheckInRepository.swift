import Foundation
import VitalTrackCore

public actor InMemoryCheckInRepository: CheckInRepository {
    private var items: [CheckIn] = []
    private let store: JSONFileStore<CheckIn>
    private let calendar = Calendar.current

    public init(filename: String = "check_ins.json", directory: URL? = nil) {
        self.store = JSONFileStore(filename: filename, directory: directory)
    }

    private func ensureLoaded() async {
        if items.isEmpty {
            items = (try? await store.load()) ?? []
        }
    }

    public func fetchAll() async throws -> [CheckIn] {
        await ensureLoaded()
        return items.sorted { $0.date > $1.date }
    }

    public func fetchToday() async throws -> CheckIn? {
        await ensureLoaded()
        return items.first { calendar.isDateInToday($0.date) }
    }

    public func upsert(_ checkIn: CheckIn) async throws {
        await ensureLoaded()
        if let idx = items.firstIndex(where: { calendar.isDate($0.date, inSameDayAs: checkIn.date) }) {
            items[idx] = checkIn
        } else {
            items.insert(checkIn, at: 0)
        }
        try await store.save(items)
    }
}
