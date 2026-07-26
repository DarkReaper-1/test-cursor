import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct DashboardView: View {
    @EnvironmentObject private var composition: AppComposition
    @EnvironmentObject private var session: SessionStore

    @State private var score: DailyHealthScore?
    @State private var summary: DailySummary?
    @State private var streak: HealthStreak = HealthStreak()
    @State private var insight: Insight?
    @State private var latestBP: BloodPressureReading?
    @State private var latestHR: HeartRateSample?
    @State private var todayCheckIn: CheckIn?
    @State private var recentHR: [HeartRateSample] = []
    @State private var recentBP: [BloodPressureReading] = []
    @State private var activeMeds: [Medication] = []
    @State private var todayDoses: [MedicationDose] = []
    @State private var weekAvgSys: Double?
    @State private var monthAvgSys: Double?
    @State private var bpPlainInsight: String?
    @State private var errorMessage: String?
    @State private var showCheckIn = false
    @State private var milestoneToast: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("VitalTrack AI")
                        .font(VTTypography.body().weight(.bold))
                        .foregroundStyle(VTColors.brandPrimary)

                    Text(greetingTitle)
                        .font(VTTypography.display(34))
                        .foregroundStyle(VTColors.textPrimary)

                    Text(greetingSubtitle)
                        .font(VTTypography.body())
                        .foregroundStyle(VTColors.textSecondary)

                    VTDisclaimerBanner(.custom(
                        "This companion explains trends in plain English. Camera pulse checks are estimates. " + TrustCopy.shortBPBanner
                    ))

                    if let score {
                        scoreHero(score)
                    }

                    quickActions

                    howAmIDoingCard

                    if let insight {
                        insightCard(insight)
                    }

                    if let summary {
                        summaryCard(summary)
                    }

                    medicationStatusCard

                    hydrationAndGoal

                    lifestyleRow

                    streakCard

                    measurementsRow

                    recentCard

                    if let errorMessage {
                        Text(errorMessage)
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.danger)
                    }
                }
                .padding(20)
            }
            .background(VTAtmosphere())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Refresh")
                }
            }
            .sheet(isPresented: $showCheckIn) {
                CheckInSheet()
                    .environmentObject(composition)
                    .onDisappear { Task { await refresh() } }
            }
            .overlay(alignment: .top) {
                if let milestoneToast {
                    Text(milestoneToast)
                        .font(VTTypography.body().weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(VTColors.brandDeep)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .padding(.top, 8)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            .task { await refresh() }
            .refreshable { await refresh() }
        }
    }

    private var greetingTitle: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        if hour < 18 { return "Good afternoon" }
        return "Good evening"
    }

    private var greetingSubtitle: String {
        if let name = session.settings.preferredName, !name.isEmpty {
            return "Hello, \(name). Here’s how your health looks today."
        }
        return "Here’s how your health looks today — clearly, calmly."
    }

    private func scoreHero(_ score: DailyHealthScore) -> some View {
        VTCard(emphasized: true) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Daily health score")
                            .font(VTTypography.title(18))
                        Text(score.displayValue)
                            .font(VTTypography.metric(52))
                            .foregroundStyle(VTColors.textPrimary)
                        VTSourceChip(score.confidence.displayName)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 8) {
                        miniMetric(title: "Recovery", value: score.recovery.displayValue)
                        miniMetric(title: "Stress", value: score.stress.label)
                    }
                }
                Text(score.explanation)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
                Text("Inputs: \(score.inputsUsed.joined(separator: " · "))")
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textTertiary)
            }
        }
    }

    private func miniMetric(title: String, value: String) -> some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(title)
                .font(VTTypography.caption())
                .foregroundStyle(VTColors.textSecondary)
            Text(value)
                .font(VTTypography.body().weight(.bold))
                .foregroundStyle(VTColors.brandDeep)
        }
    }

    private var quickActions: some View {
        HStack(spacing: 12) {
            Button {
                session.selectedTab = .heart
            } label: {
                Label("Quick scan", systemImage: "waveform.path.ecg")
                    .font(VTTypography.body().weight(.bold))
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .foregroundStyle(.white)
                    .background(VTColors.brandPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)

            Button {
                showCheckIn = true
            } label: {
                Label("Check-in", systemImage: "drop.fill")
                    .font(VTTypography.body().weight(.bold))
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .foregroundStyle(VTColors.brandDeep)
                    .background(VTColors.subtle)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
        }
    }

    private var howAmIDoingCard: some View {
        VTCard(emphasized: true) {
            VStack(alignment: .leading, spacing: 12) {
                Text("How am I doing?")
                    .font(VTTypography.title(18))
                if let latestBP {
                    Text("Today’s reading: \(latestBP.displayValue) mmHg")
                        .font(VTTypography.body().weight(.bold))
                    Text(bpPlainInsight ?? "Keep logging with your FDA-cleared cuff. Patterns help more than one number.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                } else {
                    Text("No cuff reading yet today.")
                        .font(VTTypography.body().weight(.bold))
                    Text("Next step: enter numbers from your home monitor on the BP tab.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Weekly avg")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                        Text(weekAvgSys.map { String(format: "%.0f sys", $0) } ?? "—")
                            .font(VTTypography.body().weight(.bold))
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Monthly avg")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                        Text(monthAvgSys.map { String(format: "%.0f sys", $0) } ?? "—")
                            .font(VTTypography.body().weight(.bold))
                    }
                    Spacer()
                }
            }
        }
    }

    private func insightCard(_ insight: Insight) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Personalized insight")
                    .font(VTTypography.title(18))
                Text(insight.title)
                    .font(VTTypography.body().weight(.bold))
                Text(insight.body)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
                    .lineLimit(6)
            }
        }
    }

    private var medicationStatusCard: some View {
        VTCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Medication status")
                    .font(VTTypography.title(18))
                if activeMeds.isEmpty {
                    Text("Add medications in More → Medications for reminders and dose history.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                } else {
                    let taken = todayDoses.filter { $0.status == .taken }.count
                    Text("\(taken) of \(activeMeds.count) logged taken today")
                        .font(VTTypography.body().weight(.bold))
                    Text(activeMeds.prefix(3).map { "\($0.name) \($0.dosage)" }.joined(separator: " · "))
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
            }
        }
    }

    private var lifestyleRow: some View {
        HStack(spacing: 12) {
            VTCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Sleep")
                        .font(VTTypography.title(18))
                    Text(todayCheckIn?.sleepHours.map { String(format: "%.1fh", $0) } ?? "—")
                        .font(VTTypography.metric(28))
                    Text(todayCheckIn?.exerciseMinutes.map { "\($0) min move" } ?? "Log exercise in check-in")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
            }
            VTCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Weight")
                        .font(VTTypography.title(18))
                    Text(todayCheckIn?.weightKg.map { String(format: "%.1f kg", $0) } ?? "—")
                        .font(VTTypography.metric(28))
                    Text(todayCheckIn?.stressLevel.map(\.displayName) ?? "Stress optional")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
            }
        }
    }

    private func summaryCard(_ summary: DailySummary) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Today’s health summary")
                    .font(VTTypography.title(18))
                summaryRow("Recovery", summary.recoveryLabel)
                summaryRow("Stress", summary.stressLabel)
                summaryRow("Heart rate", summary.heartRateLabel)
                summaryRow("Hydration", summary.hydrationLabel)
                Text("Suggested action")
                    .font(VTTypography.caption().weight(.bold))
                    .padding(.top, 4)
                ForEach(summary.suggestedActions, id: \.self) { action in
                    Text("• \(action)")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
            }
        }
    }

    private func summaryRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title).font(VTTypography.caption()).foregroundStyle(VTColors.textSecondary)
            Spacer()
            Text(value).font(VTTypography.body().weight(.bold))
        }
    }

    private var hydrationAndGoal: some View {
        HStack(spacing: 12) {
            VTCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Hydration")
                        .font(VTTypography.title(18))
                    Text("\(todayCheckIn?.waterGlasses ?? 0)/8")
                        .font(VTTypography.metric(36))
                    Text("glasses today")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                    ProgressView(value: min(1, Double(todayCheckIn?.waterGlasses ?? 0) / 8.0))
                        .tint(VTColors.brandPrimary)
                }
            }
            VTCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Today’s goal")
                        .font(VTTypography.title(18))
                    Text(goalTitle)
                        .font(VTTypography.body().weight(.bold))
                    Text(goalCaption)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
            }
        }
    }

    private var goalTitle: String {
        if latestHR == nil { return "Take a pulse check" }
        if (todayCheckIn?.waterGlasses ?? 0) < 4 { return "Log more water" }
        if latestBP == nil { return "Add a cuff BP reading" }
        return "Keep your streak"
    }

    private var goalCaption: String {
        "Small daily actions beat perfect weeks."
    }

    private var streakCard: some View {
        VTCard {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Health streak")
                        .font(VTTypography.title(18))
                    Text("\(streak.currentDays) day\(streak.currentDays == 1 ? "" : "s")")
                        .font(VTTypography.metric(36))
                    Text("Best: \(streak.bestDays) days · Consistency \(score?.consistencyScore ?? 0)%")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                Spacer()
                Image(systemName: "flame.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(VTColors.brandPrimary)
                    .accessibilityHidden(true)
            }
        }
    }

    private var measurementsRow: some View {
        HStack(spacing: 12) {
            VTCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Heart rate")
                        .font(VTTypography.title(18))
                    if let latestHR {
                        VTMetricHero(value: latestHR.displayBPM, unit: "BPM", caption: latestHR.source.displayName, compact: true)
                    } else {
                        Text("No pulse yet")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }
            }
            VTCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Blood pressure")
                        .font(VTTypography.title(18))
                    if let latestBP {
                        VTMetricHero(value: latestBP.displayValue, unit: "mmHg", caption: latestBP.source.displayName, compact: true)
                    } else {
                        Text("Log from your cuff")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }
            }
        }
    }

    private var recentCard: some View {
        VTCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Recent measurements")
                    .font(VTTypography.title(18))
                if recentHR.isEmpty && recentBP.isEmpty {
                    Text("Your latest pulse and cuff readings will appear here.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                ForEach(recentHR.prefix(3)) { sample in
                    HStack {
                        Text("\(sample.displayBPM) BPM")
                            .font(VTTypography.body().weight(.bold))
                        VTSourceChip("Pulse")
                        Spacer()
                        Text(sample.recordedAt.formatted(date: .omitted, time: .shortened))
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }
                ForEach(recentBP.prefix(2)) { reading in
                    HStack {
                        Text("\(reading.displayValue) mmHg")
                            .font(VTTypography.body().weight(.bold))
                        VTSourceChip("Cuff")
                        Spacer()
                        Text(reading.recordedAt.formatted(date: .omitted, time: .shortened))
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }
            }
        }
    }

    private func refresh() async {
        do {
            let context = try await composition.companionStore.companionContext()
            let daily = await composition.scoreEngine.computeDailyScore(from: context)
            let dailySummary = await composition.summaryEngine.dailySummary(from: context, score: daily)
            let nextStreak = await composition.scoreEngine.computeStreak(from: context)
            let insights = await composition.environment.insightEngine.generateInsights(from: context.insightContext)
            let previous = streak.currentDays
            let stats = await composition.scoreEngine.historyStats(from: context)
            score = daily
            summary = dailySummary
            streak = nextStreak
            insight = insights.first
            latestBP = context.bloodPressure.first
            latestHR = context.heartRate.first
            recentHR = Array(context.heartRate.prefix(5))
            recentBP = Array(context.bloodPressure.prefix(5))
            todayCheckIn = context.checkIns.first { Calendar.current.isDateInToday($0.date) }
            activeMeds = context.medications.filter(\.isActive)
            todayDoses = context.doses.filter { Calendar.current.isDateInToday($0.takenAt) }
            weekAvgSys = stats.weekAvgSys
            monthAvgSys = stats.monthAvgSys
            bpPlainInsight = plainBPInsight(latest: context.bloodPressure.first, week: stats.weekAvgSys, month: stats.monthAvgSys, insights: insights)
            errorMessage = nil
            if nextStreak.currentDays > 0, nextStreak.currentDays > previous, [3, 7, 14, 30].contains(nextStreak.currentDays) {
                withAnimation {
                    milestoneToast = "Milestone: \(nextStreak.currentDays)-day streak"
                }
                if !session.settings.reduceMotion {
                    #if canImport(UIKit)
                    let gen = UINotificationFeedbackGenerator()
                    gen.notificationOccurred(.success)
                    #endif
                }
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                withAnimation { milestoneToast = nil }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func plainBPInsight(
        latest: BloodPressureReading?,
        week: Double?,
        month: Double?,
        insights: [Insight]
    ) -> String {
        if let encouraging = insights.first(where: { $0.relatedMetric == "bloodPressure" && $0.severity == .info }) {
            return encouraging.body
        }
        guard let latest else {
            return "Log a cuff reading to see how today compares with your averages."
        }
        if let week {
            let delta = Double(latest.systolic) - week
            if abs(delta) < 3 {
                return "Today’s \(latest.displayValue) is close to your weekly average. Steady logging helps your clinician."
            }
            if delta < 0 {
                return "Nice — today’s systolic looks about \(Int(abs(delta))) mmHg lower than your weekly average. Keep your routine."
            }
            return "Today’s systolic is about \(Int(delta)) mmHg above your weekly average. Rest, recheck later if needed, and note sleep or stress. Not a diagnosis."
        }
        if let month {
            return "Monthly average systolic is about \(Int(month)) mmHg. Keep building your record with your FDA-cleared cuff."
        }
        return "You’re off to a good start. A few more readings unlock clearer trends."
    }
}

#if canImport(UIKit)
import UIKit
#endif

#Preview {
    DashboardView()
        .environmentObject(SessionStore())
        .environmentObject(AppComposition())
}
