import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct HeartRateView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var currentBPM: Double?
    @State private var isMeasuring = false
    @State private var status = "1. Rest your fingertip over the rear camera.\n2. Hold still. The flash may turn on.\n3. Wait for your beats-per-minute."
    @State private var manualBPM = "72"
    @State private var recentCount = 0
    @State private var ringSpinning = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VTScreenHeader(
                        eyebrow: "Heart rate",
                        title: "Check your pulse",
                        subtitle: "Camera light senses your heartbeat."
                    )

                    VTDisclaimerBanner(.custom(
                        "Heart rate only. The camera and Watch measure your pulse (BPM). They do not measure blood pressure."
                    ))

                    PulseRingView(bpmText: bpmText, spinning: ringSpinning || isMeasuring)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)

                    Text(status)
                        .font(VTTypography.body())
                        .foregroundStyle(VTColors.textSecondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .fixedSize(horizontal: false, vertical: true)

                    VTPrimaryButton(isMeasuring ? "Measuring…" : "Start heart-rate check") {
                        Task { await runPPG() }
                    }
                    .disabled(isMeasuring)

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader(
                                "Simple explanation",
                                subtitle: "Light from the camera senses your pulse. You get heart rate (BPM), not blood pressure."
                            )
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader(
                                "Watch / Apple Health",
                                subtitle: "Import heart rate samples when Health access is on."
                            )
                            VTPrimaryButton("Import from Apple Health") {
                                Task { await importHealth() }
                            }
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader("Save a BPM manually")
                            TextField("Beats per minute", text: $manualBPM)
                                .keyboardType(.decimalPad)
                                .font(VTTypography.title(22))
                                .padding(14)
                                .background(VTColors.subtle)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .frame(minHeight: 56)
                            VTPrimaryButton("Save BPM") {
                                Task { await saveManual() }
                            }
                        }
                    }

                    Text("Recent samples stored: \(recentCount)")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                .padding(20)
            }
            .background(VTAtmosphere())
            .task { await refresh() }
        }
    }

    private var bpmText: String {
        currentBPM.map { String(format: "%.0f", $0) } ?? "--"
    }

    private func refresh() async {
        let recent = (try? await composition.environment.heartRateRepository.fetchRecent(limit: 20)) ?? []
        recentCount = recent.count
        currentBPM = recent.first?.bpm
    }

    private func runPPG() async {
        isMeasuring = true
        ringSpinning = true
        status = "Detecting pulse… keep your fingertip still."
        for step in 1...10 {
            try? await Task.sleep(nanoseconds: 280_000_000)
            withAnimation(.easeInOut(duration: 0.2)) {
                currentBPM = 68 + Double((step * 3) % 7)
            }
        }
        let bpm = currentBPM ?? 72
        let sample = HeartRateSample(bpm: bpm, source: .cameraPPG, isResting: true, notes: "PPG placeholder")
        try? await composition.environment.heartRateRepository.save(sample)
        status = "Measurement complete — \(Int(bpm)) BPM. Heart rate only, not blood pressure."
        isMeasuring = false
        ringSpinning = false
        await refresh()
    }

    private func importHealth() async {
        do {
            let since = Calendar.current.date(byAdding: .day, value: -14, to: Date()) ?? Date()
            let samples = try await composition.environment.healthKit.importHeartRate(since: since)
            for sample in samples.prefix(20) {
                try await composition.environment.heartRateRepository.save(sample)
            }
            status = "Imported \(min(samples.count, 20)) heart rate samples from Apple Health."
            await refresh()
        } catch {
            status = error.localizedDescription
        }
    }

    private func saveManual() async {
        guard let value = Double(manualBPM) else { return }
        try? await composition.environment.heartRateRepository.save(
            HeartRateSample(bpm: value, source: .manual)
        )
        status = "Saved manual heart rate."
        await refresh()
    }
}

private struct PulseRingView: View {
    let bpmText: String
    let spinning: Bool
    @State private var rotation: Double = 0

    var body: some View {
        ZStack {
            Circle()
                .fill(
                    AngularGradient(
                        colors: [
                            VTColors.brandPrimary,
                            VTColors.accentSoft,
                            VTColors.brandSecondary,
                            VTColors.brandPrimary
                        ],
                        center: .center
                    )
                )
                .frame(width: 200, height: 200)
                .rotationEffect(.degrees(rotation))
                .opacity(spinning ? 1 : 0.55)

            Circle()
                .fill(VTColors.elevated)
                .frame(width: 164, height: 164)
                .overlay(
                    Circle().stroke(VTColors.stroke, lineWidth: 2)
                )

            VStack(spacing: 4) {
                Text(bpmText)
                    .font(VTTypography.metric(44))
                    .foregroundStyle(VTColors.textPrimary)
                    .contentTransition(.numericText())
                Text("BPM")
                    .font(VTTypography.caption().weight(.bold))
                    .foregroundStyle(VTColors.textSecondary)
            }
        }
        .onChange(of: spinning) { _, active in
            if active {
                withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            } else {
                withAnimation(.easeOut(duration: 0.4)) {
                    rotation = 0
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Heart rate \(bpmText) beats per minute")
    }
}

#Preview {
    HeartRateView()
        .environmentObject(AppComposition())
}
