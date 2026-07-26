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
    @State private var includeLifestyle = false
    @State private var weightKg = 75.0
    @State private var includeWeight = false
    @State private var sodiumMg = 1500
    @State private var includeSodium = false
    @State private var caffeineCups = 1
    @State private var alcoholDrinks = 0
    @State private var smoked = 0
    @State private var exerciseMinutes = 20
    @State private var includeExercise = false
    @State private var steps = 4000
    @State private var includeSteps = false
    @State private var stressLevel: StressLevel = .mild
    @State private var includeStress = false
    @State private var status = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VTScreenHeader(
                        eyebrow: "Check-in",
                        title: "How are you today?",
                        subtitle: "Water, mood, sleep, and optional lifestyle notes help explain BP patterns."
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

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle("Add lifestyle details", isOn: $includeLifestyle)
                                .font(VTTypography.title(18))
                            Text("Optional — only what helps you and your clinician.")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)

                            if includeLifestyle {
                                Toggle("Weight (kg)", isOn: $includeWeight)
                                if includeWeight {
                                    Stepper(value: $weightKg, in: 35...200, step: 0.5) {
                                        Text(String(format: "%.1f kg", weightKg))
                                            .font(VTTypography.body().weight(.bold))
                                    }
                                    .frame(minHeight: 48)
                                }

                                Toggle("Sodium estimate (mg)", isOn: $includeSodium)
                                if includeSodium {
                                    Stepper("\(sodiumMg) mg", value: $sodiumMg, in: 500...5000, step: 100)
                                        .frame(minHeight: 48)
                                }

                                Stepper("Caffeine cups: \(caffeineCups)", value: $caffeineCups, in: 0...10)
                                    .frame(minHeight: 48)
                                Stepper("Alcohol drinks: \(alcoholDrinks)", value: $alcoholDrinks, in: 0...10)
                                    .frame(minHeight: 48)
                                Stepper("Cigarettes: \(smoked)", value: $smoked, in: 0...40)
                                    .frame(minHeight: 48)

                                Toggle("Exercise minutes", isOn: $includeExercise)
                                if includeExercise {
                                    Stepper("\(exerciseMinutes) min", value: $exerciseMinutes, in: 0...180, step: 5)
                                        .frame(minHeight: 48)
                                }

                                Toggle("Steps", isOn: $includeSteps)
                                if includeSteps {
                                    Stepper("\(steps) steps", value: $steps, in: 0...30000, step: 500)
                                        .frame(minHeight: 48)
                                }

                                Toggle("Quick stress tag", isOn: $includeStress)
                                if includeStress {
                                    Picker("Stress", selection: $stressLevel) {
                                        ForEach(StressLevel.allCases) { level in
                                            Text(level.displayName).tag(level)
                                        }
                                    }
                                    .pickerStyle(.segmented)
                                    .frame(minHeight: 44)
                                    Text("For a full stress & anxiety score (1–10), use Measure stress on Home.")
                                        .font(VTTypography.caption())
                                        .foregroundStyle(VTColors.textTertiary)
                                }
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
            if today.weightKg != nil || today.sodiumMg != nil || today.exerciseMinutes != nil {
                includeLifestyle = true
            }
            if let w = today.weightKg { weightKg = w; includeWeight = true }
            if let s = today.sodiumMg { sodiumMg = s; includeSodium = true }
            caffeineCups = today.caffeineCups ?? caffeineCups
            alcoholDrinks = today.alcoholDrinks ?? 0
            smoked = today.smokedCigarettes ?? 0
            if let e = today.exerciseMinutes { exerciseMinutes = e; includeExercise = true }
            if let st = today.steps { steps = st; includeSteps = true }
            if let stress = today.stressLevel { stressLevel = stress; includeStress = true }
        }
    }

    private func save() async {
        let checkIn = CheckIn(
            waterGlasses: water,
            mood: mood,
            sleepHours: includeSleep ? sleepHours : nil,
            weightKg: includeLifestyle && includeWeight ? weightKg : nil,
            sodiumMg: includeLifestyle && includeSodium ? sodiumMg : nil,
            caffeineCups: includeLifestyle ? caffeineCups : nil,
            alcoholDrinks: includeLifestyle ? alcoholDrinks : nil,
            smokedCigarettes: includeLifestyle ? smoked : nil,
            exerciseMinutes: includeLifestyle && includeExercise ? exerciseMinutes : nil,
            steps: includeLifestyle && includeSteps ? steps : nil,
            stressLevel: includeLifestyle && includeStress ? stressLevel : nil
        )
        do {
            try await composition.companionStore.upsertCheckIn(checkIn)
            status = "Saved. Home insights will update when patterns appear."
            dismiss()
        } catch {
            status = error.localizedDescription
        }
    }
}
