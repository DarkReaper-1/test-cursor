import Foundation
import VitalTrackCore

public actor UserSettingsStore {
    private let store: JSONFileStore<CodableBox<UserSettings>>
    private let defaults = UserSettings.default

    public init(filename: String = "user_settings.json", directory: URL? = nil) {
        self.store = JSONFileStore(filename: filename, directory: directory)
    }

    public func load() async -> UserSettings {
        let boxes = (try? await store.load()) ?? []
        return boxes.first?.value ?? defaults
    }

    public func save(_ settings: UserSettings) async throws {
        try await store.save([CodableBox(value: settings)])
    }
}

private struct CodableBox<T: Codable & Sendable>: Codable, Sendable {
    var value: T
}
