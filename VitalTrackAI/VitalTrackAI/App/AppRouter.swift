import SwiftUI
import VitalTrackDesignSystem

struct RootView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var composition: AppComposition

    var body: some View {
        ZStack {
            VTAtmosphere()
            Group {
                switch session.phase {
                case .splash:
                    SplashView()
                        .task {
                            await session.bootstrap(settingsStore: composition.settingsStore)
                        }
                case .onboarding:
                    OnboardingFlowView()
                case .main:
                    MainTabView()
                }
            }
        }
        .animation(.easeInOut(duration: 0.32), value: session.phase)
    }
}

struct MainTabView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        TabView(selection: $session.selectedTab) {
            DashboardView()
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(AppTab.home)

            HeartRateView()
                .tabItem { Label("Pulse", systemImage: "waveform.path.ecg") }
                .tag(AppTab.heart)

            BloodPressureView()
                .tabItem { Label("BP", systemImage: "heart.text.square.fill") }
                .tag(AppTab.bloodPressure)

            AIAssistantView()
                .tabItem { Label("Tips", systemImage: "lightbulb.fill") }
                .tag(AppTab.insights)

            MoreView()
                .tabItem { Label("More", systemImage: "line.3.horizontal") }
                .tag(AppTab.more)
        }
        .tint(VTColors.brandPrimary)
    }
}
