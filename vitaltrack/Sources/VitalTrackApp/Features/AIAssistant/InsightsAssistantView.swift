import SwiftUI
import VitalTrackCore

/// The product brief calls this an "AI Assistant". What's shipped here is
/// rule-based statistics over your own logged readings, computed entirely
/// on-device — not a chat interface, not a generative model, nothing
/// leaves your phone to produce these. That's a deliberate call: the
/// product's own "never mislead users" principle rules out implying a
/// conversational AI that doesn't exist. See `InsightsEngine` and
/// docs/PRD.md for the reasoning and what a real assistant would need.
struct InsightsAssistantView: View {
    @EnvironmentObject private var container: AppContainer
    @State private var insights: [Insight] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Smart Insights — patterns detected on-device from your own readings. "
                        + "This is informational only and not medical advice.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if isLoading {
                    ProgressView()
                } else {
                    ForEach(insights) { insight in
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: icon(for: insight.tone))
                                .foregroundStyle(color(for: insight.tone))
                            Text(insight.text)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Insights")
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private func load() async {
        isLoading = true
        insights = (try? await container.insightsEngine.buildInsights()) ?? []
        isLoading = false
    }

    private func icon(for tone: InsightTone) -> String {
        switch tone {
        case .positive: return "checkmark.circle.fill"
        case .caution: return "exclamationmark.circle.fill"
        case .neutral: return "sparkles"
        }
    }

    private func color(for tone: InsightTone) -> Color {
        switch tone {
        case .positive: return VTColor.good
        case .caution: return VTColor.caution
        case .neutral: return .secondary
        }
    }
}
