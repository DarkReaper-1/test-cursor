import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct HeartRateView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var currentBPM: Double?
    @State private var isMeasuring = false
    @State private var status = "Camera PPG measures heart rate only."
    @State private var manualBPM = "72"
    @State private var recentCount = 0

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Heart rate")
                        .font(VTTypography.display(34))
                        .foregroundStyle(VTColors.brandPrimary)

                    VTDisclaimerBanner(.heartRate)

                    VTMetricHero(
                        value: currentBPM.map { String(format: "%.0f", $0) } ?? "--",
                        unit: "BPM",
                        caption: status
                    )

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader("Camera PPG", subtitle: "Photoplethysmography detects pulse — not blood pressure.")
                            Text(TrustCopy.howHeartRateWorks)
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                            VTPrimaryButton(isMeasuring ? "Measuring…" : "Start camera PPG (placeholder)") {
                                Task { await runPPG() }
                            }
                            .disabled(isMeasuring)
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader("Watch / Apple Health", subtitle: "Import heart rate samples when Health access is on.")
                            VTPrimaryButton("Import from Apple Health") {
                                Task { await importHealth() }
                            }
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader("Manual BPM")
                            TextField("BPM", text: $manualBPM)
                                .keyboardType(.decimalPad)
                                .textFieldStyle(.roundedBorder)
                            VTPrimaryButton("Save BPM") {
                                Task { await saveManual() }
                            }
                        }
                    }

                    Text("Recent samples stored: \(recentCount)")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textTertiary)
                }
                .padding()
            }
            .background(VTColors.canvasGradient.ignoresSafeArea())
            .task { await refresh() }
        }
    }

    private func refresh() async {
        let recent = (try? await composition.environment.heartRateRepository.fetchRecent(limit: 20)) ?? []
        recentCount = recent.count
        currentBPM = recent.first?.bpm
    }

    private func runPPG() async {
        isMeasuring = true
        status = "Locking onto PPG signal (demo)…"
        for step in 1...6 {
            try? await Task.sleep(nanoseconds: 280_000_000)
            withAnimation(.easeInOut(duration: 0.2)) {
                currentBPM = 70 + Double((step * 2) % 5)
            }
        }
        let bpm = currentBPM ?? 72
        let sample = HeartRateSample(bpm: bpm, source: .cameraPPG, isResting: true, notes: "PPG placeholder")
        try? await composition.environment.heartRateRepository.save(sample)
        status = "Saved \(Int(bpm)) BPM from camera PPG. This is not blood pressure."
        isMeasuring = false
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

#Preview {
    HeartRateView()
        .environmentObject(AppComposition())
}
