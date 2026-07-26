import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct HistoryView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var segment = 0
    @State private var stats = HistoryStats()
    @State private var bp: [BloodPressureReading] = []
    @State private var hr: [HeartRateSample] = []
    @State private var weeklyNarrative = ""
    @State private var exportNote = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VTScreenHeader(
                    eyebrow: "History",
                    title: "Trends & records",
                    subtitle: "Charts and personal averages from your logs."
                )

                Picker("History", selection: $segment) {
                    Text("Overview").tag(0)
                    Text("Pulse").tag(1)
                    Text("Blood pressure").tag(2)
                }
                .pickerStyle(.segmented)

                if segment == 0 {
                    overview
                } else if segment == 1 {
                    VTDisclaimerBanner(.heartRate)
                    pulseList
                } else {
                    VTDisclaimerBanner(.bloodPressure)
                    bpList
                }
            }
            .padding(20)
        }
        .background(VTAtmosphere())
        .navigationTitle("History")
        .task { await load() }
    }

    private var overview: some View {
        VStack(alignment: .leading, spacing: 14) {
            VTCard(emphasized: true) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("This week")
                        .font(VTTypography.title(18))
                    if stats.weeklyBPMs.isEmpty {
                        Text("Take a few pulse checks to unlock your weekly chart.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    } else {
                        ChartBars(values: stats.weeklyBPMs)
                            .frame(height: 120)
                    }
                    Text(weeklyNarrative)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                statTile("Average pulse", stats.averageBPM.map { String(format: "%.0f BPM", $0) } ?? "—")
                statTile("Highest", stats.highestBPM.map { String(format: "%.0f BPM", $0) } ?? "—")
                statTile("Lowest", stats.lowestBPM.map { String(format: "%.0f BPM", $0) } ?? "—")
                statTile("Streak", "\(stats.measurementStreak) days")
                statTile("Avg BP", stats.averageSys.map { String(format: "%.0f/%.0f", $0, stats.averageDia ?? 0) } ?? "—")
                statTile("Total logs", "\(stats.totalMeasurements)")
            }

            if !stats.monthlyBPMs.isEmpty {
                VTCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Monthly pulse trend")
                            .font(VTTypography.title(18))
                        ChartBars(values: Array(stats.monthlyBPMs.suffix(16)))
                            .frame(height: 100)
                    }
                }
            }

            VTCard {
                VStack(alignment: .leading, spacing: 12) {
                    VTSectionHeader("Export & share", subtitle: "Doctor-ready summaries include trust disclaimers.")
                    VTPrimaryButton("Build weekly report text") {
                        Task { await buildWeeklyExport() }
                    }
                    VTPrimaryButton("Export BP CSV") {
                        Task { await exportCSV() }
                    }
                    if !exportNote.isEmpty {
                        Text(exportNote)
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                            .textSelection(.enabled)
                    }
                }
            }
        }
    }

    private var pulseList: some View {
        VTCard {
            VStack(alignment: .leading, spacing: 10) {
                if hr.isEmpty {
                    Text("No pulse samples yet.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                ForEach(hr.prefix(30)) { sample in
                    HStack {
                        Text("\(sample.displayBPM) BPM")
                            .font(VTTypography.body().weight(.bold))
                        VTSourceChip(sample.source.displayName)
                        Spacer()
                        Text(sample.recordedAt.formatted(date: .abbreviated, time: .shortened))
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }
            }
        }
    }

    private var bpList: some View {
        VTCard {
            VStack(alignment: .leading, spacing: 10) {
                if bp.isEmpty {
                    Text("No cuff readings yet. Log BP from an FDA-cleared monitor.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                ForEach(bp.prefix(30)) { reading in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(reading.displayValue) mmHg")
                                .font(VTTypography.body().weight(.bold))
                            Text(reading.category.displayName)
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        }
                        Spacer()
                        VTSourceChip(reading.source.displayName)
                    }
                }
            }
        }
    }

    private func statTile(_ title: String, _ value: String) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
                Text(value)
                    .font(VTTypography.title(20))
            }
        }
    }

    private func load() async {
        let context = (try? await composition.companionStore.companionContext()) ?? CompanionContext()
        stats = await composition.scoreEngine.historyStats(from: context)
        bp = context.bloodPressure
        hr = context.heartRate
        let score = await composition.scoreEngine.computeDailyScore(from: context)
        let report = await composition.summaryEngine.weeklyReport(from: context, score: score)
        weeklyNarrative = report.encouragement + " " + report.lifestyleWins.prefix(2).joined(separator: ". ")
    }

    private func buildWeeklyExport() async {
        let context = (try? await composition.companionStore.companionContext()) ?? CompanionContext()
        let score = await composition.scoreEngine.computeDailyScore(from: context)
        let report = await composition.summaryEngine.weeklyReport(from: context, score: score)
        exportNote = report.narrative
    }

    private func exportCSV() async {
        let bp = (try? await composition.environment.bloodPressureRepository.fetchAll()) ?? []
        if let data = try? await composition.environment.exporter.exportBloodPressureCSV(bp) {
            exportNote = "CSV ready (\(data.count) bytes). Sources labeled; camera is never a BP source."
        }
    }
}

struct ChartBars: View {
    let values: [Double]

    var body: some View {
        GeometryReader { geo in
            let maxV = max(values.max() ?? 1, 1)
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [VTColors.accentSoft, VTColors.brandPrimary],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: max(8, (geo.size.width - CGFloat(values.count) * 6) / CGFloat(max(values.count, 1))), height: max(8, geo.size.height * CGFloat(value / maxV)))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
        .accessibilityLabel("Trend chart with \(values.count) points")
    }
}
