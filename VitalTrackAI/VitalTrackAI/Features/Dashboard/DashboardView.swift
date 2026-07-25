import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct DashboardView: View {
    @EnvironmentObject private var composition: AppComposition
    @EnvironmentObject private var session: SessionStore
    @State private var latestBP: BloodPressureReading?
    @State private var latestHR: HeartRateSample?
    @State private var insights: [Insight] = []
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("VitalTrack AI")
                        .font(VTTypography.display(34))
                        .foregroundStyle(VTColors.brandPrimary)
                        .accessibilityAddTraits(.isHeader)

                    Text(greeting)
                        .font(VTTypography.body())
                        .foregroundStyle(VTColors.textSecondary)

                    VTDisclaimerBanner(.custom(TrustCopy.firstLaunchBanner + " " + TrustCopy.insightsBanner))

                    ForEach(session.settings.dashboardCards) { card in
                        cardView(card)
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.danger)
                    }
                }
                .padding()
            }
            .background(VTColors.canvasGradient.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .accessibilityLabel("Refresh dashboard")
                }
            }
            .task { await refresh() }
            .refreshable { await refresh() }
        }
    }

    private var greeting: String {
        if let name = session.settings.preferredName, !name.isEmpty {
            return "Hello, \(name)"
        }
        return "Your vitals at a glance"
    }

    @ViewBuilder
    private func cardView(_ kind: DashboardCardKind) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 10) {
                VTSectionHeader(kind.title)
                switch kind {
                case .latestBloodPressure:
                    if let bp = latestBP {
                        VTMetricHero(
                            value: bp.displayValue,
                            unit: "mmHg",
                            caption: "\(bp.source.displayName) · \(bp.category.displayName)"
                        )
                    } else {
                        Text("No BP yet. Log from an FDA-cleared monitor.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                case .latestHeartRate:
                    if let hr = latestHR {
                        VTMetricHero(value: hr.displayBPM, unit: "BPM", caption: hr.source.displayName)
                    } else {
                        Text("No heart rate yet. Use camera PPG, Watch, or Health.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                case .insightsPreview:
                    if insights.isEmpty {
                        Text("Insights appear after you log a few measurements.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    } else {
                        ForEach(insights.prefix(2)) { insight in
                            Text(insight.title)
                                .font(VTTypography.body().weight(.semibold))
                            Text(insight.body)
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                                .lineLimit(3)
                        }
                    }
                case .weeklyBPTrend:
                    Text("See Analytics for weekly blood pressure charts from logged cuff/Health/CSV data.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                case .restingHRTrend:
                    Text("Resting heart rate trends use PPG/Health samples — never as blood pressure.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                case .devicesStatus:
                    Text("Pair FDA-cleared Bluetooth cuffs in Devices.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                case .reminders:
                    Text("Set logging reminders in Settings. Reminders never claim camera BP.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                case .hrvSnapshot:
                    Text("HRV imports from Apple Health when enabled.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
            }
        }
    }

    private func refresh() async {
        do {
            latestBP = try await composition.readingStore.latestBloodPressure()
            latestHR = try await composition.readingStore.latestHeartRate()
            let context = try await composition.readingStore.insightContext()
            insights = await composition.environment.insightEngine.generateInsights(from: context)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    DashboardView()
        .environmentObject(SessionStore())
        .environmentObject(AppComposition())
}
