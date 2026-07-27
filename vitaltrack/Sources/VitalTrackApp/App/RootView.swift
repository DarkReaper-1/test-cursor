import SwiftUI
import VitalTrackCore

public struct RootView: View {
    @StateObject private var settings: SettingsStore
    @StateObject private var container: AppContainer
    @State private var showSplash = true

    public init() {
        let settings = SettingsStore()
        _settings = StateObject(wrappedValue: settings)
        _container = StateObject(wrappedValue: AppContainer(settings: settings))
    }

    public var body: some View {
        ZStack {
            if showSplash {
                SplashView()
                    .transition(.opacity)
                    .task {
                        try? await Task.sleep(nanoseconds: 700_000_000)
                        withAnimation(.easeOut(duration: 0.25)) { showSplash = false }
                    }
            } else if !settings.onboardingCompleted {
                OnboardingView()
                    .transition(.opacity)
            } else {
                MainTabView()
                    .transition(.opacity)
            }
        }
        .environmentObject(container)
        .environmentObject(settings)
    }
}

struct SplashView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "heart.text.square.fill")
                .font(.system(size: 56))
                .foregroundStyle(VTColor.accent)
            Text("VitalTrack")
                .font(.title2.weight(.bold))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(uiColor: .systemBackground))
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "square.grid.2x2") }
            HistoryView()
                .tabItem { Label("History", systemImage: "clock") }
            AnalyticsView()
                .tabItem { Label("Analytics", systemImage: "chart.xyaxis.line") }
            InsightsAssistantView()
                .tabItem { Label("Insights", systemImage: "sparkles") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .tint(VTColor.accent)
    }
}
