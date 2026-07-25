import SwiftUI
import VitalTrackDesignSystem

struct RootView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var composition: AppComposition

    var body: some View {
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
        .background(VTColors.canvasGradient.ignoresSafeArea())
        .animation(.easeInOut(duration: 0.28), value: session.phase)
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
                .tabItem { Label("Heart", systemImage: "heart.fill") }
                .tag(AppTab.heart)

            BloodPressureView()
                .tabItem { Label("BP", systemImage: "waveform.path.ecg") }
                .tag(AppTab.bloodPressure)

            AIAssistantView()
                .tabItem { Label("Insights", systemImage: "sparkles") }
                .tag(AppTab.insights)

            MoreView()
                .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
                .tag(AppTab.more)
        }
        .tint(VTColors.brandPrimary)
    }
}
