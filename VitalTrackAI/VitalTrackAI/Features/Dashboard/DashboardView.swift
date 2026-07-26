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
                VStack(alignment: .leading, spacing: 18) {
                    Text("VitalTrack AI")
                        .font(VTTypography.body().weight(.bold))
                        .foregroundStyle(VTColors.brandPrimary)

                    Text(greetingTitle)
                        .font(VTTypography.display(36))
                        .foregroundStyle(VTColors.textPrimary)
                        .accessibilityAddTraits(.isHeader)

                    Text(greetingSubtitle)
                        .font(VTTypography.body())
                        .foregroundStyle(VTColors.textSecondary)

                    VTDisclaimerBanner(.custom(
                        "Blood pressure comes from your cuff. " + TrustCopy.shortBPBanner + " Camera measurements are heart rate only. Insights are informational only and are not medical advice."
                    ))

                    ForEach(priorityCards) { card in
                        cardView(card)
                    }

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
                            .font(.system(size: 17, weight: .semibold))
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Refresh dashboard")
                }
            }
            .task { await refresh() }
            .refreshable { await refresh() }
        }
    }

    /// Prefer a calm, readable Home: BP, HR, tip, then remaining configured cards.
    private var priorityCards: [DashboardCardKind] {
        let preferred: [DashboardCardKind] = [
            .latestBloodPressure,
            .latestHeartRate,
            .insightsPreview,
            .weeklyBPTrend
        ]
        let configured = session.settings.dashboardCards
        var ordered = preferred.filter { configured.contains($0) }
        for card in configured where !ordered.contains(card) {
            ordered.append(card)
        }
        return ordered
    }

    private var greetingTitle: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        if hour < 18 { return "Good afternoon" }
        return "Good evening"
    }

    private var greetingSubtitle: String {
        if let name = session.settings.preferredName, !name.isEmpty {
            return "Hello, \(name). Your numbers, clearly."
        }
        return "Your numbers, clearly."
    }

    @ViewBuilder
    private func cardView(_ kind: DashboardCardKind) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 12) {
                Text(kind.comfortTitle)
                    .font(VTTypography.title(20))
                    .foregroundStyle(VTColors.textPrimary)

                switch kind {
                case .latestBloodPressure:
                    if let bp = latestBP {
                        VTMetricHero(
                            value: bp.displayValue,
                            unit: "mmHg",
                            caption: "\(bp.source.displayName) · \(bp.category.displayName)"
                        )
                    } else {
                        Text("Tap BP below to enter numbers from your cuff.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                case .latestHeartRate:
                    if let hr = latestHR {
                        VTMetricHero(
                            value: hr.displayBPM,
                            unit: "BPM",
                            caption: "\(hr.source.displayName) · fingertip or Watch"
                        )
                    } else {
                        Text("Use the Pulse tab for a fingertip heart-rate check.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                case .insightsPreview:
                    if let tip = insights.first {
                        Text(tip.title)
                            .font(VTTypography.body().weight(.bold))
                            .foregroundStyle(VTColors.textPrimary)
                        Text(tip.body)
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                            .lineLimit(4)
                    } else {
                        Text("Save a cuff reading today. A few days of logs make trends easier to see. Informational only — not medical advice.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                case .weeklyBPTrend:
                    WeeklyBarsView()
                    Text("Bars show cuff readings you saved — not camera estimates.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                case .restingHRTrend:
                    Text("Resting heart rate trends use Pulse / Health samples — never as blood pressure.")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                case .devicesStatus:
                    Text("Pair FDA-cleared Bluetooth cuffs in More → Devices.")
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

private extension DashboardCardKind {
    var comfortTitle: String {
        switch self {
        case .latestBloodPressure: return "Latest blood pressure"
        case .latestHeartRate: return "Today’s heart rate"
        case .insightsPreview: return "Helpful tip"
        case .weeklyBPTrend: return "This week"
        case .restingHRTrend: return "Resting heart rate"
        case .devicesStatus: return "Devices"
        case .reminders: return "Reminders"
        case .hrvSnapshot: return "Heart rate variability"
        }
    }
}

private struct WeeklyBarsView: View {
    private let heights: [CGFloat] = [0.42, 0.55, 0.48, 0.62, 0.58, 0.70, 0.64]

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            ForEach(Array(heights.enumerated()), id: \.offset) { _, h in
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [VTColors.accentSoft, VTColors.brandPrimary],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: 110 * h)
            }
        }
        .frame(height: 120)
        .accessibilityLabel("Weekly trend chart placeholder")
    }
}

#Preview {
    DashboardView()
        .environmentObject(SessionStore())
        .environmentObject(AppComposition())
}
