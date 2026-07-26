import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct AnalyticsView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var stats = HistoryStats()
    @State private var reportNarrative = ""
    @State private var range = 0 // 0 week, 1 month, 2 year
    @State private var filter = 0 // 0 all, 1 morning, 2 evening, 3 before med, 4 after med
    @State private var bp: [BloodPressureReading] = []
    @State private var stressScores: [Double] = []
    @State private var anxietyAvg: String = "—"
    @State private var stressAvg: String = "—"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Analytics",
                    title: "Your trends",
                    subtitle: "Color-blind friendly bars. Zoom by week, month, or year."
                )
                VTDisclaimerBanner(.insights)
                VTDisclaimerBanner(.bloodPressure)

                Picker("Range", selection: $range) {
                    Text("Week").tag(0)
                    Text("Month").tag(1)
                    Text("Year").tag(2)
                }
                .pickerStyle(.segmented)

                Picker("Filter", selection: $filter) {
                    Text("All").tag(0)
                    Text("AM").tag(1)
                    Text("PM").tag(2)
                    Text("Before med").tag(3)
                    Text("After med").tag(4)
                }
                .pickerStyle(.segmented)

                VTCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(chartTitle)
                            .font(VTTypography.title(18))
                        if chartValues.isEmpty {
                            Text("Log cuff readings to unlock this chart.")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        } else {
                            ChartBars(values: chartValues, colorBlindSafe: true)
                                .frame(height: 140)
                            Text("Showing systolic mmHg. Higher bars mean higher systolic.")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textTertiary)
                        }
                    }
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    statTile("Avg BP", stats.averageSys.map { String(format: "%.0f/%.0f", $0, stats.averageDia ?? 0) } ?? "—")
                    statTile("Week avg sys", stats.weekAvgSys.map { String(format: "%.0f", $0) } ?? "—")
                    statTile("Month avg sys", stats.monthAvgSys.map { String(format: "%.0f", $0) } ?? "—")
                    statTile("Highest sys", stats.highestSys.map(String.init) ?? "—")
                    statTile("Lowest sys", stats.lowestSys.map(String.init) ?? "—")
                    statTile("Morning avg", stats.morningAvgSys.map { String(format: "%.0f", $0) } ?? "—")
                    statTile("Evening avg", stats.eveningAvgSys.map { String(format: "%.0f", $0) } ?? "—")
                    statTile("Before med", stats.beforeMedAvgSys.map { String(format: "%.0f", $0) } ?? "—")
                    statTile("After med", stats.afterMedAvgSys.map { String(format: "%.0f", $0) } ?? "—")
                    statTile("Pulse avg", stats.averageBPM.map { String(format: "%.0f BPM", $0) } ?? "—")
                }

                VTCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Weekly pulse")
                            .font(VTTypography.title(18))
                        if stats.weeklyBPMs.isEmpty {
                            Text("No pulse data yet.")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        } else {
                            ChartBars(values: stats.weeklyBPMs, colorBlindSafe: true)
                                .frame(height: 110)
                        }
                    }
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
        .task { await load() }
        .onChange(of: range) { _, _ in }
        .onChange(of: filter) { _, _ in }
    }

    private var chartTitle: String {
        let r = ["Weekly", "Monthly", "Yearly"][range]
        return "\(r) blood pressure (systolic)"
    }

    private var chartValues: [Double] {
        let filtered = filteredBP
        switch range {
        case 1: return Array(filtered.suffix(30).map { Double($0.systolic) })
        case 2: return Array(filtered.suffix(52).map { Double($0.systolic) })
        default: return Array(filtered.suffix(14).map { Double($0.systolic) })
        }
    }

    private var filteredBP: [BloodPressureReading] {
        let sorted = bp.sorted { $0.recordedAt < $1.recordedAt }
        switch filter {
        case 1: return sorted.filter { $0.timeBucket == .morning }
        case 2: return sorted.filter { $0.timeBucket == .evening || $0.timeBucket == .night }
        case 3: return sorted.filter { $0.medicationTiming == .beforeMedication }
        case 4: return sorted.filter { $0.medicationTiming == .afterMedication }
        default: return sorted
        }
    }

    private func statTile(_ title: String, _ value: String) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
                Text(value)
                    .font(VTTypography.body().weight(.bold))
                    .foregroundStyle(VTColors.textPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func load() async {
        let context = (try? await composition.companionStore.companionContext()) ?? CompanionContext()
        stats = await composition.scoreEngine.historyStats(from: context)
        bp = context.bloodPressure
        let score = await composition.scoreEngine.computeDailyScore(from: context)
        reportNarrative = await composition.summaryEngine.weeklyReport(from: context, score: score).narrative
    }
}
