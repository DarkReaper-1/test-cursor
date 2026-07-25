import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct AIAssistantView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var insights: [Insight] = []
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Insights")
                        .font(VTTypography.display(34))
                        .foregroundStyle(VTColors.brandPrimary)
                    Text("Offline heuristics that describe patterns in your logs. Not a diagnosis.")
                        .font(VTTypography.body(15))
                        .foregroundStyle(VTColors.textSecondary)

                    VTDisclaimerBanner(.insights)
                    VTDisclaimerBanner(.bloodPressure)

                    VTPrimaryButton(isLoading ? "Refreshing…" : "Refresh insights") {
                        Task { await refresh() }
                    }
                    .disabled(isLoading)

                    if insights.isEmpty {
                        VTEmptyState(
                            title: "No insights yet",
                            message: "Log a few BP cuff readings and heart rate samples to see informational trends.",
                            systemImage: "sparkles"
                        )
                    } else {
                        ForEach(insights) { insight in
                            VTCard {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(insight.title)
                                        .font(VTTypography.title(18))
                                    Text(insight.body)
                                        .font(VTTypography.body(15))
                                        .foregroundStyle(VTColors.textSecondary)
                                    Text(insight.severity.rawValue.capitalized)
                                        .font(VTTypography.caption())
                                        .foregroundStyle(VTColors.textTertiary)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
            .background(VTColors.canvasGradient.ignoresSafeArea())
            .task { await refresh() }
        }
    }

    private func refresh() async {
        isLoading = true
        defer { isLoading = false }
        if let context = try? await composition.readingStore.insightContext() {
            insights = await composition.environment.insightEngine.generateInsights(from: context)
        }
    }
}
