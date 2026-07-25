import SwiftUI
import VitalTrackDesignSystem

struct MoreView: View {
    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink("Analytics") { AnalyticsView() }
                    NavigationLink("History") { HistoryView() }
                    NavigationLink("Devices") { DevicesView() }
                    NavigationLink("Reports") { ReportsView() }
                }
                Section {
                    NavigationLink("Settings") { SettingsView() }
                    NavigationLink("Subscription") { SubscriptionView() }
                    NavigationLink("Privacy") { PrivacyView() }
                    NavigationLink("Help") { HelpView() }
                }
            }
            .scrollContentBackground(.hidden)
            .background(VTColors.canvasGradient.ignoresSafeArea())
            .navigationTitle("More")
            .safeAreaInset(edge: .bottom) {
                VTDisclaimerBanner(.custom(TrustCopy.shortBPBanner))
                    .padding()
            }
        }
    }
}
