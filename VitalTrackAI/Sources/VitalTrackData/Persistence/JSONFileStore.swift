import Foundation

/// Simple actor-backed JSON file persistence for demo / offline-first storage.
public actor JSONFileStore<T: Codable & Sendable> {
    private let fileURL: URL
    private var cache: [T]?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(filename: String, directory: URL? = nil) {
        let dir = directory ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        self.fileURL = dir.appendingPathComponent(filename)
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    }

    public func load() async throws -> [T] {
        if let cache { return cache }
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            cache = []
            return []
        }
        let data = try Data(contentsOf: fileURL)
        let items = try decoder.decode([T].self, from: data)
        cache = items
        return items
    }

    public func save(_ items: [T]) async throws {
        let data = try encoder.encode(items)
        try data.write(to: fileURL, options: [.atomic])
        cache = items
    }
}
