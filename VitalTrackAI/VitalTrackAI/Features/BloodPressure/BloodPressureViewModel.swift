import Foundation
import VitalTrackCore
import VitalTrackFeatures

@MainActor
final class BloodPressureViewModel: ObservableObject {
    @Published var systolicText = "120"
    @Published var diastolicText = "80"
    @Published var pulseText = ""
    @Published var source: MeasurementSource = .manual
    @Published var recent: [BloodPressureReading] = []
    @Published var errorMessage: String?
    @Published var statusMessage = "Enter values from your FDA-cleared monitor."

    private let repository: any BloodPressureRepository

    /// BP sources shown in the picker — camera/Watch intentionally omitted.
    let allowedSources: [MeasurementSource] = [.manual, .bluetoothCuff, .healthKit, .csvImport]

    init(repository: any BloodPressureRepository) {
        self.repository = repository
    }

    func load() async {
        do {
            recent = try await repository.fetchRecent(limit: 30)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func save() async {
        guard let sys = Int(systolicText), let dia = Int(diastolicText) else {
            errorMessage = "Enter whole-number systolic and diastolic values."
            return
        }
        guard MeasurementValidation.isPlausibleBloodPressure(systolic: sys, diastolic: dia) else {
            errorMessage = "Values look out of plausible range. Double-check your cuff reading."
            return
        }
        guard source.isValidBloodPressureSource else {
            errorMessage = VitalTrackError.invalidBloodPressureSource(source).errorDescription
            return
        }
        let pulse = Int(pulseText)
        let reading = BloodPressureReading(
            systolic: sys,
            diastolic: dia,
            pulse: pulse,
            source: source,
            deviceName: source == .manual ? "Manual cuff reading" : nil
        )
        do {
            try await repository.save(reading)
            statusMessage = "Saved \(reading.displayValue) mmHg from \(source.displayName)."
            errorMessage = nil
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
