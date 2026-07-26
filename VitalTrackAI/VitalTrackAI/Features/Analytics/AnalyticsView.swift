import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct AnalyticsView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var stats = HistoryStats()
    @State private var reportNarrative = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Analytics",
                    title: "Your trends",
                    subtitle: "Personalized patterns from pulse and cuff logs."
                )
                VTDisclaimerBanner(.insights)
                VTDisclaimerBanner(.bloodPressure)

                VTCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Weekly pulse")
                            .font(VTTypography.title(18))
                        if stats.weeklyBPMs.isEmpty {
                            Text("No pulse data yet.")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        } else {
                            ChartBars(values: stats.weeklyBPMs)
                                .frame(height: 130)
                        }
                    }
                }

                VTCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Personal records")
                            .font(VTTypography.title(18))
                        Text("Average \(stats.averageBPM.map { String(format: "%.0f BPM", $0) } ?? "—")")
                        Text("Highest \(stats.highestBPM.map { String(format: "%.0f BPM", $0) } ?? "—")")
                        Text("Lowest \(stats.lowestBPM.map { String(format: "%.0f BPM", $0) } ?? "—")")
                        Text("Measurement streak \(stats.measurementStreak) days")
                    }
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                }

                if !reportNarrative.isEmpty {
                    VTCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("AI weekly report")
                                .font(VTTypography.title(18))
                            Text(reportNarrative)
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        }
                    }
                }
            }
            .padding(20)
        }
        .background(VTAtmosphere())
        .task {
            let context = (try? await composition.companionStore.companionContext()) ?? CompanionContext()
            stats = await composition.scoreEngine.historyStats(from: context)
            let score = await composition.scoreEngine.computeDailyScore(from: context)
            reportNarrative = await composition.summaryEngine.weeklyReport(from: context, score: score).narrative
        }
    }
}
