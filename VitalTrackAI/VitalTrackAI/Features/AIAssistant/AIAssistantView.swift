import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct AIAssistantView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var messages: [CoachMessage] = [
        CoachMessage(
            role: .assistant,
            text: "Hi — I’m your VitalTrack AI coach. Ask about pulse trends, recovery, hydration, or when to talk with a clinician. I explain why, and I never diagnose."
        )
    ]
    @State private var draft = ""
    @State private var isThinking = false
    @State private var weeklyNarrative = ""
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            VTDisclaimerBanner(.custom(
                                "Informational coaching only — not medical advice. " + TrustCopy.shortBPBanner
                            ))

                            if !weeklyNarrative.isEmpty {
                                VTCard {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("This week at a glance")
                                            .font(VTTypography.title(18))
                                        Text(weeklyNarrative)
                                            .font(VTTypography.caption())
                                            .foregroundStyle(VTColors.textSecondary)
                                    }
                                }
                            }

                            Text("Try asking")
                                .font(VTTypography.caption().weight(.bold))
                                .foregroundStyle(VTColors.textSecondary)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(composition.coachEngine.suggestedPrompts(), id: \.self) { prompt in
                                        Button(prompt) {
                                            Task { await ask(prompt) }
                                        }
                                        .font(VTTypography.caption().weight(.bold))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 10)
                                        .background(VTColors.subtle)
                                        .foregroundStyle(VTColors.brandDeep)
                                        .clipShape(Capsule())
                                        .disabled(isThinking)
                                    }
                                }
                            }

                            ForEach(messages) { message in
                                bubble(message)
                                    .id(message.id)
                            }

                            if isThinking {
                                Text("Thinking…")
                                    .font(VTTypography.caption())
                                    .foregroundStyle(VTColors.textTertiary)
                                    .padding(.leading, 4)
                            }
                        }
                        .padding(20)
                    }
                    .onChange(of: messages.count) { _, _ in
                        if let last = messages.last {
                            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                }

                HStack(spacing: 10) {
                    TextField("Ask your health coach…", text: $draft, axis: .vertical)
                        .font(VTTypography.body())
                        .padding(12)
                        .background(VTColors.elevated)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(VTColors.stroke, lineWidth: 1)
                        )
                        .focused($focused)
                        .lineLimit(1...4)

                    Button {
                        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !text.isEmpty else { return }
                        draft = ""
                        Task { await ask(text) }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 36))
                            .foregroundStyle(VTColors.brandPrimary)
                    }
                    .disabled(isThinking || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .accessibilityLabel("Send")
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.ultraThinMaterial)
            }
            .background(VTAtmosphere())
            .navigationTitle("Coach")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadWeekly() }
        }
    }

    private func bubble(_ message: CoachMessage) -> some View {
        HStack {
            if message.role == .user { Spacer(minLength: 40) }
            Text(message.text)
                .font(VTTypography.body())
                .foregroundStyle(message.role == .user ? Color.white : VTColors.textPrimary)
                .padding(14)
                .background(message.role == .user ? VTColors.brandPrimary : VTColors.elevated)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(message.role == .user ? Color.clear : VTColors.stroke, lineWidth: 1)
                )
            if message.role != .user { Spacer(minLength: 40) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel((message.role == .user ? "You: " : "Coach: ") + message.text)
    }

    private func ask(_ question: String) async {
        messages.append(CoachMessage(role: .user, text: question))
        isThinking = true
        defer { isThinking = false }
        let context = (try? await composition.companionStore.companionContext()) ?? CompanionContext()
        let reply = await composition.coachEngine.answer(question: question, context: context)
        messages.append(reply)
    }

    private func loadWeekly() async {
        guard let context = try? await composition.companionStore.companionContext() else { return }
        let score = await composition.scoreEngine.computeDailyScore(from: context)
        let report = await composition.summaryEngine.weeklyReport(from: context, score: score)
        weeklyNarrative = report.narrative
    }
}

#Preview {
    AIAssistantView()
        .environmentObject(AppComposition())
}
