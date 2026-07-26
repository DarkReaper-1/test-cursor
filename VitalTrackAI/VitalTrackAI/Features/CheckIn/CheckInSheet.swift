import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct CheckInSheet: View {
    @EnvironmentObject private var composition: AppComposition
    @Environment(\.dismiss) private var dismiss

    @State private var water = 0
    @State private var mood: MoodTag = .good
    @State private var sleepHours = 7.0
    @State private var includeSleep = true
    @State private var status = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VTScreenHeader(
                        eyebrow: "Check-in",
                        title: "How are you today?",
                        subtitle: "Water, mood, and sleep help your AI coach personalize tips."
                    )
                    VTDisclaimerBanner(.insights)

                    VTCard {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Water glasses")
                                .font(VTTypography.title(18))
                            HStack(spacing: 12) {
                                VTGhostButton("−") { water = max(0, water - 1) }
                                Text("\(water)")
                                    .font(VTTypography.metric(36))
                                    .frame(maxWidth: .infinity)
                                VTGhostButton("+") { water = min(20, water + 1) }
                            }
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Mood")
                                .font(VTTypography.title(18))
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 10)], spacing: 10) {
                                ForEach(MoodTag.allCases) { tag in
                                    Button {
                                        mood = tag
                                    } label: {
                                        Text(tag.displayName)
                                            .font(VTTypography.caption().weight(.bold))
                                            .frame(maxWidth: .infinity, minHeight: 48)
                                            .foregroundStyle(mood == tag ? Color.white : VTColors.textPrimary)
                                            .background(mood == tag ? VTColors.brandPrimary : VTColors.subtle)
                                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle("Log sleep hours", isOn: $includeSleep)
                                .font(VTTypography.title(18))
                            if includeSleep {
                                Stepper(value: $sleepHours, in: 3...12, step: 0.5) {
                                    Text(String(format: "%.1f hours", sleepHours))
                                        .font(VTTypography.body().weight(.bold))
                                }
                                .frame(minHeight: 48)
                            }
                        }
                    }

                    if !status.isEmpty {
                        Text(status)
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }

                    VTPrimaryButton("Save check-in") {
                        Task { await save() }
                    }
                }
                .padding(20)
            }
            .background(VTAtmosphere())
            .navigationTitle("Check-in")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        if let today = try? await composition.companionStore.todayCheckIn() {
            water = today.waterGlasses
            mood = today.mood ?? .good
            if let sleep = today.sleepHours {
                sleepHours = sleep
                includeSleep = true
            }
        }
    }

    private func save() async {
        let checkIn = CheckIn(
            waterGlasses: water,
            mood: mood,
            sleepHours: includeSleep ? sleepHours : nil
        )
        do {
            try await composition.companionStore.upsertCheckIn(checkIn)
            status = "Saved. Your Home scores will update."
            dismiss()
        } catch {
            status = error.localizedDescription
        }
    }
}
