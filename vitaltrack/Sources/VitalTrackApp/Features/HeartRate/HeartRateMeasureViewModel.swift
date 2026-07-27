import Foundation
import VitalTrackCore

enum HeartRateMeasureState: Equatable {
    case idle
    case requestingPermission
    case measuring
    case error(String)
    case finished(bpm: Int?, hrv: Double?)
}

@MainActor
final class HeartRateMeasureViewModel: ObservableObject {
    @Published private(set) var state: HeartRateMeasureState = .idle
    @Published private(set) var currentReading: PPGReading?

    private let camera = CameraPPGCaptureService()
    private let processor = PPGProcessor()
    private let repository: HealthRepository
    private let healthKit: HealthKitManager
    private let settings: SettingsStore
    private var savedThisSession = false

    private let minDuration: TimeInterval = 15
    private let maxDuration: TimeInterval = 45

    init(repository: HealthRepository, healthKit: HealthKitManager, settings: SettingsStore) {
        self.repository = repository
        self.healthKit = healthKit
        self.settings = settings
    }

    var canFinishEarly: Bool {
        guard case .measuring = state, let reading = currentReading else { return false }
        return reading.bpm != nil && reading.elapsed >= minDuration
    }

    func start() {
        state = .requestingPermission
        processor.reset()
        savedThisSession = false

        Task {
            do {
                try await camera.startMeasuring { [weak self] timestampMs, luminance in
                    guard let self else { return }
                    Task { @MainActor in
                        let reading = self.processor.addSample(timestampMs: timestampMs, luminance: luminance)
                        self.currentReading = reading
                        if reading.elapsed >= self.maxDuration {
                            await self.finish()
                        }
                    }
                }
                state = .measuring
            } catch {
                state = .error(error.localizedDescription)
            }
        }
    }

    func finish() async {
        camera.stopMeasuring()
        let reading = currentReading

        if let reading, let bpm = reading.bpm, !savedThisSession {
            savedThisSession = true
            let saved = HeartRateReading(takenAt: Date(), bpm: bpm, hrvRMSSDMs: reading.hrvRMSSDMs, source: .camera)
            try? await repository.addHeartRate(saved)
            if settings.healthKitWriteEnabled {
                try? await healthKit.writeHeartRate(saved)
            }
        }
        state = .finished(bpm: reading?.bpm, hrv: reading?.hrvRMSSDMs)
    }

    func cancel() {
        camera.stopMeasuring()
        state = .idle
    }

    var fingerDetected: Bool { processor.looksLikeFingerPresent }
}
