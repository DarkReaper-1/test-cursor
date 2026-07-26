import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct StressMeasureView: View {
    @EnvironmentObject private var composition: AppComposition
    @Environment(\.dismiss) private var dismiss
    var presentedAsSheet: Bool = false

    @State private var stressScore = 4
    @State private var anxietyScore = 4
    @State private var selectedSignals: Set<BodyStressSignal> = []
    @State private var notes = ""
    @State private var showBreathing = false
    @State private var completedBreathing = false
    @State private var recent: [StressCheck] = []
    @State private var status = ""
    @State private var savedCheck: StressCheck?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Stress & anxiety",
                    title: "How do you feel right now?",
                    subtitle: "Large controls. One minute. Not a diagnosis — just a calm check-in."
                )

                VTDisclaimerBanner(.custom(
                    "These scores are your self-ratings for wellness patterns. They do not diagnose anxiety or any medical condition."
                ))

                if let today = recent.first(where: { Calendar.current.isDateInToday($0.recordedAt) }) {
                    VTCard {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Today’s latest check")
                                .font(VTTypography.title(18))
                            Text(today.displaySummary)
                                .font(VTTypography.body().weight(.bold))
                            Text("Band: \(today.intensityBand.displayName)")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        }
                    }
                }

                scoreCard(
                    title: "Stress level",
                    caption: "1 = very calm · 10 = very stressed",
                    value: $stressScore
                )

                scoreCard(
                    title: "Anxiety level",
                    caption: "1 = very calm · 10 = very anxious",
                    value: $anxietyScore
                )

                VTCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Body signals (optional)")
                            .font(VTTypography.title(18))
                        Text("Tap any that fit. Skip what doesn’t.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 10)], spacing: 10) {
                            ForEach(BodyStressSignal.allCases) { signal in
                                Button {
                                    if selectedSignals.contains(signal) {
                                        selectedSignals.remove(signal)
                                    } else {
                                        if signal == .calmBody {
                                            selectedSignals = [.calmBody]
                                        } else {
                                            selectedSignals.remove(.calmBody)
                                            selectedSignals.insert(signal)
                                        }
                                    }
                                } label: {
                                    Text(signal.displayName)
                                        .font(VTTypography.caption().weight(.bold))
                                        .frame(maxWidth: .infinity, minHeight: 52)
                                        .foregroundStyle(selectedSignals.contains(signal) ? Color.white : VTColors.textPrimary)
                                        .background(selectedSignals.contains(signal) ? VTColors.brandPrimary : VTColors.subtle)
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                VTCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Optional note")
                            .font(VTTypography.title(18))
                        TextField("What might be contributing? (optional)", text: $notes, axis: .vertical)
                            .font(VTTypography.body())
                            .lineLimit(3...5)
                            .frame(minHeight: 72)
                    }
                }

                if stressScore >= 7 || anxietyScore >= 7 {
                    VTCard(emphasized: true) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Would a short breathing pause help?")
                                .font(VTTypography.title(18))
                            Text("In for 4 · out for 6. Stay seated. No pressure to finish.")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                            VTPrimaryButton(showBreathing ? "Hide breathing guide" : "Try 60-second breathing") {
                                showBreathing.toggle()
                            }
                            if showBreathing {
                                BreathingGuideView(completed: $completedBreathing)
                            }
                        }
                    }
                }

                VTPrimaryButton("Save stress check") {
                    Task { await save() }
                }

                if let savedCheck {
                    VTCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Saved — \(savedCheck.intensityBand.displayName)")
                                .font(VTTypography.title(18))
                            Text(encouragement(for: savedCheck))
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        }
                    }
                }

                if !status.isEmpty {
                    Text(status)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }

                if !recent.isEmpty {
                    VTSectionHeader("Recent checks", subtitle: "Patterns help you and your clinician — not a diagnosis.")
                    ForEach(recent.prefix(8)) { check in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(check.displaySummary)
                                    .font(VTTypography.body().weight(.bold))
                                Text(check.intensityBand.displayName)
                                    .font(VTTypography.caption())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                            Spacer()
                            Text(check.recordedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textTertiary)
                        }
                        .padding(.vertical, 6)
                    }
                }
            }
            .padding(20)
        }
        .background(VTAtmosphere())
        .navigationTitle("Measure stress")
        .toolbar {
            if presentedAsSheet {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .task { await load() }
    }

    private func scoreCard(title: String, caption: String, value: Binding<Int>) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 12) {
                Text(title)
                    .font(VTTypography.title(18))
                Text(caption)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
                HStack(spacing: 12) {
                    VTGhostButton("−") { value.wrappedValue = max(1, value.wrappedValue - 1) }
                    Text("\(value.wrappedValue)")
                        .font(VTTypography.metric(44))
                        .frame(maxWidth: .infinity)
                        .accessibilityLabel("\(title) \(value.wrappedValue) out of 10")
                    VTGhostButton("+") { value.wrappedValue = min(10, value.wrappedValue + 1) }
                }
                ProgressView(value: Double(value.wrappedValue), total: 10)
                    .tint(VTColors.brandPrimary)
                    .frame(minHeight: 12)
            }
        }
    }

    private func load() async {
        recent = (try? await composition.stressCheckRepository.fetchRecent(limit: 30)) ?? []
        if let today = recent.first(where: { Calendar.current.isDateInToday($0.recordedAt) }) {
            stressScore = today.stressScore
            anxietyScore = today.anxietyScore
            selectedSignals = Set(today.bodySignals)
            notes = today.notes ?? ""
            completedBreathing = today.completedBreathing
        }
    }

    private func save() async {
        guard StressCheck.validateScores(stress: stressScore, anxiety: anxietyScore) else {
            status = "Scores should be between 1 and 10."
            return
        }
        let check = StressCheck(
            stressScore: stressScore,
            anxietyScore: anxietyScore,
            bodySignals: Array(selectedSignals),
            completedBreathing: completedBreathing,
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes
        )
        do {
            try await composition.companionStore.saveStressCheck(check)
            savedCheck = check
            status = "Saved. Your Home stress estimate will update."
            await load()
        } catch {
            status = error.localizedDescription
        }
    }

    private func encouragement(for check: StressCheck) -> String {
        switch check.intensityBand {
        case .calm:
            return "Nice — you’re in a calmer band right now. Keeping a short daily check helps spot patterns with blood pressure."
        case .mild:
            return "A mild lift is common. A short walk or slower breathing can help. Recheck later if you like."
        case .moderate:
            return "Moderate stress is worth noticing without panic. Rest, hydrate, and use the breathing guide if it helps. Informational only."
        case .high:
            return "High scores deserve kindness toward yourself. Try the breathing pause, then contact a clinician or counselor if worry stays intense or includes panic. This app does not diagnose anxiety."
        }
    }
}

private struct BreathingGuideView: View {
    @Binding var completed: Bool
    @State private var phase = "Breathe in"
    @State private var secondsLeft = 60
    @State private var running = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(phase)
                .font(VTTypography.title(22))
            Text("\(secondsLeft)s remaining")
                .font(VTTypography.caption())
                .foregroundStyle(VTColors.textSecondary)
            if !running {
                VTGhostButton("Start") {
                    running = true
                    Task { await runSession() }
                }
            }
            if completed {
                Text("Breathing pause logged — well done.")
                    .font(VTTypography.caption().weight(.bold))
                    .foregroundStyle(VTColors.brandDeep)
            }
        }
    }

    private func runSession() async {
        var remaining = 60
        secondsLeft = remaining
        while remaining > 0 {
            let cycle = remaining % 10
            phase = cycle >= 5 ? "Breathe out slowly" : "Breathe in gently"
            try? await Task.sleep(nanoseconds: reduceMotion ? 1_000_000_000 : 1_000_000_000)
            remaining -= 1
            secondsLeft = remaining
        }
        phase = "Done"
        completed = true
        running = false
    }
}
