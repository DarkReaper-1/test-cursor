import Foundation
import VitalTrackCore

@MainActor
final class SessionStore: ObservableObject {
    enum Phase: Equatable {
        case splash
        case onboarding
        case main
    }

    @Published var phase: Phase = .splash
    @Published var settings: UserSettings = .default
    @Published var selectedTab: AppTab = .home

    func bootstrap(settingsStore: UserSettingsStore) async {
        try? await Task.sleep(nanoseconds: 900_000_000)
        let loaded = await settingsStore.load()
        settings = loaded
        phase = loaded.hasCompletedOnboarding ? .main : .onboarding
    }

    func completeOnboarding(settingsStore: UserSettingsStore) async {
        settings.hasCompletedOnboarding = true
        try? await settingsStore.save(settings)
        phase = .main
    }

    func updateSettings(_ newValue: UserSettings, settingsStore: UserSettingsStore) async {
        settings = newValue
        try? await settingsStore.save(newValue)
    }
}

enum AppTab: Hashable {
    case home
    case heart
    case bloodPressure
    case insights
    case more
}
