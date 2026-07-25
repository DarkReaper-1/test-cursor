import Foundation
import VitalTrackCore
import VitalTrackData

@MainActor
final class HeartRateViewModel: ObservableObject {
    @Published var currentBPM: Double?
    @Published var isMeasuring = false
    @Published var recent: [HeartRateSample] = []
    @Published var status = "Ready"
    @Published var errorMessage: String?

    private let repository: any HeartRateRepository

    init(repository: any HeartRateRepository) {
        self.repository = repository
    }

    func load() async {
        do {
            recent = try await repository.fetchRecent(limit: 20)
            currentBPM = recent.first?.bpm
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Simulated camera PPG session — educational placeholder, not a clinical device.
    func startCameraPPGPlaceholder() async {
        guard !isMeasuring else { return }
        isMeasuring = true
        status = "Measuring heart rate via PPG placeholder…"
        // Simulate pulse lock-in
        for step in 1...5 {
            try? await Task.sleep(nanoseconds: 350_000_000)
            currentBPM = 68 + Double(step % 3)
        }
        let sample = HeartRateSample(
            bpm: currentBPM ?? 72,
            source: .cameraPPG,
            isResting: true,
            notes: "Camera PPG placeholder session"
        )
        do {
            try await repository.save(sample)
            await load()
            status = "Saved \(sample.displayBPM) BPM from camera PPG (not blood pressure)."
        } catch {
            errorMessage = error.localizedDescription
        }
        isMeasuring = false
    }

    func saveManualBPM(_ value: Double) async {
        let sample = HeartRateSample(bpm: value, source: .manual, isResting: false)
        do {
            try await repository.save(sample)
            await load()
            status = "Saved manual heart rate."
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
