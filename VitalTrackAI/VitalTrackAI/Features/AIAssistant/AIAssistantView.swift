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
                VStack(alignment: .leading, spacing: 18) {
                    VTScreenHeader(
                        eyebrow: "Insights",
                        title: "Plain-language tips",
                        subtitle: "Patterns from your logs — never a diagnosis."
                    )

                    VTDisclaimerBanner(.custom(
                        "Not a diagnosis. These tips are informational only and are not medical advice. Ask your clinician about your health."
                    ))

                    VTPrimaryButton(isLoading ? "Refreshing…" : "Refresh tips") {
                        Task { await refresh() }
                    }
                    .disabled(isLoading)

                    if insights.isEmpty {
                        VTEmptyState(
                            title: "No tips yet",
                            message: "Log a few cuff blood pressure readings and a heart-rate check to unlock helpful patterns.",
                            systemImage: "lightbulb"
                        )
                    } else {
                        ForEach(insights) { insight in
                            VTCard {
                                HStack(alignment: .top, spacing: 14) {
                                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                                        .fill(VTColors.brandPrimary)
                                        .frame(width: 4)
                                        .padding(.vertical, 2)
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text(insight.title)
                                            .font(VTTypography.title(20))
                                            .foregroundStyle(VTColors.textPrimary)
                                        Text(insight.body)
                                            .font(VTTypography.body())
                                            .foregroundStyle(VTColors.textSecondary)
                                            .fixedSize(horizontal: false, vertical: true)
                                        VTSourceChip(insight.severity.rawValue.capitalized)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(VTAtmosphere())
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

#Preview {
    AIAssistantView()
        .environmentObject(AppComposition())
}
