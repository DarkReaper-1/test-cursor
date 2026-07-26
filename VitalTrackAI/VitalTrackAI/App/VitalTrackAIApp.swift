import SwiftUI
import VitalTrackDesignSystem

@main
struct VitalTrackAIApp: App {
    @StateObject private var session = SessionStore()
    @StateObject private var composition = AppComposition()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .environmentObject(composition)
                .preferredColorScheme(.light)
                // Comfort-first baseline for adults 40+; Settings can still prefer system sizing later.
                .dynamicTypeSize(session.settings.largerText ? .xLarge : .large)
        }
    }
}
